const crypto = require('crypto');
const questionsDB = require('./preguntas_elmas');
const Utils = require('./utils');

let players = [];
let gameInProgress = false;
let questionsQueue = [];
let currentRoundIndex = 0;
let maxRounds = 5;
let roundStage = 'LOBBY'; // LOBBY, VOTING, REVEAL, PODIUM

function broadcast(io) {
    // Calcular votos recibidos por cada jugador en ESTA ronda para mostrarlos
    const playersPublic = players.map(p => {
        // Contar cuántos le han votado a ESTE jugador
        const votesReceivedCount = players.filter(voter => voter.votedFor === p.id).length;
        
        return {
            id: p.id,
            name: p.name,
            isAdmin: p.isAdmin,
            score: p.score,
            connected: p.connected,
            voted: !!p.votedFor, // Si ya ha votado
            votesInThisRound: (roundStage === 'REVEAL') ? votesReceivedCount : null // Solo mostrar votos en el reveal
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

module.exports = {
    init: (io, socket) => {
        socket.on('elmas_action', (action) => {
            const me = players.find(p => p.socketId === socket.id);
            if (!me) return;

            // --- KICK (ECHAR JUGADOR) ---
            if (action.type === 'kick') {
                if (!me.isAdmin) return;
                players = players.filter(p => p.id !== action.targetId);
                broadcast(io);
            }

            // --- LOBBY: START ---
            if (action.type === 'start') {
                if (!me.isAdmin) return;
                maxRounds = parseInt(action.rounds) || 5;
                
                // Preparar preguntas aleatorias
                questionsQueue = [...questionsDB].sort(() => Math.random() - 0.5).slice(0, maxRounds);
                
                currentRoundIndex = 0;
                gameInProgress = true;
                roundStage = 'VOTING';
                players.forEach(p => { p.score = 0; p.votedFor = null; });
                
                broadcast(io);
            }

            // --- JUEGO: VOTAR ---
            if (action.type === 'vote') {
                if (!gameInProgress || roundStage !== 'VOTING') return;
                me.votedFor = action.targetId;
                broadcast(io);
            }

            // --- JUEGO: SIGUIENTE / RESULTADOS ---
            if (action.type === 'next') {
                if (!me.isAdmin || !gameInProgress) return;

                // 1. CALCULAR PUNTOS
                players.forEach(voter => {
                    if (voter.votedFor) {
                        // Contar cuántos en TOTAL votaron a ese mismo objetivo (incluyéndose a sí mismo)
                        const totalVotesForTarget = players.filter(p => p.votedFor === voter.votedFor).length;
                        
                        if (totalVotesForTarget === 1) {
                            // Solo le votaste tú (o te votaste solo a ti mismo y nadie más) -> Resta 1
                            voter.score -= 1;
                        } else {
                            // Alguien más le votó -> Sumas N+1 (que es igual a totalVotesForTarget)
                            voter.score += totalVotesForTarget;
                        }
                    }
                });

                roundStage = 'REVEAL';
                broadcast(io);

                // Esperar un poco para ver resultados antes de pasar
                // (O dejar que el admin pulse siguiente manualmente, pero dijiste 10s al final, 
                // aquí haremos transición automática de ronda o manual? 
                // Haremos manual el paso a la siguiente pregunta para que el admin controle el ritmo de las risas)
            }

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
                        io.to('elmas').emit('gameEnded');
                        broadcast(io);
                    }, 10000);

                } else {
                    roundStage = 'VOTING';
                    broadcast(io);
                }
            }

            if (action.type === 'reset') {
                if (!me.isAdmin) return;
                gameInProgress = false;
                roundStage = 'LOBBY';
                players.forEach(p => { p.score = 0; p.votedFor = null; });
                broadcast(io);
            }
        });
    },

    handleJoin: (socket, name) => {
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
    },

    handleRejoin: (socket, savedId) => {
        const p = players.find(x => x.id === savedId);
        if (p) {
            p.socketId = socket.id;
            p.connected = true;
            socket.join('elmas');
            socket.emit('joinedSuccess', { playerId: savedId, room: 'elmas', isRejoin: true });
            broadcast(socket.server);
        } else { socket.emit('sessionExpired'); }
    },

    handleLeave: (id) => { players = players.filter(p => p.id !== id); },
    handleDisconnect: (socket) => { 
        const p = players.find(x => x.socketId === socket.id);
        if(p) { p.connected=false; broadcast(socket.server); }
    }
};