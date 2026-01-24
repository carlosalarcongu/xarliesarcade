const crypto = require('crypto');
const Utils = require('./utils');

let players = [];
let settings = { wolvesCount: 2, hasSeer: true, hasGirl: false, hasCupid: false, hasHunter: false };
let gameInProgress = false;
let turnData = {};
const EMOJIS = ["😈","👽","🐸","🦊","🐵","🐼","🐯","🦄","🔥","⚡","🚀","🍕","🎲"];

function broadcast(io) {
    io.to('lobo').emit('updateLoboList', { players, gameInProgress });
}

module.exports = {
    init: (io, socket) => {
        socket.on('lobo_action', (action) => {
            if (action.type === 'updateSetting') {
                settings[action.key] = action.value;
                io.to('lobo').emit('loboSettingsUpdate', settings);
            }
            if (action.type === 'kick') {
                players = players.filter(p => p.id !== action.targetId);
                broadcast(io);
            }
            if (action.type === 'kill') {
                const p = players.find(pl => pl.id === action.targetId);
                if (p) { p.isDead = !p.isDead; broadcast(io); }
            }
            if (action.type === 'reset') {
                gameInProgress = false;
                turnData = {};
                players.forEach(p => { p.isDead = false; p.role = null; });
                io.to('lobo').emit('resetGame');
                broadcast(io);
            }
            if (action.type === 'start') {
                if (players.length < 2) return;
                let deck = [];
                for(let i=0; i<settings.wolvesCount; i++) deck.push('LOBO');
                if(settings.hasSeer) deck.push('VIDENTE');
                if(settings.hasGirl) deck.push('NIÑA');
                if(settings.hasCupid) deck.push('CUPIDO');
                if(settings.hasHunter) deck.push('CAZADOR');
                while(deck.length < players.length) deck.push('ALDEANO');
                
                deck = deck.sort(() => Math.random() - 0.5);
                players.forEach(p => p.isDead = false);
                gameInProgress = true;
                turnData = {};
                const wolfNames = [];

                players.forEach((p, i) => {
                    const role = deck[i] || 'ALDEANO';
                    turnData[p.id] = { role, description: getRoleDescription(role), wolfPartners: [] };
                    if (role === 'LOBO') wolfNames.push(p.name);
                });

                players.forEach(p => {
                    if (turnData[p.id].role === 'LOBO') turnData[p.id].wolfPartners = wolfNames.filter(n => n !== p.name);
                });

                players.forEach(p => { if (p.socketId) io.to(p.socketId).emit('loboRoleAssigned', turnData[p.id]); });
                broadcast(io);
            }
        });
    },

    handleJoin: (socket, name) => {
        if (players.find(p => p.rawName.toLowerCase() === name.trim().toLowerCase())) {
            return socket.emit('joinError', 'Nombre en uso.');
        }

        // --- USAMOS EL UTIL COMPARTIDO ---
        const basePlayer = Utils.createPlayer(socket.id, name);

        // Específico de Lobo
        const newPlayer = { ...basePlayer, role: null };
        
        players.push(newPlayer);
        socket.join('lobo');
        socket.emit('joinedSuccess', { playerId: newPlayer.id, room: 'lobo' });
        
        const io = socket.server;
        broadcast(io);
        socket.emit('loboSettingsUpdate', settings);
    },

    handleRejoin: (socket, savedId) => {
        const player = players.find(p => p.id === savedId);
        const io = socket.server;
        if (player) {
            player.socketId = socket.id;
            player.connected = true;
            socket.join('lobo');
            socket.emit('joinedSuccess', { playerId: savedId, room: 'lobo', isRejoin: true });
            broadcast(io);
            socket.emit('loboSettingsUpdate', settings);
            if (gameInProgress && turnData[player.id]) socket.emit('loboRoleAssigned', turnData[player.id]);
        } else {
            socket.emit('sessionExpired');
        }
    },

    handleLeave: (playerId) => {
        players = players.filter(pl => pl.id !== playerId);
    },

    handleDisconnect: (socket) => {
        const p = players.find(pl => pl.socketId === socket.id);
        if (p) { p.connected = false; broadcast(socket.server); }
    }
};

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