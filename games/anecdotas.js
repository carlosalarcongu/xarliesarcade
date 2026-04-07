const Utils = require('./utils');

const rooms = {};

function createRoom(roomId) {
    rooms[roomId] = {
        id: roomId,
        players: [],
        gameInProgress: false,
        anecdoteQueue: [],
        currentRoundIndex: 0,
        roundStage: 'LOBBY', 
        inactivityTimer: null
    };
    return rooms[roomId];
}

function destroyRoom(roomId) {
    if (rooms[roomId]) {
        delete rooms[roomId];
    }
}

function checkRoomInactivity(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    const activePlayers = room.players.filter(p => p.connected);
    
    if (activePlayers.length === 0) {
        if (room.inactivityTimer) clearTimeout(room.inactivityTimer);
        room.inactivityTimer = setTimeout(() => destroyRoom(roomId), 20 * 60 * 1000); 
    } else {
        if (room.inactivityTimer) {
            clearTimeout(room.inactivityTimer);
            room.inactivityTimer = null;
        }
    }
}

function broadcastRoom(io, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    const publicPlayers = room.players.map(p => ({
        id: p.id,
        name: p.name,
        isAdmin: p.isAdmin,
        score: p.score,
        connected: p.connected,
        hasAnecdote: !!p.anecdote && p.anecdote.trim().length > 0,
        voted: !!p.votedFor
    }));

    let roundInfo = null;
    if (room.gameInProgress && room.anecdoteQueue[room.currentRoundIndex]) {
        roundInfo = {
            text: room.anecdoteQueue[room.currentRoundIndex].text,
            current: room.currentRoundIndex + 1,
            total: room.anecdoteQueue.length
        };
    }

    io.to('anecdotas_' + roomId).emit('updateAnecdotasList', {
        players: publicPlayers,
        gameInProgress: room.gameInProgress,
        roundStage: room.roundStage,
        roundInfo
    });
}

const handleSocket = (io, socket) => {
    socket.on('anecdotas_action', (action) => {
        const roomId = socket.data.roomId;
        const room = rooms[roomId];
        if (!room) return socket.emit('error', 'Sala no encontrada.');

        const me = room.players.find(p => p.uuid === socket.data.uuid);
        if (!me) return;

        if (action.type === 'saveAnecdote') {
            if (room.gameInProgress) return;
            const text = action.text.trim();
            if (text.length > 0) {
                me.anecdote = text;
                broadcastRoom(io, roomId);
            }
        }

        if (action.type === 'kick') {
            if (!me.isAdmin) return;
            handleLeave(action.targetId, roomId, io, true);
        }

        if (action.type === 'start') {
            if (!me.isAdmin) return;
            
            const pending = room.players.filter(p => !p.anecdote || p.anecdote.trim() === "");
            if (pending.length > 0) {
                socket.emit('errorMsg', `Faltan anécdotas de: ${pending.map(p=>p.name).join(', ')}`);
                return;
            }
            
            room.anecdoteQueue = room.players.map(p => ({ authorId: p.id, text: p.anecdote }));
            room.anecdoteQueue = room.anecdoteQueue.sort(() => Math.random() - 0.5);
            
            room.currentRoundIndex = 0;
            room.gameInProgress = true;
            room.roundStage = 'VOTING';
            room.players.forEach(p => { p.score = 0; p.votedFor = null; });
            
            broadcastRoom(io, roomId);
        }

        if (action.type === 'vote') {
            if (!room.gameInProgress || room.roundStage !== 'VOTING') return;
            me.votedFor = action.targetId;
            broadcastRoom(io, roomId);
        }

        if (action.type === 'next') {
            if (!me.isAdmin || !room.gameInProgress) return;

            const currentAnecdote = room.anecdoteQueue[room.currentRoundIndex];
            const author = room.players.find(p => p.id === currentAnecdote.authorId);
            const correctVoters = room.players.filter(p => p.votedFor === author.id && p.id !== author.id);
            const totalVoters = room.players.filter(p => p.id !== author.id).length;

            correctVoters.forEach(p => p.score += 3);

            if (correctVoters.length === totalVoters) author.score += 1; 
            else if (correctVoters.length === 0) author.score -= 1; 
            else author.score += 2; 

            room.roundStage = 'REVEAL';
            const revealData = {
                authorName: author.name,
                correctVotersNames: correctVoters.map(p => p.name),
                scoreboard: room.players.map(p => ({ id: p.id, score: p.score }))
            };
            
            io.to('anecdotas_' + roomId).emit('roundReveal', revealData);
            broadcastRoom(io, roomId);

            setTimeout(() => {
                if (!rooms[roomId]) return; 
                
                room.currentRoundIndex++;
                room.players.forEach(p => p.votedFor = null);

                if (room.currentRoundIndex >= room.anecdoteQueue.length) {
                    room.gameInProgress = true; 
                    room.roundStage = 'PODIUM';
                    
                    const sorted = [...room.players].sort((a,b) => b.score - a.score).slice(0, 3);
                    io.to('anecdotas_' + roomId).emit('showPodium', sorted);
                    broadcastRoom(io, roomId);

                    setTimeout(() => {
                        if (!rooms[roomId]) return;
                        room.gameInProgress = false;
                        room.roundStage = 'LOBBY';
                        room.players.forEach(p => { 
                            p.score = 0; 
                            p.anecdote = ""; 
                            p.votedFor = null;
                        });
                        io.to('anecdotas_' + roomId).emit('gameEnded');
                        broadcastRoom(io, roomId);
                    }, 10000);

                } else {
                    room.roundStage = 'VOTING';
                    broadcastRoom(io, roomId);
                }
            }, 5000);
        }

        if (action.type === 'reset') {
            if (!me.isAdmin) return;
            room.gameInProgress = false;
            room.roundStage = 'LOBBY';
            room.currentRoundIndex = 0;
            room.players.forEach(p => { p.score = 0; p.votedFor = null; p.anecdote = ""; });
            io.to('anecdotas_' + roomId).emit('forceReset');
            broadcastRoom(io, roomId);
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

    socket.join('anecdotas_' + room.id);
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
        p.anecdote = "";
        p.votedFor = null;
        p.score = 0;
        
        const lowerName = cleanName.toLowerCase();
        if (room.players.length === 0 || ['administrador m', 'xarlie', 'musero'].includes(lowerName)) {
            p.isAdmin = true;
        }

        room.players.push(p);
    }
    
    socket.emit('joinedSuccess', { playerId: p.id, name: p.name, room: 'anecdotas', roomId: room.id });
    checkRoomInactivity(room.id);
    broadcastRoom(socket.server, room.id);
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
        
        socket.join('anecdotas_' + room.id);
        socket.data.roomId = room.id;
        socket.data.uuid = p.uuid;
        
        socket.emit('joinedSuccess', { playerId: p.id, name: p.name, room: 'anecdotas', roomId: room.id, isRejoin: true });
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
    
    if (wasAdmin && room.players.length > 0) room.players[0].isAdmin = true;
    
    checkRoomInactivity(roomId);
    
    if (room.players.length === 0) {
        room.gameInProgress = false;
        room.currentRoundIndex = 0;
    }
    
    broadcastRoom(io, roomId);
};

module.exports = {
    init: (io) => {},
    handleSocket,
    handleJoin,
    handleRejoin,
    handleLeave,
    getRooms: () => Object.values(rooms).map(r => ({ id: r.id, players: r.players.length, state: r.gameInProgress ? 'JUGANDO' : 'LOBBY' }))
};