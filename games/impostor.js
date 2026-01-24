const database = require('./database');
const crypto = require('crypto');
const Utils = require('./utils'); // Corregido: Mayúscula para coincidir con tu uso abajo

// --- 1. VARIABLES GLOBALES (ESTADO DEL JUEGO) ---
let roundStage = 'LOBBY';
let players = [];
let settings = { impostorCount: 1, selectedCategories: [], hintsEnabled: true };
let gameInProgress = false;
let turnData = {};

// --- 2. HELPERS ---
function broadcast(io) {
    const playersWithVotes = players.map(p => {
        const votes = players.filter(voter => voter.votedFor === p.id).length;
        return { ...p, votesReceived: votes }; 
    });
    // Emitimos a la sala 'impostor'
    io.to('impostor').emit('updateList', { players: playersWithVotes, gameInProgress });
    io.to('impostor').emit('updateSettings', settings);
}

// --- 3. FUNCIONES DE GESTIÓN (Join, Leave, Disconnect) ---
// Las definimos fuera para poder usarlas tanto en el export como internamente

const handleJoin = (socket, name) => {
    // Verificar duplicados
    if (players.find(p => p.rawName.toLowerCase() === name.trim().toLowerCase())) {
        return socket.emit('joinError', 'Nombre en uso.');
    }

    const basePlayer = Utils.createPlayer(socket.id, name);
    
    const newPlayer = { 
        ...basePlayer, 
        role: null, 
        votedFor: null,
        timeout: null 
    };
    
    players.push(newPlayer);
    socket.join('impostor');
    
    // Emitir éxito
    socket.emit('joinedSuccess', { playerId: newPlayer.id, room: 'impostor' });
    
    const io = socket.server; // Recuperamos IO del socket
    broadcast(io);
    socket.emit('initSetup', { isAdmin: newPlayer.isAdmin, categories: database });
};

const handleRejoin = (socket, savedId) => {
    const player = players.find(p => p.id === savedId);
    const io = socket.server;
    
    if (player) {
        if (player.timeout) clearTimeout(player.timeout);
        player.timeout = null;

        player.socketId = socket.id;
        player.connected = true;
        socket.join('impostor');
        
        socket.emit('joinedSuccess', { playerId: savedId, room: 'impostor', isRejoin: true });
        socket.emit('initSetup', { isAdmin: player.isAdmin, categories: database });
        
        broadcast(io);
        if (gameInProgress && turnData[player.id]) socket.emit('roleAssigned', turnData[player.id]);
    } else {
        socket.emit('sessionExpired');
    }
};

const handleLeave = (playerId) => {
    const p = players.find(pl => pl.id === playerId);
    if (p) {
         if(p.timeout) clearTimeout(p.timeout);
         players = players.filter(pl => pl.id !== playerId);
         players.forEach(x => { if(x.votedFor === playerId) x.votedFor = null; });
    }
};

const handleDisconnect = (socket) => {
    const p = players.find(pl => pl.socketId === socket.id);
    if (p) { 
        p.connected = false; 
        if(socket.server) broadcast(socket.server); 
        
        // Timeout 15 min
        if(p.timeout) clearTimeout(p.timeout);
        p.timeout = setTimeout(() => {
            console.log(`[IMPOSTOR] 🗑️ Borrando a ${p.name} por inactividad.`);
            players = players.filter(pl => pl.id !== p.id);
        }, 15 * 60 * 1000);
    }
};

// --- 4. EXPORTACIÓN PRINCIPAL (HÍBRIDA) ---

