const Utils = require('./utils');
const logger = require('../debug_logger'); 

let players = [];
let gameInProgress = false;

let settings = { 
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

let turnData = {
    phase: 'ASSIGNMENT',
    currentPhaseIndex: -1,
    sequence: [],
    nightKillId: null,
    witchRevived: false,
    witchKilledId: null,
    deathsThisNight: [],
    potions: { revive: true, kill: true }
};

function broadcast(io) {
    const publicPlayers = players.map(p => {
        let votesReceived = 0;
        players.forEach(voter => {
            if (voter.votedFor === p.id) {
                if (turnData[voter.id] && turnData[voter.id].role === 'ALGUACIL' && !voter.isDead) {
                    votesReceived += 2; 
                } else {
                    votesReceived += 1;
                }
            }
        });

        let revealedRole = null;
        if ((p.isDead && turnData[p.id]) || turnData.phase === 'GAME_OVER') {
            revealedRole = turnData[p.id] ? turnData[p.id].role : null;
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
    
    const deathsSafe = turnData.deathsThisNight || [];

    const publicTurnData = {
        phase: turnData.phase,
        sequence: turnData.sequence,
        phaseDefs: PHASE_DEFINITIONS,
        deathsThisNight: deathsSafe
    };

    io.to('lobo').emit('updateLoboList', { 
        players: publicPlayers, 
        gameInProgress,
        settings,
        turnData: publicTurnData
    });
}

function checkWinCondition(io) {
    if (!gameInProgress) return false;

    const wolves = players.filter(p => !p.isDead && turnData[p.id] && turnData[p.id].role === 'LOBO');
    const villagers = players.filter(p => !p.isDead && turnData[p.id] && turnData[p.id].role !== 'LOBO');
    
    let winner = null;

    if (wolves.length === 0) {
        winner = 'PUEBLO';
    } else if (wolves.length >= villagers.length) {
        winner = 'LOBOS';
    }

    if (winner) {
        turnData.phase = 'GAME_OVER';
        
        const fullList = players.map(p => ({
            name: p.name,
            role: turnData[p.id] ? turnData[p.id].role : 'ESPECTADOR',
            isDead: p.isDead
        }));

        io.to('lobo').emit('loboGameOver', { winner, fullList });
        return true; 
    }
    return false;
}

function nextPhase(io) {
    if (turnData.phase === 'GAME_OVER') return;

    players.forEach(p => p.ready = false);

    if (turnData.phase === 'ASSIGNMENT') {
        turnData.currentPhaseIndex = 0;
        turnData.nightKillId = null;
        turnData.witchRevived = false;
        turnData.witchKilledId = null;
    } else {
        turnData.currentPhaseIndex++;
        
        if (turnData.currentPhaseIndex >= turnData.sequence.length) {
            turnData.currentPhaseIndex = 0;
            turnData.nightKillId = null;
            turnData.witchRevived = false;
            turnData.witchKilledId = null;
        }
    }

    const nextPhaseId = turnData.sequence[turnData.currentPhaseIndex];
    turnData.phase = nextPhaseId;

    if (nextPhaseId === 'NIGHT_WITCH' && settings.hasWitch) {
        const witch = players.find(p => turnData[p.id]?.role === 'BRUJA');
        if (witch && !witch.isDead && witch.socketId) {
            io.to(witch.socketId).emit('witchInfo', { 
                victimId: turnData.nightKillId,
                hasRevive: turnData.potions.revive,
                hasKill: turnData.potions.kill
            });
        }
    }

    if (nextPhaseId === 'DAY_REVEAL') {
        resolveNight(io);
    } else {
        broadcast(io);
    }
}

function resolveNight(io) {
    turnData.deathsThisNight = [];

    if (turnData.nightKillId && !turnData.witchRevived) {
        const victim = players.find(p => p.id === turnData.nightKillId);
        if (victim && !victim.isDead) {
            victim.isDead = true;
            turnData.deathsThisNight.push(victim.id);
        }
    }

    if (turnData.witchKilledId) {
        const victim = players.find(p => p.id === turnData.witchKilledId);
        if (victim && !victim.isDead) {
            victim.isDead = true;
            turnData.deathsThisNight.push(victim.id);
        }
    }

    const gameOver = checkWinCondition(io);

    if (!gameOver && gameInProgress) {
        io.to('lobo').emit('playSound', 'ring');
        broadcast(io);
    } else {
        broadcast(io);
    }
}

const gameModule = (io, socket) => {
    socket.on('lobo_action', (action) => {
        const me = players.find(p => p.socketId === socket.id);
        if (!me) return;

        if (action.type === 'updateSetting' && me.isAdmin) {
            settings[action.key] = action.value;
            if(action.key === 'wolvesCount') {
                settings.wolvesCount = Math.max(1, Math.min(players.length - 1, settings.wolvesCount));
            }
            broadcast(io);
        }

        if (action.type === 'start' && me.isAdmin) {
            if (players.length < settings.wolvesCount + 1) return;
            
            let seq = ['NIGHT_WOLVES'];
            if (settings.hasSeer) seq.push('NIGHT_SEER');
            if (settings.hasWitch) seq.push('NIGHT_WITCH');
            seq.push('DAY_REVEAL');
            seq.push('DAY_VOTING');
            
            turnData = {
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
            for(let i=0; i<settings.wolvesCount; i++) deck.push('LOBO');
            if(settings.hasSeer) deck.push('VIDENTE');
            if(settings.hasGirl) deck.push('NIÑA');
            if(settings.hasCupid) deck.push('CUPIDO');
            if(settings.hasHunter) deck.push('CAZADOR');
            if(settings.hasWitch) deck.push('BRUJA');
            if(settings.hasSheriff) deck.push('ALGUACIL');
            
            while(deck.length < players.length) deck.push('ALDEANO');
            if (deck.length > players.length) deck = deck.slice(0, players.length);
            deck.sort(() => Math.random() - 0.5);

            const wolfNames = [];
            players.forEach((p, i) => { if (deck[i] === 'LOBO') wolfNames.push(p.name); });

            players.forEach((p, i) => {
                p.isDead = false;
                p.votedFor = null;
                p.ready = false;
                
                const role = deck[i];
                let partners = [];
                if (role === 'LOBO') partners = wolfNames.filter(n => n !== p.name);

                turnData[p.id] = { role, wolfPartners: partners };
                
                if (p.socketId) io.to(p.socketId).emit('loboRoleAssigned', { 
                    role, 
                    wolfPartners: partners,
                    desc: getRoleDescription(role) 
                });
            });

            gameInProgress = true;
            broadcast(io);
        }

        if (action.type === 'phaseReady') {
            if (!gameInProgress || turnData.phase === 'GAME_OVER') return;
            me.ready = true;
            
            const livingPlayers = players.filter(p => !p.isDead && p.connected);
            const allReady = livingPlayers.every(p => p.ready);
            const currentPhase = turnData.phase;
            
            let shouldAdvance = false;

            if (currentPhase === 'ASSIGNMENT') {
                shouldAdvance = allReady;
            }
            else if (currentPhase === 'NIGHT_WOLVES') {
                const wolves = livingPlayers.filter(p => turnData[p.id]?.role === 'LOBO');
                if (wolves.every(p => p.ready)) shouldAdvance = true;
            }
            else if (currentPhase === 'NIGHT_WITCH') {
                const witch = livingPlayers.find(p => turnData[p.id]?.role === 'BRUJA');
                if (!witch || witch.ready) shouldAdvance = true;
            }
            else if (currentPhase === 'NIGHT_SEER') {
                const seer = livingPlayers.find(p => turnData[p.id]?.role === 'VIDENTE');
                if (!seer || seer.ready) shouldAdvance = true;
            }
            else {
                if (allReady) shouldAdvance = true;
            }
            
            if (shouldAdvance) nextPhase(io);
            else broadcast(io);
        }

        if (action.type === 'wolfAttack') {
            if (turnData.phase !== 'NIGHT_WOLVES') return;
            if (turnData[me.id]?.role !== 'LOBO') return;
            turnData.nightKillId = action.targetId; 
        }

        if (action.type === 'witchAction') {
            if (turnData.phase !== 'NIGHT_WITCH') return;
            if (turnData[me.id]?.role !== 'BRUJA') return;
            
            if (action.subType === 'revive' && turnData.potions.revive) {
                turnData.witchRevived = true;
                turnData.potions.revive = false;
            }
            if (action.subType === 'kill' && turnData.potions.kill) {
                turnData.witchKilledId = action.targetId;
                turnData.potions.kill = false;
            }
        }

        if (action.type === 'vote' && turnData.phase === 'DAY_VOTING') {
            if (!me.isDead) {
                me.votedFor = (me.votedFor === action.targetId) ? null : action.targetId;
                broadcast(io);
            }
        }
        
        if (action.type === 'kill' && me.isAdmin) {
             const p = players.find(pl => pl.id === action.targetId);
             if (p) { 
                 p.isDead = !p.isDead;
                 if (!p.isDead) p.votedFor = null;
                 const gameOver = checkWinCondition(io);
                 broadcast(io); 
             }
        }
        
        if (action.type === 'clearVotes' && me.isAdmin) {
             players.forEach(p => p.votedFor = null);
             broadcast(io);
        }

        // --- CORRECCIÓN AQUÍ ---
        // Usamos un reset suave (variables) y no resetInternalState (que borra players)
        if (action.type === 'reset' && me.isAdmin) {
             gameInProgress = false;
             turnData = {
                 phase: 'ASSIGNMENT',
                 currentPhaseIndex: -1,
                 sequence: [],
                 nightKillId: null,
                 witchRevived: false,
                 witchKilledId: null,
                 deathsThisNight: [],
                 potions: { revive: true, kill: true }
             };
             // Limpiar estado de jugadores
             players.forEach(p => {
                 p.isDead = false;
                 p.votedFor = null;
                 p.ready = false;
             });
             
             io.to('lobo').emit('loboReset');
             broadcast(io);
        }
    });

    socket.on('disconnect', () => handleDisconnect(socket));
};

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

const handleJoin = (socket, name) => {
    if (players.find(p => p.rawName.toLowerCase() === name.trim().toLowerCase())) return socket.emit('joinError', 'Nombre en uso.');
    const newPlayer = Utils.createPlayer(socket.id, name);
    if(players.length === 0) newPlayer.isAdmin = true;
    newPlayer.ready = false;
    newPlayer.votedFor = null;

    players.push(newPlayer);
    socket.join('lobo');
    socket.emit('joinedSuccess', { playerId: newPlayer.id, name: newPlayer.name, room: 'lobo' });
    broadcast(socket.server);
};

const handleRejoin = (socket, savedId) => {
    const p = players.find(x => x.id === savedId);
    if (p) {
        if (p.timeout) { clearTimeout(p.timeout); p.timeout = null; }
        p.socketId = socket.id;
        p.connected = true;
        socket.join('lobo');
        socket.emit('joinedSuccess', { playerId: savedId, name: p.name, room: 'lobo', isRejoin: true });
        
        if (gameInProgress && turnData[p.id]) {
            socket.emit('loboRoleAssigned', {
                role: turnData[p.id].role,
                wolfPartners: turnData[p.id].wolfPartners,
                desc: getRoleDescription(turnData[p.id].role)
            });
            if (turnData[p.id].role === 'BRUJA' && turnData.phase === 'NIGHT_WITCH') {
                socket.emit('witchInfo', { 
                    victimId: turnData.nightKillId,
                    hasRevive: turnData.potions.revive,
                    hasKill: turnData.potions.kill
                });
            }
        }
        broadcast(socket.server);
    } else socket.emit('sessionExpired');
};

const handleLeave = (id, io) => {
    const p = players.find(x => x.id === id);
    if(p) {
        if(p.timeout) clearTimeout(p.timeout);
        const wasAdmin = p.isAdmin;
        players = players.filter(x => x.id !== id);
        if (wasAdmin && players.length > 0) players[0].isAdmin = true;
        if (players.length === 0) gameModule.resetInternalState();
        if (io) broadcast(io);
    }
};

const handleDisconnect = (socket) => {
    Utils.handleDisconnect(socket.id, players, () => {
        gameModule.resetInternalState();
    });
    if (socket.server) broadcast(socket.server);
};

// Esta función borra TODO (solo usar cuando la sala queda vacía)
gameModule.resetInternalState = () => {
    players = [];
    gameInProgress = false;
    turnData = { phase: 'ASSIGNMENT', sequence: [] };
    settings = { wolvesCount: 2, hasSeer: true, hasGirl: false, hasCupid: false, hasHunter: false, hasWitch: true, hasSheriff: true };
};

module.exports = gameModule;
module.exports.handleJoin = handleJoin;
module.exports.handleRejoin = handleRejoin;
module.exports.handleLeave = handleLeave;
module.exports.handleDisconnect = handleDisconnect;