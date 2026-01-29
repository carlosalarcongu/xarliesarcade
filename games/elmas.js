const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const questionsDB = require('./preguntas_elmas'); 
const Utils = require('./utils');

const FEEDBACK_FILE = path.join(__dirname, '../feedback_log.txt');

// --- 1. VARIABLES GLOBALES ---
let players = [];
let gameInProgress = false;
let questionsQueue = [];
let currentRoundIndex = 0;
let settings = { maxRounds: 5 }; // Configuración sincronizada

let roundStage = 'LOBBY'; // LOBBY, VOTING, REVEAL, PODIUM

// Almacén temporal de Feedback de preguntas (Likes/Dislikes)
// Estructura: { "Texto Pregunta": { likes: 0, dislikes: 0 } }
let sessionFeedback = {};

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
            voted: !!p.votedFor, 
            votesInThisRound: (roundStage === 'REVEAL') ? votesReceivedCount : null 
        };
    });

    let roundInfo = null;
    if (gameInProgress && questionsQueue[currentRoundIndex]) {
        roundInfo = {
            text: questionsQueue[currentRoundIndex],
            current: currentRoundIndex + 1,
            total: settings.maxRounds
        };
    }

    io.to('elmas').emit('updateElMasList', {
        players: playersPublic,
        gameInProgress,
        roundStage,
        roundInfo,
        settings // Enviamos config a todos
    });
}

function saveFeedback() {
    if (Object.keys(sessionFeedback).length === 0) return;
    
    let content = `\n--- EL MAS FEEDBACK [${new Date().toISOString()}] ---\n`;
    for (const [q, data] of Object.entries(sessionFeedback)) {
        content += `"${q}": 👍${data.likes} | 👎${data.dislikes}\n`;
    }
    content += "--------------------------------------\n";

    fs.appendFile(FEEDBACK_FILE, content, (err) => {
        if (err) console.error("Error guardando feedback auto:", err);
    });
    
    sessionFeedback = {}; // Limpiar tras guardar
}

// --- 3. GESTIÓN (Persistencia) ---

const handleJoin = (socket, name) => {
    const existing = players.find(p => p.rawName.toLowerCase() === name.trim().toLowerCase());
    if (existing) {
        if(!existing.connected) return handleRejoin(socket, existing.id);
        return socket.emit('joinError', 'Nombre en uso.');
    }

    const basePlayer = Utils.createPlayer(socket.id, name);
    // Si es el primero, es Admin
    if (players.length === 0) basePlayer.isAdmin = true;

    const newPlayer = { ...basePlayer, votedFor: null, timeout: null };
    
    players.push(newPlayer);
    socket.join('elmas');
    socket.emit('joinedSuccess', { playerId: newPlayer.id, name: newPlayer.name, room: 'elmas' });
    
    broadcast(socket.server);
};

const handleRejoin = (socket, savedId) => {
    const p = players.find(x => x.id === savedId);
    if (p) {
        if(p.timeout) { clearTimeout(p.timeout); p.timeout = null; }
        p.socketId = socket.id;
        p.connected = true;
        socket.join('elmas');
        socket.emit('joinedSuccess', { playerId: savedId, name: p.name, room: 'elmas', isRejoin: true });
        broadcast(socket.server);
    } else { 
        socket.emit('sessionExpired'); 
    }
};

const handleLeave = (id, io) => { 
    const p = players.find(x => x.id === id);
    if(p) {
        if(p.timeout) clearTimeout(p.timeout);
        const wasAdmin = p.isAdmin;
        players = players.filter(x => x.id !== id);
        
        // Heredar admin si queda alguien
        if (wasAdmin && players.length > 0) players[0].isAdmin = true;
        
        // Reset si vacío
        if (players.length === 0) {
            gameModule.resetInternalState();
        } else {
            // Limpiar votos hacia él
            players.forEach(voter => { if(voter.votedFor === id) voter.votedFor = null; });
            if(io) broadcast(io);
        }
    }
};

const handleDisconnect = (socket) => { 
    Utils.handleDisconnect(socket.id, players, () => {
        gameModule.resetInternalState();
    });
    if (socket.server) broadcast(socket.server);
};

// --- 4. LÓGICA DE JUEGO ---

const gameModule = (io, socket) => {
    socket.on('elmas_action', (action) => {
        const me = players.find(p => p.socketId === socket.id);
        if (!me) return;

        // FEEDBACK INVISIBLE (Cualquiera puede enviar, 1 vez por pregunta controlada en front)
        if (action.type === 'rateQuestion') {
            if (!gameInProgress || !questionsQueue[currentRoundIndex]) return;
            const q = questionsQueue[currentRoundIndex];
            
            if (!sessionFeedback[q]) sessionFeedback[q] = { likes: 0, dislikes: 0 };
            
            if (action.vote === 'like') sessionFeedback[q].likes++;
            else if (action.vote === 'dislike') sessionFeedback[q].dislikes++;
            return; // No hace falta broadcast
        }

        // --- ACCIONES ADMIN ---
        if (me.isAdmin) {
            // Sincronizar Configuración
            if (action.type === 'updateSettings') {
                if(action.rounds) settings.maxRounds = parseInt(action.rounds);
                broadcast(io);
            }

            if (action.type === 'kick') {
                const t = players.find(p => p.id === action.targetId);
                if(t) {
                    if(t.socketId) io.to(t.socketId).emit('sessionExpired');
                    players = players.filter(p => p.id !== action.targetId);
                    broadcast(io);
                }
            }

            if (action.type === 'start') {
                // Usamos la config ya sincronizada
                let qData = ["¿Quién sobreviviría a un apocalipsis?", "¿Quién liga más?"];
                
                // Cargar preguntas (array simple o objeto json)
                if(questionsDB && Array.isArray(questionsDB)) qData = questionsDB;
                else if(questionsDB && questionsDB.questions) qData = questionsDB.questions;
                
                questionsQueue = [...qData].sort(() => Math.random() - 0.5).slice(0, settings.maxRounds);
                
                currentRoundIndex = 0;
                gameInProgress = true;
                roundStage = 'VOTING';
                players.forEach(p => { p.score = 0; p.votedFor = null; });
                
                sessionFeedback = {}; // Reiniciar feedback sesión
                broadcast(io);
            }

            if (action.type === 'next' && gameInProgress) {
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

            if (action.type === 'continue') {
                currentRoundIndex++;
                players.forEach(p => p.votedFor = null);

                if (currentRoundIndex >= questionsQueue.length) {
                    roundStage = 'PODIUM';
                    saveFeedback(); // Guardar feedback al acabar partida
                    
                    const sorted = [...players].sort((a,b) => b.score - a.score).slice(0, 3);
                    io.to('elmas').emit('showPodium', sorted);
                    broadcast(io);

                    setTimeout(() => {
                        gameInProgress = false;
                        roundStage = 'LOBBY';
                        players.forEach(p => p.score = 0);
                        io.to('elmas').emit('gameEnded');
                        broadcast(io);
                    }, 10000);

                } else {
                    roundStage = 'VOTING';
                    broadcast(io);
                }
            }

            if (action.type === 'reset') {
                gameInProgress = false;
                roundStage = 'LOBBY';
                saveFeedback(); // Guardar lo que haya hasta ahora
                players.forEach(p => { p.score = 0; p.votedFor = null; });
                broadcast(io);
            }
        }

        // --- ACCIONES JUGADOR ---
        if (action.type === 'vote' && gameInProgress && roundStage === 'VOTING') {
            me.votedFor = action.targetId;
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
    sessionFeedback = {};
};

module.exports = gameModule;