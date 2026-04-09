const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../arcade.db'));
const Utils = require('./utils');

const rooms = {};

const defaultSettings = { 
    impostors: 1, 
    category: 'MIX', 
    hints: false, 
    silentMode: false 
};

function createRoom(roomId) {
    rooms[roomId] = {
        id: roomId,
        players: [],
        settings: { ...defaultSettings },
        gameInProgress: false,
        turnData: {},
        chatHistory: [], 
        turn: { order: [], currentIndex: 0 },
        inactivityTimer: null
    };
    return rooms[roomId];
}

function destroyRoom(roomId) {
    if (rooms[roomId]) delete rooms[roomId];
}

function checkRoomInactivity(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    const activePlayers = room.players.filter(p => p.connected);
    if (activePlayers.length === 0) {
        if (room.inactivityTimer) clearTimeout(room.inactivityTimer);
        room.inactivityTimer = setTimeout(() => { destroyRoom(roomId); }, 20 * 60 * 1000); 
    } else {
        if (room.inactivityTimer) { clearTimeout(room.inactivityTimer); room.inactivityTimer = null; }
    }
}

function advanceTurn(room) {
    if (!room.turn.order || room.turn.order.length === 0) return;
    room.turn.currentIndex++;
    while (room.turn.currentIndex < room.turn.order.length) {
        const nextId = room.turn.order[room.turn.currentIndex];
        const nextPlayer = room.players.find(p => p.id === nextId);
        if (nextPlayer && !nextPlayer.isDead) break; 
        room.turn.currentIndex++;
    }
}

function broadcastRoom(io, roomId) {
    const room = rooms[roomId];
    if (!room) return;

    const publicPlayers = room.players.map(p => ({
        id: p.id,
        name: p.name,
        isAdmin: p.isAdmin,
        isDead: p.isDead,
        isObserver: !!p.isObserver,
        connected: p.connected,
        hasVoted: !!p.votedFor,
        votesReceived: room.players.filter(v => v.votedFor === p.id).length,
        revealedRole: (p.isDead && room.turnData[p.id]) ? room.turnData[p.id].role : null,
        gameWord: p.gameWord 
    }));

    let currentTurnId = null;
    if (room.gameInProgress && room.turn.order.length > 0 && room.turn.currentIndex < room.turn.order.length) {
        currentTurnId = room.turn.order[room.turn.currentIndex];
    }

    io.to('impostor_' + roomId).emit('updateState', {
        players: publicPlayers,
        gameInProgress: room.gameInProgress,
        settings: room.settings,
        turnData: { ...room.turnData, currentTurn: currentTurnId }, 
        chatHistory: room.chatHistory, 
        roomId: roomId
    });
}

// --- NUEVA FUNCIÓN PARA LEER CATEGORÍAS DESDE LA BBDD ---
function getPublicCategories() {
    const rows = db.prepare(`SELECT DISTINCT categoria, aux1 FROM impostor_data`).all();
    const categories = [{ id: 'MIX', label: '🎲 Aleatorio (Mix)' }];
    
    rows.forEach(r => {
        categories.push({ id: r.categoria, label: r.aux1 || r.categoria });
    });
    
    return categories;
}

function notifyElimination(room, eliminatedPlayer) {
    if (!room.settings.silentMode) return;
    
    const validVoters = room.players.filter(p => !p.isDead && !p.isObserver);
    const totalVotesMade = validVoters.filter(p => p.votedFor !== null).length;
    
    if (totalVotesMade > 0) {
        const votesForHim = room.players.filter(p => p.votedFor === eliminatedPlayer.id).length;
        const percentage = Math.round((votesForHim / validVoters.length) * 100);
        
        room.chatHistory.push({
            name: "SISTEMA",
            text: `💀 <b>${eliminatedPlayer.name}</b> ha sido ELIMINADO (${percentage}% de los votos posibles). Era: ${room.turnData[eliminatedPlayer.id]?.role || '?'}`,
            type: 'system_elimination'
        });
    } else {
        room.chatHistory.push({
            name: "SISTEMA",
            text: `💀 <b>${eliminatedPlayer.name}</b> ha sido ELIMINADO por el Administrador. Era: ${room.turnData[eliminatedPlayer.id]?.role || '?'}`,
            type: 'system_elimination'
        });
    }
    
    if(room.chatHistory.length > 60) room.chatHistory.shift();
}


