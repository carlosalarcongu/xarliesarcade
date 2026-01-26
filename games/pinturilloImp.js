const database = require('./database');
const Utils = require('./utils');

let players = [];
let gameInProgress = false;
let settings = { impostors: 1 };
let turn = { currentDrawer: null, order: [] };
let canvasHistory = []; // Array de trazos (cada trazo es array de puntos)
let currentStroke = [];
let phase = 'LOBBY'; // LOBBY, DRAW, VOTE
let turnData = {}; // Roles y palabras

function broadcast(io) {
    const pub = players.map(p => ({
        id: p.id,
        name: p.name,
        isAdmin: p.isAdmin,
        isDead: p.isDead,
        hasVoted: !!p.votedFor,
        votes: players.filter(v => v.votedFor === p.id).length,
        revealedRole: (p.isDead && turnData[p.id]) ? turnData[p.id].role : null
    }));
    // Emitimos a la sala 'pinturilloImp' con el evento 'pintuImpUpdate'
    io.to('pinturilloImp').emit('pintuImpUpdate', {
        players: pub, gameInProgress, settings, turn, phase
    });
}

const gameModule = (io, socket) => {
    // Escuchamos el evento 'pintuImp_action'
    socket.on('pintuImp_action', (action) => {
        const me = players.find(p => p.socketId === socket.id);
        if (!me) return;

        if (action.type === 'start' && me.isAdmin) {
            if (players.length < 2) return;
            
            let wordPool = [];
            // Asumiendo que database tiene categorías como IMPOSIBLE, OBJETO, etc.
            Object.keys(database).forEach(k => { if(k!=='MIX') wordPool = wordPool.concat(database[k].words); });
            
            // Fallback si no hay palabras
            if(wordPool.length === 0) wordPool = [{word: "CASA"}, {word: "ARBOL"}];
            
            const sel = wordPool[Math.floor(Math.random() * wordPool.length)];
            
            // Roles
            const indices = players.map((_,i)=>i).sort(()=>Math.random()-0.5);
            // Asegurar que no hay más impostores que jugadores - 1
            const numImpostors = Math.min(settings.impostors, players.length - 1);
            const impIdx = indices.slice(0, numImpostors);
            
            turnData = {};
            turn.order = indices; // Orden de dibujo
            
            players.forEach((p, i) => {
                p.isDead = false;
                p.votedFor = null;
                const isImp = impIdx.includes(i);
                turnData[p.id] = { role: isImp?'IMPOSTOR':'ARTISTA', word: sel.word };
                if(p.socketId) io.to(p.socketId).emit('pintuImpRole', turnData[p.id]);
            });

            // Guardar info para resumen
            turnData.SUMMARY = { 
                word: sel.word, 
                impostors: players.filter((_,i) => impIdx.includes(i)).map(p=>p.id) 
            };

            gameInProgress = true;
            phase = 'DRAW';
            canvasHistory = [];
            currentStroke = [];
            
            // Primer turno
            turn.currentDrawer = players[turn.order[0]].id;
            broadcast(io);
            io.to('pinturilloImp').emit('pintuImpCanvasHistory', canvasHistory);
        }

        if (action.type === 'changeImpostors' && me.isAdmin) {
            settings.impostors = Math.max(1, Math.min(players.length-1, settings.impostors + action.value));
            broadcast(io);
        }

        // --- DRAWING LOGIC ---
        if (action.type === 'draw_start' && phase === 'DRAW' && turn.currentDrawer === me.id) {
            currentStroke = [action.value];
            // Broadcast a los demás en la sala
            socket.broadcast.to('pinturilloImp').emit('pintuImpDrawOp', { type: 'start', ...action.value });
        }
        if (action.type === 'draw_move' && phase === 'DRAW' && turn.currentDrawer === me.id) {
            currentStroke.push(action.value);
            socket.broadcast.to('pinturilloImp').emit('pintuImpDrawOp', { type: 'move', ...action.value });
        }
        if (action.type === 'draw_end' && phase === 'DRAW' && turn.currentDrawer === me.id) {
            if(currentStroke.length > 0) canvasHistory.push(currentStroke);
            currentStroke = [];
        }

        if (action.type === 'undo' && phase === 'DRAW' && turn.currentDrawer === me.id) {
            if (canvasHistory.length > 0) {
                canvasHistory.pop();
                io.to('pinturilloImp').emit('pintuImpCanvasHistory', canvasHistory);
            }
        }

        if (action.type === 'pass' && phase === 'DRAW' && turn.currentDrawer === me.id) {
            // Buscar índice actual en el orden de turno
            const currentIdx = turn.order.findIndex(idx => players[idx].id === me.id);
            
            if (currentIdx !== -1 && currentIdx < turn.order.length - 1) {
                // Siguiente jugador
                turn.currentDrawer = players[turn.order[currentIdx + 1]].id;
            } else {
                // Fin de ronda de dibujo -> Votación
                phase = 'VOTE';
                turn.currentDrawer = null;
            }
            broadcast(io);
        }

        // --- VOTING ---
        if (action.type === 'vote' && phase === 'VOTE' && !me.isDead) {
            me.votedFor = (me.votedFor === action.value) ? null : action.value;
            broadcast(io);
        }
        
        if (action.type === 'clearVotes' && me.isAdmin) {
            players.forEach(p => p.votedFor = null);
            broadcast(io);
        }

        if (action.type === 'kick' && me.isAdmin) {
            const target = players.find(p => p.id === action.value);
            if (target) {
                if(target.socketId) io.to(target.socketId).emit('sessionExpired');
                players = players.filter(p => p.id !== action.value);
                broadcast(io);
            }
        }
        if (action.type === 'kill' && me.isAdmin) {
            const p = players.find(x => x.id === action.value);
            if(p) { 
                p.isDead = !p.isDead; 
                if(!p.isDead) p.votedFor=null; 
                broadcast(io); 
            }
        }

        if (action.type === 'revealResults' && me.isAdmin) {
            const sum = turnData.SUMMARY;
            if (sum) {
                const imps = players.filter(p => sum.impostors.includes(p.id)).map(p => ({name:p.name, isDead:p.isDead}));
                io.to('pinturilloImp').emit('pintuImpSummary', { word: sum.word, impostors: imps });
            }
        }

        if (action.type === 'reset' && me.isAdmin) {
            gameInProgress = false;
            phase = 'LOBBY';
            players.forEach(p => { p.votedFor = null; p.isDead = false; });
            broadcast(io);
        }
    });
};

