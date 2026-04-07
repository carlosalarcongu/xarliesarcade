const Utils = require('./utils');

const rooms = {};

const defaultSettings = { 
    category: 'NUMEROS', 
    difficulty: 'EASY',
    chuletas: false
};

const SEQUENCES = {
    'NUMEROS': {
        label: "Números",
        generate: (count, diff) => {
            let pool = [];
            if (diff === 'EASY') pool = Array.from({length: count}, (_, i) => i + 1);
            else if (diff === 'MEDIUM') pool = Array.from({length: count}, (_, i) => (i + 1) * 2);
            else {
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
            phase: 'LOBBY', 
            orderedIds: [], 
            assignedValues: {}, 
            correctOrder: [], 
            suggestions: {}, 
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

    let wordPool = [];
    if (room.settings.chuletas) {
        if (room.settings.category === 'NUMEROS') {
            if (room.state.assignedValues && Object.keys(room.state.assignedValues).length > 0) {
                wordPool = Object.values(room.state.assignedValues).map(v => v.val).sort((a,b) => a-b);
            }
        } else {
            const seq = SEQUENCES[room.settings.category];
            if (seq) {
                wordPool = [...seq.data].sort();
            }
        }
    }

    const orderedList = room.state.orderedIds.map(id => {
        const p = room.players.find(pl => pl.id === id);
        if (!p) return null;
        return {
            id: p.id,
            name: p.name,
            isAdmin: p.isAdmin,
            suggestions: room.state.suggestions[p.id] || { up: 0, down: 0 },
            isReady: p.isReady,
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
        wordPool: wordPool,
        categories: Object.keys(SEQUENCES).map(k => ({ key: k, label: SEQUENCES[k].label }))
    });
}

function calculateScore(currentOrder, assignedValues) {
    const currentValues = currentOrder.map(id => assignedValues[id]);
    
    if (currentValues.length === 0) return 0;

    const correctOrder = [...currentValues].sort((a,b) => {
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        return String(a).localeCompare(String(b)); 
    });

    const piles = [];
    for (const val of currentValues) {
        const rank = correctOrder.indexOf(val);
        
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

function getGameValues(category, difficulty, count) {
    const seq = SEQUENCES[category];
    let pool = [];

    if (category === 'NUMEROS') {
        pool = seq.generate(count, difficulty);
    } else {
        const source = seq.data;
        
        if (difficulty === 'EASY') {
            pool = source.slice(0, count);
        } else if (difficulty === 'MEDIUM') {
            const step = Math.floor(source.length / count);
            for(let i=0; i<count; i++) pool.push(source[Math.min(source.length-1, i*step)]);
        } else {
            let indices = [];
            while(indices.length < count) {
                const r = Math.floor(Math.random() * source.length);
                if(!indices.includes(r)) indices.push(r);
            }
            indices.sort((a,b) => a-b);
            pool = indices.map(i => source[i]);
        }
    }
    
    return pool.map((val, index) => ({ val: val, rank: (typeof val === 'number') ? val : index }));
}

const handleSocket = (io, socket) => {
    socket.on('orden_action', (action) => {
        const roomId = socket.data.roomId;
        const room = rooms[roomId];
        if (!room) return;

        const me = room.players.find(p => p.uuid === socket.data.uuid);
        if (!me) return;

        if (me.isAdmin && action.type === 'updateSettings') {
            if (action.category) room.settings.category = action.category;
            if (action.difficulty) room.settings.difficulty = action.difficulty;
            if (typeof action.chuletas !== 'undefined') room.settings.chuletas = !!action.chuletas;
            broadcast(io, roomId);
        }

        if (me.isAdmin && action.type === 'start') {
            if (room.players.length < 2) return; 

            const count = room.players.length;
            const values = getGameValues(room.settings.category, room.settings.difficulty, count);
            
            const shuffledValues = [...values].sort(() => Math.random() - 0.5);
            
            room.state.assignedValues = {};
            room.state.orderedIds = [];
            room.state.suggestions = {};
            
            room.players.forEach((p, i) => {
                room.state.assignedValues[p.id] = shuffledValues[i];
                room.state.orderedIds.push(p.id);
                room.state.suggestions[p.id] = { up: 0, down: 0 };
                p.isReady = false;
            });

            room.state.orderedIds.sort(() => Math.random() - 0.5);

            room.state.phase = 'PLAYING';
            room.state.readyCount = 0;
            room.gameInProgress = true;

            room.players.forEach(p => {
                if(p.socketId) io.to(p.socketId).emit('ordenPrivate', room.state.assignedValues[p.id]);
            });

            broadcast(io, roomId);
        }

        if (action.type === 'suggest' && room.state.phase === 'PLAYING') {
            const targetId = action.targetId;
            const dir = action.dir; 
            
            if (room.state.suggestions[targetId]) {
                room.state.suggestions[targetId][dir]++;
                broadcast(io, roomId);
            }
        }

        if (me.isAdmin && action.type === 'move' && room.state.phase === 'PLAYING') {
            const targetId = action.targetId;
            const dir = action.dir;
            const idx = room.state.orderedIds.indexOf(targetId);

            if (idx === -1) return;
            
            if (dir === 'up' && idx > 0) {
                [room.state.orderedIds[idx], room.state.orderedIds[idx-1]] = [room.state.orderedIds[idx-1], room.state.orderedIds[idx]];
            } else if (dir === 'down' && idx < room.state.orderedIds.length - 1) {
                [room.state.orderedIds[idx], room.state.orderedIds[idx+1]] = [room.state.orderedIds[idx+1], room.state.orderedIds[idx]];
            }

            Object.keys(room.state.suggestions).forEach(key => {
                room.state.suggestions[key] = { up: 0, down: 0 };
            });

            broadcast(io, roomId);
        }

        if (action.type === 'toggleReady' && room.state.phase === 'PLAYING') {
            me.isReady = !me.isReady;
            broadcast(io, roomId);
        }

        if (me.isAdmin && action.type === 'resolve' && room.state.phase === 'PLAYING') {
            const currentValuesObj = room.state.orderedIds.map(id => room.state.assignedValues[id]);
            
            let orderedRanks = currentValuesObj.map(v => v.rank);
            
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

            const fullList = room.players.map(p => {
                const card = room.state.assignedValues[p.id];
                if (!card) return null;
                return {
                    name: p.name, 
                    val: card.val,
                    rank: card.rank
                };
            }).filter(i => i !== null);

            const correctList = fullList.sort((a, b) => a.rank - b.rank);

            room.state.result = { 
                score: Math.round(score), 
                success,
                correctList: correctList
            };
            
            room.state.phase = 'RESULT';
            broadcast(io, roomId);
        }

        if (me.isAdmin && action.type === 'kick') {
            handleLeave(action.targetId, roomId, io, true);
        }

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
            broadcast(io, rId);
        }
    });
};

const handleJoin = (socket, nameRaw, targetRoomId, data = {}) => {
    const cleanName = nameRaw.replace(/👑|👤/g, '').trim();
    const uuid = data.uuid || socket.id;
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
    socket.data.uuid = uuid;

    let p = room.players.find(player => player.uuid === uuid);

    if (p) {
        if (p.timeout) clearTimeout(p.timeout);
        p.socketId = socket.id;
        p.connected = true;
        p.name = cleanName;
    } else {
        const existingName = room.players.find(player => player.name.toLowerCase() === cleanName.toLowerCase());
        if (existingName && existingName.connected) return socket.emit('joinError', 'Nombre en uso.');

        p = Utils.createPlayer(socket.id, cleanName);
        p.uuid = uuid;
        p.isReady = false;
        
        const lowerName = cleanName.toLowerCase();
        if (room.players.length === 0 || ['administrador m', 'xarlie', 'musero'].includes(lowerName)) {
            p.isAdmin = true;
        }

        room.players.push(p);
        
        if (room.gameInProgress) {
            room.state.orderedIds.push(p.id);
        }
    }

    socket.emit('joinedSuccess', { playerId: p.id, name: p.name, room: 'orden', roomId: room.id });
    checkRoomInactivity(room.id);
    broadcast(socket.server, room.id);
};

const handleRejoin = (socket, savedId, savedRoomId, data = {}) => {
    const room = rooms[savedRoomId];
    if (!room) return socket.emit('sessionExpired');

    const uuid = data.uuid;
    const p = room.players.find(x => x.uuid === uuid || x.id === savedId);
    
    if (p) {
        if (p.timeout) clearTimeout(p.timeout);
        p.socketId = socket.id;
        p.connected = true;
        p.uuid = uuid || p.uuid;
        
        socket.join('orden_' + room.id);
        socket.data.roomId = room.id;
        socket.data.uuid = p.uuid;
        
        socket.emit('joinedSuccess', { playerId: p.id, name: p.name, room: 'orden', roomId: room.id, isRejoin: true });
        
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