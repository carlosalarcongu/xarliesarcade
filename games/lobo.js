const Utils = require('./utils');
const logger = require('../debug_logger'); 

// --- 1. VARIABLES GLOBALES ---
let players = [];
let gameInProgress = false;
let settings = { wolvesCount: 2, hasSeer: true, hasGirl: false, hasCupid: false, hasHunter: false };
let turnData = {}; // Almacena roles privados { playerId: { role, desc, partners } }

// --- 2. HELPERS ---
function broadcast(io) {
    const publicData = players.map(p => {
        // Calculamos votos recibidos
        const votes = players.filter(voter => voter.votedFor === p.id).length;
        
        // Revelar rol si está muerto
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
            hasVoted: !!p.votedFor,
            revealedRole: revealedRole
        };
    });
    
    io.to('lobo').emit('updateLoboList', { 
        players: publicData, 
        gameInProgress,
        settings 
    });
}

function getRoleDescription(role) {
    switch(role) {
        case 'LOBO': return "Comete crímenes nocturnos. Devora a los aldeanos.";
        case 'ALDEANO': return "Descubre a los lobos y linchalos de día.";
        case 'VIDENTE': return "Cada noche puedes ver el rol de un jugador.";
        case 'NIÑA': return "Puedes espiar a los lobos entrecerrando los ojos.";
        case 'CUPIDO': return "Enamora a dos personas la primera noche.";
        case 'CAZADOR': return "Si mueres, puedes matar a alguien más al instante.";
        default: return "";
    }
}

// --- 3. GESTIÓN DE JUGADORES ---

const handleJoin = (socket, name) => {
    const existing = players.find(p => p.rawName.toLowerCase() === name.trim().toLowerCase());
    if (existing) {
        if (!existing.connected) {
            logger.log('GAME LOBO', `Reconexión por nombre: ${name}`);
            return handleRejoin(socket, existing.id);
        }
        return socket.emit('joinError', 'Nombre en uso.');
    }

    const newPlayer = Utils.createPlayer(socket.id, name);
    // Campos extra para Lobo
    newPlayer.role = null;
    newPlayer.timeout = null;newPlayer.votedFor = null; 
    
    players.push(newPlayer);
    socket.join('lobo');
    socket.emit('joinedSuccess', { playerId: newPlayer.id, name: newPlayer.name, room: 'lobo' });
    broadcast(socket.server);
};

const handleRejoin = (socket, savedId) => {
    logger.log('GAME LOBO', `Rejoin solicitado ID: ${savedId}`);
    const p = players.find(x => x.id === savedId);
    
    if (p) {
        if (p.timeout) { clearTimeout(p.timeout); p.timeout = null; }
        
        p.socketId = socket.id;
        p.connected = true;
        socket.join('lobo');
        
        socket.emit('joinedSuccess', { playerId: savedId, name: p.name, room: 'lobo', isRejoin: true });
        
        // --- RECUPERAR ROL ---
        if (gameInProgress && turnData[p.id]) {
            logger.log('GAME LOBO', `Restaurando rol a ${p.name}: ${turnData[p.id].role}`);
            socket.emit('loboRoleAssigned', turnData[p.id]);
        }
        
        broadcast(socket.server);
    } else {
        socket.emit('sessionExpired');
    }
};

const handleLeave = (id) => {
    const p = players.find(x => x.id === id);
    if(p) {
        if(p.timeout) clearTimeout(p.timeout);
        players = players.filter(x => x.id !== id);
        if (turnData[id]) delete turnData[id];
    }
};

const handleDisconnect = (socket) => {
    const p = players.find(x => x.socketId === socket.id);
    if (p) {
        p.connected = false;
        if(socket.server) broadcast(socket.server);
        
        if(p.timeout) clearTimeout(p.timeout);
        p.timeout = setTimeout(() => {
            logger.log('GAME LOBO', `Borrando a ${p.name} por inactividad.`);
            players = players.filter(x => x.id !== p.id);
            if (turnData[p.id]) delete turnData[p.id];
        }, 15 * 60 * 1000);
    }
};

// --- 4. LÓGICA DEL JUEGO ---

