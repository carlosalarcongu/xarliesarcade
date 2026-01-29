const Utils = require('./utils');
const questionsDB = require('./tabu_words'); 

// ESTADO GLOBAL
let players = [];
let gameInProgress = false;
let isPaused = false; // NUEVO: Estado de pausa

let settings = { totalRounds: 3, turnDuration: 60, skipsPerTurn: 3, pauseBetweenRounds: false }; 

let turnData = {
    currentTeam: 'BLUE', 
    roundNumber: 1,
    describerId: null, 
    currentCard: null, 
    timer: 60, 
    skipsRemaining: 3,
    teamIndex: { BLUE: 0, RED: 0 }, 
    score: { BLUE: 0, RED: 0 },
    status: 'LOBBY', // LOBBY, PRE_TURN, PLAYING, PAUSED
    lastRoundWinner: null, // Para mostrar resultados intermedios
    lastRoundMVP: []
};

let turnInterval = null;

// HELPERS
function broadcast(io) {
    const publicPlayers = players.map(p => ({
        id: p.id,
        name: p.name,
        isAdmin: p.isAdmin,
        team: p.team,
        individualScore: p.individualScore
    }));

    io.to('tabu').emit('updateTabuState', {
        players: publicPlayers,
        gameInProgress,
        isPaused,
        turnData,
        settings
    });
}

function nextTurn(io) {
    if (turnInterval) clearInterval(turnInterval);

    // Cambio de equipo
    if (turnData.currentTeam === 'BLUE') {
        turnData.currentTeam = 'RED';
    } else {
        turnData.currentTeam = 'BLUE';
        turnData.roundNumber++;
        
        // Comprobar fin de partida o pausa entre rondas
        if (turnData.roundNumber > settings.totalRounds) {
            endGame(io);
            return;
        }
        
        if (settings.pauseBetweenRounds) {
            isPaused = true;
            turnData.status = 'PAUSED';
            broadcast(io);
            return;
        }
    }

    startPreTurn(io);
}

function startPreTurn(io) {
    const teamMembers = players.filter(p => p.team === turnData.currentTeam);
    if (teamMembers.length === 0) return nextTurn(io); // Si equipo vacío, saltar

    let idx = turnData.teamIndex[turnData.currentTeam] % teamMembers.length;
    turnData.describerId = teamMembers[idx].id;
    turnData.teamIndex[turnData.currentTeam]++;

    // PRE_TURN
    turnData.status = 'PRE_TURN';
    turnData.timer = 5;
    turnData.currentCard = null;
    turnData.skipsRemaining = settings.skipsPerTurn;
    
    broadcast(io);

    let prepCounter = 5;
    const prepInterval = setInterval(() => {
        if (!gameInProgress || isPaused) { clearInterval(prepInterval); return; }

        prepCounter--;
        turnData.timer = prepCounter;
        io.to('tabu').emit('timerTick', prepCounter); 

        if (prepCounter <= 0) {
            clearInterval(prepInterval);
            startPlayingPhase(io);
        }
    }, 1000);
}

function startPlayingPhase(io) {
    turnData.status = 'PLAYING';
    turnData.timer = settings.turnDuration;
    pickNewCard();
    broadcast(io);

    if (turnInterval) clearInterval(turnInterval);

    turnInterval = setInterval(() => {
        if (!gameInProgress || isPaused) { clearInterval(turnInterval); return; }

        turnData.timer--;
        
        if (turnData.timer <= 0) {
            clearInterval(turnInterval);
            io.to('tabu').emit('playSound', 'timeout');
            
            // Mostrar MVP de la ronda/turno antes de cambiar (Opcional, aquí cambiamos directo)
            nextTurn(io);
        } else {
            io.to('tabu').emit('timerTick', turnData.timer);
        }
    }, 1000);
}

function pickNewCard() {
    const fallbackDB = [
        { word: "MANZANA", forbidden: ["FRUTA", "ROJA", "COMER", "BLANCANIEVES"] },
        { word: "COCHE", forbidden: ["RUEDAS", "VOLANTE", "MOTOR", "CONDUCIR"] },
        { word: "FUTBOL", forbidden: ["PELOTA", "GOL", "PORTERIA", "DEPORTE"] }
    ];
    const db = (questionsDB && questionsDB.length > 0) ? questionsDB : fallbackDB;
    const random = db[Math.floor(Math.random() * db.length)];
    turnData.currentCard = random;
}

function endGame(io) {
    gameInProgress = false;
    if (turnInterval) clearInterval(turnInterval);
    
    let winner = 'DRAW';
    if (turnData.score.BLUE > turnData.score.RED) winner = 'BLUE';
    if (turnData.score.RED > turnData.score.BLUE) winner = 'RED';

    // Calcular MVP del equipo ganador (o global si empate)
    const winningTeamPlayers = winner === 'DRAW' ? players : players.filter(p => p.team === winner);
    const mvpList = winningTeamPlayers.sort((a,b) => b.individualScore - a.individualScore).slice(0, 5);

    io.to('tabu').emit('gameOver', { 
        winner, 
        finalScores: turnData.score,
        mvp: mvpList
    });
    
    broadcast(io); 
}

