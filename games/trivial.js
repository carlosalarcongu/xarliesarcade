const Utils = require('./utils');
const DATA = require('./trivial_data');

const rooms = {};
let io;

// --- MODELO DE TABLERO "RUEDA DE CARRO" ---
// Total 42 casillas.
// 0 = Centro (Hub)
// 1-36 = Círculo Exterior (6 secciones de 6 casillas)
// Para simplificar la lógica de movimiento en esta versión, mantenemos un grafo circular
// pero visualmente lo pintaremos distinto.
const BOARD_SIZE = 42;
const CAT_ORDER = ['GEO', 'ENT', 'HIS', 'ART', 'CIE', 'DEP'];

function getCategoryForNode(nodeId) {
    if (nodeId % 7 === 0) return 'HUB'; // Casillas de quesito
    // Mapeo cíclico de colores
    return CAT_ORDER[(nodeId % 6)];
}

function calculateMoves(currentPos, steps) {
    // Lógica circular simple (Adelante/Atrás)
    let forward = (currentPos + steps) % BOARD_SIZE;
    let backward = (currentPos - steps);
    if (backward < 0) backward = BOARD_SIZE + backward;
    return [...new Set([forward, backward])];
}

function ensureRoom(socket, roomId) {
    if (!rooms[roomId]) {
        rooms[roomId] = {
            id: roomId,
            phase: 'LOBBY', 
            players: [],
            teams: [], 
            activeTeamIndex: 0,
            usedQuestions: [],
            gameLog: [], // <--- NUEVO: Historial de la partida
            boardState: {
                dice: null,
                possibleMoves: [],
                currentCard: null,
                failures: 0
            },
            config: { maxErrors: 1 },
            timer: null
        };
        addTeamToRoom(rooms[roomId], '#e84118', 'Equipo Rojo');
        addTeamToRoom(rooms[roomId], '#00a8ff', 'Equipo Azul');
    }
    
    socket.join('trivial_' + roomId);
    let p = rooms[roomId].players.find(x => x.socketId === socket.id);
    if (!p) {
        p = Utils.createPlayer(socket.id, "Jugador");
        rooms[roomId].players.push(p);
    }
    return rooms[roomId];
}

function addTeamToRoom(room, color, name) {
    const id = 'T' + Date.now() + Math.floor(Math.random()*100);
    room.teams.push({
        id: id, name: name || `Equipo ${room.teams.length + 1}`, color: color,
        members: [], pos: 0, cheeses: [], turn: false
    });
}

function addLog(room, text, type = 'info') {
    const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute:'2-digit' });
    room.gameLog.unshift({ time, text, type }); // Añadir al principio
    if (room.gameLog.length > 50) room.gameLog.pop(); // Limitar historial
}

function broadcast(roomId) {
    const r = rooms[roomId];
    if(!r || !io) return;
    io.to('trivial_' + roomId).emit('trivialUpdate', {
        phase: r.phase,
        teams: r.teams,
        players: r.players,
        board: r.boardState,
        activeTeamId: r.teams[r.activeTeamIndex]?.id,
        gameLog: r.gameLog, // Enviamos el log
        categories: DATA.CATEGORIES 
    });
}

