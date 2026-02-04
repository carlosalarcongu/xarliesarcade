const fs = require('fs');
const path = require('path');
const questionsDB = require('./preguntas_elmas'); 
const Utils = require('./utils');

const FEEDBACK_FILE = path.join(__dirname, '../feedback_log.txt');

// Almacén de salas
const rooms = {};

// Configuración por defecto
const defaultSettings = { maxRounds: 5 }; 

function createRoom(roomId) {
    rooms[roomId] = {
        id: roomId,
        players: [],
        gameInProgress: false,
        settings: { ...defaultSettings },
        questionsQueue: [],
        currentRoundIndex: 0,
        roundStage: 'LOBBY', // LOBBY, VOTING, REVEAL, PODIUM
        sessionFeedback: {}, // Almacén de feedback por sala
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

    const playersPublic = room.players.map(p => {
        const votesReceivedCount = room.players.filter(voter => voter.votedFor === p.id).length;
        return {
            id: p.id,
            name: p.name,
            isAdmin: p.isAdmin,
            score: p.score,
            connected: p.connected,
            voted: !!p.votedFor, 
            votesInThisRound: (room.roundStage === 'REVEAL') ? votesReceivedCount : null 
        };
    });

    let roundInfo = null;
    if (room.gameInProgress && room.questionsQueue[room.currentRoundIndex]) {
        roundInfo = {
            text: room.questionsQueue[room.currentRoundIndex],
            current: room.currentRoundIndex + 1,
            total: room.settings.maxRounds
        };
    }

    io.to('elmas_' + roomId).emit('updateElMasList', {
        players: playersPublic,
        gameInProgress: room.gameInProgress,
        roundStage: room.roundStage,
        roundInfo,
        settings: room.settings
    });
}

function saveFeedback(room) {
    if (!room || Object.keys(room.sessionFeedback).length === 0) return;
    
    let content = `\n--- EL MAS FEEDBACK [${new Date().toISOString()}] SALA: ${room.id} ---\n`;
    for (const [q, data] of Object.entries(room.sessionFeedback)) {
        content += `"${q}": 👍${data.likes} | 👎${data.dislikes}\n`;
    }
    content += "--------------------------------------\n";

    fs.appendFile(FEEDBACK_FILE, content, (err) => {
        if (err) console.error("Error guardando feedback auto:", err);
    });
    
    room.sessionFeedback = {}; 
}

function performReset(io, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    room.gameInProgress = false;
    room.roundStage = 'LOBBY';
    saveFeedback(room); 
    room.players.forEach(p => { p.score = 0; p.votedFor = null; });
    
    io.to('elmas_' + roomId).emit('gameEnded');
    broadcastRoom(io, roomId);
}

const handleSocket = (io, socket) => {
    socket.on('elmas_action', (action) => {
        const roomId = socket.data.roomId;
        const room = rooms[roomId];
        if (!room) return socket.emit('error', 'Sala no encontrada.');

        const me = room.players.find(p => p.socketId === socket.id);
        if (!me) return;

        // FEEDBACK
        if (action.type === 'rateQuestion') {
            if (!room.gameInProgress || !room.questionsQueue[room.currentRoundIndex]) return;
            const q = room.questionsQueue[room.currentRoundIndex];
            
            if (!room.sessionFeedback[q]) room.sessionFeedback[q] = { likes: 0, dislikes: 0 };
            
            if (action.vote === 'like') room.sessionFeedback[q].likes++;
            else if (action.vote === 'dislike') room.sessionFeedback[q].dislikes++;
            return; 
        }

        // ACCIONES DE ADMIN
        if (me.isAdmin) {
            if (action.type === 'updateSettings') {
                if(action.rounds) room.settings.maxRounds = parseInt(action.rounds);
                broadcastRoom(io, roomId);
            }

            if (action.type === 'kick') {
                handleLeave(action.targetId, roomId, io, true);
            }

            if (action.type === 'start') {
                let qData = ["¿Quién sobreviviría a un apocalipsis?", "¿Quién liga más?"];
                
                if(questionsDB && Array.isArray(questionsDB)) qData = questionsDB;
                else if(questionsDB && questionsDB.questions) qData = questionsDB.questions;
                
                room.questionsQueue = [...qData].sort(() => Math.random() - 0.5).slice(0, room.settings.maxRounds);
                
                room.currentRoundIndex = 0;
                room.gameInProgress = true;
                room.roundStage = 'VOTING';
                room.players.forEach(p => { p.score = 0; p.votedFor = null; });
                
                room.sessionFeedback = {}; 
                broadcastRoom(io, roomId);
            }

            if (action.type === 'next' && room.gameInProgress) {
                // Calcular puntos
                room.players.forEach(voter => {
                    if (voter.votedFor) {
                        const votes = room.players.filter(p => p.votedFor === voter.votedFor).length;
                        if (votes === 1) voter.score = Math.max(0, voter.score - 1);
                        else voter.score += votes;
                    }
                });
                room.roundStage = 'REVEAL';
                broadcastRoom(io, roomId);
            }

            if (action.type === 'continue') {
                room.currentRoundIndex++;
                room.players.forEach(p => p.votedFor = null);

                if (room.currentRoundIndex >= room.questionsQueue.length) {
                    room.roundStage = 'PODIUM';
                    saveFeedback(room); 
                    
                    const sorted = [...room.players].sort((a,b) => b.score - a.score).slice(0, 3);
                    io.to('elmas_' + roomId).emit('showPodium', sorted);
                    broadcastRoom(io, roomId);

                    setTimeout(() => {
                        // Solo resetear si sigue siendo PODIUM (el admin podría haber reseteado manual)
                        if (room && room.roundStage === 'PODIUM') {
                            performReset(io, roomId);
                        }
                    }, 10000);

                } else {
                    room.roundStage = 'VOTING';
                    broadcastRoom(io, roomId);
                }
            }

            if (action.type === 'reset') {
                performReset(io, roomId);
            }
        }

        // ACCIONES JUGADOR
        if (action.type === 'vote' && room.gameInProgress && room.roundStage === 'VOTING') {
            me.votedFor = action.targetId;
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

    socket.join('elmas_' + room.id);
    socket.data.roomId = room.id;

    const existing = room.players.find(p => p.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
        if (!existing.connected) return handleRejoin(socket, existing.id, room.id);
        return socket.emit('joinError', 'Nombre en uso.');
    }

    const basePlayer = Utils.createPlayer(socket.id, cleanName);
    const newPlayer = { ...basePlayer, votedFor: null, score: 0 };
    
    if (room.players.length === 0 || cleanName.toLowerCase() === 'admin') newPlayer.isAdmin = true;
    
    room.players.push(newPlayer);
    
    socket.emit('joinedSuccess', { playerId: newPlayer.id, name: newPlayer.name, room: 'elmas', roomId: room.id });
    
    checkRoomInactivity(room.id);
    broadcastRoom(socket.server, room.id);
};

const handleRejoin = (socket, savedId, savedRoomId) => {
    const room = rooms[savedRoomId];
    if (!room) return socket.emit('sessionExpired');

    const p = room.players.find(x => x.id === savedId);
    if (p) {
        if(p.timeout) clearTimeout(p.timeout);
        p.socketId = socket.id;
        p.connected = true;
        
        socket.join('elmas_' + room.id);
        socket.data.roomId = room.id;
        
        socket.emit('joinedSuccess', { playerId: savedId, name: p.name, room: 'elmas', roomId: room.id, isRejoin: true });
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
    room.players = room.players.filter(x => x.id !== playerId);
    
    // Limpiar votos hacia él
    room.players.forEach(voter => { if(voter.votedFor === playerId) voter.votedFor = null; });

    if (wasAdmin && room.players.length > 0) room.players[0].isAdmin = true;
    
    checkRoomInactivity(roomId);

    if (room.players.length === 0) {
        performReset(io, roomId);
    } else {
        broadcastRoom(io, roomId);
    }
};

module.exports = {
    init: (io) => {},
    handleSocket,
    handleJoin,
    handleRejoin,
    handleLeave,
    getRooms: () => Object.values(rooms).map(r => ({ id: r.id, players: r.players.length, state: r.gameInProgress ? 'JUGANDO' : 'LOBBY' }))
};