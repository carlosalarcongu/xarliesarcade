const Utils = require('./utils');
const questionsDB = require('./tabu_words'); 

// ESTADO GLOBAL
let players = [];
let gameInProgress = false;
let isPaused = false;

// Configuración por defecto
let settings = { 
    totalRounds: 3, 
    turnDuration: 60, 
    skipsPerTurn: 3, 
    pauseBetweenRounds: false 
}; 

let turnData = {
    currentTeam: 'BLUE', 
    roundNumber: 1,
    describerId: null, 
    currentCard: null, 
    timer: 60, 
    skipsRemaining: 3,
    teamIndex: { BLUE: 0, RED: 0 }, 
    score: { BLUE: 0, RED: 0 },
    status: 'LOBBY', 
    lastRoundWinner: null, 
    lastRoundMVP: []
};

let turnInterval = null;

// --- FUNCIÓN DE RESET COMPARTIDA ---
function performReset(io) {
    gameInProgress = false;
    isPaused = false;
    if (turnInterval) clearInterval(turnInterval);
    turnData = { 
        currentTeam: 'BLUE', 
        roundNumber: 1, 
        score: { BLUE: 0, RED: 0 }, 
        teamIndex: { BLUE: 0, RED: 0 },
        status: 'LOBBY' 
    };
    broadcast(io);
}

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

    if (turnData.currentTeam === 'BLUE') {
        turnData.currentTeam = 'RED';
    } else {
        turnData.currentTeam = 'BLUE';
        turnData.roundNumber++;
        
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
    if (teamMembers.length === 0) return nextTurn(io); 

    let idx = turnData.teamIndex[turnData.currentTeam] % teamMembers.length;
    turnData.describerId = teamMembers[idx].id;
    turnData.teamIndex[turnData.currentTeam]++;

    turnData.status = 'PRE_TURN';
    turnData.timer = 5;
    turnData.currentCard = null;
    turnData.skipsRemaining = settings.skipsPerTurn;
    
    broadcast(io);

    let prepCounter = 5;
    const prepInterval = setInterval(() => {
        if (!gameInProgress || isPaused || turnData.status === 'ENDED') { 
            clearInterval(prepInterval); return; 
        }

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
        if (!gameInProgress || isPaused || turnData.status === 'ENDED') { 
            clearInterval(turnInterval); return; 
        }

        turnData.timer--;
        
        if (turnData.timer <= 0) {
            clearInterval(turnInterval);
            io.to('tabu').emit('playSound', 'timeout');
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

// --- MODIFICADO: ENDGAME MANTIENE EL JUEGO ACTIVO 10s ---
function endGame(io) {
    if (turnInterval) clearInterval(turnInterval);
    
    // Mantenemos gameInProgress = true para que el frontend siga en la pantalla de juego
    turnData.status = 'ENDED'; 
    
    let winner = 'DRAW';
    if (turnData.score.BLUE > turnData.score.RED) winner = 'BLUE';
    if (turnData.score.RED > turnData.score.BLUE) winner = 'RED';

    const winningTeamPlayers = winner === 'DRAW' ? players : players.filter(p => p.team === winner);
    const mvpList = winningTeamPlayers.sort((a,b) => b.individualScore - a.individualScore).slice(0, 5);

    // Emitimos el evento de victoria
    io.to('tabu').emit('gameOver', { 
        winner, 
        finalScores: turnData.score,
        mvp: mvpList
    });
    
    // Actualizamos estado (para que los nuevos que entren vean que acabó)
    broadcast(io); 

    // Temporizador del servidor para resetear todo en 10s
    setTimeout(() => {
        // Solo reseteamos si seguimos en estado ENDED (por si el admin reinició manualmente antes)
        if (turnData.status === 'ENDED') {
            performReset(io);
        }
    }, 10000);
}

const gameModule = (io, socket) => {
    socket.on('tabu_action', (action) => {
        const me = players.find(p => p.socketId === socket.id);
        if (!me) return;

        if (action.type === 'joinTeam') {
            if (gameInProgress && turnData.status !== 'ENDED') return;
            me.team = action.team; 
            broadcast(io);
        }

        // --- ACCIONES DE ADMIN ---
        if (me.isAdmin) {
            
            if (action.type === 'updateSettings') {
                if (action.rounds) settings.totalRounds = parseInt(action.rounds);
                if (action.duration) settings.turnDuration = parseInt(action.duration);
                if (action.skips) settings.skipsPerTurn = parseInt(action.skips);
                if (typeof action.pauseOn !== 'undefined') settings.pauseBetweenRounds = !!action.pauseOn;
                broadcast(io);
            }

            if (action.type === 'randomizeTeams') {
                if (gameInProgress) return;
                const shuffled = players.sort(() => Math.random() - 0.5);
                shuffled.forEach((p, index) => {
                    p.team = (index % 2 === 0) ? 'BLUE' : 'RED';
                });
                broadcast(io);
            }

            if (action.type === 'kick') {
                const target = players.find(p => p.id === action.targetId);
                if (target) {
                    if(target.socketId) io.to(target.socketId).emit('sessionExpired');
                    players = players.filter(p => p.id !== action.targetId);
                    broadcast(io);
                }
            }

            if (action.type === 'start') {
                const blues = players.filter(p => p.team === 'BLUE').length;
                const reds = players.filter(p => p.team === 'RED').length;
                if (blues === 0 || reds === 0) {
                    socket.emit('tabu_error', '⚠ Faltan jugadores.\nDebe haber al menos 1 persona en cada equipo.');
                    return;
                }

                if (isPaused) {
                    isPaused = false;
                    turnData.status = 'PRE_TURN'; 
                    startPreTurn(io);
                    broadcast(io);
                    return;
                }

                turnData.score = { BLUE: 0, RED: 0 };
                turnData.roundNumber = 0; 
                turnData.currentTeam = 'RED'; 
                turnData.teamIndex = { BLUE: 0, RED: 0 };
                players.forEach(p => p.individualScore = 0);

                gameInProgress = true;
                isPaused = false;
                nextTurn(io);
            }

            if (action.type === 'pause') {
                if (!gameInProgress) return;
                isPaused = !isPaused;
                if(!isPaused && turnData.status === 'PAUSED') {
                    nextTurn(io);
                }
                broadcast(io);
            }

            if (action.type === 'reset') {
                performReset(io);
            }
        }

        // --- JUEGO ---
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
        
        if (players.length === 0) {
            performReset(io);
        } else if (io) {
            broadcast(io);
        }
    }
};

const handleDisconnect = (socket) => { 
    Utils.handleDisconnect(socket.id, players, () => {
        // Si se vacía, reset total
        players = [];
        performReset(socket.server); 
        // Nota: performReset requiere 'io', pero si el socket se desconecta, 
        // socket.server es la referencia a io.
    });
    if (socket.server) broadcast(socket.server);
};

gameModule.resetInternalState = () => {
    players = [];
    // Reset dummy IO object if needed, or just reset vars
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