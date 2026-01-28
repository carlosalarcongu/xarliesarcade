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
        isObserver: !!p.isObserver, // Nueva propiedad para cliente
        hasVoted: !!p.votedFor,
        votesReceived: players.filter(v => v.votedFor === p.id).length,
        revealedRole: (p.isDead && turnData[p.id]) ? turnData[p.id].role : null
    }));

    io.to('impostor').emit('updateState', {
        players: publicPlayers,
        gameInProgress,
        settings, // Enviamos settings actuales para sincronizar selects
        turnData 
    });
}

// --- 3. FUNCIONES DE GESTIÓN ---

const handleJoin = (socket, nameRaw) => {
    // 1. Limpieza y Detección de Corona
    const cleanName = nameRaw.replace(/👑|👤/g, '').trim();

    if (players.find(p => p.name.toLowerCase() === cleanName.toLowerCase())) {
        const existing = players.find(p => p.name.toLowerCase() === cleanName.toLowerCase());
        if (!existing.connected) {
             return handleRejoin(socket, existing.id);
        }
        return socket.emit('joinError', 'Nombre en uso.');
    }

    const p = Utils.createPlayer(socket.id, cleanName);
    
    // Si la sala estaba vacía, es admin
    if (players.length === 0) p.isAdmin = true;

    p.isDead = false;
    p.votedFor = null;
    
    // LÓGICA OBSERVADOR: Si el juego ya empezó, entra como observador
    if (gameInProgress) {
        p.isObserver = true;
        socket.emit('joinedSuccess', { playerId: p.id, name: p.name, room: 'impostor' });
        socket.emit('impostorCategories', getPublicCategories());
        
        players.push(p);
        broadcast(socket.server);
        return; 
    }

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
        
        // Recuperar Rol si partida en curso y no es observador
        if(gameInProgress && turnData[p.id]) {
            socket.emit('privateRole', turnData[p.id]);
        }
        broadcast(socket.server);
    } else socket.emit('sessionExpired');
};

const handleLeave = (playerId, io) => {
    // Eliminación inmediata
    const wasAdmin = players.find(p => p.id === playerId)?.isAdmin;
    players = players.filter(p => p.id !== playerId);
    
    // Limpiar votos
    players.forEach(p => { if(p.votedFor === playerId) p.votedFor = null; });

    // Reasignar admin si hace falta
    if (wasAdmin && players.length > 0) {
        players[0].isAdmin = true;
    }
    
    // Reset si vacío
    if (players.length === 0) {
        gameInProgress = false;
        turnData = {};
        settings = { impostors: 1, category: 'MIX', hints: false };
    }

    // Actualización inmediata a todos
    if (io) broadcast(io);
};

const handleDisconnect = (socket) => {
    // Usamos Utils para gestión centralizada y RESET si vacío
    const changed = Utils.handleDisconnect(socket.id, players, () => {
        console.log("[IMPOSTOR] Sala vacía. Reseteando...");
        gameInProgress = false;
        turnData = {};
        settings = { impostors: 1, category: 'MIX', hints: false };
    });

    if (changed && socket.server) {
        broadcast(socket.server);
    }
};

// --- 4. LÓGICA DEL JUEGO ---

const gameModule = (io, socket) => {
    socket.on('impostor_action', (action) => {
        const me = players.find(p => p.socketId === socket.id);
        if (!me) return;

        // ACCIÓN: ACTUALIZAR CONFIGURACIÓN (Sincronización en tiempo real)
        if (action.type === 'updateSettings' && me.isAdmin) {
            if (action.value.category) settings.category = action.value.category;
            if (typeof action.value.hints !== 'undefined') settings.hints = action.value.hints;
            if (action.value.impostors) settings.impostors = action.value.impostors;
            
            broadcast(io);
        }

        // INICIAR PARTIDA
        if (action.type === 'startGame' && me.isAdmin) {
            if (players.length < 3) return; 

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
            
            // Reinicio variables de jugadores
            players.forEach(p => { 
                p.isDead = false; 
                p.votedFor = null; 
                p.isObserver = false;
            });
            
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
                    // MODIFICACIÓN: Impostor ve "Impostor", Ciudadano ve la palabra real
                    word: isImp ? 'Impostor' : sel.word,
                    // MODIFICACIÓN: SOLO el impostor ve la pista si está activada
                    hint: (settings.hints && isImp) ? sel.hint : null,
                    starter: me.name, 
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
            const newVal = Math.max(1, Math.min(Math.floor(players.length/2), settings.impostors + action.value));
            settings.impostors = newVal;
            broadcast(io);
        }

        if (action.type === 'vote' && gameInProgress && !me.isDead && !me.isObserver) {
            me.votedFor = (me.votedFor === action.targetId) ? null : action.targetId;
            broadcast(io);
        }
        
        // Acciones Admin
        if (me.isAdmin) {
             if (action.type === 'kick') {
                const target = players.find(p => p.id === action.targetId);
                if (target) {
                    if (target.socketId) io.to(target.socketId).emit('sessionExpired');
                    handleLeave(target.id, io); 
                    broadcast(io);
                }
            }
            if (action.type === 'kill') {
                const p = players.find(p => p.id === action.targetId);
                if (p) { 
                    p.isDead = !p.isDead; 
                    if (!p.isDead) p.votedFor = null;
                    else io.to(p.socketId).emit('youDied'); 
                    broadcast(io); 
                }
            }
            if (action.type === 'clearVotes') {
                 players.forEach(p => p.votedFor = null);
                 broadcast(io);
            }
            
            if (action.type === 'revealResults') {
                if (turnData['SUMMARY']) {
                    turnData['SUMMARY'].impostorsData = players
                        .filter(p => turnData['SUMMARY'].originalImpostorIds.includes(p.id))
                        .map(p => ({ name: p.name, isDead: p.isDead }));
                    
                    io.to('impostor').emit('gameSummary', turnData['SUMMARY']);
                }
            }

            if (action.type === 'reset') {
                gameInProgress = false;
                players.forEach(p => { 
                    p.isDead=false; 
                    p.votedFor=null; 
                    p.isObserver=false; 
                });
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