// Esta es la función que ejecuta server.js al hacer require(...)(io, socket)
const gameModule = (io, socket) => {
    
    // LISTENERS DE ACCIÓN
    socket.on('impostor_action', (action) => {
        // --- AJUSTES ---
        if (action.type === 'changeImpostorCount') {
            settings.impostorCount = Math.max(0, Math.min(players.length, settings.impostorCount + action.value));
            broadcast(io);
        }
        if (action.type === 'toggleCategory') {
            const i = settings.selectedCategories.indexOf(action.value);
            i > -1 ? settings.selectedCategories.splice(i, 1) : settings.selectedCategories.push(action.value);
            broadcast(io);
        }
        if (action.type === 'toggleHints') {
            settings.hintsEnabled = !settings.hintsEnabled;
            broadcast(io);
        }

        // --- JUEGO ---
        if (action.type === 'vote') {
            const me = players.find(p => p.socketId === socket.id);
            if (me && !me.isDead) {
                me.votedFor = (me.votedFor === action.targetId) ? null : action.targetId;
                broadcast(io);
            }
        }
        if (action.type === 'kick') {
            players = players.filter(p => p.id !== action.targetId);
            broadcast(io);
        }
        if (action.type === 'kill') {
            const p = players.find(p => p.id === action.targetId);
            if (p) { 
                p.isDead = true; 
                if (p.socketId) io.to(p.socketId).emit('youDied'); 
                broadcast(io); 
            }
        }
        if (action.type === 'clearVotes') {
            players.forEach(p => p.votedFor = null);
            broadcast(io);
        }

        // --- RESET ---
        if (action.type === 'reset') {
            if (turnData['SUMMARY']) io.to('impostor').emit('gameSummary', turnData['SUMMARY']);
            gameInProgress = false;
            players.forEach(p => { p.isDead = false; p.votedFor = null; });
            io.to('impostor').emit('resetGame'); 
            broadcast(io);
        }

        // --- START ---
        if (action.type === 'start') {
            if (players.length < 3) return;
            players.forEach(p => p.votedFor = null);
            
            let wordPool = [];
            let activeLabels = [];
            const cats = settings.selectedCategories.length > 0 ? settings.selectedCategories : Object.keys(database).filter(k => k !== "MIX");
            cats.forEach(k => { if (database[k]) { wordPool = wordPool.concat(database[k].words); activeLabels.push(database[k].label); } });

            if (!wordPool.length) return;
            const sel = wordPool[Math.floor(Math.random() * wordPool.length)];
            
            let indices = players.map((_, i) => i).sort(() => Math.random() - 0.5);
            const impostors = indices.slice(0, settings.impostorCount);
            const starter = players[Math.floor(Math.random() * players.length)].name;

            players.forEach(p => p.isDead = false);
            gameInProgress = true;
            turnData = {};

            players.forEach((p, i) => {
                let role = impostors.includes(i) ? "IMPOSTOR" : "CIUDADANO";
                let txt = role === "IMPOSTOR" ? (settings.hintsEnabled ? `Pista: ${sel.hint}` : "Sin pistas") : `Palabra: ${sel.word}`;
                turnData[p.id] = { role, text: txt, starter, categoriesPlayed: activeLabels.join(" + ") };
            });

            turnData['SUMMARY'] = {
                word: sel.word, hint: sel.hint,
                impostors: players.filter((_, i) => impostors.includes(i)).map(p => p.name),
                hintsWasEnabled: settings.hintsEnabled
            };

            io.to('impostor').emit('preGameCountdown', 3);
            
            setTimeout(() => {
                players.forEach(p => { 
                    if (p.connected && p.socketId) io.to(p.socketId).emit('roleAssigned', turnData[p.id]); 
                });
                broadcast(io);
            }, 3500);
        }
    });

    // LISTENER DE DESCONEXIÓN (Específico para lógica de juego)
    socket.on('disconnect', () => {
        handleDisconnect(socket);
    });
};

// --- 5. ADJUNTAR MÉTODOS AL EXPORT ---
// Esto permite que server.js llame a require('./games/impostor').handleJoin(...)
gameModule.handleJoin = handleJoin;
gameModule.handleRejoin = handleRejoin;
gameModule.handleLeave = handleLeave;

module.exports = gameModule;