const database = require('./database');
const Utils = require('./utils');
const logger = require('../debug_logger');

// --- 1. VARIABLES GLOBALES (ESTADO DEL JUEGO) ---
let players = [];
let settings = { impostorCount: 1, selectedCategories: [], hintsEnabled: true };
let gameInProgress = false;
let turnData = {}; 

// --- 2. HELPERS ---
function broadcast(io) {
    const publicPlayers = players.map(p => {
        const votes = players.filter(voter => voter.votedFor === p.id).length;
        
        // Si está muerto, revelamos su rol. Si no, es secreto.
        let revealedRole = null;
        if (p.isDead && turnData[p.id]) {
            revealedRole = turnData[p.id].role;
        }

        return { 
            id: p.id,
            name: p.name,
            isAdmin: p.isAdmin,
            connected: p.connected,
            isDead: p.isDead,
            votesReceived: votes,
            hasVoted: !!p.votedFor, // Booleano para el tic verde
            revealedRole: revealedRole // Solo lleva dato si está muerto
        }; 
    });

    io.to('impostor').emit('updateList', { players: publicPlayers, gameInProgress });
    io.to('impostor').emit('updateSettings', settings);
}

// --- 3. FUNCIONES DE GESTIÓN ---

const handleJoin = (socket, name) => {
    // Verificar duplicados por nombre
    const existing = players.find(p => p.rawName.toLowerCase() === name.trim().toLowerCase());
    
    if (existing) {
        if (!existing.connected) {
            logger.log('GAME', `Reconexión por nombre (Impostor): ${name}`);
            return handleRejoin(socket, existing.id);
        }
        return socket.emit('joinError', 'Nombre en uso.');
    }

    const basePlayer = Utils.createPlayer(socket.id, name);
    // Campos específicos de Impostor
    const newPlayer = { 
        ...basePlayer, 
        role: null, 
        votedFor: null,
        timeout: null 
    };
    
    players.push(newPlayer);
    socket.join('impostor');
    socket.emit('joinedSuccess', { playerId: newPlayer.id, room: 'impostor' });
    
    broadcast(socket.server);
    socket.emit('initSetup', { isAdmin: newPlayer.isAdmin, categories: database });
};

const handleRejoin = (socket, savedId) => {
    logger.log('GAME', `Rejoin solicitado en Impostor ID: ${savedId}`);
    
    const player = players.find(p => p.id === savedId);
    
    if (player) {
        // Cancelar borrado si estaba pendiente
        if (player.timeout) {
            clearTimeout(player.timeout);
            player.timeout = null;
        }

        player.socketId = socket.id;
        player.connected = true;
        socket.join('impostor');
        
        socket.emit('joinedSuccess', { playerId: savedId, room: 'impostor', isRejoin: true });
        socket.emit('initSetup', { isAdmin: player.isAdmin, categories: database });
        
        broadcast(socket.server);

        // PERSISTENCIA DE ROL: Si la partida está en marcha, reenviamos su rol
        if (gameInProgress && turnData[player.id]) {
            logger.log('GAME', `Restaurando rol a ${player.name}`);
            socket.emit('roleAssigned', turnData[player.id]);
        }
    } else {
        socket.emit('sessionExpired');
    }
};

const handleLeave = (playerId) => {
    const p = players.find(pl => pl.id === playerId);
    if (p) {
         if(p.timeout) clearTimeout(p.timeout);
         players = players.filter(pl => pl.id !== playerId);
         // Limpiar votos que este jugador haya hecho
         players.forEach(x => { if(x.votedFor === playerId) x.votedFor = null; });
    }
};

const handleDisconnect = (socket) => {
    const p = players.find(pl => pl.socketId === socket.id);
    if (p) { 
        p.connected = false; 
        if(socket.server) broadcast(socket.server); 
        
        // Timeout de seguridad (15 min) antes de borrar definitivamente
        if(p.timeout) clearTimeout(p.timeout);
        p.timeout = setTimeout(() => {
            logger.log('GAME', `Borrando a ${p.name} por inactividad.`);
            players = players.filter(pl => pl.id !== p.id);
        }, 15 * 60 * 1000); 
    }
};

// --- 4. LÓGICA DEL JUEGO ---