const handleSocket = (io, socket) => {
    socket.on('impostor_action', (action) => {
        const roomId = socket.data.roomId; 
        const room = rooms[roomId];
        if (!room) return;

        const me = room.players.find(p => p.uuid === socket.data.uuid);
        if (!me) return; 

        if (action.type === 'updateSettings' && me.isAdmin) {
            if (action.value.category) room.settings.category = action.value.category;
            if (typeof action.value.hints !== 'undefined') room.settings.hints = !!action.value.hints;
            if (typeof action.value.silent !== 'undefined') room.settings.silentMode = !!action.value.silent;
            if (action.value.impostors) room.settings.impostors = parseInt(action.value.impostors);
            broadcastRoom(io, roomId);
        }

        if (action.type === 'chat') {
            if (me.chatBanUntil && Date.now() < me.chatBanUntil) {
                return; 
            } else if (me.chatBanUntil) {
                me.chatBanUntil = null; 
            }

            const msgText = String(action.value).trim().substring(0, 100);
            if(msgText) {
                const now = Date.now();
                if (!me.msgTimestamps) me.msgTimestamps = [];
                me.msgTimestamps.push(now);
                
                me.msgTimestamps = me.msgTimestamps.filter(t => now - t < 10000);
                
                if (me.msgTimestamps.length > 5) {
                    me.chatBanUntil = now + 10000; 
                    me.msgTimestamps = []; 
                    
                    room.chatHistory.push({
                        name: "SISTEMA",
                        text: `🚫 <b>${me.name}</b> ha sido silenciado 10s por SPAM.`,
                        type: 'system_ban'
                    });
                } else {
                    room.chatHistory.push({ name: me.name, text: msgText, type: 'chat' });
                }

                if(room.chatHistory.length > 60) room.chatHistory.shift();
                broadcastRoom(io, roomId);
            }
        }

        if (action.type === 'gameWord' && room.gameInProgress && room.settings.silentMode) {
            if (room.turn.currentIndex < room.turn.order.length) {
                const currentTurnId = room.turn.order[room.turn.currentIndex];
                if (currentTurnId === me.id && !me.isDead) {
                    const wordText = String(action.value).trim().substring(0, 50);
                    if(wordText) {
                        me.gameWord = wordText;

                        room.chatHistory.push({ name: me.name, text: wordText, type: 'gameWord' });
                        if(room.chatHistory.length > 60) room.chatHistory.shift();
                        
                        advanceTurn(room);
                        broadcastRoom(io, roomId);
                    }
                }
            }
        }

        if (action.type === 'startGame' && me.isAdmin) {
            if (room.players.length < 3) return; 

            io.to('impostor_' + roomId).emit('preGameCountdown', 3);

            // --- EXTRACCIÓN DE PALABRAS DESDE LA BBDD ---
            let wordPool = [];
            if (room.settings.category === 'MIX') {
                wordPool = db.prepare(`SELECT palabra as word, pista as hint FROM impostor_data`).all();
            } else {
                wordPool = db.prepare(`SELECT palabra as word, pista as hint FROM impostor_data WHERE categoria = ?`).all(room.settings.category);
            }
            
            if(!wordPool.length) wordPool = [{word: "Error", hint: "Base de datos vacía"}];
            const sel = wordPool[Math.floor(Math.random() * wordPool.length)];

            // Extraer el nombre de la categoría para mostrarlo a los jugadores civiles
            let catLabel = "Mezcla";
            if (room.settings.category !== 'MIX') {
                const catInfo = db.prepare(`SELECT aux1 FROM impostor_data WHERE categoria = ? LIMIT 1`).get(room.settings.category);
                if (catInfo && catInfo.aux1) catLabel = catInfo.aux1;
            }

            const indices = room.players.map((_,i)=>i).sort(()=>Math.random()-0.5);
            const numImpostors = Math.min(room.settings.impostors, Math.floor(room.players.length / 2)); 
            const impIdx = indices.slice(0, numImpostors);
            
            room.players.forEach(p => { 
                p.isDead = false; p.votedFor = null; p.isObserver = false; 
                p.gameWord = null; 
                p.msgTimestamps = [];
                p.chatBanUntil = null;
            });
            
            room.gameInProgress = true;
            room.chatHistory = []; 
            
            room.turn.order = room.players.map(p => p.id).sort(() => Math.random() - 0.5);
            room.turn.currentIndex = 0;
            
            const starterId = room.turn.order[0];
            const starterPlayer = room.players.find(p => p.id === starterId);
            const starterName = starterPlayer ? starterPlayer.name : "Desconocido";

            room.turnData = {};
            room.turnData['SUMMARY'] = {
                word: sel.word,
                hint: sel.hint,
                originalImpostorIds: [],
                hintsWasEnabled: room.settings.hints,
                impostorsData: []
            };

            room.players.forEach((p, i) => {
                const isImp = impIdx.includes(i);
                if(isImp) room.turnData['SUMMARY'].originalImpostorIds.push(p.id);

                room.turnData[p.id] = {
                    role: isImp ? 'IMPOSTOR' : 'CIVIL',
                    word: isImp ? 'Impostor' : sel.word,
                    hint: (room.settings.hints && isImp) ? sel.hint : null,
                    starter: starterName, 
                    categoriesPlayed: catLabel
                };
            });

            setTimeout(() => {
                room.players.forEach(p => { 
                    if (p.connected && p.socketId && room.turnData[p.id]) {
                        io.to(p.socketId).emit('privateRole', room.turnData[p.id]); 
                    }
                });
                broadcastRoom(io, roomId);
            }, 3500);
        }

        if (action.type === 'vote' && room.gameInProgress && !me.isDead && !me.isObserver) {
            me.votedFor = (me.votedFor === action.targetId) ? null : action.targetId;
            
            if (room.settings.silentMode && me.votedFor) {
                const target = room.players.find(p => p.id === action.targetId);
                if (target) {
                    room.chatHistory.push({
                        name: me.name,
                        text: `ha votado a ${target.name}`,
                        type: 'system_vote'
                    });
                    if(room.chatHistory.length > 60) room.chatHistory.shift();
                }
            }
            
            broadcastRoom(io, roomId);
        }

        if (me.isAdmin) {
             if (action.type === 'kick') handleLeave(action.targetId, roomId, io, true); 
             
             if (action.type === 'banChat') {
                const p = room.players.find(pl => pl.id === action.targetId);
                if (p) {
                    p.chatBanUntil = Date.now() + 10000; 
                    room.chatHistory.push({
                        name: "SISTEMA",
                        text: `🚫 El Admin ha silenciado a <b>${p.name}</b> por 10s.`,
                        type: 'system_ban'
                    });
                    if(room.chatHistory.length > 60) room.chatHistory.shift();
                    broadcastRoom(io, roomId);
                }
             }

             if (action.type === 'kill') {
                const p = room.players.find(pl => pl.id === action.targetId);
                if (p) { 
                    p.isDead = !p.isDead; 
                    if (!p.isDead) p.votedFor = null;
                    else {
                        io.to(p.socketId).emit('youDied'); 
                        notifyElimination(room, p); 
                        
                        if(room.gameInProgress && room.settings.silentMode) {
                            if(room.turn.currentIndex < room.turn.order.length) {
                                const currentTurnId = room.turn.order[room.turn.currentIndex];
                                if(currentTurnId === p.id) advanceTurn(room);
                            }
                        }
                    }
                    broadcastRoom(io, roomId); 
                }
             }

             if (action.type === 'clearVotes') { 
                 room.players.forEach(p => p.votedFor = null); 
                 broadcastRoom(io, roomId); 
             }
             
             if (action.type === 'revealResults') {
                if (room.turnData['SUMMARY']) {
                    room.turnData['SUMMARY'].impostorsData = room.players
                        .filter(p => room.turnData['SUMMARY'].originalImpostorIds.includes(p.id))
                        .map(p => ({ name: p.name, isDead: p.isDead }));
                    io.to('impostor_' + roomId).emit('gameSummary', room.turnData['SUMMARY']);
                }
             }
             
             if (action.type === 'reset') {
                room.gameInProgress = false;
                room.chatHistory = [];
                room.players.forEach(p => { 
                    p.isDead=false; p.votedFor=null; p.isObserver=false; 
                    p.gameWord = null; p.chatBanUntil = null; 
                });
                io.to('impostor_' + roomId).emit('resetGame');
                broadcastRoom(io, roomId);
            }
             
             if (action.type === 'changeImpostors') {
                room.settings.impostors = Math.max(0, Math.min(room.players.length, room.settings.impostors + action.value));
                broadcastRoom(io, roomId);
             }
        }
    });

    socket.on('disconnect', () => {
        const rId = socket.data.roomId;
        if (rId && rooms[rId]) {
            const changed = Utils.handleDisconnect(socket.id, rooms[rId].players, () => { checkRoomInactivity(rId); });
            if (changed) broadcastRoom(io, rId);
        }
    });
};

