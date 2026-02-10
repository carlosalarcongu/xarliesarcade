const Utils = require('./utils');

const rooms = {};

const defaultSettings = { 
    category: 'NUMEROS', 
    difficulty: 'EASY' // EASY (Secuencial), MEDIUM (Saltos), HARD (Desorden conceptual/Huecos grandes)
};

// --- BASE DE DATOS DE SECUENCIAS ---
const SEQUENCES = {
    'NUMEROS': {
        label: "Números",
        generate: (count, diff) => {
            let pool = [];
            // Easy: 1,2,3... | Medium: 2, 4, 6... | Hard: Random 1-100
            if (diff === 'EASY') pool = Array.from({length: count}, (_, i) => i + 1);
            else if (diff === 'MEDIUM') pool = Array.from({length: count}, (_, i) => (i + 1) * 2);
            else { // HARD
                while(pool.length < count) {
                    const r = Math.floor(Math.random() * 100) + 1;
                    if(!pool.includes(r)) pool.push(r);
                }
                pool.sort((a,b) => a-b);
            }
            return pool;
        }
    },
    'VIDA': {
        label: "Ciclo de Vida",
        data: ["Nacer", "Primeros pasos", "Primera palabra", "Ir al colegio", "Aprender a leer", "Primer beso", "Graduación", "Primer trabajo", "Casarse", "Tener hijos", "Jubilación", "Ser abuelo", "Morir"]
    },
    'FIESTA': {
        label: "Salir de Fiesta",
        data: ["Ducharse", "Vestirse", "Cenar", "Precopa en casa", "Pedir Taxi/Uber", "Entrar a la discoteca", "Pedir una copa", "Bailar", "Perder a un amigo", "Llamar a tu ex", "Comer Kebab", "Dormir la mona", "Resaca"]
    },
    'ESCUELA': {
        label: "Estudios",
        data: ["Infantil", "Primaria", "ESO", "Bachillerato", "Selectividad (EBAU)", "Grado Universitario", "Máster", "Doctorado", "Cátedra"]
    },
    'COCINA': {
        label: "Hacer Pasta",
        data: ["Llenar olla", "Hervir agua", "Echar sal", "Echar pasta", "Esperar 10 min", "Escurrir", "Echar salsa", "Rallar queso", "Servir", "Comer", "Lavar platos"]
    }
};

function createRoom(roomId) {
    rooms[roomId] = {
        id: roomId,
        players: [],
        gameInProgress: false,
        settings: { ...defaultSettings },
        state: {
            phase: 'LOBBY', // LOBBY, PLAYING, RESULT
            orderedIds: [], // El orden actual de los IDs de jugadores
            assignedValues: {}, // { playerId: "Valor asignado" }
            correctOrder: [], // Array de valores ordenados correctamente (para comparar)
            suggestions: {}, // { playerId: { up: 0, down: 0 } }
            readyCount: 0
        },
        inactivityTimer: null
    };
    return rooms[roomId];
}

function destroyRoom(roomId) {
    if (rooms[roomId]) delete rooms[roomId];
}

function checkRoomInactivity(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    const active = room.players.filter(p => p.connected);
    if (active.length === 0) {
        if (room.inactivityTimer) clearTimeout(room.inactivityTimer);
        room.inactivityTimer = setTimeout(() => destroyRoom(roomId), 20 * 60 * 1000); 
    } else {
        if (room.inactivityTimer) {
            clearTimeout(room.inactivityTimer);
            room.inactivityTimer = null;
        }
    }
}

function broadcast(io, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    // Construir la lista ordenada según state.orderedIds
    const orderedList = room.state.orderedIds.map(id => {
        const p = room.players.find(pl => pl.id === id);
        if (!p) return null;
        return {
            id: p.id,
            name: p.name,
            isAdmin: p.isAdmin,
            suggestions: room.state.suggestions[p.id] || { up: 0, down: 0 },
            isReady: p.isReady,
            // Solo revelar valor si estamos en RESULT o si es uno mismo (se filtra en cliente, aquí mandamos null si no es RESULT)
            value: (room.state.phase === 'RESULT') ? room.state.assignedValues[p.id] : null
        };
    }).filter(p => p !== null);

    const publicPlayers = room.players.map(p => ({
        id: p.id,
        name: p.name,
        isAdmin: p.isAdmin,
        connected: p.connected,
        isReady: p.isReady
    }));

    io.to('orden_' + roomId).emit('updateOrden', {
        players: publicPlayers,
        orderedList: orderedList,
        state: room.state,
        settings: room.settings,
        categories: Object.keys(SEQUENCES).map(k => ({ key: k, label: SEQUENCES[k].label }))
    });
}

