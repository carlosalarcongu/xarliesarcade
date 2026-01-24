const crypto = require('crypto');
const Utils = require('./utils');

// --- 1. VARIABLES GLOBALES (ESTADO DEL JUEGO) ---
let players = [];
let settings = { wolvesCount: 2, hasSeer: true, hasGirl: false, hasCupid: false, hasHunter: false };
let gameInProgress = false;
let turnData = {};
const EMOJIS = ["😈","👽","🐸","🦊","🐵","🐼","🐯","🦄","🔥","⚡","🚀","🍕","🎲"];

// --- 2. HELPERS ---
function broadcast(io) {
    io.to('lobo').emit('updateLoboList', { players, gameInProgress });
}

function getRoleDescription(role) {
    switch(role) {
        case 'LOBO': return "Comete crímenes nocturnos.";
        case 'ALDEANO': return "Descubre a los lobos.";
        case 'VIDENTE': return "Ve el rol de otros.";
        case 'NIÑA': return "Espía a los lobos.";
        case 'CUPIDO': return "Enamora a dos personas.";
        case 'CAZADOR': return "Mata al morir.";
        default: return "";
    }
}

// --- 3. FUNCIONES DE GESTIÓN (Join, Leave, Disconnect) ---

const handleJoin = (socket, name) => {
    // Verificar duplicados
    if (players.find(p => p.rawName.toLowerCase() === name.trim().toLowerCase())) {
        return socket.emit('joinError', 'Nombre en uso.');
    }

    const basePlayer = Utils.createPlayer(socket.id, name);

    // Específico de Lobo
    const newPlayer = { ...basePlayer, role: null };
    
    players.push(newPlayer);
    socket.join('lobo');
    
    // Éxito
    socket.emit('joinedSuccess', { playerId: newPlayer.id, room: 'lobo' });
    
    const io = socket.server;
    broadcast(io);
    socket.emit('loboSettingsUpdate', settings);
};

const handleRejoin = (socket, savedId) => {
    const player = players.find(p => p.id === savedId);
    const io = socket.server;
    
    if (player) {
        player.socketId = socket.id;
        player.connected = true;
        socket.join('lobo');
        
        socket.emit('joinedSuccess', { playerId: savedId, room: 'lobo', isRejoin: true });
        
        broadcast(io);
        socket.emit('loboSettingsUpdate', settings);
        
        // Si la partida está en curso, devolverle su rol
        if (gameInProgress && turnData[player.id]) {
            socket.emit('loboRoleAssigned', turnData[player.id]);
        }
    } else {
        socket.emit('sessionExpired');
    }
};

const handleLeave = (playerId) => {
    players = players.filter(pl => pl.id !== playerId);
};

const handleDisconnect = (socket) => {
    const p = players.find(pl => pl.socketId === socket.id);
    if (p) { 
        p.connected = false; 
        if(socket.server) broadcast(socket.server); 
    }
};

// --- 4. EXPORTACIÓN PRINCIPAL (HÍBRIDA) ---

const gameModule = (io, socket) => {
    
    socket.on('lobo_action', (action) => {
        // AJUSTES
        if (action.type === 'updateSetting') {
            settings[action.key] = action.value;
            io.to('lobo').emit('loboSettingsUpdate', settings);
        }

        // KICK
        if (action.type === 'kick') {
            players = players.filter(p => p.id !== action.targetId);
            broadcast(io);
        }

        // MATAR / REVIVIR (Admin)
        if (action.type === 'kill') {
            const p = players.find(pl => pl.id === action.targetId);
            if (p) { p.isDead = !p.isDead; broadcast(io); }
        }

        // RESET
        if (action.type === 'reset') {
            gameInProgress = false;
            turnData = {};
            players.forEach(p => { p.isDead = false; p.role = null; });
            io.to('lobo').emit('resetGame');
            broadcast(io);
        }

        // START
        if (action.type === 'start') {
            if (players.length < 2) return;
            
            // 1. Crear Mazo
            let deck = [];
            for(let i=0; i<settings.wolvesCount; i++) deck.push('LOBO');
            if(settings.hasSeer) deck.push('VIDENTE');
            if(settings.hasGirl) deck.push('NIÑA');
            if(settings.hasCupid) deck.push('CUPIDO');
            if(settings.hasHunter) deck.push('CAZADOR');
            
            // Rellenar con aldeanos
            while(deck.length < players.length) deck.push('ALDEANO');
            
            // Barajar
            deck = deck.sort(() => Math.random() - 0.5);
            
            players.forEach(p => p.isDead = false);
            gameInProgress = true;
            turnData = {};
            const wolfNames = [];

            // 2. Asignar Roles
            players.forEach((p, i) => {
                const role = deck[i] || 'ALDEANO';
                turnData[p.id] = { role, description: getRoleDescription(role), wolfPartners: [] };
                if (role === 'LOBO') wolfNames.push(p.name);
            });

            // 3. Informar a los lobos de sus compañeros
            players.forEach(p => {
                if (turnData[p.id].role === 'LOBO') {
                    turnData[p.id].wolfPartners = wolfNames.filter(n => n !== p.name);
                }
            });

            // 4. Enviar info privada a cada socket
            players.forEach(p => { 
                if (p.socketId) io.to(p.socketId).emit('loboRoleAssigned', turnData[p.id]); 
            });
            
            broadcast(io);
        }
    });

    // Listener de desconexión
    socket.on('disconnect', () => {
        handleDisconnect(socket);
    });
};

// --- 5. ADJUNTAR MÉTODOS AL EXPORT ---
gameModule.handleJoin = handleJoin;
gameModule.handleRejoin = handleRejoin;
gameModule.handleLeave = handleLeave;
gameModule.handleDisconnect = handleDisconnect;

module.exports = gameModule;