const Utils = require('./utils');

const rooms = {};

const defaultSettings = { 
    totalRounds: 6, 
    turnDuration: 60 
};

function createRoom(roomId) {
    rooms[roomId] = {
        id: roomId,
        players: [],
        gameInProgress: false,
        settings: { ...defaultSettings },
        state: {
            round: 0,
            type: null, // 'NUMBERS' | 'LETTERS'
            phase: 'LOBBY', // LOBBY, PRE_ROUND, PLAYING, SCORING, PODIUM
            target: null,
            dataset: [],
            timer: 0
        },
        scoresBuffer: {},
        interval: null,
        inactivityTimer: null
    };
    return rooms[roomId];
}

function destroyRoom(roomId) {
    if (rooms[roomId]) {
        if (rooms[roomId].interval) clearInterval(rooms[roomId].interval);
        delete rooms[roomId];
    }
}

function checkRoomInactivity(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    const active = room.players.filter(p => p.connected);
    if (active.length === 0) {
        if (room.inactivityTimer) clearTimeout(room.inactivityTimer);
        room.inactivityTimer = setTimeout(() => destroyRoom(roomId), 20 * 60 * 1000); 
    } else {
        if (room.inactivityTimer) {
            clearTimeout(room.inactivityTimer);
            room.inactivityTimer = null;
        }
    }
}

function broadcast(io, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    const publicPlayers = room.players.map(p => ({
        id: p.id,
        name: p.name,
        isAdmin: p.isAdmin,
        score: p.score,
        connected: p.connected,
        roundScore: room.scoresBuffer[p.id] !== undefined ? room.scoresBuffer[p.id] : null
    }));

    io.to('cyl_' + roomId).emit('updateCyL', {
        players: publicPlayers,
        state: room.state,
        settings: room.settings
    });
}

function generateNumbers() {
    const large = [25, 50, 75, 100];
    const small = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10];
    const set = [];
    
    // Selección: 1 Grande y 5 Pequeños (Estándar TV)
    const largeIdx = Math.floor(Math.random() * large.length);
    set.push(large[largeIdx]);
    
    const smallCopy = [...small];
    for(let i=0; i<5; i++) {
        const idx = Math.floor(Math.random() * smallCopy.length);
        set.push(smallCopy[idx]);
        smallCopy.splice(idx, 1);
    }
    
    // GENERACIÓN DE OBJETIVO SOLUBLE (Algoritmo Inverso)
    // Partimos de los números disponibles y aplicamos operaciones aleatorias
    // para llegar a un resultado. Así garantizamos que ES posible (o muy cercano).
    let currentValues = [...set];
    let steps = Math.floor(Math.random() * 3) + 2; // Realizar entre 2 y 4 operaciones
    
    // Clonamos para no modificar el set original que se enviará al cliente
    let workingSet = [...currentValues];

    while (steps > 0 && workingSet.length > 1) {
        // Coger dos números al azar
        const idx1 = Math.floor(Math.random() * workingSet.length);
        const num1 = workingSet[idx1];
        workingSet.splice(idx1, 1);
        
        const idx2 = Math.floor(Math.random() * workingSet.length);
        const num2 = workingSet[idx2];
        workingSet.splice(idx2, 1);

        // Operación aleatoria válida
        const ops = ['+', '*', '-'];
        // Solo dividir si es exacta y útil
        if (num2 !== 0 && num1 % num2 === 0) ops.push('/');
        else if (num1 !== 0 && num2 % num1 === 0) ops.push('/');

        const op = ops[Math.floor(Math.random() * ops.length)];
        let res = 0;

        if (op === '+') res = num1 + num2;
        else if (op === '*') res = num1 * num2;
        else if (op === '-') res = Math.abs(num1 - num2);
        else if (op === '/') res = (num1 > num2) ? num1 / num2 : num2 / num1;

        // Evitar ceros o números negativos intermedios que no aportan
        if (res > 0) workingSet.push(res);
        else workingSet.push(num1); // Si falla, devolvemos uno

        steps--;
    }

    // El objetivo es el último número generado (o uno de los que queden)
    // Aseguramos que esté en rango 100-999. Si no, forzamos uno aleatorio (fallback raro)
    let target = workingSet[0];
    if (target < 100 || target > 999) {
        target = Math.floor(Math.random() * 899) + 101; 
    }

    return { target, set };
}