function calculateScore(currentOrder, assignedValues) {
    // Extraer los valores en el orden actual
    const currentValues = currentOrder.map(id => assignedValues[id]);
    
    // Calcular la Subsecuencia Creciente Más Larga (LIS) para determinar "cuán ordenado" está
    // Esto es más justo que mirar posición absoluta.
    if (currentValues.length === 0) return 0;

    // Mapeamos los valores a sus índices "ideales" para simplificar la comparación
    // 1. Ordenamos los valores actuales para saber cuál es el orden "correcto" absoluto
    const correctOrder = [...currentValues].sort((a,b) => {
        // Detección automática de tipo (número o string indexado??)
        // Para simplificar, en start() guardamos indices numéricos ocultos si son strings
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        return String(a).localeCompare(String(b)); // Fallback, aunque usaremos índices numéricos internos
    });

    // Algoritmo LIS (O(n log n))
    const piles = [];
    for (const val of currentValues) {
        // Encontrar índice en el orden correcto (rank)
        const rank = correctOrder.indexOf(val);
        
        // Paciencia binaria (standard LIS)
        let low = 0, high = piles.length;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (piles[mid] < rank) low = mid + 1;
            else high = mid;
        }
        if (low === piles.length) piles.push(rank);
        else piles[low] = rank;
    }

    const lisLength = piles.length;
    const percentage = (lisLength / currentValues.length) * 100;
    return percentage;
}

// Función auxiliar para obtener valores reales de las secuencias
function getGameValues(category, difficulty, count) {
    const seq = SEQUENCES[category];
    let pool = [];

    if (category === 'NUMEROS') {
        pool = seq.generate(count, difficulty);
    } else {
        // Strings (Acciones, etc)
        // Si hay menos items que jugadores, repetimos o ajustamos (no debería pasar con límites de sala)
        const source = seq.data;
        
        if (difficulty === 'EASY') {
            // Coger los primeros X
            pool = source.slice(0, count);
        } else if (difficulty === 'MEDIUM') {
            // Coger salteados uniformemente
            const step = Math.floor(source.length / count);
            for(let i=0; i<count; i++) pool.push(source[Math.min(source.length-1, i*step)]);
        } else {
            // HARD: Random del pool total (pero manteniendo el orden lógico interno)
            // Primero cogemos X random, luego los ordenamos según su índice original
            let indices = [];
            while(indices.length < count) {
                const r = Math.floor(Math.random() * source.length);
                if(!indices.includes(r)) indices.push(r);
            }
            indices.sort((a,b) => a-b);
            pool = indices.map(i => source[i]);
        }
    }
    
    // Ahora tenemos 'pool' que son los valores CORRECTOS en orden.
    // Devolvemos objetos { display: "Texto", rank: 10 }
    return pool.map((val, index) => ({ val: val, rank: (typeof val === 'number') ? val : index }));
}