// --- SOCKET HANDLER ---
const handleSocket = (ioInstance, socket) => {
    if (!io) io = ioInstance;

    socket.on('trivial_action', (action) => {
        const roomId = socket.data.roomId || 'TRIVIAL-MAIN';
        const room = ensureRoom(socket, roomId);
        const player = room.players.find(p => p.socketId === socket.id);
        if(!player) return;
        const isAdmin = room.players[0].socketId === socket.id || player.isAdmin;

        // ... (LOBBY ACTIONS: joinTeam, addTeam... IGUAL QUE ANTES) ...
        if (action.type === 'joinTeam') {
            room.teams.forEach(t => t.members = t.members.filter(m => m.id !== player.id));
            if (action.teamId !== 'SPECTATOR') {
                const target = room.teams.find(t => t.id === action.teamId);
                if (target) target.members.push({ id: player.id, name: player.name });
            }
            broadcast(roomId);
        }
        if (action.type === 'addTeam' && isAdmin) {
            if (room.teams.length >= 6) return;
            const colors = ['#4cd137', '#fbc531', '#9c88ff', '#7f8fa6'];
            addTeamToRoom(room, colors[room.teams.length % colors.length]);
            broadcast(roomId);
        }
        if (action.type === 'startGame' && isAdmin) {
            if(room.teams.some(t => t.members.length > 0)) {
                room.phase = 'GAME';
                room.activeTeamIndex = 0;
                room.teams[0].turn = true;
                addLog(room, "¡La partida ha comenzado!", "system");
                broadcast(roomId);
            }
        }

        // ... (GAME ACTIONS) ...

        if (action.type === 'rollDice') {
            const activeTeam = room.teams[room.activeTeamIndex];
            const isMember = activeTeam.members.some(m => m.id === player.id);
            if (!isMember && !isAdmin) return;
            if (room.boardState.dice !== null || room.boardState.currentCard !== null) return;

            const result = Math.floor(Math.random() * 6) + 1;
            // Animación
            io.to('trivial_' + roomId).emit('trivialAnim', { type: 'dice', value: result });
            
            setTimeout(() => {
                room.boardState.dice = result;
                room.boardState.possibleMoves = calculateMoves(activeTeam.pos, result);
                broadcast(roomId);
            }, 1500); // Un poco más de tiempo para el shake
        }

        if (action.type === 'moveToken') {
            const activeTeam = room.teams[room.activeTeamIndex];
            if (!room.boardState.possibleMoves.includes(action.nodeId)) return;
            
            activeTeam.pos = action.nodeId;
            room.boardState.dice = null;
            room.boardState.possibleMoves = [];
            
            // Selección de categoría
            const catKey = getCategoryForNode(action.nodeId);
            let targetCat = catKey;
            
            // Si es HUB (Quesito), elige una que le falte
            if (catKey === 'HUB') {
                const missing = Object.keys(DATA.CATEGORIES).filter(k => k !== 'HUB' && !activeTeam.cheeses.includes(k));
                targetCat = missing.length > 0 ? missing[Math.floor(Math.random() * missing.length)] : CAT_ORDER[Math.floor(Math.random() * CAT_ORDER.length)];
            }

            // Pregunta
            let pool = DATA.QUESTIONS.filter(q => q.c === targetCat && !room.usedQuestions.includes(q.id));
            if (pool.length === 0) pool = DATA.QUESTIONS.filter(q => q.c === targetCat);
            
            const question = pool[Math.floor(Math.random() * pool.length)];
            if(question) { 
                room.usedQuestions.push(question.id);
                room.boardState.currentCard = {
                    q: question.q,
                    a: question.a,
                    cat: targetCat,
                    isCheese: catKey === 'HUB'
                };
            }
            broadcast(roomId);
        }

        if (action.type === 'validateAnswer' && isAdmin) {
            const success = action.correct;
            const activeTeam = room.teams[room.activeTeamIndex];
            const card = room.boardState.currentCard;
            const catInfo = DATA.CATEGORIES[card.cat];

            if (success) {
                io.to('trivial_' + roomId).emit('playSound', 'correct');
                room.boardState.failures = 0;
                
                let logMsg = `${activeTeam.name} acertó en ${catInfo.name}.`;
                let type = 'success';

                // Quesito
                if (card.isCheese && !activeTeam.cheeses.includes(card.cat)) {
                    activeTeam.cheeses.push(card.cat);
                    io.to('trivial_' + roomId).emit('playSound', 'cheese_get');
                    logMsg += ` ¡Y consiguió el quesito! 🧀`;
                    type = 'cheese';
                }
                addLog(room, logMsg, type);

                if (activeTeam.cheeses.length >= 6) {
                    room.phase = 'PODIUM';
                    addLog(room, `🏆 ${activeTeam.name} HA GANADO LA PARTIDA 🏆`, 'gold');
                    broadcast(roomId);
                    room.timer = setTimeout(() => {
                        room.phase = 'LOBBY';
                        room.teams.forEach(t => { t.cheeses = []; t.pos = 0; });
                        broadcast(roomId);
                    }, 30000);
                    return;
                }
                room.boardState.currentCard = null;
            } else {
                io.to('trivial_' + roomId).emit('playSound', 'wrong');
                addLog(room, `${activeTeam.name} falló en ${catInfo.name}.`, 'error');
                room.boardState.failures++;
                
                if (room.boardState.failures >= room.config.maxErrors) {
                    addLog(room, `Cambio de turno.`, 'info');
                    nextTurn(room);
                } else {
                    room.boardState.currentCard = null;
                }
            }
            room.boardState.currentCard = null;
            broadcast(roomId);
        }

        if (action.type === 'admin_nextTurn' && isAdmin) {
            addLog(room, "Admin forzó el cambio de turno.", "info");
            nextTurn(room);
            broadcast(roomId);
        }
        
        if (action.type === 'admin_endGame' && isAdmin) { room.phase = 'PODIUM'; broadcast(roomId); }
        if (action.type === 'admin_backToLobby' && isAdmin) { room.phase = 'LOBBY'; broadcast(roomId); }
    });

    socket.on('disconnect', () => {
        const rId = socket.data.roomId;
        if (rooms[rId]) {
            Utils.handleDisconnect(socket.id, rooms[rId].players, () => {
                if(rooms[rId].players.length === 0) delete rooms[rId];
            });
            broadcast(rId);
        }
    });
};

function nextTurn(room) {
    room.teams[room.activeTeamIndex].turn = false;
    room.activeTeamIndex = (room.activeTeamIndex + 1) % room.teams.length;
    const nextTeam = room.teams[room.activeTeamIndex];
    nextTeam.turn = true;
    room.boardState.dice = null;
    room.boardState.currentCard = null;
    room.boardState.possibleMoves = [];
    room.boardState.failures = 0;
}

module.exports = { init: (i)=>{io=i}, handleSocket, handleJoin: require('./trivial').handleJoin }; // Reutilizamos el handleJoin del ejemplo anterior si estaba bien, o lo defines aqui.
// Para simplificar, asegúrate de que server.js llama a init y handleJoin correctamente.