const handleJoin = (socket, name) => {
    // Buscar si ya existe
    if (players.find(p => p.rawName.toLowerCase() === name.trim().toLowerCase())) {
        // Podríamos intentar reconexión aquí si estuviéramos usando la lógica completa de los otros juegos
        // Por simplicidad en este ejemplo nuevo:
        return socket.emit('joinError', 'Nombre en uso.');
    }
    
    const p = Utils.createPlayer(socket.id, name);
    // Campos específicos
    p.isDead = false; 
    p.votedFor = null;
    
    players.push(p);
    socket.join('pinturilloImp');
    socket.emit('joinedSuccess', { playerId: p.id, room: 'pinturilloImp' });
    broadcast(socket.server);
};

const handleRejoin = (socket, savedId) => {
    const p = players.find(x => x.id === savedId);
    if(p) {
        p.socketId = socket.id; 
        p.connected = true;
        socket.join('pinturilloImp');
        
        socket.emit('joinedSuccess', { playerId: p.id, room: 'pinturilloImp', isRejoin: true });
        
        // Restaurar estado si está en partida
        if(gameInProgress) {
            if(turnData[p.id]) socket.emit('pintuImpRole', turnData[p.id]);
            if(phase === 'DRAW') socket.emit('pintuImpCanvasHistory', canvasHistory);
        }
        broadcast(socket.server);
    } else {
        socket.emit('sessionExpired');
    }
};

const handleLeave = (id) => { 
    players = players.filter(p => p.id !== id); 
};

const handleDisconnect = (socket) => {
    // Implementar si necesitas timeout de desconexión como en los otros juegos
    const p = players.find(x => x.socketId === socket.id);
    if(p) {
        p.connected = false;
        broadcast(socket.server);
        // Timeout simple para limpiar
        setTimeout(() => {
            if(!p.connected) handleLeave(p.id);
        }, 15 * 60000); // 15 min
    }
};

// Reset para tests
gameModule.resetInternalState = () => { 
    players = []; 
    gameInProgress = false; 
    phase='LOBBY'; 
    canvasHistory=[]; 
};

gameModule.handleJoin = handleJoin;
gameModule.handleRejoin = handleRejoin;
gameModule.handleLeave = handleLeave;
gameModule.handleDisconnect = handleDisconnect; // No olvides exportar esto si lo usas en server.js

module.exports = gameModule;