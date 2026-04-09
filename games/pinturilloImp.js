const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../arcade.db'));
const Utils = require('./utils');

const rooms = {}; 

const getPublicCategories = () => {
    const rows = db.prepare(`SELECT DISTINCT categoria, aux1 FROM impostor_data`).all();
    const categories = [{ id: 'MIX', label: '🎲 Aleatorio (Mix)' }];
    rows.forEach(r => {
        categories.push({ id: r.categoria, label: r.aux1 || r.categoria });
    });
    return categories;
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

        if (action.type === 'update_settings' && me.isAdmin) {
            if (action.value.rounds) room.settings.rounds = parseInt(action.value.rounds);
            if (action.value.category) room.settings.category = action.value.category;
            if (action.value.hasOwnProperty('hints')) room.settings.hints = !!action.value.hints;
            broadcast(io, roomId);
        }

        if (action.type === 'start' && me.isAdmin) {
            if (room.players.length < 2) return;

            room.settings.rounds = parseInt(action.value.rounds) || room.settings.rounds || 1;
            room.settings.category = action.value.category || room.settings.category || 'MIX';
            room.settings.hints = !!action.value.hints;

            let wordPool = [];
            if (room.settings.category === 'MIX') {
                wordPool = db.prepare(`SELECT palabra as word, pista as hint FROM impostor_data`).all();
            } else {
                wordPool = db.prepare(`SELECT palabra as word, pista as hint FROM impostor_data WHERE categoria = ?`).all(room.settings.category);
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

const handleJoin = (socket, nameRaw, targetRoomId, data = {}) => {
    const cleanName = nameRaw.replace(/👑|👤/g, '').trim();
    const uuid = data.uuid || socket.id;
    let roomId = targetRoomId;

    if (!roomId || roomId === 'NEW') {
        if (Object.keys(rooms).length >= 4) return socket.emit('joinError', 'Máximo de salas alcanzado.');
        roomId = Utils.getRandomCapital(Object.keys(rooms));
    }
    const room = ensureRoom(roomId);

    socket.join('pintu_' + room.id);
    socket.data.roomId = room.id;
    socket.data.uuid = uuid;

    let p = room.players.find(player => player.uuid === uuid);

    if (p) {
        if (p.timeout) clearTimeout(p.timeout);
        p.socketId = socket.id;
        p.connected = true;
        p.name = cleanName;
    } else {
        const existingName = room.players.find(player => player.name.toLowerCase() === cleanName.toLowerCase());
        if (existingName && existingName.connected) return socket.emit('joinError', 'Nombre en uso.');

        p = Utils.createPlayer(socket.id, cleanName);
        p.uuid = uuid;
        p.isDead = false;
        p.votedFor = null;

        const lowerName = cleanName.toLowerCase();
        if (room.players.length === 0 || ['administrador m', 'xarlie', 'musero'].includes(lowerName)) {
            p.isAdmin = true;
        }
        
        room.players.push(p);
    }

    socket.emit('pintuImpCategories', getPublicCategories());
    socket.emit('joinedSuccess', { playerId: p.id, name: p.name, room: 'pinturilloImp', roomId: room.id });
    
    if(room.gameInProgress) {
        if(room.phase === 'DRAW') socket.emit('pintuImpCanvasHistory', room.canvasHistory);
        if(room.turnData[p.id]) socket.emit('pintuImpRole', room.turnData[p.id]);
    }
    
    broadcast(socket.server, room.id);
};

const handleRejoin = (socket, savedId, savedRoomId, data = {}) => {
    const room = rooms[savedRoomId];
    if (!room) return socket.emit('sessionExpired');

    const uuid = data.uuid;
    const p = room.players.find(x => x.uuid === uuid || x.id === savedId);
    
    if(p) {
        if (p.timeout) clearTimeout(p.timeout);
        p.socketId = socket.id; 
        p.connected = true;
        p.uuid = uuid || p.uuid;
        
        socket.data.roomId = savedRoomId;
        socket.data.uuid = p.uuid;
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

const handleLeave = (playerId, roomId, io, forced = false) => {
    const room = rooms[roomId];
    if(!room) return;

    if (forced) {
        const p = room.players.find(x => x.id === playerId);
        if(p && p.socketId) io.to(p.socketId).emit('sessionExpired');
    }

    if (room.gameInProgress && room.turn.currentDrawer === playerId) nextTurn(room);
    
    const wasAdmin = room.players.find(p => p.id === playerId)?.isAdmin;
    room.players = room.players.filter(p => p.id !== playerId);
    room.turn.order = room.turn.order.filter(id => id !== playerId);
    
    if(room.players.length === 0) delete rooms[roomId];
    else { 
        if(wasAdmin && room.players.length > 0) room.players[0].isAdmin = true; 
        broadcast(io, roomId); 
    }
};

const getRooms = () => Object.values(rooms).map(r => ({ id: r.id, players: r.players.length, state: r.gameInProgress ? 'GAME' : 'LOBBY' }));

module.exports = { init: (io)=>{}, handleSocket, handleJoin, handleRejoin, handleLeave, getRooms };