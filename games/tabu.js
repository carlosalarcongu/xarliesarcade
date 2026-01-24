const Utils = require('./utils');
const questionsDB = require('./tabu_words');

// ESTADO GLOBAL
let players = [];
let gameInProgress = false;
let settings = { totalRounds: 3, turnDuration: 60 }; // 60 segundos por turno
let turnData = {
    currentTeam: 'BLUE', // 'BLUE' o 'RED'
    roundNumber: 1,
    describerId: null, // ID del jugador que explica
    currentCard: null, // La carta actual
    timer: 60, // Tiempo restante
    teamIndex: { BLUE: 0, RED: 0 }, // Para rotar jugadores equitativamente
    score: { BLUE: 0, RED: 0 }
};

let turnInterval = null;

// HELPERS
function broadcast(io) {
    // Info pública de jugadores (puntos individuales y equipo)
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
    // 1. Limpiar intervalo anterior
    if (turnInterval) clearInterval(turnInterval);

    // 2. Verificar fin de juego
    if (turnData.roundNumber > settings.totalRounds) {
        endGame(io);
        return;
    }

    // 3. Seleccionar siguiente equipo
    // Si era BLUE, pasa a RED. Si era RED, pasa a BLUE y sube ronda.
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

    // 4. Seleccionar "Describer" (rotativo)
    const teamMembers = players.filter(p => p.team === turnData.currentTeam);
    if (teamMembers.length === 0) return endGame(io); // No hay jugadores en el equipo

    // Índice rotativo
    let idx = turnData.teamIndex[turnData.currentTeam] % teamMembers.length;
    turnData.describerId = teamMembers[idx].id;
    
    // Preparar siguiente índice para el futuro
    turnData.teamIndex[turnData.currentTeam]++;

    // 5. Iniciar cuenta atrás de "Preparación" (5s) antes de empezar
    turnData.status = 'PRE_TURN';
    turnData.timer = 5;
    
    // Limpiamos carta actual para que no se vea
    turnData.currentCard = null;
    broadcast(io);

    // Cuenta atrás 5s
    let prepCounter = 5;
    const prepInterval = setInterval(() => {
        prepCounter--;
        turnData.timer = prepCounter;
        broadcast(io);

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

    // CRONÓMETRO FÉRREO (Tick cada segundo)
    turnInterval = setInterval(() => {
        turnData.timer--;
        
        // Sincronización cada segundo
        if (turnData.timer <= 0) {
            // Fin del tiempo del turno
            clearInterval(turnInterval);
            // Sonido de tiempo agotado
            io.to('tabu').emit('playSound', 'timeout');
            nextTurn(io);
        } else {
            // Optimización: Solo emitimos el tiempo, no todo el estado pesado
            io.to('tabu').emit('timerTick', turnData.timer);
        }
    }, 1000);
}

function pickNewCard() {
    const random = questionsDB[Math.floor(Math.random() * questionsDB.length)];
    turnData.currentCard = random;
}

function endGame(io) {
    gameInProgress = false;
    if (turnInterval) clearInterval(turnInterval);
    
    // Determinar ganador
    let winner = 'DRAW';
    if (turnData.score.BLUE > turnData.score.RED) winner = 'BLUE';
    if (turnData.score.RED > turnData.score.BLUE) winner = 'RED';

    io.to('tabu').emit('gameOver', { 
        winner, 
        finalScores: turnData.score,
        mvp: [...players].sort((a,b) => b.individualScore - a.individualScore)
    });
}

// MÓDULO HÍBRIDO
const gameModule = (io, socket) => {
    
    socket.on('tabu_action', (action) => {
        const me = players.find(p => p.socketId === socket.id);
        if (!me) return;

        // --- LOBBY: ELEGIR EQUIPO ---
        if (action.type === 'joinTeam') {
            if (gameInProgress) return;
            me.team = action.team; // 'BLUE' o 'RED'
            broadcast(io);
        }

        // --- START (ADMIN) ---
        if (action.type === 'start') {
            if (!me.isAdmin) return;
            // Validar equipos
            const blues = players.filter(p => p.team === 'BLUE').length;
            const reds = players.filter(p => p.team === 'RED').length;
            
            if (blues === 0 || reds === 0) {
                return socket.emit('errorMsg', 'Ambos equipos necesitan jugadores.');
            }

            settings.totalRounds = parseInt(action.rounds) || 3;
            
            // Resetear estado
            turnData.score = { BLUE: 0, RED: 0 };
            turnData.roundNumber = 0; // Se incrementará a 1 en nextTurn
            turnData.currentTeam = 'RED'; // Truco: Ponemos RED para que nextTurn cambie a BLUE al empezar
            turnData.teamIndex = { BLUE: 0, RED: 0 };
            players.forEach(p => p.individualScore = 0);

            gameInProgress = true;
            nextTurn(io);
        }

        // --- JUEGO: ACIERTO ---
        if (action.type === 'correct') {
            if (!gameInProgress || turnData.status !== 'PLAYING') return;
            
            // Sumar punto al equipo actual
            turnData.score[turnData.currentTeam]++;
            
            // Sumar punto individual al describer
            const describer = players.find(p => p.id === turnData.describerId);
            if (describer) describer.individualScore++;

            io.to('tabu').emit('playSound', 'correct'); // Sonido ding
            pickNewCard();
            broadcast(io);
        }

        // --- JUEGO: TABÚ (ERROR) ---
        if (action.type === 'taboo') {
            if (!gameInProgress || turnData.status !== 'PLAYING') return;

            // REGLA DEL PROMPT: "Se termina la ronda del equipo"
            io.to('tabu').emit('playSound', 'wrong'); // Sonido error
            
            // Pasamos turno inmediatamente
            nextTurn(io);
        }
        
        // --- KICK ---
        if (action.type === 'kick') {
            if (!me.isAdmin) return;
            players = players.filter(p => p.id !== action.targetId);
            broadcast(io);
        }
        
        // --- RESET ---
        if (action.type === 'reset') {
            if (!me.isAdmin) return;
            endGame(io); // Fuerza fin
            broadcast(io);
        }
    });

    socket.on('disconnect', () => {
        handleDisconnect(socket);
    });
};

// GESTIÓN DE SALA
const handleJoin = (socket, name) => {
    if (players.find(p => p.rawName.toLowerCase() === name.trim().toLowerCase())) return socket.emit('joinError', 'Nombre en uso.');
    const basePlayer = Utils.createPlayer(socket.id, name);
    // Por defecto sin equipo
    const newPlayer = { ...basePlayer, team: null, individualScore: 0 };
    players.push(newPlayer);
    socket.join('tabu');
    socket.emit('joinedSuccess', { playerId: newPlayer.id, room: 'tabu' });
    broadcast(socket.server);
};

const handleRejoin = (socket, savedId) => {
    const p = players.find(x => x.id === savedId);
    if (p) {
        p.socketId = socket.id;
        p.connected = true;
        socket.join('tabu');
        socket.emit('joinedSuccess', { playerId: savedId, room: 'tabu', isRejoin: true });
        broadcast(socket.server);
    } else socket.emit('sessionExpired');
};

const handleLeave = (id) => { players = players.filter(p => p.id !== id); };
const handleDisconnect = (socket) => { 
    const p = players.find(x => x.socketId === socket.id);
    if (p) { p.connected = false; broadcast(socket.server); }
};

gameModule.handleJoin = handleJoin;
gameModule.handleRejoin = handleRejoin;
gameModule.handleLeave = handleLeave;
gameModule.handleDisconnect = handleDisconnect;

module.exports = gameModule;