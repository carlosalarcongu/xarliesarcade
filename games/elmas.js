const crypto = require('crypto');
const questionsDB = require('./preguntas_elmas'); // Asegúrate de que el nombre del archivo es correcto (a veces es questions_elmas o preguntas_elmas)
const Utils = require('./utils');

// --- 1. VARIABLES GLOBALES ---
let players = [];
let gameInProgress = false;
let questionsQueue = [];
let currentRoundIndex = 0;
let maxRounds = 5;
let roundStage = 'LOBBY'; // LOBBY, VOTING, REVEAL, PODIUM

// --- 2. HELPERS ---
function broadcast(io) {
    // Calcular votos recibidos por cada jugador en ESTA ronda
    const playersPublic = players.map(p => {
        const votesReceivedCount = players.filter(voter => voter.votedFor === p.id).length;
        
        return {
            id: p.id,
            name: p.name,
            isAdmin: p.isAdmin,
            score: p.score,
            connected: p.connected,
            voted: !!p.votedFor, // Si ya ha votado
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

// --- 3. FUNCIONES DE GESTIÓN (Join, Rejoin, Leave) ---

const handleJoin = (socket, name) => {
    // Verificar duplicados
    if (players.find(p => p.rawName.toLowerCase() === name.trim().toLowerCase())) {
        return socket.emit('joinError', 'Nombre en uso.');
    }

    const basePlayer = Utils.createPlayer(socket.id, name);

    // Específico de El Más
    const newPlayer = { ...basePlayer, votedFor: null };
    
    players.push(newPlayer);
    socket.join('elmas');
    socket.emit('joinedSuccess', { playerId: newPlayer.id, room: 'elmas' });
    
    broadcast(socket.server);
};

const handleRejoin = (socket, savedId) => {
    const p = players.find(x => x.id === savedId);
    if (p) {
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
    players = players.filter(p => p.id !== id); 
};

const handleDisconnect = (socket) => { 
    const p = players.find(x => x.socketId === socket.id);
    if(p) { p.connected=false; broadcast(socket.server); }
};

// --- 4. EXPORTACIÓN PRINCIPAL (HÍBRIDA) ---

const gameModule = (io, socket) => {
    
    socket.on('elmas_action', (action) => {
        const me = players.find(p => p.socketId === socket.id);
        if (!me) return;

        // --- KICK (ECHAR JUGADOR) ---
        if (action.type === 'kick') {
            if (!me.isAdmin) return;
            players = players.filter(p => p.id !== action.targetId);
            broadcast(io);
        }

        // --- START ---
        if (action.type === 'start') {
            if (!me.isAdmin) return;
            maxRounds = parseInt(action.rounds) || 5;
            
            // Cargar preguntas (manejo de error si no hay DB)
            let qData = questionsDB || ["¿Quién es más probable que gane?", "¿Quién liga más?"];
            if(questionsDB && questionsDB.questions) qData = questionsDB.questions; // Por si la estructura es {questions:[]}
            
            questionsQueue = [...qData].sort(() => Math.random() - 0.5).slice(0, maxRounds);
            
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

        // --- CALCULAR VOTOS (NEXT) ---
        if (action.type === 'next') {
            if (!me.isAdmin || !gameInProgress) return;

            // Calcular puntos
            players.forEach(voter => {
                if (voter.votedFor) {
                    const totalVotesForTarget = players.filter(p => p.votedFor === voter.votedFor).length;
                    
                    if (totalVotesForTarget === 1) {
                        voter.score -= 1; // Voto único (solo o a sí mismo solo)
                    } else {
                        voter.score += totalVotesForTarget; // Consenso
                    }
                }
            });

            roundStage = 'REVEAL';
            broadcast(io);
        }

        // --- SIGUIENTE PREGUNTA (CONTINUE) ---
        if (action.type === 'continue') {
            if (!me.isAdmin) return;
            
            currentRoundIndex++;
            players.forEach(p => p.votedFor = null); // Limpiar votos

            if (currentRoundIndex >= questionsQueue.length) {
                // FIN -> PODIO
                roundStage = 'PODIUM';
                
                // Calcular Podio
                const sorted = [...players].sort((a,b) => b.score - a.score).slice(0, 3);
                io.to('elmas').emit('showPodium', sorted);
                broadcast(io);

                // Cerrar tras 10 segundos
                setTimeout(() => {
                    gameInProgress = false;
                    roundStage = 'LOBBY';
                    
                    // Resetear puntos
                    players.forEach(p => p.score = 0);
                    
                    io.to('elmas').emit('gameEnded');
                    broadcast(io);
                }, 10000);

            } else {
                roundStage = 'VOTING';
                broadcast(io);
            }
        }

        // --- RESET MANUAL ---
        if (action.type === 'reset') {
            if (!me.isAdmin) return;
            gameInProgress = false;
            roundStage = 'LOBBY';
            players.forEach(p => { p.score = 0; p.votedFor = null; });
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