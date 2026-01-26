const Utils = require('./utils');
const questionsDB = require('./tabu_words'); 

// ESTADO GLOBAL
let players = [];
let gameInProgress = false;
let settings = { totalRounds: 3, turnDuration: 60, skipsPerTurn: 3 }; 
let turnData = {
    currentTeam: 'BLUE', 
    roundNumber: 1,
    describerId: null, 
    currentCard: null, 
    timer: 60, 
    skipsRemaining: 3, // NUEVO
    teamIndex: { BLUE: 0, RED: 0 }, 
    score: { BLUE: 0, RED: 0 },
    status: 'LOBBY' 
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
    }

    const teamMembers = players.filter(p => p.team === turnData.currentTeam);
    if (teamMembers.length === 0) return nextTurn(io); 

    let idx = turnData.teamIndex[turnData.currentTeam] % teamMembers.length;
    turnData.describerId = teamMembers[idx].id;
    turnData.teamIndex[turnData.currentTeam]++;

    // PRE_TURN
    turnData.status = 'PRE_TURN';
    turnData.timer = 5;
    turnData.currentCard = null;
    
    // REINICIAR SALTOS PARA EL NUEVO TURNO
    turnData.skipsRemaining = settings.skipsPerTurn;
    
    broadcast(io);

    let prepCounter = 5;
    const prepInterval = setInterval(() => {
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

function endGame(io) {
    gameInProgress = false;
    if (turnInterval) clearInterval(turnInterval);
    
    let winner = 'DRAW';
    if (turnData.score.BLUE > turnData.score.RED) winner = 'BLUE';
    if (turnData.score.RED > turnData.score.BLUE) winner = 'RED';

    io.to('tabu').emit('gameOver', { 
        winner, 
        finalScores: turnData.score,
        mvp: players.sort((a,b) => b.individualScore - a.individualScore).slice(0, 5)
    });
    broadcast(io); 
}

const gameModule = (io, socket) => {
    socket.on('tabu_action', (action) => {
        const me = players.find(p => p.socketId === socket.id);
        if (!me) return;

        if (action.type === 'joinTeam') {
            if (gameInProgress) return;
            me.team = action.team; 
            broadcast(io);
        }

        // START (CONFIGURABLE)
        if (action.type === 'start') {
            if (!me.isAdmin) return;
            const blues = players.filter(p => p.team === 'BLUE').length;
            const reds = players.filter(p => p.team === 'RED').length;
            if (blues === 0 || reds === 0) {
                socket.emit('tabu_error', '⚠ Faltan jugadores.\nDebe haber al menos 1 persona en cada equipo.');
                return;
            }

            settings.totalRounds = parseInt(action.rounds) || 3;
            settings.turnDuration = parseInt(action.duration) || 60; // NUEVO
            settings.skipsPerTurn = parseInt(action.skips) || 3;    // NUEVO

            turnData.score = { BLUE: 0, RED: 0 };
            turnData.roundNumber = 0; 
            turnData.currentTeam = 'RED'; 
            turnData.teamIndex = { BLUE: 0, RED: 0 };
            players.forEach(p => p.individualScore = 0);

            gameInProgress = true;
            nextTurn(io);
        }

        if (action.type === 'correct') {
            if (!gameInProgress || turnData.status !== 'PLAYING') return;
            turnData.score[turnData.currentTeam]++;
            const describer = players.find(p => p.id === turnData.describerId);
            if (describer) describer.individualScore++;
            io.to('tabu').emit('playSound', 'correct');
            pickNewCard();
            broadcast(io);
        }

        // ACCIÓN DE SALTAR (SKIP)
        if (action.type === 'skip') {
            if (!gameInProgress || turnData.status !== 'PLAYING') return;
            
            if (turnData.skipsRemaining > 0) {
                turnData.skipsRemaining--;
                io.to('tabu').emit('playSound', 'skip'); // Opcional: añadir sonido si quieres
                pickNewCard();
                broadcast(io);
            }
        }

        if (action.type === 'taboo') {
            if (!gameInProgress || turnData.status !== 'PLAYING') return;
            io.to('tabu').emit('playSound', 'wrong');
            nextTurn(io); 
        }
        
        if (action.type === 'kick' && me.isAdmin) {
            const t = players.find(p => p.id === action.targetId);
            if(t && t.socketId) io.to(t.socketId).emit('sessionExpired');
            players = players.filter(p => p.id !== action.targetId);
            broadcast(io);
        }
        
        if (action.type === 'reset' && me.isAdmin) {
            gameInProgress = false;
            if (turnInterval) clearInterval(turnInterval);
            turnData.score = { BLUE: 0, RED: 0 };
            broadcast(io);
        }
    });

    socket.on('disconnect', () => handleDisconnect(socket));
};

const handleJoin = (socket, name) => {
    if (players.find(p => p.rawName.toLowerCase() === name.trim().toLowerCase())) return socket.emit('joinError', 'Nombre en uso.');
    const basePlayer = Utils.createPlayer(socket.id, name);
    const newPlayer = { ...basePlayer, team: null, individualScore: 0, timeout: null };
    players.push(newPlayer);
    socket.join('tabu');
    socket.emit('joinedSuccess', { playerId: newPlayer.id, room: 'tabu' });
    broadcast(socket.server);
};

const handleRejoin = (socket, savedId) => {
    const p = players.find(x => x.id === savedId);
    if (p) {
        if(p.timeout) { clearTimeout(p.timeout); p.timeout = null; }
        p.socketId = socket.id;
        p.connected = true;
        socket.join('tabu');
        socket.emit('joinedSuccess', { playerId: savedId, room: 'tabu', isRejoin: true });
        broadcast(socket.server);
    } else socket.emit('sessionExpired');
};

const handleLeave = (id) => { 
    const p = players.find(x => x.id === id);
    if(p) {
        if(p.timeout) clearTimeout(p.timeout);
        players = players.filter(x => x.id !== id);
    }
};

const handleDisconnect = (socket) => { 
    const p = players.find(x => x.socketId === socket.id);
    if (p) { 
        p.connected = false; 
        broadcast(socket.server); 
        if(p.timeout) clearTimeout(p.timeout);
        p.timeout = setTimeout(() => { players = players.filter(x => x.id !== p.id); }, 15*60*1000);
    }
};

gameModule.resetInternalState = () => {
    players = [];
    gameInProgress = false;
    if (turnInterval) clearInterval(turnInterval);
    turnData = { currentTeam: 'BLUE', roundNumber: 1, score: { BLUE: 0, RED: 0 } };
};

gameModule.handleJoin = handleJoin;
gameModule.handleRejoin = handleRejoin;
gameModule.handleLeave = handleLeave;
gameModule.handleDisconnect = handleDisconnect;

module.exports = gameModule;