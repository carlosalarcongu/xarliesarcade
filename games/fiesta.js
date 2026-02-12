const Utils = require('./utils');
const DATA = require('./fiesta_data');

const rooms = {};

// --- HELPER: FORZAR SALA ---
// Si la sala no existe, la crea. Si el jugador no tiene ID de sala, se lo asigna.
function ensureRoomAndPlayer(socket, targetRoomId = null) {
    // 1. Determinar ID de sala (Recuperar del socket, del argumento, o Default)
    let rId = targetRoomId || socket.data.roomId || 'FIESTA-MAIN';
    
    // 2. Guardar en el socket por si se había perdido
    socket.data.roomId = rId;

    // 3. Crear sala si no existe en memoria
    if (!rooms[rId]) {
        console.log(`[FIESTA] 🛠️ Creando sala ${rId} automáticamente.`);
        rooms[rId] = {
            id: rId,
            players: [],
            currentGame: 'MENU',
            gameState: {},
            inactivityTimer: null
        };
    }

    // 4. Asegurar que el socket está unido al canal de Socket.IO
    socket.join('fiesta_' + rId);

    // 5. Asegurar que el jugador está en la lista de la sala
    const room = rooms[rId];
    const playerExists = room.players.find(p => p.socketId === socket.id);
    if (!playerExists) {
        // Nombre genérico si no lo sabemos
        const pName = "Fiestero"; 
        const newP = Utils.createPlayer(socket.id, pName);
        room.players.push(newP);
    }

    return room;
}

function broadcast(io, roomId) {
    const room = rooms[roomId];
    if (!room) return;
    
    // console.log(`[FIESTA] 📡 Enviando update a ${roomId}. Juego: ${room.currentGame}`);
    
    io.to('fiesta_' + roomId).emit('fiestaUpdate', {
        players: room.players,
        currentGame: room.currentGame,
        gameState: room.gameState
    });
}

