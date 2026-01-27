const database = require('./database');
const Utils = require('./utils');
const logger = require('../debug_logger');

// --- 1. VARIABLES GLOBALES (ESTADO DEL JUEGO) ---
let players = [];
let settings = { impostors: 1, category: 'MIX', hints: false };
let gameInProgress = false;
let turnData = {}; 

// Helper Categorías
const getPublicCategories = () => {
    return Object.keys(database).map(k => ({
        id: k,
        label: database[k].label || k
    }));
};

// --- 2. HELPERS ---
function broadcast(io) {
    const publicPlayers = players.map(p => ({
        id: p.id,
        name: p.name,
        isAdmin: p.isAdmin,
        isDead: p.isDead,
        hasVoted: !!p.votedFor,
        votesReceived: players.filter(v => v.votedFor === p.id).length,
        // CORRECCIÓN VISUAL: Añadimos role revelado si está muerto o acabó partida
        revealedRole: (p.isDead && turnData[p.id]) ? turnData[p.id].role : null
    }));

    io.to('impostor').emit('updateState', {
        players: publicPlayers,
        gameInProgress,
        settings,
        turnData // Cuidado con enviar info sensible aquí, filtra si es necesario
    });
}

// --- 3. FUNCIONES DE GESTIÓN ---

const handleJoin = (socket, nameRaw) => {
    // 1. Limpieza y Detección de Corona
    const hasCrown = nameRaw.includes('👑');
    const cleanName = nameRaw.replace(/👑|👤/g, '').trim();

    if (players.find(p => p.name.toLowerCase() === cleanName.toLowerCase())) {
        const existing = players.find(p => p.name.toLowerCase() === cleanName.toLowerCase());
        if (!existing.connected) {
             return handleRejoin(socket, existing.id);
        }
        return socket.emit('joinError', 'Nombre en uso.');
    }

    const p = Utils.createPlayer(socket.id, cleanName);
    
    // 2. Asignar Admin: Si tiene corona O es el primero
    p.isAdmin = hasCrown || players.length === 0;
    p.isDead = false;
    p.votedFor = null;
    
    players.push(p);
    socket.join('impostor');
    
    // 3. Enviar Categorías y Éxito
    socket.emit('impostorCategories', getPublicCategories());
    socket.emit('joinedSuccess', { playerId: p.id, name: p.name, room: 'impostor' });
    
    broadcast(socket.server);
};

const handleRejoin = (socket, savedId) => {
    const p = players.find(x => x.id === savedId);
    if(p) {
        p.socketId = socket.id;
        p.connected = true;
        socket.join('impostor');
        
        socket.emit('impostorCategories', getPublicCategories());
        socket.emit('joinedSuccess', { playerId: p.id, name: p.name, room: 'impostor', isRejoin: true });
        
        // Recuperar Rol si partida en curso
        if(gameInProgress && turnData[p.id]) {
            socket.emit('privateRole', turnData[p.id]);
        }
        broadcast(socket.server);
    } else socket.emit('sessionExpired');
};

const handleLeave = (playerId) => {
    players = players.filter(p => p.id !== playerId);
    // Limpiar votos que apuntaban a este jugador o que él hizo
    players.forEach(p => { if(p.votedFor === playerId) p.votedFor = null; });
};

const handleDisconnect = (socket) => {
    const p = players.find(pl => pl.socketId === socket.id);
    if (p) { 
        p.connected = false; 
        if(socket.server) broadcast(socket.server); 
        
        setTimeout(() => {
            if(!p.connected) {
                players = players.filter(pl => pl.id !== p.id);
            }
        }, 15 * 60 * 1000); 
    }
};

// --- 4. LÓGICA DEL JUEGO ---

