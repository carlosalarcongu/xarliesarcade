const Utils = require('./utils');
const questionsDB = require('./tabu_words'); 

const rooms = {};

const defaultSettings = { 
    totalRounds: 3, 
    turnDuration: 60, 
    skipsPerTurn: 3, 
    pauseBetweenRounds: false 
};

function createRoom(roomId) {
    rooms[roomId] = {
        id: roomId,
        players: [],
        gameInProgress: false,
        isPaused: false,
        settings: { ...defaultSettings },
        turnData: {
            currentTeam: 'BLUE', 
            roundNumber: 1,
            describerId: null, 
            currentCard: null, 
            timer: 60, 
            skipsRemaining: 3,
            teamIndex: { BLUE: 0, RED: 0 }, 
            score: { BLUE: 0, RED: 0 },
            status: 'LOBBY'
        },
        turnInterval: null,
        inactivityTimer: null
    };
    return rooms[roomId];
}

function destroyRoom(roomId) {
    if (rooms[roomId]) {
        if (rooms[roomId].turnInterval) clearInterval(rooms[roomId].turnInterval);
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
        team: p.team,
        individualScore: p.individualScore
    }));

    io.to('tabu_' + roomId).emit('updateTabuState', {
        players: publicPlayers,
        gameInProgress: room.gameInProgress,
        isPaused: room.isPaused,
        turnData: room.turnData,
        settings: room.settings
    });
}

function performReset(io, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    room.gameInProgress = false;
    room.isPaused = false;
    if (room.turnInterval) clearInterval(room.turnInterval);
    
    room.turnData = { 
        currentTeam: 'BLUE', 
        roundNumber: 1, 
        score: { BLUE: 0, RED: 0 }, 
        teamIndex: { BLUE: 0, RED: 0 },
        status: 'LOBBY',
        timer: room.settings.turnDuration
    };
    broadcastRoom(io, roomId);
}

function nextTurn(io, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    if (room.turnInterval) clearInterval(room.turnInterval);

    if (room.turnData.currentTeam === 'BLUE') {
        room.turnData.currentTeam = 'RED';
    } else {
        room.turnData.currentTeam = 'BLUE';
        room.turnData.roundNumber++;
        
        if (room.turnData.roundNumber > room.settings.totalRounds) {
            endGame(io, roomId);
            return;
        }
        
        if (room.settings.pauseBetweenRounds) {
            room.isPaused = true;
            room.turnData.status = 'PAUSED';
            broadcastRoom(io, roomId);
            return;
        }
    }
    startPreTurn(io, roomId);
}

function startPreTurn(io, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    const teamMembers = room.players.filter(p => p.team === room.turnData.currentTeam);
    if (teamMembers.length === 0) return nextTurn(io, roomId); 

    let idx = room.turnData.teamIndex[room.turnData.currentTeam] % teamMembers.length;
    room.turnData.describerId = teamMembers[idx].id;
    room.turnData.teamIndex[room.turnData.currentTeam]++;

    room.turnData.status = 'PRE_TURN';
    room.turnData.timer = 5;
    room.turnData.currentCard = null;
    room.turnData.skipsRemaining = room.settings.skipsPerTurn;
    
    broadcastRoom(io, roomId);

    let prepCounter = 5;
    const prepInterval = setInterval(() => {
        if (!room.gameInProgress || room.isPaused || room.turnData.status === 'ENDED') { 
            clearInterval(prepInterval); return; 
        }

        prepCounter--;
        room.turnData.timer = prepCounter;
        io.to('tabu_' + roomId).emit('timerTick', prepCounter); 

        if (prepCounter <= 0) {
            clearInterval(prepInterval);
            startPlayingPhase(io, roomId);
        }
    }, 1000);
}

function startPlayingPhase(io, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    room.turnData.status = 'PLAYING';
    room.turnData.timer = room.settings.turnDuration;
    pickNewCard(room);
    broadcastRoom(io, roomId);

    if (room.turnInterval) clearInterval(room.turnInterval);

    room.turnInterval = setInterval(() => {
        if (!room.gameInProgress || room.isPaused || room.turnData.status === 'ENDED') { 
            clearInterval(room.turnInterval); return; 
        }

        room.turnData.timer--;
        
        if (room.turnData.timer <= 0) {
            clearInterval(room.turnInterval);
            io.to('tabu_' + roomId).emit('playSound', 'timeout');
            nextTurn(io, roomId);
        } else {
            io.to('tabu_' + roomId).emit('timerTick', room.turnData.timer);
        }
    }, 1000);
}

function pickNewCard(room) {
    const fallbackDB = [
        { word: "MANZANA", forbidden: ["FRUTA", "ROJA", "COMER", "BLANCANIEVES"] },
        { word: "COCHE", forbidden: ["RUEDAS", "VOLANTE", "MOTOR", "CONDUCIR"] },
        { word: "FUTBOL", forbidden: ["PELOTA", "GOL", "PORTERIA", "DEPORTE"] }
    ];
    const db = (questionsDB && questionsDB.length > 0) ? questionsDB : fallbackDB;
    const random = db[Math.floor(Math.random() * db.length)];
    room.turnData.currentCard = random;
}