const handleSocket = (io, socket) => {
    socket.on('fiesta_action', (action) => {
        // console.log(`[FIESTA] Acción recibida: ${action.type}`);

        // 1. RECUPERACIÓN MÁGICA DE SALA
        // Esto garantiza que 'room' NUNCA sea null
        const room = ensureRoomAndPlayer(socket); 
        const roomId = room.id;

        // --- MANEJO DE ACCIONES ---

        if (action.type === 'requestState') {
            broadcast(io, roomId);
            return;
        }

        if (action.type === 'changeGame') {
            console.log(`[FIESTA] Cambiando juego a ${action.game}`);
            room.currentGame = action.game; 
            room.gameState = {}; 
            broadcast(io, roomId);
        }

        // --- ORACULO ---
        if (action.type === 'oraculo_spin') {
            const template = DATA.ORACULO[Math.floor(Math.random() * DATA.ORACULO.length)];
            const target = room.players[Math.floor(Math.random() * room.players.length)];
            const player = room.players.find(p => p.socketId === socket.id) || room.players[0];
            
            let text = template.replace('{target}', `<strong>${target.name}</strong>`);
            text = text.replace('{player}', `<strong>${player.name}</strong>`);

            room.gameState = { text: text, type: 'RESULT' };
            broadcast(io, roomId);
        }

        // --- RONDA ---
        if (action.type === 'ronda_spin') {
            const cat = DATA.RONDA_5S[Math.floor(Math.random() * DATA.RONDA_5S.length)];
            const victim = room.players[Math.floor(Math.random() * room.players.length)];
            
            room.gameState = { category: cat, victim: victim.name, timer: 5, active: true };
            broadcast(io, roomId);

            let count = 5;
            if (room.turnInterval) clearInterval(room.turnInterval);
            room.turnInterval = setInterval(() => {
                count--;
                room.gameState.timer = count;
                io.to('fiesta_' + roomId).emit('fiestaTimer', count);
                if (count <= 0) {
                    clearInterval(room.turnInterval);
                    room.gameState.active = false;
                    io.to('fiesta_' + roomId).emit('playSound', 'timeout');
                    broadcast(io, roomId);
                }
            }, 1000);
        }

        // --- PUERTA ---
        if (action.type === 'puerta_open') {
            const q = DATA.LA_PUERTA[Math.floor(Math.random() * DATA.LA_PUERTA.length)];
            const v = room.players[Math.floor(Math.random() * room.players.length)];
            room.gameState = { question: q, victim: v.name, votes: { fake:0, honest:0, brutal:0 } };
            broadcast(io, roomId);
        }
        if (action.type === 'puerta_vote') {
            if (room.gameState.votes) {
                room.gameState.votes[action.vote]++;
                broadcast(io, roomId);
            }
        }

        // --- ACUSADO ---
        if (action.type === 'acusado_spin') {
            const t = DATA.ACUSADO.actions[Math.floor(Math.random() * DATA.ACUSADO.actions.length)];
            const v = room.players[Math.floor(Math.random() * room.players.length)];
            room.gameState = { task: t, victim: v.name };
            broadcast(io, roomId);
        }

        // --- CONEXION ---
        if (action.type === 'conexion_start') {
            if (room.players.length < 2) return;
            const p1 = room.players[Math.floor(Math.random() * room.players.length)];
            let p2 = room.players[Math.floor(Math.random() * room.players.length)];
            while (p1.id === p2.id) p2 = room.players[Math.floor(Math.random() * room.players.length)];

            room.gameState = { p1: p1.name, p2: p2.name, timer: 7, status: 'GAZING' };
            broadcast(io, roomId);

            let count = 7;
            if (room.turnInterval) clearInterval(room.turnInterval);
            room.turnInterval = setInterval(() => {
                count--;
                io.to('fiesta_' + roomId).emit('fiestaTimer', count);
                if (count <= 0) {
                    clearInterval(room.turnInterval);
                    room.gameState.status = 'VOTING';
                    room.gameState.votes = { tension: 0, nada: 0 };
                    broadcast(io, roomId);
                }
            }, 1000);
        }
        if (action.type === 'conexion_vote') {
            if (room.gameState.status === 'VOTING') {
                room.gameState.votes[action.vote]++;
                broadcast(io, roomId);
            }
        }

        // --- CADENA ---
        if (action.type === 'cadena_start') {
            const words = ["Amor", "Coche", "Playa", "Dinero", "Fiesta", "Cama", "Fuego", "Cielo", "Muerte", "Pizza"];
            const startWord = words[Math.floor(Math.random() * words.length)];
            room.gameState = { word: startWord, status: 'PLAYING' };
            broadcast(io, roomId);
        }
        if (action.type === 'cadena_fail') {
            room.gameState.status = 'FAILED';
            io.to('fiesta_' + roomId).emit('playSound', 'wrong');
            broadcast(io, roomId);
        }
    });

    socket.on('disconnect', () => {
        // Lógica de desconexión estándar
        const rId = socket.data.roomId;
        if (rId && rooms[rId]) {
            Utils.handleDisconnect(socket.id, rooms[rId].players, () => {
                if(rooms[rId].players.length === 0) delete rooms[rId];
            });
            broadcast(io, rId);
        }
    });
};

const handleJoin = (socket, name, targetRoomId) => {
    // Si no viene ID, usamos FIESTA-MAIN
    const roomId = targetRoomId === 'NEW' ? 'FIESTA-MAIN' : targetRoomId;
    
    // Usamos el helper para crear o recuperar
    const room = ensureRoomAndPlayer(socket, roomId);

    // Actualizar nombre real si viene
    const p = room.players.find(pl => pl.socketId === socket.id);
    if(p && name) p.name = name;

    // Confirmar al cliente
    socket.emit('joinedSuccess', { playerId: p.id, name: p.name, room: 'fiesta', roomId: roomId });
    
    // ENVIAR ESTADO AL INSTANTE
    io.to(socket.id).emit('fiestaUpdate', {
        players: room.players,
        currentGame: room.currentGame,
        gameState: room.gameState
    });

    // Avisar al resto
    broadcast(io, roomId);
};

const handleRejoin = (socket, savedId, savedRoomId) => { handleJoin(socket, "Fiestero", savedRoomId); };
const handleLeave = () => {};

module.exports = { init: (io)=>{}, handleSocket, handleJoin, handleRejoin, handleLeave };