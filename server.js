const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const contexto = require('./games/contexto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Referencias globales para el Hub
const gamesModules = {
    impostor: require('./games/impostor'),
    lobo: require('./games/lobo'),
    anecdotas: require('./games/anecdotas'),
    elmas: require('./games/elmas'),
    tabu: require('./games/tabu'),
    pinturilloImp: require('./games/pinturilloImp'),
    mus: require('./games/mus'),
    cifrasyletras: require('./games/cifrasyletras'),
    give: require('./games/give'),
    orden: require('./games/orden'),
    contexto: require('./games/contexto'),
    consejo: require('./games/consejo'),
    fiesta: require('./games/fiesta')
};

// Inicializar juegos
Object.keys(gamesModules).forEach(key => {
    if (gamesModules[key] && typeof gamesModules[key].init === 'function') {
        gamesModules[key].init(io);
    }
});

io.on('connection', (socket) => {
    
    // Delegación híbrida (Nuevo/Viejo) para eventos de juego
    Object.keys(gamesModules).forEach(key => {
        const module = gamesModules[key];
        if (module && typeof module.handleSocket === 'function') {
            module.handleSocket(io, socket);
        } else if (typeof module === 'function') {
            module(io, socket);
        }
    });

    // --- HUB: PETICIÓN DE SALAS (CORREGIDO) ---
    socket.on('requestHubRooms', () => {
        const allRooms = [];
        
        // CORRECCIÓN: Iteramos sobre TODOS los módulos cargados, no solo 'impostor'
        Object.keys(gamesModules).forEach(gameKey => {
            const module = gamesModules[gameKey];
            
            // Si el módulo tiene la función getRooms (significa que está migrado al sistema de salas)
            if (module && typeof module.getRooms === 'function') {
                const rooms = module.getRooms();
                
                rooms.forEach(r => {
                    allRooms.push({
                        game: gameKey,
                        id: r.id,
                        players: r.players,
                        status: r.state
                    });
                });
            }
        });

        socket.emit('hubRoomsUpdate', allRooms);
    });

    // --- JOIN ---
    socket.on('joinRoom', ({ name, room, roomId }) => {
        if (!name || !room) return;
        const module = gamesModules[room];

        if (module && typeof module.handleJoin === 'function') {
            module.handleJoin(socket, name, roomId);
        } else if (module && typeof module === 'function') {
             // Compatibilidad juegos viejos
             if (room === 'lobo') require('./games/lobo').handleJoin(socket, name);
             else if (room === 'anecdotas') require('./games/anecdotas').handleJoin(socket, name);
             else if (room === 'elmas') require('./games/elmas').handleJoin(socket, name);
             else if (room === 'pinturilloImp') require('./games/pinturilloImp').handleJoin(socket, name);
        }
    });

    // --- REJOIN ---
    socket.on('rejoin', ({ savedId, savedRoom, savedRoomId }) => {
        if (!savedId || !savedRoom) return;
        const module = gamesModules[savedRoom];
        
        if (module && typeof module.handleRejoin === 'function') {
            module.handleRejoin(socket, savedId, savedRoomId);
        } else {
             // Compatibilidad
             if (savedRoom === 'lobo') require('./games/lobo').handleRejoin(socket, savedId);
             else if (savedRoom === 'anecdotas') require('./games/anecdotas').handleRejoin(socket, savedId);
             else if (savedRoom === 'elmas') require('./games/elmas').handleRejoin(socket, savedId);
             else if (savedRoom === 'pinturilloImp') require('./games/pinturilloImp').handleRejoin(socket, savedId);
        }
    });

    // --- LEAVE ---
    socket.on('leaveGame', ({ playerId, room, roomId }) => {
        const module = gamesModules[room];
        if (module && typeof module.handleLeave === 'function') {
            module.handleLeave(playerId, roomId, io);
        } else {
             // Compatibilidad
             if (room === 'lobo') require('./games/lobo').handleLeave(playerId, io);
             else if (room === 'anecdotas') require('./games/anecdotas').handleLeave(playerId, io);
             else if (room === 'elmas') require('./games/elmas').handleLeave(playerId, io);
             else if (room === 'pinturilloImp') require('./games/pinturilloImp').handleLeave(playerId, io);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ SERVIDOR LISTO EN PUERTO ${PORT}`);
});