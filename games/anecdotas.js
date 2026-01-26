const crypto = require('crypto');
const Utils = require('./utils');

// --- 1. VARIABLES GLOBALES ---
let players = [];
let gameInProgress = false;
let anecdoteQueue = []; 
let currentRoundIndex = 0;
let roundStage = 'LOBBY'; // LOBBY, VOTING, REVEAL, PODIUM

// --- 2. HELPERS ---
function broadcast(io) {
    const publicPlayers = players.map(p => ({
        id: p.id,
        name: p.name,
        isAdmin: p.isAdmin,
        score: p.score,
        connected: p.connected,
        hasAnecdote: !!p.anecdote && p.anecdote.trim().length > 0,
        voted: !!p.votedFor
    }));

    let roundInfo = null;
    if (gameInProgress && anecdoteQueue[currentRoundIndex]) {
        roundInfo = {
            text: anecdoteQueue[currentRoundIndex].text,
            current: currentRoundIndex + 1,
            total: anecdoteQueue.length
        };
    }

    io.to('anecdotas').emit('updateAnecdotasList', {
        players: publicPlayers,
        gameInProgress,
        roundStage,
        roundInfo
    });
}

// --- 3. FUNCIONES DE GESTIÓN ---

const handleJoin = (socket, name) => {
    if (players.find(p => p.rawName.toLowerCase() === name.trim().toLowerCase())) {
        return socket.emit('joinError', 'Nombre en uso.');
    }

    const basePlayer = Utils.createPlayer(socket.id, name);

    // Específico de Anécdotas
    const newPlayer = { ...basePlayer, anecdote: "", votedFor: null };
    
    players.push(newPlayer);
    socket.join('anecdotas');
    socket.emit('joinedSuccess', { playerId: newPlayer.id, name: newPlayer.name, room: 'anecdotas' });
    broadcast(socket.server);
};

const handleRejoin = (socket, savedId) => {
    const p = players.find(x => x.id === savedId);
    if (p) {
        p.socketId = socket.id;
        p.connected = true;
        socket.join('anecdotas');
        socket.emit('joinedSuccess', { playerId: savedId, name: p.name, room: 'anecdotas', isRejoin: true });
        broadcast(socket.server);
    } else {
        socket.emit('sessionExpired');
    }
};

const handleLeave = (id) => {
    players = players.filter(p => p.id !== id);
};

const handleDisconnect = (socket) => {
    const p = players.find(x => x.socketId === socket.id);
    if (p) { 
        p.connected = false; 
        broadcast(socket.server);
    }
};

// --- 4. EXPORTACIÓN PRINCIPAL (HÍBRIDA) ---

const gameModule = (io, socket) => {

    socket.on('anecdotas_action', (action) => {
        const me = players.find(p => p.socketId === socket.id);
        if (!me) return;

        // --- GUARDAR ANÉCDOTA ---
        if (action.type === 'saveAnecdote') {
            if (gameInProgress) return;
            const text = action.text.trim();
            if (text.length > 0) {
                me.anecdote = text;
                broadcast(io);
            }
        }

        // --- KICK ---
        if (action.type === 'kick') {
            if (!me.isAdmin) return;
            players = players.filter(p => p.id !== action.targetId);
            broadcast(io);
        }

        // --- START ---
        if (action.type === 'start') {
            if (!me.isAdmin) return;
            
            // Validar
            const pending = players.filter(p => !p.anecdote || p.anecdote.trim() === "");
            if (pending.length > 0) {
                socket.emit('errorMsg', `Faltan anécdotas de: ${pending.map(p=>p.name).join(', ')}`);
                return;
            }
            
            // Preparar
            anecdoteQueue = players.map(p => ({ authorId: p.id, text: p.anecdote }));
            anecdoteQueue = anecdoteQueue.sort(() => Math.random() - 0.5);
            
            currentRoundIndex = 0;
            gameInProgress = true;
            roundStage = 'VOTING';
            players.forEach(p => { p.score = 0; p.votedFor = null; });
            
            broadcast(io);
        }

        // --- VOTAR ---
        if (action.type === 'vote') {
            if (!gameInProgress || roundStage !== 'VOTING') return;
            me.votedFor = action.targetId;
            broadcast(io);
        }

        // --- CALCULAR Y SIGUIENTE (NEXT) ---
        if (action.type === 'next') {
            if (!me.isAdmin || !gameInProgress) return;

            // 1. Calcular puntos ronda
            const currentAnecdote = anecdoteQueue[currentRoundIndex];
            const author = players.find(p => p.id === currentAnecdote.authorId);
            const correctVoters = players.filter(p => p.votedFor === author.id && p.id !== author.id);
            const totalVoters = players.filter(p => p.id !== author.id).length;

            // A) Adivinadores (+3)
            correctVoters.forEach(p => p.score += 3);

            // B) Autor
            if (correctVoters.length === totalVoters) author.score += 1; // Muy obvio
            else if (correctVoters.length === 0) author.score -= 1; // Imposible
            else author.score += 2; // Bien jugado

            // 2. REVEAL
            roundStage = 'REVEAL';
            const revealData = {
                authorName: author.name,
                correctVotersNames: correctVoters.map(p => p.name),
                scoreboard: players.map(p => ({ id: p.id, score: p.score }))
            };
            
            io.to('anecdotas').emit('roundReveal', revealData);
            broadcast(io);

            // 3. AUTO-NEXT TRAS 5s
            setTimeout(() => {
                currentRoundIndex++;
                players.forEach(p => p.votedFor = null);

                if (currentRoundIndex >= anecdoteQueue.length) {
                    // FIN -> PODIO
                    gameInProgress = true; 
                    roundStage = 'PODIUM';
                    
                    const sorted = [...players].sort((a,b) => b.score - a.score).slice(0, 3);
                    io.to('anecdotas').emit('showPodium', sorted);
                    broadcast(io);

                    // RESET FINAL TRAS 10s
                    setTimeout(() => {
                        gameInProgress = false;
                        roundStage = 'LOBBY';
                        players.forEach(p => { 
                            p.score = 0; 
                            p.anecdote = ""; 
                            p.votedFor = null;
                        });
                        io.to('anecdotas').emit('gameEnded');
                        broadcast(io);
                    }, 10000);

                } else {
                    roundStage = 'VOTING';
                    broadcast(io);
                }
            }, 5000);
        }

        // --- RESET TOTAL ---
        if (action.type === 'reset') {
            if (!me.isAdmin) return;
            gameInProgress = false;
            roundStage = 'LOBBY';
            currentRoundIndex = 0;
            players.forEach(p => { p.score = 0; p.votedFor = null; p.anecdote = ""; });
            io.to('anecdotas').emit('forceReset');
            broadcast(io);
        }
    });

    socket.on('disconnect', () => {
        handleDisconnect(socket);
    });
};

// --- 5. ADJUNTAR MÉTODOS ---
gameModule.handleJoin = handleJoin;
gameModule.handleRejoin = handleRejoin;
gameModule.handleLeave = handleLeave;
gameModule.handleDisconnect = handleDisconnect;

module.exports = gameModule;