function endGame(io, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    if (room.turnInterval) clearInterval(room.turnInterval);
    
    room.turnData.status = 'ENDED'; 
    
    let winner = 'DRAW';
    if (room.turnData.score.BLUE > room.turnData.score.RED) winner = 'BLUE';
    if (room.turnData.score.RED > room.turnData.score.BLUE) winner = 'RED';

    const winningTeamPlayers = winner === 'DRAW' ? room.players : room.players.filter(p => p.team === winner);
    const mvpList = winningTeamPlayers.sort((a,b) => b.individualScore - a.individualScore).slice(0, 5);

    io.to('tabu_' + roomId).emit('gameOver', { 
        winner, 
        finalScores: room.turnData.score,
        mvp: mvpList
    });
    
    broadcastRoom(io, roomId); 

    setTimeout(() => {
        if (room && room.turnData.status === 'ENDED') {
            performReset(io, roomId);
        }
    }, 10000);
}

const handleSocket = (io, socket) => {
    socket.on('tabu_action', (action) => {
        const roomId = socket.data.roomId;
        const room = rooms[roomId];
        if (!room) return socket.emit('tabu_error', 'Sala no encontrada.');

        const me = room.players.find(p => p.socketId === socket.id);
        if (!me) return;

        if (action.type === 'joinTeam') {
            if (room.gameInProgress && room.turnData.status !== 'ENDED') return;
            me.team = action.team; 
            broadcastRoom(io, roomId);
        }

        if (me.isAdmin) {
            if (action.type === 'updateSettings') {
                if (action.rounds) room.settings.totalRounds = parseInt(action.rounds);
                if (action.duration) room.settings.turnDuration = parseInt(action.duration);
                if (action.skips) room.settings.skipsPerTurn = parseInt(action.skips);
                if (typeof action.pauseOn !== 'undefined') room.settings.pauseBetweenRounds = !!action.pauseOn;
                broadcastRoom(io, roomId);
            }

            if (action.type === 'randomizeTeams') {
                if (room.gameInProgress) return;
                const shuffled = room.players.sort(() => Math.random() - 0.5);
                shuffled.forEach((p, index) => {
                    p.team = (index % 2 === 0) ? 'BLUE' : 'RED';
                });
                broadcastRoom(io, roomId);
            }

            if (action.type === 'kick') {
                handleLeave(action.targetId, roomId, io, true);
            }

            if (action.type === 'start') {
                const blues = room.players.filter(p => p.team === 'BLUE').length;
                const reds = room.players.filter(p => p.team === 'RED').length;
                if (blues === 0 || reds === 0) {
                    return socket.emit('tabu_error', '⚠ Faltan jugadores.\nDebe haber al menos 1 persona en cada equipo.');
                }

                if (room.isPaused) {
                    room.isPaused = false;
                    room.turnData.status = 'PRE_TURN'; 
                    startPreTurn(io, roomId);
                    broadcastRoom(io, roomId);
                    return;
                }

                room.turnData.score = { BLUE: 0, RED: 0 };
                room.turnData.roundNumber = 0; 
                room.turnData.currentTeam = 'RED'; 
                room.turnData.teamIndex = { BLUE: 0, RED: 0 };
                room.players.forEach(p => p.individualScore = 0);

                room.gameInProgress = true;
                room.isPaused = false;
                nextTurn(io, roomId);
            }

            if (action.type === 'pause') {
                if (!room.gameInProgress) return;
                room.isPaused = !room.isPaused;
                if(!room.isPaused && room.turnData.status === 'PAUSED') {
                    nextTurn(io, roomId);
                }
                broadcastRoom(io, roomId);
            }

            if (action.type === 'reset') {
                performReset(io, roomId);
            }
        }

        if (room.gameInProgress && !room.isPaused && room.turnData.status === 'PLAYING' && me.id === room.turnData.describerId) {
            if (action.type === 'correct') {
                room.turnData.score[room.turnData.currentTeam]++;
                me.individualScore++;
                io.to('tabu_' + roomId).emit('playSound', 'correct');
                pickNewCard(room);
                broadcastRoom(io, roomId);
            }
            if (action.type === 'skip') {
                if (room.turnData.skipsRemaining > 0) {
                    room.turnData.skipsRemaining--;
                    io.to('tabu_' + roomId).emit('playSound', 'skip');
                    pickNewCard(room);
                    broadcastRoom(io, roomId);
                }
            }
            if (action.type === 'taboo') {
                io.to('tabu_' + roomId).emit('playSound', 'wrong');
                nextTurn(io, roomId); 
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

    socket.join('tabu_' + room.id);
    socket.data.roomId = room.id;

    const existing = room.players.find(p => p.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
        if (!existing.connected) return handleRejoin(socket, existing.id, room.id);
        return socket.emit('joinError', 'Nombre en uso en esta sala.');
    }

    const basePlayer = Utils.createPlayer(socket.id, cleanName);
    const newPlayer = { ...basePlayer, team: null, individualScore: 0 };
    
    if(room.players.length === 0 || cleanName.toLowerCase() === 'admin') newPlayer.isAdmin = true;
    
    room.players.push(newPlayer);
    
    socket.emit('joinedSuccess', { playerId: newPlayer.id, name: newPlayer.name, room: 'tabu', roomId: room.id });
    
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
        
        socket.join('tabu_' + room.id);
        socket.data.roomId = room.id;
        
        socket.emit('joinedSuccess', { playerId: savedId, name: p.name, room: 'tabu', roomId: room.id, isRejoin: true });
        
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
    room.players = room.players.filter(x => x.id !== playerId);
    
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