const handleSocket = (io, socket) => {
    socket.on('orden_action', (action) => {
        const roomId = socket.data.roomId;
        const room = rooms[roomId];
        if (!room) return;

        const me = room.players.find(p => p.socketId === socket.id);
        if (!me) return;

        // ADMIN: CONFIG
        if (me.isAdmin && action.type === 'updateSettings') {
            if (action.category) room.settings.category = action.category;
            if (action.difficulty) room.settings.difficulty = action.difficulty;
            broadcast(io, roomId);
        }

        // ADMIN: START
        if (me.isAdmin && action.type === 'start') {
            if (room.players.length < 2) return; // Mínimo 2

            const count = room.players.length;
            const values = getGameValues(room.settings.category, room.settings.difficulty, count);
            
            // Asignar valores aleatoriamente a los jugadores
            // values está ordenado. Lo barajamos para asignar.
            const shuffledValues = [...values].sort(() => Math.random() - 0.5);
            
            room.state.assignedValues = {};
            room.state.orderedIds = [];
            room.state.suggestions = {};
            
            room.players.forEach((p, i) => {
                // Guardamos el valor completo. Si es string, usamos el objeto interno para comparar ranking
                room.state.assignedValues[p.id] = shuffledValues[i];
                room.state.orderedIds.push(p.id);
                room.state.suggestions[p.id] = { up: 0, down: 0 };
                p.isReady = false;
            });

            // Barajar el orden visual inicial de los jugadores también
            room.state.orderedIds.sort(() => Math.random() - 0.5);

            room.state.phase = 'PLAYING';
            room.state.readyCount = 0;
            room.gameInProgress = true;

            // Enviar valor privado a cada uno
            room.players.forEach(p => {
                if(p.socketId) io.to(p.socketId).emit('ordenPrivate', room.state.assignedValues[p.id]);
            });

            broadcast(io, roomId);
        }

        // JUGADOR: SUGERIR MOVIMIENTO (Flechas)
        if (action.type === 'suggest' && room.state.phase === 'PLAYING') {
            const targetId = action.targetId;
            const dir = action.dir; // 'up' or 'down'
            
            if (room.state.suggestions[targetId]) {
                room.state.suggestions[targetId][dir]++;
                broadcast(io, roomId);
            }
        }

        // ADMIN: MOVER (Efectivo)
        if (me.isAdmin && action.type === 'move' && room.state.phase === 'PLAYING') {
            const targetId = action.targetId;
            const dir = action.dir;
            const idx = room.state.orderedIds.indexOf(targetId);

            if (idx === -1) return;
            
            if (dir === 'up' && idx > 0) {
                // Swap con el anterior
                [room.state.orderedIds[idx], room.state.orderedIds[idx-1]] = [room.state.orderedIds[idx-1], room.state.orderedIds[idx]];
            } else if (dir === 'down' && idx < room.state.orderedIds.length - 1) {
                // Swap con el siguiente
                [room.state.orderedIds[idx], room.state.orderedIds[idx+1]] = [room.state.orderedIds[idx+1], room.state.orderedIds[idx]];
            }

            // Resetear sugerencias al mover (para evitar spam visual acumulado)
            Object.keys(room.state.suggestions).forEach(key => {
                room.state.suggestions[key] = { up: 0, down: 0 };
            });

            broadcast(io, roomId);
        }

        // JUGADOR: LISTO
        if (action.type === 'toggleReady' && room.state.phase === 'PLAYING') {
            me.isReady = !me.isReady;
            broadcast(io, roomId);
        }

        // ADMIN: RESOLVER (Check de victoria)
        if (me.isAdmin && action.type === 'resolve' && room.state.phase === 'PLAYING') {
            // 1. Obtener todos los objetos de valor asignados actualmente
            const currentValuesObj = room.state.orderedIds.map(id => room.state.assignedValues[id]);
            
            // 2. Extraer rangos para calcular puntuación
            let orderedRanks = currentValuesObj.map(v => v.rank);
            
            // 3. Calculo LIS
            const piles = [];
            for (const r of orderedRanks) {
                let low = 0, high = piles.length;
                while(low < high) {
                    const mid = Math.floor((low+high)/2);
                    if(piles[mid] < r) low = mid + 1;
                    else high = mid;
                }
                if(low === piles.length) piles.push(r);
                else piles[low] = r;
            }
            
            const score = (piles.length / orderedRanks.length) * 100;
            const success = score >= 80;

            // 4. GENERAR LA LISTA CORRECTA CON NOMBRES (MODIFICADO)
            // Mapeamos jugadores a sus cartas y luego ordenamos
            const fullList = room.players.map(p => {
                const card = room.state.assignedValues[p.id];
                if (!card) return null;
                return {
                    name: p.name, // Añadimos el nombre aquí
                    val: card.val,
                    rank: card.rank
                };
            }).filter(i => i !== null);

            // Ordenar por el rango correcto
            const correctList = fullList.sort((a, b) => a.rank - b.rank);

            room.state.result = { 
                score: Math.round(score), 
                success,
                correctList: correctList
            };
            
            room.state.phase = 'RESULT';
            broadcast(io, roomId);
        }

        // ADMIN: KICK (Durante partida)
        if (me.isAdmin && action.type === 'kick') {
            handleLeave(action.targetId, roomId, io, true);
        }

        // ADMIN: RESET
        if (me.isAdmin && action.type === 'reset') {
            room.state.phase = 'LOBBY';
            room.gameInProgress = false;
            room.players.forEach(p => p.isReady = false);
            broadcast(io, roomId);
        }
    });

    socket.on('disconnect', () => {
        const rId = socket.data.roomId;
        if (rId && rooms[rId]) {
            Utils.handleDisconnect(socket.id, rooms[rId].players, () => checkRoomInactivity(rId));
            // Si se va alguien en partida, lo sacamos de la lista ordenada
            const p = rooms[rId].players.find(pl => pl.socketId === socket.id); // Ya habrá sido borrado por handleDisconnect utils? No, utils marca connected=false
            // Tenemos que buscar por ID que se desconectó
            // ... Utils handleDisconnect es genérico. Aquí necesitamos limpiar orderedIds si se va del todo.
            // Por simplicidad, si se desconecta, sigue en la lista visual (con icono desconectado) hasta que el admin haga Kick.
            broadcast(io, rId);
        }
    });
};