const gameModule = (io, socket) => {
    socket.on('impostor_action', (action) => {
        const me = players.find(p => p.socketId === socket.id);
        if (!me) return;

        // INICIAR PARTIDA
        if (action.type === 'startGame' && me.isAdmin) {
            if (players.length < 3) return; 

            // Configuración
            settings.category = action.value.category || 'MIX';
            settings.hints = !!action.value.hints;

            // 1. Emitir Cuenta Atrás
            io.to('impostor').emit('preGameCountdown', 3);

            // 2. Lógica diferida
            let wordPool = [];
            if (settings.category === 'MIX') {
                Object.keys(database).forEach(k => { if(k!=='MIX') wordPool = wordPool.concat(database[k].words); });
            } else if (database[settings.category]) {
                wordPool = database[settings.category].words || [];
            }
            if(!wordPool.length) wordPool = [{word: "Error", hint: "..."}];
            
            const sel = wordPool[Math.floor(Math.random() * wordPool.length)];

            // Roles
            const indices = players.map((_,i)=>i).sort(()=>Math.random()-0.5);
            const numImpostors = Math.min(settings.impostors, Math.floor(players.length / 2)); 
            const impIdx = indices.slice(0, numImpostors);
            
            // Reinicio variables
            players.forEach(p => { p.isDead = false; p.votedFor = null; });
            gameInProgress = true;
            turnData = {};
            turnData['SUMMARY'] = {
                word: sel.word,
                hint: sel.hint,
                originalImpostorIds: [],
                hintsWasEnabled: settings.hints,
                impostorsData: []
            };

            players.forEach((p, i) => {
                const isImp = impIdx.includes(i);
                
                if(isImp) turnData['SUMMARY'].originalImpostorIds.push(p.id);

                turnData[p.id] = {
                    role: isImp ? 'IMPOSTOR' : 'CIVIL',
                    word: isImp ? 'Eres el IMPOSTOR' : sel.word,
                    hint: (settings.hints && !isImp) ? sel.hint : null,
                    starter: me.name, // Nombre del admin que inició
                    categoriesPlayed: database[settings.category] ? database[settings.category].label : "Mezcla"
                };
            });

            // 3. ENVIAR ROLES TRAS TIMEOUT
            setTimeout(() => {
                players.forEach(p => { 
                    if (p.connected && p.socketId && turnData[p.id]) {
                        io.to(p.socketId).emit('privateRole', turnData[p.id]); 
                    }
                });
                broadcast(io);
            }, 3500);
        }

        if (action.type === 'changeImpostors' && me.isAdmin) {
            settings.impostors = Math.max(1, Math.min(Math.floor(players.length/2), settings.impostors + action.value));
            broadcast(io);
        }

        if (action.type === 'vote' && gameInProgress && !me.isDead) {
            me.votedFor = (me.votedFor === action.targetId) ? null : action.targetId;
            broadcast(io);
        }
        
        // Acciones Admin
        if (me.isAdmin) {
             if (action.type === 'kick') {
                const target = players.find(p => p.id === action.targetId);
                if (target) {
                    if (target.socketId) io.to(target.socketId).emit('sessionExpired');
                    handleLeave(target.id);
                    broadcast(io);
                }
            }
            if (action.type === 'kill') {
                const p = players.find(p => p.id === action.targetId);
                if (p) { 
                    p.isDead = !p.isDead; 
                    if (!p.isDead) p.votedFor = null;
                    else io.to(p.socketId).emit('youDied'); // Sonido muerte 
                    broadcast(io); 
                }
            }
            if (action.type === 'clearVotes') {
                 players.forEach(p => p.votedFor = null);
                 broadcast(io);
            }
            
            if (action.type === 'revealResults') {
                if (turnData['SUMMARY']) {
                    // Recalcular estado muertos/vivos
                    turnData['SUMMARY'].impostorsData = players
                        .filter(p => turnData['SUMMARY'].originalImpostorIds.includes(p.id))
                        .map(p => ({ name: p.name, isDead: p.isDead }));
                    
                    io.to('impostor').emit('gameSummary', turnData['SUMMARY']);
                }
            }

            if (action.type === 'reset') {
                gameInProgress = false;
                players.forEach(p => { p.isDead=false; p.votedFor=null; });
                io.to('impostor').emit('resetGame');
                broadcast(io);
            }
        }
    });
};

gameModule.handleJoin = handleJoin;
gameModule.handleRejoin = handleRejoin;
gameModule.handleLeave = handleLeave;
gameModule.handleDisconnect = handleDisconnect;

module.exports = gameModule;