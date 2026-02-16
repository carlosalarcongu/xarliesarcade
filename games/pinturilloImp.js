const database = require('./database');
const Utils = require('./utils');

const rooms = {}; 

const getPublicCategories = () => {
    return Object.keys(database).map(k => ({ id: k, label: database[k].label || k }));
};

function ensureRoom(roomId) {
    if (!rooms[roomId]) {
        rooms[roomId] = {
            id: roomId,
            players: [],
            gameInProgress: false,
            settings: { impostors: 1, rounds: 1, category: 'MIX', hints: false },
            turn: { 
                currentDrawer: null, 
                order: [], 
                currentLap: 1, 
                turnIndex: 0,
                strokesThisTurn: 0 
            },
            canvasHistory: [],
            currentStroke: [],
            chatHistory: [], 
            phase: 'LOBBY',
            turnData: {}
        };
    }
    return rooms[roomId];
}

function broadcast(io, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    const pub = room.players.map(p => ({
        id: p.id,
        name: p.name,
        isAdmin: p.isAdmin,
        isDead: p.isDead,
        hasVoted: !!p.votedFor,
        votes: room.players.filter(v => v.votedFor === p.id).length,
        revealedRole: (p.isDead && room.turnData[p.id]) ? room.turnData[p.id].role : null
    }));

    io.to('pintu_' + roomId).emit('pintuImpUpdate', {
        players: pub, 
        gameInProgress: room.gameInProgress, 
        settings: room.settings, 
        turn: room.turn, 
        phase: room.phase,
        chat: room.chatHistory 
    });
}

function nextTurn(room) {
    room.turn.turnIndex++;
    room.turn.order = room.turn.order.filter(id => room.players.some(p => p.id === id));
    
    const totalTurns = room.turn.order.length * room.settings.rounds;
    
    room.turn.strokesThisTurn = 0; 
    
    if (room.turn.turnIndex >= totalTurns || room.turn.order.length === 0) {
        room.phase = 'VOTE';
        room.turn.currentDrawer = null;
    } else {
        const nextId = room.turn.order[room.turn.turnIndex % room.turn.order.length];
        room.turn.currentLap = Math.floor(room.turn.turnIndex / room.turn.order.length) + 1;
        room.turn.currentDrawer = nextId;
        room.currentStroke = [];
    }
}