const gameModule = (io, socket) => {
    
    socket.on('impostor_action', (action) => {
        const me = players.find(p => p.socketId === socket.id);
        if (!me) return;

        // --- ACCIONES DE ADMIN ---
        if (me.isAdmin) {
            if (action.type === 'changeImpostorCount') {
                settings.impostorCount = Math.max(1, Math.min(players.length - 1, settings.impostorCount + action.value));
                broadcast(io);
            }
            if (action.type === 'toggleCategory') {
                const i = settings.selectedCategories.indexOf(action.value);
                if (i > -1) settings.selectedCategories.splice(i, 1);
                else settings.selectedCategories.push(action.value);
                broadcast(io);
            }
            if (action.type === 'toggleHints') {
                settings.hintsEnabled = !settings.hintsEnabled;
                broadcast(io);
            }
            if (action.type === 'kick') {
                const target = players.find(p => p.id === action.targetId);
                if (target) {
                    if (target.socketId) io.to(target.socketId).emit('sessionExpired');
                    handleLeave(target.id); // Reutilizamos la lógica de borrado
                    broadcast(io);
                }
            }
            if (action.type === 'kill' && me.isAdmin) {
                const p = players.find(p => p.id === action.targetId);
                if (p) { 
                    p.isDead = !p.isDead; 
                    if (!p.isDead) p.votedFor = null; 
                    broadcast(io); 
                }
            }
            if (action.type === 'clearVotes') {
                if (me.isAdmin) {
                    players.forEach(p => p.votedFor = null);
                    broadcast(io);
                }
            }
            if (action.type === 'reset') {
                // Mostrar resumen antes de cerrar si existe
                if (turnData['SUMMARY']) io.to('impostor').emit('gameSummary', turnData['SUMMARY']);
                gameInProgress = false;
                players.forEach(p => { p.isDead = false; p.votedFor = null; });
                io.to('impostor').emit('resetGame'); 
                broadcast(io);
            }
            
        }
        // --- ACCIONES DE JUGADOR ---
        if (action.type === 'vote') {
            const me = players.find(p => p.socketId === socket.id);
            if (me && !me.isDead) { // Solo votan los vivos
                // Si ya le votaba a este target, lo quito (null). Si no, lo pongo.
                me.votedFor = (me.votedFor === action.targetId) ? null : action.targetId;
                broadcast(io);
            }
        }
        if (action.type === 'revealResults' && me.isAdmin) {
            // Actualizamos el estado de los impostores en tiempo real por si murieron durante la partida
            if (turnData['SUMMARY']) {
                // Buscamos a los jugadores que eran impostores originalmente
                const updatedImpostors = players
                    .filter(p => turnData['SUMMARY'].originalImpostorIds.includes(p.id))
                    .map(p => ({ name: p.name, isDead: p.isDead }));
                
                // Actualizamos el objeto summary
                turnData['SUMMARY'].impostorsData = updatedImpostors;
                
                // Enviamos evento
                io.to('impostor').emit('gameSummary', turnData['SUMMARY']);
            }
        }

        // --- START CON CUENTA ATRÁS RECUPERADA ---
        if (action.type === 'start') {
            if (players.length < 3) return;
            
            // 1. Emitir Cuenta Atrás
            io.to('impostor').emit('preGameCountdown', 3);

            // 2. Preparar lógica (pero esperar al timeout para enviar roles)
            let wordPool = [];
            let activeLabels = [];
            const cats = settings.selectedCategories.length > 0 ? settings.selectedCategories : Object.keys(database).filter(k => k !== "MIX");
            
            cats.forEach(k => { 
                if (database[k]) { 
                    wordPool = wordPool.concat(database[k].words); 
                    activeLabels.push(database[k].label); 
                } 
            });

            if (!wordPool.length) return;
            const sel = wordPool[Math.floor(Math.random() * wordPool.length)];
            
            let indices = players.map((_, i) => i).sort(() => Math.random() - 0.5);
            const impostorIndices = indices.slice(0, settings.impostorCount);
            const starterName = players[Math.floor(Math.random() * players.length)].name;

            players.forEach(p => { p.isDead = false; p.votedFor = null; });
            gameInProgress = true;
            turnData = {};

            // Guardamos IDs originales para el resumen posterior
            const originalImpostorIds = [];

            players.forEach((p, i) => {
                const isImpostor = impostorIndices.includes(i);
                if (isImpostor) originalImpostorIds.push(p.id);

                const role = isImpostor ? "IMPOSTOR" : "CIUDADANO";
                let text = "";
                if (isImpostor) {
                    text = settings.hintsEnabled ? `Pista: ${sel.hint}` : "Sin pistas";
                } else {
                    text = `Palabra: ${sel.word}`;
                }
                turnData[p.id] = { role, text, starter: starterName, categoriesPlayed: activeLabels.join(" + ") };
            });
            
            // Estructura de Resumen Mejorada
            turnData['SUMMARY'] = {
                word: sel.word, 
                hint: sel.hint,
                originalImpostorIds: originalImpostorIds, // Guardamos IDs para buscar estado actual luego
                // Datos iniciales (se actualizarán al revelar)
                impostorsData: players.filter(p => originalImpostorIds.includes(p.id)).map(p => ({ name: p.name, isDead: p.isDead })),
                hintsWasEnabled: settings.hintsEnabled
            };

            // 3. ENVIAR ROLES TRAS 3.5 SEGUNDOS (Para que termine la cuenta atrás)
            setTimeout(() => {
                players.forEach(p => { 
                    if (p.connected && p.socketId && turnData[p.id]) {
                        io.to(p.socketId).emit('roleAssigned', turnData[p.id]); 
                    }
                });
                broadcast(io);
            }, 3500);
        }

        // --- RESET ---
        if (action.type === 'reset') {
            gameInProgress = false;
            players.forEach(p => { p.isDead = false; p.votedFor = null; });
            io.to('impostor').emit('resetGame'); 
            broadcast(io);
        }
        if(['changeImpostorCount', 'toggleCategory', 'toggleHints'].includes(action.type)) {
             broadcast(io);
        }
    });
    socket.on('disconnect', () => { handleDisconnect(socket); });
};

// EXPORTACIÓN CON MÉTODOS ADJUNTOS
gameModule.handleJoin = handleJoin;
gameModule.handleRejoin = handleRejoin;
gameModule.handleLeave = handleLeave;
gameModule.handleDisconnect = handleDisconnect;

// Método extra para tests
gameModule.resetInternalState = () => {
    players = [];
    gameInProgress = false;
    turnData = {};
    logger.log('GAME', 'Estado interno de Impostor reseteado.');
};

module.exports = gameModule;