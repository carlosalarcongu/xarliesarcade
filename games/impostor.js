const database = require('./database');
const crypto = require('crypto');
const Utils = require('./utils');

let players = [];
let settings = { impostorCount: 1, selectedCategories: [], hintsEnabled: true };
let gameInProgress = false;
let turnData = {};

// Helper para broadcast
function broadcast(io) {
    const playersWithVotes = players.map(p => {
        const votes = players.filter(voter => voter.votedFor === p.id).length;
        // Importante: Devolvemos si está conectado o no para la UI
        return { ...p, votesReceived: votes }; 
    });
    io.to('impostor').emit('updateList', { players: playersWithVotes, gameInProgress });
    io.to('impostor').emit('updateSettings', settings);
}

module.exports = {
    init: (io, socket) => {
        socket.on('impostor_action', (action) => {
            // --- AJUSTES (Broadcast inmediato para ver cambios en tiempo real) ---
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
                if (p) { p.isDead = true; if (p.socketId) io.to(p.socketId).emit('youDied'); broadcast(io); }
            }
            if (action.type === 'clearVotes') {
                players.forEach(p => p.votedFor = null);
                broadcast(io);
            }

            // --- RESET CON RESUMEN ---
            if (action.type === 'reset') {
                // 1. Enviamos el resumen FINAL a todos antes de borrar nada
                if (turnData['SUMMARY']) {
                    io.to('impostor').emit('gameSummary', turnData['SUMMARY']);
                }
                
                // 2. Reseteamos lógica interna
                gameInProgress = false;
                // No borramos turnData aun para que el resumen funcione, se sobreescribirá en start
                players.forEach(p => { p.isDead = false; p.votedFor = null; });
                
                // 3. Avisamos para volver al lobby (el cliente gestionará cerrar el modal)
                io.to('impostor').emit('resetGame'); 
                broadcast(io);
            }

            // --- START GAME (INCLUYENDO OFFLINE) ---
            if (action.type === 'start') {
                if (players.length < 3) return;
                players.forEach(p => p.votedFor = null);
                
                let wordPool = [];
                let activeLabels = [];
                const cats = settings.selectedCategories.length > 0 ? settings.selectedCategories : Object.keys(database).filter(k => k !== "MIX");
                cats.forEach(k => { if (database[k]) { wordPool = wordPool.concat(database[k].words); activeLabels.push(database[k].label); } });

                if (!wordPool.length) return;
                const sel = wordPool[Math.floor(Math.random() * wordPool.length)];
                
                // Mezclar jugadores (incluyendo desconectados que no hayan sido borrados por timeout)
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

                // Guardar resumen para el final
                turnData['SUMMARY'] = {
                    word: sel.word, hint: sel.hint,
                    impostors: players.filter((_, i) => impostors.includes(i)).map(p => p.name),
                    hintsWasEnabled: settings.hintsEnabled
                };

                io.to('impostor').emit('preGameCountdown', 3);
                
                setTimeout(() => {
                    // Enviar roles solo a los que tienen socket activo
                    players.forEach(p => { 
                        if (p.connected && p.socketId) io.to(p.socketId).emit('roleAssigned', turnData[p.id]); 
                    });
                    broadcast(io);
                }, 3500);
            }
        });
    },

    handleJoin: (socket, name) => {
        // Verificar duplicados (usando el nombre sin emoji)
        if (players.find(p => p.rawName.toLowerCase() === name.trim().toLowerCase())) {
            return socket.emit('joinError', 'Nombre en uso.');
        }

        // --- USAMOS EL UTIL COMPARTIDO ---
        const basePlayer = Utils.createPlayer(socket.id, name);
        
        // Añadimos solo lo específico de Impostor
        const newPlayer = { 
            ...basePlayer, 
            role: null, 
            votedFor: null,
            timeout: null 
        };
        
        players.push(newPlayer);
        socket.join('impostor');
        socket.emit('joinedSuccess', { playerId: newPlayer.id, room: 'impostor' });
        
        const io = socket.server;
        broadcast(io);
        socket.emit('initSetup', { isAdmin: newPlayer.isAdmin, categories: database });
    },

    handleRejoin: (socket, savedId) => {
        const player = players.find(p => p.id === savedId);
        const io = socket.server;
        if (player) {
            // Cancelar borrado si vuelve a tiempo
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
    },

    handleLeave: (playerId) => {
        const p = players.find(pl => pl.id === playerId);
        if (p) {
             if(p.timeout) clearTimeout(p.timeout);
             players = players.filter(pl => pl.id !== playerId);
             players.forEach(x => { if(x.votedFor === playerId) x.votedFor = null; });
        }
    },

    handleDisconnect: (socket) => {
        const p = players.find(pl => pl.socketId === socket.id);
        if (p) { 
            p.connected = false; 
            broadcast(socket.server); 
            
            // --- TIMEOUT 15 MINUTOS ---
            if(p.timeout) clearTimeout(p.timeout);
            p.timeout = setTimeout(() => {
                console.log(`[IMPOSTOR] 🗑️ Borrando a ${p.name} por inactividad.`);
                players = players.filter(pl => pl.id !== p.id);
                // No podemos hacer broadcast aquí fácilmente sin el objeto IO guardado, 
                // pero se actualizará en la siguiente interacción.
            }, 15 * 60 * 1000); // 15 minutos
        }
    }
};