const handleJoin = (socket, nameRaw, targetRoomId) => {
    const cleanName = nameRaw.replace(/👑|👤/g, '').trim();
    let room;

    if (!targetRoomId || targetRoomId === 'NEW') {
        if (Object.keys(rooms).length >= 4) return socket.emit('joinError', 'Máximo de salas alcanzado.');
        const newId = Utils.getRandomCapital(Object.keys(rooms));
        room = createRoom(newId);
    } else {
        room = rooms[targetRoomId];
        if (!room) {
             if (Object.keys(rooms).length < 4) room = createRoom(targetRoomId);
             else return socket.emit('joinError', 'La sala no existe.');
        }
    }

    socket.join('orden_' + room.id);
    socket.data.roomId = room.id;

    const existing = room.players.find(p => p.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
        if (!existing.connected) return handleRejoin(socket, existing.id, room.id);
        return socket.emit('joinError', 'Nombre en uso.');
    }

    const newPlayer = Utils.createPlayer(socket.id, cleanName);
    newPlayer.isReady = false;
    if (room.players.length === 0 || cleanName.toLowerCase() === 'admin') newPlayer.isAdmin = true;

    room.players.push(newPlayer);
    
    // Si entra en mitad de partida, lo añadimos al final de la lista visual (sin carta)
    if (room.gameInProgress) {
        room.state.orderedIds.push(newPlayer.id);
        // Sin valor asignado (null)
    }

    socket.emit('joinedSuccess', { playerId: newPlayer.id, name: newPlayer.name, room: 'orden', roomId: room.id });
    checkRoomInactivity(room.id);
    broadcast(socket.server, room.id);
};

const handleRejoin = (socket, savedId, savedRoomId) => {
    const room = rooms[savedRoomId];
    if (!room) return socket.emit('sessionExpired');

    const p = room.players.find(x => x.id === savedId);
    if (p) {
        if (p.timeout) clearTimeout(p.timeout);
        p.socketId = socket.id;
        p.connected = true;
        socket.join('orden_' + room.id);
        socket.data.roomId = room.id;
        socket.emit('joinedSuccess', { playerId: savedId, name: p.name, room: 'orden', roomId: room.id, isRejoin: true });
        
        // Reenviar carta si hay partida
        if (room.gameInProgress && room.state.assignedValues[p.id]) {
            socket.emit('ordenPrivate', room.state.assignedValues[p.id]);
        }
        
        broadcast(socket.server, room.id);
    } else {
        socket.emit('sessionExpired');
    }
};

const handleLeave = (playerId, roomId, io, forced = false) => {
    const room = rooms[roomId];
    if (!room) return;

    if (forced) {
        const p = room.players.find(x => x.id === playerId);
        if(p && p.socketId) io.to(p.socketId).emit('sessionExpired');
    }

    const wasAdmin = room.players.find(p => p.id === playerId)?.isAdmin;
    room.players = room.players.filter(p => p.id !== playerId);
    
    // Quitar de la lista ordenada
    room.state.orderedIds = room.state.orderedIds.filter(id => id !== playerId);
    delete room.state.assignedValues[playerId];
    delete room.state.suggestions[playerId];

    if (wasAdmin && room.players.length > 0) room.players[0].isAdmin = true;
    
    checkRoomInactivity(roomId);
    if (room.players.length === 0) destroyRoom(roomId);
    else broadcast(io, roomId);
};

module.exports = {
    init: (io) => {},
    handleSocket,
    handleJoin,
    handleRejoin,
    handleLeave,
    getRooms: () => Object.values(rooms).map(r => ({ id: r.id, players: r.players.length, state: r.gameInProgress ? 'JUGANDO' : 'LOBBY' }))
};