const database = require('./database');
const Utils = require('./utils');

// ALMACÉN DE SALAS
// Estructura: { "MADRID": { id: "MADRID", players: [], settings: {}, turnData: {}, ... } }
const rooms = {};

// CONFIGURACIÓN POR DEFECTO
const defaultSettings = { impostors: 1, category: 'MIX', hints: false };

// --- GESTIÓN DE SALAS Y TIMERS ---
function createRoom(roomId) {
    rooms[roomId] = {
        id: roomId,
        players: [],
        settings: { ...defaultSettings },
        gameInProgress: false,
        turnData: {},
        inactivityTimer: null
    };
    return rooms[roomId];
}

function destroyRoom(roomId) {
    if (rooms[roomId]) {
        console.log(`[IMPOSTOR] Sala ${roomId} eliminada por inactividad.`);
        delete rooms[roomId];
    }
}

function checkRoomInactivity(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    // Si no hay jugadores conectados, iniciar contador de destrucción (20 min)
    const activePlayers = room.players.filter(p => p.connected);
    
    if (activePlayers.length === 0) {
        if (room.inactivityTimer) clearTimeout(room.inactivityTimer);
        room.inactivityTimer = setTimeout(() => {
            destroyRoom(roomId);
        }, 20 * 60 * 1000); 
    } else {
        if (room.inactivityTimer) {
            clearTimeout(room.inactivityTimer);
            room.inactivityTimer = null;
        }
    }
}

// --- HELPERS ---
function broadcastRoom(io, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    const publicPlayers = room.players.map(p => ({
        id: p.id,
        name: p.name,
        isAdmin: p.isAdmin,
        isDead: p.isDead,
        isObserver: !!p.isObserver,
        connected: p.connected,
        hasVoted: !!p.votedFor,
        votesReceived: room.players.filter(v => v.votedFor === p.id).length,
        revealedRole: (p.isDead && room.turnData[p.id]) ? room.turnData[p.id].role : null
    }));

    io.to('impostor_' + roomId).emit('updateState', {
        players: publicPlayers,
        gameInProgress: room.gameInProgress,
        settings: room.settings,
        turnData: room.turnData, 
        roomId: roomId
    });
}

function getPublicCategories() {
    return Object.keys(database).map(k => ({
        id: k,
        label: database[k].label || k
    }));
}

// --- LÓGICA DE SOCKET ---

const handleSocket = (io, socket) => {
    socket.on('impostor_action', (action) => {
        // Recuperamos la sala vinculada al socket
        const roomId = socket.data.roomId; 
        const room = rooms[roomId];
        
        if (!room) return socket.emit('error', 'Sala no encontrada o expirada.');

        const me = room.players.find(p => p.socketId === socket.id);
        if (!me) return; 

        // --- ACCIONES ---
        if (action.type === 'updateSettings' && me.isAdmin) {
            if (action.value.category) room.settings.category = action.value.category;
            if (typeof action.value.hints !== 'undefined') room.settings.hints = action.value.hints;
            if (action.value.impostors) room.settings.impostors = action.value.impostors;
            broadcastRoom(io, roomId);
        }

        if (action.type === 'startGame' && me.isAdmin) {
            if (room.players.length < 3) return; 

            io.to('impostor_' + roomId).emit('preGameCountdown', 3);

            let wordPool = [];
            if (room.settings.category === 'MIX') {
                Object.keys(database).forEach(k => { if(k!=='MIX') wordPool = wordPool.concat(database[k].words); });
            } else if (database[room.settings.category]) {
                wordPool = database[room.settings.category].words || [];
            }
            if(!wordPool.length) wordPool = [{word: "Error", hint: "..."}];
            
            const sel = wordPool[Math.floor(Math.random() * wordPool.length)];

            // Asignar roles
            const indices = room.players.map((_,i)=>i).sort(()=>Math.random()-0.5);
            const numImpostors = Math.min(room.settings.impostors, Math.floor(room.players.length / 2)); 
            const impIdx = indices.slice(0, numImpostors);
            
            room.players.forEach(p => { 
                p.isDead = false; p.votedFor = null; p.isObserver = false; 
            });
            
            room.gameInProgress = true;
            room.turnData = {};
            room.turnData['SUMMARY'] = {
                word: sel.word,
                hint: sel.hint,
                originalImpostorIds: [],
                hintsWasEnabled: room.settings.hints,
                impostorsData: []
            };

            room.players.forEach((p, i) => {
                const isImp = impIdx.includes(i);
                if(isImp) room.turnData['SUMMARY'].originalImpostorIds.push(p.id);

                room.turnData[p.id] = {
                    role: isImp ? 'IMPOSTOR' : 'CIVIL',
                    word: isImp ? 'Impostor' : sel.word,
                    hint: (room.settings.hints && isImp) ? sel.hint : null,
                    starter: me.name, 
                    categoriesPlayed: database[room.settings.category] ? database[room.settings.category].label : "Mezcla"
                };
            });

            setTimeout(() => {
                room.players.forEach(p => { 
                    if (p.connected && p.socketId && room.turnData[p.id]) {
                        io.to(p.socketId).emit('privateRole', room.turnData[p.id]); 
                    }
                });
                broadcastRoom(io, roomId);
            }, 3500);
        }

        if (action.type === 'vote' && room.gameInProgress && !me.isDead && !me.isObserver) {
            me.votedFor = (me.votedFor === action.targetId) ? null : action.targetId;
            broadcastRoom(io, roomId);
        }

        if (me.isAdmin) {
             if (action.type === 'kick') {
                // True = forzado (envía evento sessionExpired)
                handleLeave(action.targetId, roomId, io, true); 
             }
             if (action.type === 'kill') {
                const p = room.players.find(pl => pl.id === action.targetId);
                if (p) { 
                    p.isDead = !p.isDead; 
                    if (!p.isDead) p.votedFor = null;
                    else io.to(p.socketId).emit('youDied'); 
                    broadcastRoom(io, roomId); 
                }
             }
             if (action.type === 'clearVotes') {
                 room.players.forEach(p => p.votedFor = null);
                 broadcastRoom(io, roomId);
             }
             if (action.type === 'revealResults') {
                if (room.turnData['SUMMARY']) {
                    room.turnData['SUMMARY'].impostorsData = room.players
                        .filter(p => room.turnData['SUMMARY'].originalImpostorIds.includes(p.id))
                        .map(p => ({ name: p.name, isDead: p.isDead }));
                    io.to('impostor_' + roomId).emit('gameSummary', room.turnData['SUMMARY']);
                }
             }
             if (action.type === 'reset') {
                room.gameInProgress = false;
                room.players.forEach(p => { 
                    p.isDead=false; p.votedFor=null; p.isObserver=false; 
                });
                io.to('impostor_' + roomId).emit('resetGame');
                broadcastRoom(io, roomId);
            }
             if (action.type === 'changeImpostors') {
                const newVal = Math.max(0, Math.min(room.players.length, room.settings.impostors + action.value));
                room.settings.impostors = newVal;
                broadcastRoom(io, roomId);
             }
        }
    });

    socket.on('disconnect', () => {
        const rId = socket.data.roomId;
        if (rId && rooms[rId]) {
            const changed = Utils.handleDisconnect(socket.id, rooms[rId].players, () => {
                checkRoomInactivity(rId);
            });
            if (changed) broadcastRoom(io, rId);
        }
    });
};

