const crypto = require('crypto');
const Utils = require('./utils');

let players = [];
let gameInProgress = false;
let anecdoteQueue = []; // Lista de anécdotas barajadas para jugar
let currentRoundIndex = 0;
let roundStage = 'LOBBY'; // LOBBY, VOTING, REVEAL

// Helper para enviar estado a todos
function broadcast(io) {
    // Preparamos la lista de jugadores con info pública
    const publicPlayers = players.map(p => ({
        id: p.id,
        name: p.name,
        isAdmin: p.isAdmin,
        score: p.score,
        connected: p.connected,
        hasAnecdote: !!p.anecdote && p.anecdote.trim().length > 0, // Para el tick verde
        voted: !!p.votedFor // Para saber si ya votó en la ronda actual
    }));

    // Info de la ronda actual (si estamos jugando)
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

module.exports = {
    init: (io, socket) => {
        socket.on('anecdotas_action', (action) => {
            const me = players.find(p => p.socketId === socket.id);
            if (!me) return;

            // --- LOBBY: GUARDAR ANÉCDOTA ---
            if (action.type === 'saveAnecdote') {
                if (gameInProgress) return;
                const text = action.text.trim();
                if (text.length > 0) {
                    me.anecdote = text;
                    broadcast(io);
                }
            }

            // --- KICK (ECHAR JUGADOR) ---
            if (action.type === 'kick') {
                if (!me.isAdmin) return;
                players = players.filter(p => p.id !== action.targetId);
                broadcast(io);
            }

            // --- LOBBY: INICIAR PARTIDA (ADMIN) ---
            if (action.type === 'start') {
                if (!me.isAdmin) return;
                // Validar que todos tengan anécdota
                const pending = players.filter(p => !p.anecdote || p.anecdote.trim() === "");
                if (pending.length > 0) {
                    socket.emit('errorMsg', `Faltan anécdotas de: ${pending.map(p=>p.name).join(', ')}`);
                    return;
                }
                
                // Preparar partida
                anecdoteQueue = players.map(p => ({ authorId: p.id, text: p.anecdote }));
                // Barajar
                anecdoteQueue = anecdoteQueue.sort(() => Math.random() - 0.5);
                
                currentRoundIndex = 0;
                gameInProgress = true;
                roundStage = 'VOTING';
                players.forEach(p => { p.score = 0; p.votedFor = null; }); // Resetear puntos y votos
                
                broadcast(io);
            }

            // --- JUEGO: VOTAR ---
            if (action.type === 'vote') {
                if (!gameInProgress || roundStage !== 'VOTING') return;
                // No permitir votarse a uno mismo (Opcional, pero recomendado para la lógica)
                // if (action.targetId === me.id) return socket.emit('errorMsg', "No puedes votarte a ti mismo.");
                
                me.votedFor = action.targetId;
                broadcast(io);
            }

            // --- JUEGO: CONTAR Y SIGUIENTE (ADMIN) ---
            if (action.type === 'next') {
                if (!me.isAdmin || !gameInProgress) return;

                // 1. CALCULAR PUNTUACIÓN DE ESTA RONDA
                const currentAnecdote = anecdoteQueue[currentRoundIndex];
                const author = players.find(p => p.id === currentAnecdote.authorId);
                
                // Jugadores que acertaron (excluyendo al propio autor si se votó a sí mismo por error)
                const correctVoters = players.filter(p => p.votedFor === author.id && p.id !== author.id);
                const totalVoters = players.filter(p => p.id !== author.id).length; // Todos menos el autor

                // A) Puntos a los que acertaron
                correctVoters.forEach(p => p.score += 3);

                // B) Puntos al Autor
                if (correctVoters.length === totalVoters) {
                    // Todos acertaron -> +1
                    author.score += 1;
                } else if (correctVoters.length === 0) {
                    // Nadie acertó -> -1
                    author.score -= 1;
                } else {
                    // Caso promedio -> +2
                    author.score += 2;
                }

                // 2. ENVIAR RESULTADO (REVEAL)
                roundStage = 'REVEAL';
                const revealData = {
                    authorName: author.name,
                    correctVotersNames: correctVoters.map(p => p.name),
                    scoreboard: players.map(p => ({ id: p.id, score: p.score }))
                };
                
                io.to('anecdotas').emit('roundReveal', revealData);
                broadcast(io); // Para actualizar tabla de puntos visualmente de fondo

                // 3. PASAR A SIGUIENTE RONDA TRAS 5 SEGUNDOS
                setTimeout(() => {
                    currentRoundIndex++;
                    // Limpiar votos
                    players.forEach(p => p.votedFor = null);

                    if (currentRoundIndex >= anecdoteQueue.length) {
                        // --- FASE PODIO (NUEVO) ---
                        gameInProgress = true; // Seguimos "jugando" técnicamente
                        roundStage = 'PODIUM';
                        
                        // 1. Calcular Ganadores
                        const sorted = [...players].sort((a,b) => b.score - a.score).slice(0, 3);
                        
                        // 2. Enviar Podio
                        io.to('anecdotas').emit('showPodium', sorted);
                        broadcast(io); // Para que actualice el estado de fondo

                        // 3. Esperar 10 segundos antes de resetear
                        setTimeout(() => {
                            gameInProgress = false;
                            roundStage = 'LOBBY';
                            
                            // Resetear datos
                            players.forEach(p => { 
                                p.score = 0; 
                                p.anecdote = ""; 
                                p.votedFor = null;
                            });

                            io.to('anecdotas').emit('gameEnded');
                            broadcast(io);
                        }, 10000); // 10 Segundos de gloria

                    } else {
                        // SIGUIENTE ANÉCDOTA
                        roundStage = 'VOTING';
                        broadcast(io);
                    }                    broadcast(io);
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
    },

    handleJoin: (socket, name) => {
        if (players.find(p => p.rawName.toLowerCase() === name.trim().toLowerCase())) {
            return socket.emit('joinError', 'Nombre en uso.');
        }

        const basePlayer = Utils.createPlayer(socket.id, name);

        // Específico de Anécdotas
        const newPlayer = { ...basePlayer, anecdote: "", votedFor: null };
        
        players.push(newPlayer);
        socket.join('anecdotas');
        socket.emit('joinedSuccess', { playerId: newPlayer.id, room: 'anecdotas' });
        broadcast(socket.server);
    },

    handleRejoin: (socket, savedId) => {
        const p = players.find(x => x.id === savedId);
        if (p) {
            p.socketId = socket.id;
            p.connected = true;
            socket.join('anecdotas');
            socket.emit('joinedSuccess', { playerId: savedId, room: 'anecdotas', isRejoin: true });
            broadcast(socket.server);
        } else {
            socket.emit('sessionExpired');
        }
    },

    handleLeave: (id) => {
        players = players.filter(p => p.id !== id);
    },

    handleDisconnect: (socket) => {
        const p = players.find(x => x.socketId === socket.id);
        if (p) { 
            p.connected = false; 
            broadcast(socket.server);
            // Timeout de borrado si quieres (igual que impostor)
        }
    }
};