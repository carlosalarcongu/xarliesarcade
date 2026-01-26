const database = require('./database');
const Utils = require('./utils');

let players = [];
let gameInProgress = false;
let settings = { impostors: 1, rounds: 1, category: 'MIX', hints: false };
let turn = { currentDrawer: null, order: [], currentLap: 1, turnIndex: 0 };
let canvasHistory = [];
let currentStroke = [];
let phase = 'LOBBY'; 
let turnData = {}; 

// --- HELPER: Obtener categorías para el frontend ---
const getPublicCategories = () => {
    return Object.keys(database).map(k => ({
        id: k,
        label: database[k].label || k
    }));
};
// --------------------------------------------------

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
    io.to('pinturilloImp').emit('pintuImpUpdate', {
        players: pub, gameInProgress, settings, turn, phase
    });
}

const gameModule = (io, socket) => {
    socket.on('pintuImp_action', (action) => {
        const me = players.find(p => p.socketId === socket.id);
        if (!me) return;

        if (action.type === 'start' && me.isAdmin) {
            if (players.length < 2) return;
            
            settings.rounds = parseInt(action.value.rounds) || 1;
            settings.category = action.value.category || 'MIX';
            settings.hints = !!action.value.hints;
            
            // LÓGICA DATABASE ACTUALIZADA
            let wordPool = [];
            if (settings.category === 'MIX') {
                // Cogemos todas menos MIX
                Object.keys(database).forEach(k => { 
                    if(k!=='MIX' && database[k].words) {
                        wordPool = wordPool.concat(database[k].words); 
                    }
                });
            } else if (database[settings.category]) {
                wordPool = database[settings.category].words || [];
            }

            // Fallback
            if(!wordPool || wordPool.length === 0) wordPool = [{word: "CASA", hint: "Vivienda"}, {word: "SOL", hint: "Astro"}];
            
            const sel = wordPool[Math.floor(Math.random() * wordPool.length)];
            
            // Roles
            const indices = players.map((_,i)=>i).sort(()=>Math.random()-0.5);
            const numImpostors = Math.min(settings.impostors, players.length - 1);
            const impIdx = indices.slice(0, numImpostors);
            
            turnData = {};
            turn.order = indices; 
            turn.currentLap = 1;
            turn.turnIndex = 0; 
            
            players.forEach((p, i) => {
                p.isDead = false;
                p.votedFor = null;
                const isImp = impIdx.includes(i);
                
                turnData[p.id] = { 
                    role: isImp ? 'IMPOSTOR' : 'ARTISTA', 
                    word: sel.word,
                    // Soporte para estructura {word, hint}
                    hint: (settings.hints && !isImp) ? (sel.hint || "Sin pista") : null
                };
                if(p.socketId) io.to(p.socketId).emit('pintuImpRole', turnData[p.id]);
            });

            turnData.SUMMARY = { 
                word: sel.word, 
                impostors: players.filter((_,i) => impIdx.includes(i)).map(p=>p.id) 
            };

            gameInProgress = true;
            phase = 'DRAW';
            canvasHistory = [];
            currentStroke = [];
            turn.currentDrawer = players[turn.order[0]].id;
            
            broadcast(io);
            io.to('pinturilloImp').emit('pintuImpCanvasHistory', canvasHistory);
        }

        // ... (Resto de acciones: changeImpostors, draw_*, undo, pass, vote... IGUALES) ...
        // Simplemente copia el bloque de acciones anterior, no ha cambiado la lógica interna
        // Solo asegúrate de copiar todo el bloque de ifs que tenías antes.
        
        if (action.type === 'changeImpostors' && me.isAdmin) {
            settings.impostors = Math.max(1, Math.min(players.length-1, settings.impostors + action.value));
            broadcast(io);
        }
        if (action.type === 'draw_start' && phase === 'DRAW' && turn.currentDrawer === me.id) {
            currentStroke = [action.value];
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
            turn.turnIndex++;
            const totalTurns = players.length * settings.rounds;
            if (turn.turnIndex >= totalTurns) {
                phase = 'VOTE';
                turn.currentDrawer = null;
            } else {
                const nextIdx = turn.turnIndex % players.length;
                turn.currentLap = Math.floor(turn.turnIndex / players.length) + 1;
                turn.currentDrawer = players[turn.order[nextIdx]].id;
            }
            broadcast(io);
        }
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
            if(p) { p.isDead = !p.isDead; if(!p.isDead) p.votedFor=null; broadcast(io); }
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
    if (players.find(p => p.rawName.toLowerCase() === name.trim().toLowerCase())) return socket.emit('joinError', 'Nombre en uso.');
    const p = Utils.createPlayer(socket.id, name);
    p.isDead = false; p.votedFor = null;
    players.push(p);
    socket.join('pinturilloImp');
    
    // CAMBIO: ENVIAR CATEGORIAS AL ENTRAR
    socket.emit('pintuImpCategories', getPublicCategories());
    socket.emit('joinedSuccess', { playerId: p.id, name: p.name, room: 'pinturilloImp' });
    
    broadcast(socket.server);
};

const handleRejoin = (socket, savedId) => {
    const p = players.find(x => x.id === savedId);
    if(p) {
        p.socketId = socket.id; p.connected = true;
        socket.join('pinturilloImp');
        
        // CAMBIO: ENVIAR CATEGORIAS AL RECONECTAR
        socket.emit('pintuImpCategories', getPublicCategories());
        socket.emit('joinedSuccess', { playerId: p.id, name: p.name, room: 'pinturilloImp', isRejoin: true });       
        if(gameInProgress) {
            if(turnData[p.id]) socket.emit('pintuImpRole', turnData[p.id]);
            if(phase === 'DRAW') socket.emit('pintuImpCanvasHistory', canvasHistory);
        }
        broadcast(socket.server);
    } else socket.emit('sessionExpired');
};

const handleLeave = (id) => { players = players.filter(p => p.id !== id); };
const handleDisconnect = (socket) => {
    const p = players.find(x => x.socketId === socket.id);
    if(p) { p.connected = false; broadcast(socket.server); setTimeout(() => { if(!p.connected) handleLeave(p.id); }, 900000); }
};

gameModule.resetInternalState = () => { players = []; gameInProgress = false; phase='LOBBY'; canvasHistory=[]; };
gameModule.handleJoin = handleJoin;
gameModule.handleRejoin = handleRejoin;
gameModule.handleLeave = handleLeave;
gameModule.handleDisconnect = handleDisconnect;

module.exports = gameModule;