const gameModule = (io, socket) => {
    socket.on('lobo_action', (action) => {
        const me = players.find(p => p.socketId === socket.id);
        if (!me) return;
        if (action.type === 'vote') {
            const me = players.find(p => p.socketId === socket.id);
            if (me && !me.isDead) {
                // Toggle: Votar / Desvotar
                me.votedFor = (me.votedFor === action.targetId) ? null : action.targetId;
                broadcast(io);
            }
        }
        if (action.type === 'clearVotes' && me.isAdmin) {
            players.forEach(p => p.votedFor = null);
            broadcast(io);
        }
        if (action.type === 'kill' && me.isAdmin) {
            const p = players.find(pl => pl.id === action.targetId);
            if (p) { 
                p.isDead = !p.isDead;
                if(!p.isDead) p.votedFor = null;
                broadcast(io); 
            }
        }
        if (action.type === 'updateSetting') {
            if (!me.isAdmin) return;
            settings[action.key] = action.value;
            // Validar límites
            if(action.key === 'wolvesCount') {
                settings.wolvesCount = Math.max(1, Math.min(players.length - 1, settings.wolvesCount));
            }
            broadcast(io); // Broadcast envía settings a todos
        }

        // KICK
        if (action.type === 'kick') {
            if (!me.isAdmin) return;
            const target = players.find(p => p.id === action.targetId);
            if (target) {
                if (target.socketId) io.to(target.socketId).emit('sessionExpired');
                players = players.filter(p => p.id !== action.targetId);
                if (turnData[action.targetId]) delete turnData[action.targetId];
                broadcast(io);
            }
        }

        // RESET
        if (action.type === 'reset') {
            if (!me.isAdmin) return;
            gameInProgress = false;
            turnData = {};
            players.forEach(p => { p.isDead = false; });
            io.to('lobo').emit('loboReset');
            broadcast(io);
        }

        // START
        if (action.type === 'start') {
            if (!me.isAdmin) return;
            if (players.length < settings.wolvesCount + 1) return; // Mínimo lógico

            gameInProgress = true;
            turnData = {};
            players.forEach(p => p.isDead = false);
            
            // 1. Crear Mazo
            let deck = [];
            
            // Añadir Lobos
            for(let i=0; i<settings.wolvesCount; i++) deck.push('LOBO');
            
            // Añadir Especiales (si están activos)
            if(settings.hasSeer) deck.push('VIDENTE');
            if(settings.hasGirl) deck.push('NIÑA');
            if(settings.hasCupid) deck.push('CUPIDO');
            if(settings.hasHunter) deck.push('CAZADOR');
            
            // Rellenar con Aldeanos
            while(deck.length < players.length) deck.push('ALDEANO');
            
            // Si sobran roles (porque hay pocos jugadores), recortamos
            if (deck.length > players.length) deck = deck.slice(0, players.length);
            
            // Shuffle
            deck = deck.sort(() => Math.random() - 0.5);

            // Asignar
            const wolfNames = [];
            // Pre-scan para saber quiénes son lobos
            players.forEach((p, i) => {
                if (deck[i] === 'LOBO') wolfNames.push(p.name);
            });

            players.forEach((p, i) => {
                const role = deck[i];
                let partners = [];

                if (role === 'LOBO') {
                    partners = wolfNames.filter(n => n !== p.name); // Sus amigos
                }

                // Guardar datos privados
                turnData[p.id] = { 
                    role, 
                    description: getRoleDescription(role), 
                    wolfPartners: partners 
                };

                // Enviar al socket
                if (p.socketId) io.to(p.socketId).emit('loboRoleAssigned', turnData[p.id]);
            });

            broadcast(io);
        }
    });

    socket.on('disconnect', () => handleDisconnect(socket));
};

gameModule.handleJoin = handleJoin;
gameModule.handleRejoin = handleRejoin;
gameModule.handleLeave = handleLeave;
gameModule.handleDisconnect = handleDisconnect;
gameModule.resetInternalState = () => {
    players = [];
    gameInProgress = false;
    turnData = {};
    settings = { wolvesCount: 2, hasSeer: true, hasGirl: false, hasCupid: false, hasHunter: false };
    logger.log('GAME LOBO', 'Estado interno reseteado.');
};

module.exports = gameModule;