const gameModule = (io, socket) => {
    socket.on('tabu_action', (action) => {
        const me = players.find(p => p.socketId === socket.id);
        if (!me) return;

        // UNIRSE A EQUIPO
        if (action.type === 'joinTeam') {
            if (gameInProgress) return;
            me.team = action.team; 
            broadcast(io);
        }

        // --- ACCIONES DE ADMIN ---
        if (me.isAdmin) {
            // RANDOMIZAR EQUIPOS
            if (action.type === 'randomizeTeams') {
                if (gameInProgress) return;
                
                // Mezclar array
                const shuffled = players.sort(() => Math.random() - 0.5);
                // Asignar mitad y mitad
                shuffled.forEach((p, index) => {
                    p.team = (index % 2 === 0) ? 'BLUE' : 'RED';
                });
                broadcast(io);
            }

            // KICK JUGADOR
            if (action.type === 'kick') {
                const target = players.find(p => p.id === action.targetId);
                if (target) {
                    if(target.socketId) io.to(target.socketId).emit('sessionExpired');
                    players = players.filter(p => p.id !== action.targetId);
                    broadcast(io);
                }
            }

            // INICIAR / REANUDAR
            if (action.type === 'start') {
                const blues = players.filter(p => p.team === 'BLUE').length;
                const reds = players.filter(p => p.team === 'RED').length;
                if (blues === 0 || reds === 0) {
                    socket.emit('tabu_error', '⚠ Faltan jugadores.\nDebe haber al menos 1 persona en cada equipo.');
                    return;
                }

                // Si venimos de pausa, reanudar
                if (isPaused) {
                    isPaused = false;
                    turnData.status = 'PRE_TURN'; // Ojo: reinicia el pre-turno
                    startPreTurn(io);
                    broadcast(io);
                    return;
                }

                // Configuración inicial
                settings.totalRounds = parseInt(action.rounds) || 3;
                settings.turnDuration = parseInt(action.duration) || 60;
                settings.skipsPerTurn = parseInt(action.skips) || 3;
                settings.pauseBetweenRounds = !!action.pauseOn; // Nuevo

                turnData.score = { BLUE: 0, RED: 0 };
                turnData.roundNumber = 0; 
                turnData.currentTeam = 'RED'; // Para que nextTurn empiece con BLUE
                turnData.teamIndex = { BLUE: 0, RED: 0 };
                players.forEach(p => p.individualScore = 0);

                gameInProgress = true;
                isPaused = false;
                nextTurn(io);
            }

            // PAUSAR MANUALMENTE
            if (action.type === 'pause') {
                if (!gameInProgress) return;
                isPaused = !isPaused;
                // Si despausamos, hay que ver en qué estado estábamos (simplificado: reiniciar turno actual o next)
                if(!isPaused && turnData.status === 'PAUSED') {
                    nextTurn(io);
                }
                broadcast(io);
            }

            // RESET
            if (action.type === 'reset') {
                gameInProgress = false;
                isPaused = false;
                if (turnInterval) clearInterval(turnInterval);
                turnData.score = { BLUE: 0, RED: 0 };
                broadcast(io);
            }
        }

        // --- ACCIONES DE JUEGO (JUGADOR ACTIVO) ---
        // Solo el describer puede enviar esto
        if (gameInProgress && !isPaused && turnData.status === 'PLAYING' && me.id === turnData.describerId) {
            
            if (action.type === 'correct') {
                turnData.score[turnData.currentTeam]++;
                me.individualScore++;
                io.to('tabu').emit('playSound', 'correct');
                pickNewCard();
                broadcast(io);
            }

            if (action.type === 'skip') {
                if (turnData.skipsRemaining > 0) {
                    turnData.skipsRemaining--;
                    io.to('tabu').emit('playSound', 'skip');
                    pickNewCard();
                    broadcast(io);
                }
            }

            if (action.type === 'taboo') {
                io.to('tabu').emit('playSound', 'wrong');
                nextTurn(io); 
            }
        }
    });

    socket.on('disconnect', () => handleDisconnect(socket));
};

const handleJoin = (socket, name) => {
    if (players.find(p => p.rawName.toLowerCase() === name.trim().toLowerCase())) return socket.emit('joinError', 'Nombre en uso.');
    const basePlayer = Utils.createPlayer(socket.id, name);
    const newPlayer = { ...basePlayer, team: null, individualScore: 0, timeout: null };
    
    // Si es el primero, hacerlo admin
    if(players.length === 0) newPlayer.isAdmin = true;

    players.push(newPlayer);
    socket.join('tabu');
    socket.emit('joinedSuccess', { playerId: newPlayer.id, name: newPlayer.name, room: 'tabu' });
    broadcast(socket.server);
};

const handleRejoin = (socket, savedId) => {
    const p = players.find(x => x.id === savedId);
    if (p) {
        if(p.timeout) { clearTimeout(p.timeout); p.timeout = null; }
        p.socketId = socket.id;
        p.connected = true;
        socket.join('tabu');
        socket.emit('joinedSuccess', { playerId: savedId, name: p.name, room: 'tabu', isRejoin: true });
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

gameModule.resetInternalState = () => {
    players = [];
    gameInProgress = false;
    isPaused = false;
    if (turnInterval) clearInterval(turnInterval);
    turnData = { currentTeam: 'BLUE', roundNumber: 1, score: { BLUE: 0, RED: 0 }, status: 'LOBBY' };
};

gameModule.handleJoin = handleJoin;
gameModule.handleRejoin = handleRejoin;
gameModule.handleLeave = handleLeave;
gameModule.handleDisconnect = handleDisconnect;

module.exports = gameModule;