const handleJoin = (socket, nameRaw, targetRoomId, data = {}) => {
    const cleanName = nameRaw.replace(/👑|👤/g, '').trim();
    const uuid = data.uuid || socket.id;
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

    socket.join('impostor_' + room.id);
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
        
        if (room.players.length === 0 || ['administrador m', 'xarlie', 'musero'].includes(cleanName.toLowerCase())) {
            p.isAdmin = true;
        }
        
        if (room.gameInProgress) p.isObserver = true;
        room.players.push(p);
    }

    socket.emit('impostorCategories', getPublicCategories());
    socket.emit('joinedSuccess', { playerId: p.id, name: p.name, room: 'impostor', roomId: room.id });
    checkRoomInactivity(room.id); 
    broadcastRoom(socket.server, room.id);
};

const handleRejoin = (socket, savedId, savedRoomId, data = {}) => {
    const room = rooms[savedRoomId];
    if (!room) return socket.emit('sessionExpired');
    
    const uuid = data.uuid;
    const p = room.players.find(x => x.uuid === uuid || x.id === savedId);
    
    if (p) {
        if (p.timeout) clearTimeout(p.timeout);
        p.socketId = socket.id;
        p.connected = true;
        p.uuid = uuid || p.uuid;
        socket.join('impostor_' + room.id);
        socket.data.roomId = room.id;
        socket.data.uuid = p.uuid;
        socket.emit('impostorCategories', getPublicCategories());
        socket.emit('joinedSuccess', { playerId: p.id, name: p.name, room: 'impostor', roomId: room.id, isRejoin: true });
        if (room.gameInProgress && room.turnData[p.id]) socket.emit('privateRole', room.turnData[p.id]);
        checkRoomInactivity(room.id);
        broadcastRoom(socket.server, room.id);
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
    room.players.forEach(p => { if(p.votedFor === playerId) p.votedFor = null; });
    if(room.gameInProgress && room.settings.silentMode) {
        if(room.turn.currentIndex < room.turn.order.length && room.turn.order[room.turn.currentIndex] === playerId) {
             advanceTurn(room);
        }
        room.turn.order = room.turn.order.filter(id => id !== playerId);
    }
    if (wasAdmin && room.players.length > 0) room.players[0].isAdmin = true;
    checkRoomInactivity(roomId);
    if (room.players.length === 0) delete rooms[roomId];
    else broadcastRoom(io, roomId);
};

module.exports = { init: (io)=>{}, handleSocket, handleJoin, handleRejoin, handleLeave, getRooms: () => Object.values(rooms).map(r => ({ id: r.id, players: r.players.length, state: r.gameInProgress ? 'JUGANDO' : 'LOBBY' })) };