const handleSocket = (io, socket) => {
    socket.on('pintuImp_action', (action) => {
        const roomId = socket.data.roomId;
        if (!roomId || !rooms[roomId]) return;

        const room = rooms[roomId];
        const me = room.players.find(p => p.socketId === socket.id);
        if (!me) return;

        // --- ACTUALIZACIÓN DE AJUSTES EN TIEMPO REAL ---
        if (action.type === 'update_settings' && me.isAdmin) {
            if (action.value.rounds) room.settings.rounds = parseInt(action.value.rounds);
            if (action.value.category) room.settings.category = action.value.category;
            // hasOwnProperty es necesario porque false es un valor válido
            if (action.value.hasOwnProperty('hints')) room.settings.hints = !!action.value.hints;
            broadcast(io, roomId);
        }

        // --- START ---
        if (action.type === 'start' && me.isAdmin) {
            if (room.players.length < 2) return;

            // Guardamos configuración final
            room.settings.rounds = parseInt(action.value.rounds) || room.settings.rounds || 1;
            room.settings.category = action.value.category || room.settings.category || 'MIX';
            room.settings.hints = !!action.value.hints;

            let wordPool = [];
            if (room.settings.category === 'MIX') {
                Object.keys(database).forEach(k => { 
                    if(k!=='MIX' && database[k].words) wordPool = wordPool.concat(database[k].words); 
                });
            } else if (database[room.settings.category]) {
                wordPool = database[room.settings.category].words || [];
            }
            if(!wordPool || wordPool.length === 0) wordPool = [{word: "CASA", hint: "Vivienda"}];
            const sel = wordPool[Math.floor(Math.random() * wordPool.length)];

            const playerIds = room.players.map(p => p.id).sort(()=>Math.random()-0.5);
            const numImpostors = Math.min(room.settings.impostors, room.players.length - 1);
            const impostorIds = [];
            const tempIds = [...playerIds];
            for(let i=0; i<numImpostors; i++) {
                const idx = Math.floor(Math.random() * tempIds.length);
                impostorIds.push(tempIds.splice(idx, 1)[0]);
            }

            room.turnData = {};
            room.turn.order = playerIds; 
            room.turn.currentLap = 1;
            room.turn.turnIndex = 0;
            room.turn.strokesThisTurn = 0; 

            room.players.forEach(p => {
                p.isDead = false;
                p.votedFor = null;
                const isImp = impostorIds.includes(p.id);
                
                // --- LÓGICA DE PISTAS CORREGIDA ---
                // Si hints activado: Solo el Impostor ve la pista.
                const showHint = (room.settings.hints && isImp); 
                
                room.turnData[p.id] = { 
                    role: isImp ? 'IMPOSTOR' : 'ARTISTA', 
                    word: sel.word, 
                    hint: showHint ? (sel.hint || "Sin pista") : null
                };
                if(p.socketId) io.to(p.socketId).emit('pintuImpRole', room.turnData[p.id]);
            });

            room.turnData.SUMMARY = { word: sel.word, impostors: impostorIds };

            room.gameInProgress = true;
            room.phase = 'DRAW';
            room.canvasHistory = [];
            room.currentStroke = [];
            room.chatHistory = [];
            room.turn.currentDrawer = room.turn.order[0];

            broadcast(io, roomId);
            io.to('pintu_' + roomId).emit('pintuImpCanvasHistory', room.canvasHistory);
        }

        // --- DRAWING ---
        const isMyTurn = (room.phase === 'DRAW' && room.turn.currentDrawer === me.id);

        if (action.type === 'draw_start' && isMyTurn) {
            room.currentStroke = [action.value];
            socket.broadcast.to('pintu_' + roomId).emit('pintuImpDrawOp', { type: 'start', ...action.value });
        }
        if (action.type === 'draw_move' && isMyTurn) {
            room.currentStroke.push(action.value);
            socket.broadcast.to('pintu_' + roomId).emit('pintuImpDrawOp', { type: 'move', ...action.value });
        }
        if (action.type === 'draw_end' && isMyTurn) {
            if(room.currentStroke.length > 0) {
                room.canvasHistory.push(room.currentStroke);
                room.turn.strokesThisTurn++; 
            }
            room.currentStroke = [];
        }
        
        if (action.type === 'undo' && isMyTurn) {
            if (room.turn.strokesThisTurn > 0 && room.canvasHistory.length > 0) {
                room.canvasHistory.pop();
                room.turn.strokesThisTurn--; 
                io.to('pintu_' + roomId).emit('pintuImpCanvasHistory', room.canvasHistory);
            }
        }

        if (action.type === 'pass' && isMyTurn) {
            nextTurn(room);
            broadcast(io, roomId);
        }

        // --- CHAT (10 segundos) ---
        if (action.type === 'chat') {
            const msg = action.value.trim().substring(0, 50); 
            if(msg) {
                const msgId = Date.now() + Math.random(); 
                room.chatHistory.push({ id: msgId, name: me.name, text: msg });
                broadcast(io, roomId);

                setTimeout(() => {
                    if(rooms[roomId]) { 
                        rooms[roomId].chatHistory = rooms[roomId].chatHistory.filter(m => m.id !== msgId);
                        broadcast(io, roomId);
                    }
                }, 10000);
            }
        }

        // --- VOTING & ADMIN ---
        if (action.type === 'vote' && !me.isDead) {
            me.votedFor = (me.votedFor === action.value) ? null : action.value;
            broadcast(io, roomId);
        }
        if (action.type === 'changeImpostors' && me.isAdmin) {
            room.settings.impostors = Math.max(1, Math.min(room.players.length-1, room.settings.impostors + action.value));
            broadcast(io, roomId);
        }
        if (action.type === 'clearVotes' && me.isAdmin) {
            room.players.forEach(p => p.votedFor = null);
            broadcast(io, roomId);
        }
        if (action.type === 'kick' && me.isAdmin) {
            const targetId = action.value;
            if (room.gameInProgress && room.turn.currentDrawer === targetId) nextTurn(room);
            room.players = room.players.filter(p => p.id !== targetId);
            room.turn.order = room.turn.order.filter(id => id !== targetId);
            
            io.to('pintu_' + roomId).emit('forceRefresh'); 
            broadcast(io, roomId);
        }
        if (action.type === 'kill' && me.isAdmin) {
            const p = room.players.find(x => x.id === action.value);
            if(p) { p.isDead = !p.isDead; if(!p.isDead) p.votedFor=null; broadcast(io, roomId); }
        }
        if (action.type === 'revealResults' && me.isAdmin) {
            const sum = room.turnData.SUMMARY;
            if (sum) {
                const imps = room.players.filter(p => sum.impostors.includes(p.id)).map(p => ({name:p.name, isDead:p.isDead}));
                io.to('pintu_' + roomId).emit('pintuImpSummary', { word: sum.word, impostors: imps });
            }
        }
        if (action.type === 'reset' && me.isAdmin) {
            room.gameInProgress = false;
            room.phase = 'LOBBY';
            room.players.forEach(p => { p.votedFor = null; p.isDead = false; });
            broadcast(io, roomId);
        }
    });
};