function generateLetters() {
    // Bolsa ponderada para español/castellano
    const weights = {
        'A': 12, 'E': 12, 'O': 9, 'I': 7, 'U': 5, // Vocales (45%)
        'S': 6, 'N': 6, 'R': 6, 'L': 5, 'D': 5, 'C': 4, 'T': 4, 'M': 3, 'P': 3, 'B': 2, // Frecuentes
        'G': 2, 'V': 1, 'Y': 1, 'Q': 1, 'H': 1, 'F': 1, 'J': 1, 'Z': 1, 'Ñ': 1, 'X': 0.5, 'K': 0.1, 'W': 0.1 // Resto
    };

    const pool = [];
    Object.keys(weights).forEach(char => {
        // Multiplicamos por 10 para tener enteros en el array
        const count = Math.ceil(weights[char] * 2); 
        for(let i=0; i<count; i++) pool.push(char);
    });

    const set = [];
    
    // Estructura fija: Al menos 4 vocales y 5 consonantes para asegurar jugabilidad
    const vowels = ['A','E','I','O','U'];
    const consonants = pool.filter(c => !vowels.includes(c));
    
    // 4 Vocales
    for(let i=0; i<4; i++) set.push(vowels[Math.floor(Math.random() * vowels.length)]);
    // 5 Consonantes
    for(let i=0; i<5; i++) set.push(consonants[Math.floor(Math.random() * consonants.length)]);
    // 3 Aleatorias (del pool general ponderado)
    for(let i=0; i<3; i++) set.push(pool[Math.floor(Math.random() * pool.length)]);

    return { target: null, set: set.sort(() => Math.random() - 0.5) };
}


function startRound(io, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    room.state.round++;
    if (room.state.round > room.settings.totalRounds) {
        endGame(io, roomId);
        return;
    }

    // Alternar: Impar = Cifras, Par = Letras
    room.state.type = (room.state.round % 2 !== 0) ? 'NUMBERS' : 'LETTERS';
    room.state.phase = 'PRE_ROUND';
    room.state.timer = 5;
    room.scoresBuffer = {};
    
    broadcast(io, roomId);

    let cd = 5;
    const preInt = setInterval(() => {
        if(!room) { clearInterval(preInt); return; }
        cd--;
        room.state.timer = cd;
        io.to('cyl_' + roomId).emit('timerTick', cd);
        
        if (cd <= 0) {
            clearInterval(preInt);
            playPhase(io, roomId);
        }
    }, 1000);
}

function playPhase(io, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    if (room.state.type === 'NUMBERS') {
        const data = generateNumbers();
        room.state.target = data.target;
        room.state.dataset = data.set;
    } else {
        const data = generateLetters();
        room.state.target = null;
        room.state.dataset = data.set;
    }

    room.state.phase = 'PLAYING';
    room.state.timer = room.settings.turnDuration;
    broadcast(io, roomId);

    if (room.interval) clearInterval(room.interval);
    room.interval = setInterval(() => {
        if(!rooms[roomId]) return clearInterval(room.interval);
        room.state.timer--;
        
        if (room.state.timer <= 0) {
            clearInterval(room.interval);
            room.state.phase = 'SCORING';
            io.to('cyl_' + roomId).emit('playSound', 'timeout');
            broadcast(io, roomId);
        } else {
            io.to('cyl_' + roomId).emit('timerTick', room.state.timer);
        }
    }, 1000);
}

function endGame(io, roomId) {
    const room = rooms[roomId];
    room.state.phase = 'PODIUM';
    broadcast(io, roomId);

    setTimeout(() => {
        if (rooms[roomId]) {
            rooms[roomId].gameInProgress = false;
            rooms[roomId].state.phase = 'LOBBY';
            rooms[roomId].state.round = 0;
            rooms[roomId].players.forEach(p => p.score = 0);
            broadcast(io, roomId);
        }
    }, 10000);
}