// --- GESTIÓN DE JUGADORES ---

const handleJoin = (socket, nameRaw, targetRoomId) => {
    const cleanName = nameRaw.replace(/👑|👤/g, '').trim();
    let room;

    // 1. Determinar Sala
    if (!targetRoomId || targetRoomId === 'NEW') {
        if (Object.keys(rooms).length >= 4) {
            return socket.emit('joinError', 'Máximo de salas alcanzado (4). Únete a una existente.');
        }
        const newId = Utils.getRandomCapital(Object.keys(rooms));
        room = createRoom(newId);
    } else {
        room = rooms[targetRoomId];
        if (!room) {
             // Si piden sala y no existe, y hay hueco, crearla
             if (Object.keys(rooms).length < 4) room = createRoom(targetRoomId);
             else return socket.emit('joinError', 'La sala no existe.');
        }
    }

    // 2. Unir Socket
    socket.join('impostor_' + room.id);
    socket.data.roomId = room.id; 

    // 3. Crear Jugador
    const existing = room.players.find(p => p.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
        if (!existing.connected) return handleRejoin(socket, existing.id, room.id);
        return socket.emit('joinError', 'Nombre en uso en esta sala.');
    }

    const p = Utils.createPlayer(socket.id, cleanName);
    if (room.players.length === 0 || cleanName.toLowerCase() === 'admin') p.isAdmin = true;
    if (room.gameInProgress) p.isObserver = true;

    room.players.push(p);

    // 4. Emitir
    socket.emit('impostorCategories', getPublicCategories());
    socket.emit('joinedSuccess', { 
        playerId: p.id, 
        name: p.name, 
        room: 'impostor', 
        roomId: room.id 
    });

    checkRoomInactivity(room.id); 
    broadcastRoom(socket.server, room.id);
};

const handleRejoin = (socket, savedId, savedRoomId) => {
    const room = rooms[savedRoomId];
    if (!room) return socket.emit('sessionExpired');

    const p = room.players.find(x => x.id === savedId);
    if(p) {
        if (p.timeout) clearTimeout(p.timeout);
        p.socketId = socket.id;
        p.connected = true;
        
        socket.join('impostor_' + room.id);
        socket.data.roomId = room.id;

        socket.emit('impostorCategories', getPublicCategories());
        socket.emit('joinedSuccess', { playerId: p.id, name: p.name, room: 'impostor', roomId: room.id, isRejoin: true });
        
        if(room.gameInProgress && room.turnData[p.id]) {
            socket.emit('privateRole', room.turnData[p.id]);
        }
        
        checkRoomInactivity(room.id);
        broadcastRoom(socket.server, room.id);
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
    
    room.players.forEach(p => { if(p.votedFor === playerId) p.votedFor = null; });

    if (wasAdmin && room.players.length > 0) {
        room.players[0].isAdmin = true;
    }
    
    checkRoomInactivity(roomId);

    if (room.players.length === 0) {
        room.gameInProgress = false;
        room.turnData = {};
        room.settings = { ...defaultSettings };
    }

    broadcastRoom(io, roomId);
};

module.exports = {
    init: (io) => {}, 
    handleSocket,
    handleJoin,
    handleRejoin,
    handleLeave,
    // ESTA ES LA FUNCIÓN QUE FALTABA Y CAUSABA EL ERROR:
    getRooms: () => Object.values(rooms).map(r => ({ 
        id: r.id, 
        players: r.players.length, 
        state: r.gameInProgress ? 'JUGANDO' : 'LOBBY' 
    }))
};