const handleJoin = (socket, name, targetRoomId) => {
    let roomId = targetRoomId;
    if (!roomId || roomId === 'NEW') roomId = Utils.getRandomCapital(Object.keys(rooms));
    const room = ensureRoom(roomId);
    
    const existing = room.players.find(p => p.rawName.toLowerCase() === name.trim().toLowerCase());
    if (existing) {
        existing.socketId = socket.id;
        existing.connected = true; 
    } else {
        const p = Utils.createPlayer(socket.id, name);
        p.isDead = false; p.votedFor = null;
        if (room.players.length === 0) p.isAdmin = true;
        room.players.push(p);
    }

    socket.data.roomId = roomId; 
    socket.join('pintu_' + roomId); 
    
    const myPlayer = room.players.find(p => p.socketId === socket.id);

    socket.emit('pintuImpCategories', getPublicCategories());
    socket.emit('joinedSuccess', { playerId: myPlayer.id, name, room: 'pinturilloImp', roomId });
    
    if(room.gameInProgress) {
        if(room.phase === 'DRAW') socket.emit('pintuImpCanvasHistory', room.canvasHistory);
        if(room.turnData[myPlayer.id]) socket.emit('pintuImpRole', room.turnData[myPlayer.id]);
    }
    broadcast(socket.server, roomId);
};

const handleRejoin = (socket, savedId, savedRoomId) => {
    const room = rooms[savedRoomId];
    if (!room) return socket.emit('sessionExpired');

    const p = room.players.find(x => x.id === savedId);
    if(p) {
        p.socketId = socket.id; 
        p.connected = true;
        socket.data.roomId = savedRoomId;
        socket.join('pintu_' + savedRoomId);
        
        socket.emit('pintuImpCategories', getPublicCategories());
        socket.emit('joinedSuccess', { playerId: p.id, name: p.name, room: 'pinturilloImp', roomId: savedRoomId, isRejoin: true });       
        
        if(room.gameInProgress) {
            if(room.turnData[p.id]) socket.emit('pintuImpRole', room.turnData[p.id]);
            if(room.phase === 'DRAW') socket.emit('pintuImpCanvasHistory', room.canvasHistory);
        }
        broadcast(socket.server, savedRoomId);
    } else {
        socket.emit('sessionExpired');
    }
};

const handleLeave = (playerId, roomId, io) => {
    const room = rooms[roomId];
    if(!room) return;

    if (room.gameInProgress && room.turn.currentDrawer === playerId) nextTurn(room);
    room.players = room.players.filter(p => p.id !== playerId);
    room.turn.order = room.turn.order.filter(id => id !== playerId);
    
    if(room.players.length === 0) delete rooms[roomId];
    else { if(!room.players.some(p => p.isAdmin)) room.players[0].isAdmin = true; broadcast(io, roomId); }
};

const getRooms = () => Object.values(rooms).map(r => ({ id: r.id, players: r.players.length, state: r.gameInProgress ? 'GAME' : 'LOBBY' }));

module.exports = { init: (io)=>{}, handleSocket, handleJoin, handleRejoin, handleLeave, getRooms };