const handleSocket = (io, socket) => {
    socket.on('cyl_action', (action) => {
        const roomId = socket.data.roomId;
        const room = rooms[roomId];
        if (!room) return;

        const me = room.players.find(p => p.socketId === socket.id);
        if (!me) return;

        if (me.isAdmin) {
            if (action.type === 'updateSettings') {
                if (action.rounds) room.settings.totalRounds = parseInt(action.rounds);
                if (action.duration) room.settings.turnDuration = parseInt(action.duration);
                broadcast(io, roomId);
            }

            if (action.type === 'start') {
                room.gameInProgress = true;
                room.state.round = 0;
                room.players.forEach(p => p.score = 0);
                startRound(io, roomId);
            }

            if (action.type === 'kick') {
                handleLeave(action.targetId, roomId, io, true);
            }

            // PUNTUACIÓN CIFRAS (0, 2, 5)
            if (action.type === 'scoreNumber') {
                const targetP = room.players.find(p => p.id === action.targetId);
                if (targetP) {
                    // action.val: 0, 2, 5
                    room.scoresBuffer[targetP.id] = parseInt(action.val);
                    broadcast(io, roomId);
                }
            }

            // PUNTUACIÓN LETRAS (Input numérico)
            if (action.type === 'scoreLetter') {
                const targetP = room.players.find(p => p.id === action.targetId);
                if (targetP) {
                    room.scoresBuffer[targetP.id] = parseInt(action.val) || 0;
                    broadcast(io, roomId);
                }
            }

            if (action.type === 'confirmRound') {
                // Aplicar puntuaciones del buffer
                room.players.forEach(p => {
                    if (room.scoresBuffer[p.id]) {
                        p.score += room.scoresBuffer[p.id];
                    }
                });
                startRound(io, roomId);
            }
            
            if (action.type === 'reset') {
                room.gameInProgress = false;
                room.state.phase = 'LOBBY';
                room.state.round = 0;
                if (room.interval) clearInterval(room.interval);
                broadcast(io, roomId);
            }
        }
    });

    socket.on('disconnect', () => {
        const rId = socket.data.roomId;
        if (rId && rooms[rId]) {
            Utils.handleDisconnect(socket.id, rooms[rId].players, () => checkRoomInactivity(rId));
            broadcast(io, rId);
        }
    });
};

const handleJoin = (socket, nameRaw, targetRoomId) => {
    const cleanName = nameRaw.replace(/👑|👤/g, '').trim();
    let room;

    if (!targetRoomId || targetRoomId === 'NEW') {
        if (Object.keys(rooms).length >= 4) return socket.emit('joinError', 'Máximo de salas alcanzado.');
        const newId = Utils.getRandomCapital(Object.keys(rooms));
        room = createRoom(newId);
    } else {
        room = rooms[targetRoomId];
        if (!room) {
             if (Object.keys(rooms).length < 4) room = createRoom(targetRoomId);
             else return socket.emit('joinError', 'La sala no existe.');
        }
    }

    socket.join('cyl_' + room.id);
    socket.data.roomId = room.id;

    const existing = room.players.find(p => p.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
        if (!existing.connected) return handleRejoin(socket, existing.id, room.id);
        return socket.emit('joinError', 'Nombre en uso.');
    }

    const newPlayer = Utils.createPlayer(socket.id, cleanName);
    newPlayer.score = 0;
    if (room.players.length === 0 || cleanName.toLowerCase() === 'admin') newPlayer.isAdmin = true;

    room.players.push(newPlayer);
    
    socket.emit('joinedSuccess', { playerId: newPlayer.id, name: newPlayer.name, room: 'cifrasyletras', roomId: room.id });
    checkRoomInactivity(room.id);
    broadcast(socket.server, room.id);
};

const handleRejoin = (socket, savedId, savedRoomId) => {
    const room = rooms[savedRoomId];
    if (!room) return socket.emit('sessionExpired');

    const p = room.players.find(x => x.id === savedId);
    if (p) {
        if (p.timeout) clearTimeout(p.timeout);
        p.socketId = socket.id;
        p.connected = true;
        socket.join('cyl_' + room.id);
        socket.data.roomId = room.id;
        socket.emit('joinedSuccess', { playerId: savedId, name: p.name, room: 'cifrasyletras', roomId: room.id, isRejoin: true });
        broadcast(socket.server, room.id);
    } else {
        socket.emit('sessionExpired');
    }
};

const handleLeave = (playerId, roomId, io, forced = false) => {
    const room = rooms[roomId];
    if (!room) return;

    if (forced) {
        const p = room.players.find(x => x.id === playerId);
        if(p && p.socketId) io.to(p.socketId).emit('sessionExpired');
    }

    const wasAdmin = room.players.find(p => p.id === playerId)?.isAdmin;
    room.players = room.players.filter(p => p.id !== playerId);
    
    if (wasAdmin && room.players.length > 0) room.players[0].isAdmin = true;
    
    checkRoomInactivity(roomId);
    if (room.players.length === 0) {
        destroyRoom(roomId);
    } else {
        broadcast(io, roomId);
    }
};

module.exports = {
    init: (io) => {},
    handleSocket,
    handleJoin,
    handleRejoin,
    handleLeave,
    getRooms: () => Object.values(rooms).map(r => ({ id: r.id, players: r.players.length, state: r.gameInProgress ? 'JUGANDO' : 'LOBBY' }))
};