const crypto = require('crypto');
const questionsDB = require('./preguntas_elmas'); 
const Utils = require('./utils');
const logger = require('../debug_logger');

// --- 1. VARIABLES GLOBALES ---
let players = [];
let gameInProgress = false;
let questionsQueue = [];
let currentRoundIndex = 0;
let maxRounds = 5;
let roundStage = 'LOBBY'; // LOBBY, VOTING, REVEAL, PODIUM

// --- 2. HELPERS ---
function broadcast(io) {
    const playersPublic = players.map(p => {
        const votesReceivedCount = players.filter(voter => voter.votedFor === p.id).length;
        return {
            id: p.id,
            name: p.name,
            isAdmin: p.isAdmin,
            score: p.score,
            connected: p.connected,
            voted: !!p.votedFor, // Para saber si mostrar el icono de sobre 🗳️
            votesInThisRound: (roundStage === 'REVEAL') ? votesReceivedCount : null 
        };
    });

    let roundInfo = null;
    if (gameInProgress && questionsQueue[currentRoundIndex]) {
        roundInfo = {
            text: questionsQueue[currentRoundIndex],
            current: currentRoundIndex + 1,
            total: maxRounds
        };
    }

    io.to('elmas').emit('updateElMasList', {
        players: playersPublic,
        gameInProgress,
        roundStage,
        roundInfo
    });
}

// --- 3. GESTIÓN (Persistencia) ---

const handleJoin = (socket, name) => {
    const existing = players.find(p => p.rawName.toLowerCase() === name.trim().toLowerCase());
    if (existing) {
        if(!existing.connected) return handleRejoin(socket, existing.id);
        return socket.emit('joinError', 'Nombre en uso.');
    }

    const basePlayer = Utils.createPlayer(socket.id, name);
    const newPlayer = { ...basePlayer, votedFor: null, timeout: null };
    
    players.push(newPlayer);
    socket.join('elmas');
    socket.emit('joinedSuccess', { playerId: newPlayer.id, room: 'elmas' });
    
    broadcast(socket.server);
};

const handleRejoin = (socket, savedId) => {
    const p = players.find(x => x.id === savedId);
    if (p) {
        if(p.timeout) { clearTimeout(p.timeout); p.timeout = null; }
        p.socketId = socket.id;
        p.connected = true;
        socket.join('elmas');
        socket.emit('joinedSuccess', { playerId: savedId, room: 'elmas', isRejoin: true });
        broadcast(socket.server);
    } else { 
        socket.emit('sessionExpired'); 
    }
};

const handleLeave = (id) => { 
    const p = players.find(x => x.id === id);
    if(p) {
        if(p.timeout) clearTimeout(p.timeout);
        players = players.filter(x => x.id !== id);
        players.forEach(voter => { if(voter.votedFor === id) voter.votedFor = null; });
    }
};

const handleDisconnect = (socket) => { 
    const p = players.find(x => x.socketId === socket.id);
    if(p) { 
        p.connected = false; 
        if(socket.server) broadcast(socket.server); 
        
        if(p.timeout) clearTimeout(p.timeout);
        p.timeout = setTimeout(() => {
            players = players.filter(x => x.id !== p.id);
        }, 15 * 60 * 1000);
    }
};

// --- 4. LÓGICA DE JUEGO ---

const gameModule = (io, socket) => {
    socket.on('elmas_action', (action) => {
        const me = players.find(p => p.socketId === socket.id);
        if (!me) return;

        if (action.type === 'kick' && me.isAdmin) {
            const t = players.find(p => p.id === action.targetId);
            if(t) {
                if(t.socketId) io.to(t.socketId).emit('sessionExpired');
                players = players.filter(p => p.id !== action.targetId);
                broadcast(io);
            }
        }

        if (action.type === 'start' && me.isAdmin) {
            maxRounds = parseInt(action.rounds) || 5;
            let qData = ["¿Quién es más probable que sobreviva a un apocalipsis?", "¿Quién liga más?"];
            if(questionsDB && Array.isArray(questionsDB)) qData = questionsDB;
            else if(questionsDB && questionsDB.questions) qData = questionsDB.questions;
            
            questionsQueue = [...qData].sort(() => Math.random() - 0.5).slice(0, maxRounds);
            
            currentRoundIndex = 0;
            gameInProgress = true;
            roundStage = 'VOTING';
            players.forEach(p => { p.score = 0; p.votedFor = null; });
            
            broadcast(io);
        }

        if (action.type === 'vote' && gameInProgress && roundStage === 'VOTING') {
            me.votedFor = action.targetId;
            broadcast(io);
        }

        if (action.type === 'next' && me.isAdmin && gameInProgress) {
            // Calcular puntos
            players.forEach(voter => {
                if (voter.votedFor) {
                    const votes = players.filter(p => p.votedFor === voter.votedFor).length;
                    if (votes === 1) voter.score = Math.max(0, voter.score - 1);
                    else voter.score += votes;
                }
            });
            roundStage = 'REVEAL';
            broadcast(io);
        }

        if (action.type === 'continue' && me.isAdmin) {
            currentRoundIndex++;
            players.forEach(p => p.votedFor = null);

            // Si hemos superado el índice, FIN DEL JUEGO
            if (currentRoundIndex >= questionsQueue.length) {
                roundStage = 'PODIUM';
                
                // Ordenar ganadores
                const sorted = [...players].sort((a,b) => b.score - a.score).slice(0, 3);
                
                // Emitir Podio
                io.to('elmas').emit('showPodium', sorted);
                
                // Actualizar lista para que nadie se quede en pantalla de votación antigua
                broadcast(io);

                // Esperar 10s y volver al lobby
                setTimeout(() => {
                    gameInProgress = false;
                    roundStage = 'LOBBY';
                    players.forEach(p => p.score = 0);
                    io.to('elmas').emit('gameEnded');
                    broadcast(io);
                }, 10000);

            } else {
                // Siguiente ronda normal
                roundStage = 'VOTING';
                broadcast(io);
            }
        }

        if (action.type === 'reset' && me.isAdmin) {
            gameInProgress = false;
            roundStage = 'LOBBY';
            players.forEach(p => { p.score = 0; p.votedFor = null; });
            broadcast(io);
        }
    });

    socket.on('disconnect', () => handleDisconnect(socket));
};

gameModule.handleJoin = handleJoin;
gameModule.handleRejoin = handleRejoin;
gameModule.handleLeave = handleLeave;
gameModule.handleDisconnect = handleDisconnect;
gameModule.resetInternalState = () => {
    players = [];
    gameInProgress = false;
    currentRoundIndex = 0;
};

module.exports = gameModule;