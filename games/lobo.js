const Utils = require('./utils');

const rooms = {};

const defaultSettings = { 
    wolvesCount: 2, 
    hasSeer: true, 
    hasGirl: false, 
    hasCupid: false, 
    hasHunter: false,
    hasWitch: true,
    hasSheriff: true
};

const PHASE_DEFINITIONS = {
    'NIGHT_WOLVES': { label: '🌙 Lobos', type: 'NIGHT' },
    'NIGHT_SEER':   { label: '🔮 Vidente', type: 'NIGHT' },
    'NIGHT_WITCH':  { label: '🧙‍♀️ Bruja', type: 'NIGHT' },
    'DAY_REVEAL':   { label: '☀️ Amanecer', type: 'DAY' },
    'DAY_VOTING':   { label: '🗳️ Votación', type: 'DAY' },
    'GAME_OVER':    { label: '🏆 Fin de Partida', type: 'END' }
};

function createRoom(roomId) {
    rooms[roomId] = {
        id: roomId,
        players: [],
        gameInProgress: false,
        settings: { ...defaultSettings },
        turnData: {
            phase: 'ASSIGNMENT',
            currentPhaseIndex: -1,
            sequence: [],
            nightKillId: null,
            witchRevived: false,
            witchKilledId: null,
            deathsThisNight: [],
            potions: { revive: true, kill: true }
        },
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

    const publicPlayers = room.players.map(p => {
        let votesReceived = 0;
        room.players.forEach(voter => {
            if (voter.votedFor === p.id) {
                if (room.turnData[voter.id] && room.turnData[voter.id].role === 'ALGUACIL' && !voter.isDead) {
                    votesReceived += 2; 
                } else {
                    votesReceived += 1;
                }
            }
        });

        let revealedRole = null;
        if ((p.isDead && room.turnData[p.id]) || room.turnData.phase === 'GAME_OVER') {
            revealedRole = room.turnData[p.id] ? room.turnData[p.id].role : null;
        }

        return {
            id: p.id,
            name: p.name,
            isAdmin: p.isAdmin,
            connected: p.connected,
            isDead: p.isDead,
            ready: p.ready,
            votesReceived: votesReceived,
            hasVoted: !!p.votedFor,
            revealedRole: revealedRole
        };
    });
    
    const deathsSafe = room.turnData.deathsThisNight || [];

    const publicTurnData = {
        phase: room.turnData.phase,
        sequence: room.turnData.sequence,
        phaseDefs: PHASE_DEFINITIONS,
        deathsThisNight: deathsSafe
    };

    io.to('lobo_' + roomId).emit('updateLoboList', { 
        players: publicPlayers, 
        gameInProgress: room.gameInProgress,
        settings: room.settings,
        turnData: publicTurnData
    });
}

function getRoleDescription(role) {
    switch(role) {
        case 'LOBO': return "Devora aldeanos de noche. Elige víctima con tus compañeros.";
        case 'ALDEANO': return "Descubre a los lobos. Vota de día para lincharlos.";
        case 'VIDENTE': return "Cada noche puedes ver el rol de un jugador (Narrador te lo dice).";
        case 'BRUJA': return "Tienes 1 poción para revivir y 1 para matar.";
        case 'ALGUACIL': return "Tu voto vale doble. ¡No reveles tu identidad!";
        case 'NIÑA': return "Puedes espiar (abrir ojos) con cuidado por la noche.";
        case 'CUPIDO': return "Enamora a dos personas la primera noche.";
        case 'CAZADOR': return "Si mueres, matas a otro al instante.";
        default: return "";
    }
}

function checkWinCondition(io, roomId) {
    const room = rooms[roomId];
    if (!room || !room.gameInProgress) return false;

    const wolves = room.players.filter(p => !p.isDead && room.turnData[p.id] && room.turnData[p.id].role === 'LOBO');
    const villagers = room.players.filter(p => !p.isDead && room.turnData[p.id] && room.turnData[p.id].role !== 'LOBO');
    
    let winner = null;

    if (wolves.length === 0) {
        winner = 'PUEBLO';
    } else if (wolves.length >= villagers.length) {
        winner = 'LOBOS';
    }

    if (winner) {
        room.turnData.phase = 'GAME_OVER';
        
        const fullList = room.players.map(p => ({
            name: p.name,
            role: room.turnData[p.id] ? room.turnData[p.id].role : 'ESPECTADOR',
            isDead: p.isDead
        }));

        io.to('lobo_' + roomId).emit('loboGameOver', { winner, fullList });
        return true; 
    }
    return false;
}

function nextPhase(io, roomId) {
    const room = rooms[roomId];
    if (!room || room.turnData.phase === 'GAME_OVER') return;

    room.players.forEach(p => p.ready = false);

    if (room.turnData.phase === 'ASSIGNMENT') {
        room.turnData.currentPhaseIndex = 0;
        room.turnData.nightKillId = null;
        room.turnData.witchRevived = false;
        room.turnData.witchKilledId = null;
    } else {
        room.turnData.currentPhaseIndex++;
        
        if (room.turnData.currentPhaseIndex >= room.turnData.sequence.length) {
            room.turnData.currentPhaseIndex = 0;
            room.turnData.nightKillId = null;
            room.turnData.witchRevived = false;
            room.turnData.witchKilledId = null;
        }
    }

    const nextPhaseId = room.turnData.sequence[room.turnData.currentPhaseIndex];
    room.turnData.phase = nextPhaseId;

    if (nextPhaseId === 'NIGHT_WITCH' && room.settings.hasWitch) {
        const witch = room.players.find(p => room.turnData[p.id]?.role === 'BRUJA');
        if (witch && !witch.isDead && witch.socketId) {
            io.to(witch.socketId).emit('witchInfo', { 
                victimId: room.turnData.nightKillId,
                hasRevive: room.turnData.potions.revive,
                hasKill: room.turnData.potions.kill
            });
        }
    }

    if (nextPhaseId === 'DAY_REVEAL') {
        resolveNight(io, roomId);
    } else {
        broadcastRoom(io, roomId);
    }
}

function resolveNight(io, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    room.turnData.deathsThisNight = [];

    if (room.turnData.nightKillId && !room.turnData.witchRevived) {
        const victim = room.players.find(p => p.id === room.turnData.nightKillId);
        if (victim && !victim.isDead) {
            victim.isDead = true;
            room.turnData.deathsThisNight.push(victim.id);
        }
    }

    if (room.turnData.witchKilledId) {
        const victim = room.players.find(p => p.id === room.turnData.witchKilledId);
        if (victim && !victim.isDead) {
            victim.isDead = true;
            room.turnData.deathsThisNight.push(victim.id);
        }
    }

    const gameOver = checkWinCondition(io, roomId);

    if (!gameOver && room.gameInProgress) {
        io.to('lobo_' + roomId).emit('playSound', 'ring');
        broadcastRoom(io, roomId);
    } else {
        broadcastRoom(io, roomId);
    }
}

const handleSocket = (io, socket) => {
    socket.on('lobo_action', (action) => {
        const roomId = socket.data.roomId;
        const room = rooms[roomId];
        if (!room) return socket.emit('error', 'Sala no encontrada.');

        const me = room.players.find(p => p.socketId === socket.id);
        if (!me) return;

        if (action.type === 'updateSetting' && me.isAdmin) {
            room.settings[action.key] = action.value;
            if(action.key === 'wolvesCount') {
                room.settings.wolvesCount = Math.max(1, Math.min(room.players.length - 1, room.settings.wolvesCount));
            }
            broadcastRoom(io, roomId);
        }

        if (action.type === 'start' && me.isAdmin) {
            if (room.players.length < room.settings.wolvesCount + 1) return;
            
            let seq = ['NIGHT_WOLVES'];
            if (room.settings.hasSeer) seq.push('NIGHT_SEER');
            if (room.settings.hasWitch) seq.push('NIGHT_WITCH');
            seq.push('DAY_REVEAL');
            seq.push('DAY_VOTING');
            
            room.turnData = {
                phase: 'ASSIGNMENT',
                currentPhaseIndex: -1,
                sequence: seq,
                nightKillId: null,
                witchRevived: false,
                witchKilledId: null,
                deathsThisNight: [],
                potions: { revive: true, kill: true }
            };

            let deck = [];
            for(let i=0; i<room.settings.wolvesCount; i++) deck.push('LOBO');
            if(room.settings.hasSeer) deck.push('VIDENTE');
            if(room.settings.hasGirl) deck.push('NIÑA');
            if(room.settings.hasCupid) deck.push('CUPIDO');
            if(room.settings.hasHunter) deck.push('CAZADOR');
            if(room.settings.hasWitch) deck.push('BRUJA');
            if(room.settings.hasSheriff) deck.push('ALGUACIL');
            
            while(deck.length < room.players.length) deck.push('ALDEANO');
            if (deck.length > room.players.length) deck = deck.slice(0, room.players.length);
            deck.sort(() => Math.random() - 0.5);

            const wolfNames = [];
            room.players.forEach((p, i) => { if (deck[i] === 'LOBO') wolfNames.push(p.name); });

            room.players.forEach((p, i) => {
                p.isDead = false;
                p.votedFor = null;
                p.ready = false;
                
                const role = deck[i];
                let partners = [];
                if (role === 'LOBO') partners = wolfNames.filter(n => n !== p.name);

                room.turnData[p.id] = { role, wolfPartners: partners };
                
                if (p.socketId) io.to(p.socketId).emit('loboRoleAssigned', { 
                    role, 
                    wolfPartners: partners,
                    desc: getRoleDescription(role) 
                });
            });

            room.gameInProgress = true;
            broadcastRoom(io, roomId);
        }

        if (action.type === 'phaseReady') {
            if (!room.gameInProgress || room.turnData.phase === 'GAME_OVER') return;
            me.ready = true;
            
            const livingPlayers = room.players.filter(p => !p.isDead && p.connected);
            const allReady = livingPlayers.every(p => p.ready);
            const currentPhase = room.turnData.phase;
            
            let shouldAdvance = false;

            if (currentPhase === 'ASSIGNMENT') {
                shouldAdvance = allReady;
            }
            else if (currentPhase === 'NIGHT_WOLVES') {
                const wolves = livingPlayers.filter(p => room.turnData[p.id]?.role === 'LOBO');
                if (wolves.every(p => p.ready)) shouldAdvance = true;
            }
            else if (currentPhase === 'NIGHT_WITCH') {
                const witch = livingPlayers.find(p => room.turnData[p.id]?.role === 'BRUJA');
                if (!witch || witch.ready) shouldAdvance = true;
            }
            else if (currentPhase === 'NIGHT_SEER') {
                const seer = livingPlayers.find(p => room.turnData[p.id]?.role === 'VIDENTE');
                if (!seer || seer.ready) shouldAdvance = true;
            }
            else {
                if (allReady) shouldAdvance = true;
            }
            
            if (shouldAdvance) nextPhase(io, roomId);
            else broadcastRoom(io, roomId);
        }

        if (action.type === 'wolfAttack') {
            if (room.turnData.phase !== 'NIGHT_WOLVES') return;
            if (room.turnData[me.id]?.role !== 'LOBO') return;
            room.turnData.nightKillId = action.targetId; 
        }

        if (action.type === 'witchAction') {
            if (room.turnData.phase !== 'NIGHT_WITCH') return;
            if (room.turnData[me.id]?.role !== 'BRUJA') return;
            
            if (action.subType === 'revive' && room.turnData.potions.revive) {
                room.turnData.witchRevived = true;
                room.turnData.potions.revive = false;
            }
            if (action.subType === 'kill' && room.turnData.potions.kill) {
                room.turnData.witchKilledId = action.targetId;
                room.turnData.potions.kill = false;
            }
        }

        if (action.type === 'vote' && room.turnData.phase === 'DAY_VOTING') {
            if (!me.isDead) {
                me.votedFor = (me.votedFor === action.targetId) ? null : action.targetId;
                broadcastRoom(io, roomId);
            }
        }
        
        if (action.type === 'kill' && me.isAdmin) {
             const p = room.players.find(pl => pl.id === action.targetId);
             if (p) { 
                 p.isDead = !p.isDead;
                 if (!p.isDead) p.votedFor = null;
                 checkWinCondition(io, roomId);
                 broadcastRoom(io, roomId); 
             }
        }
        
        if (action.type === 'clearVotes' && me.isAdmin) {
             room.players.forEach(p => p.votedFor = null);
             broadcastRoom(io, roomId);
        }

        if (action.type === 'reset' && me.isAdmin) {
             room.gameInProgress = false;
             room.turnData = {
                 phase: 'ASSIGNMENT',
                 currentPhaseIndex: -1,
                 sequence: [],
                 nightKillId: null,
                 witchRevived: false,
                 witchKilledId: null,
                 deathsThisNight: [],
                 potions: { revive: true, kill: true }
             };
             
             room.players.forEach(p => {
                 p.isDead = false;
                 p.votedFor = null;
                 p.ready = false;
             });
             
             io.to('lobo_' + roomId).emit('loboReset');
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

    socket.join('lobo_' + room.id);
    socket.data.roomId = room.id;

    const existing = room.players.find(p => p.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
        if (!existing.connected) return handleRejoin(socket, existing.id, room.id);
        return socket.emit('joinError', 'Nombre en uso.');
    }

    const newPlayer = Utils.createPlayer(socket.id, cleanName);
    if(room.players.length === 0 || cleanName.toLowerCase() === 'admin') newPlayer.isAdmin = true;
    newPlayer.ready = false;
    newPlayer.votedFor = null;

    room.players.push(newPlayer);
    socket.emit('joinedSuccess', { playerId: newPlayer.id, name: newPlayer.name, room: 'lobo', roomId: room.id });
    
    checkRoomInactivity(room.id);
    broadcastRoom(socket.server, room.id);
};

const handleRejoin = (socket, savedId, savedRoomId) => {
    const room = rooms[savedRoomId];
    if (!room) return socket.emit('sessionExpired');

    const p = room.players.find(x => x.id === savedId);
    if (p) {
        if (p.timeout) { clearTimeout(p.timeout); p.timeout = null; }
        p.socketId = socket.id;
        p.connected = true;
        
        socket.join('lobo_' + room.id);
        socket.data.roomId = room.id;
        
        socket.emit('joinedSuccess', { playerId: savedId, name: p.name, room: 'lobo', roomId: room.id, isRejoin: true });
        
        if (room.gameInProgress && room.turnData[p.id]) {
            socket.emit('loboRoleAssigned', {
                role: room.turnData[p.id].role,
                wolfPartners: room.turnData[p.id].wolfPartners,
                desc: getRoleDescription(room.turnData[p.id].role)
            });
            if (room.turnData[p.id].role === 'BRUJA' && room.turnData.phase === 'NIGHT_WITCH') {
                socket.emit('witchInfo', { 
                    victimId: room.turnData.nightKillId,
                    hasRevive: room.turnData.potions.revive,
                    hasKill: room.turnData.potions.kill
                });
            }
        }
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

    // Reset si vacío
    if (room.players.length === 0) {
        room.gameInProgress = false;
        room.turnData = { phase: 'ASSIGNMENT', sequence: [] };
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