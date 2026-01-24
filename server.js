const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// --- GESTIÓN DE SOCKETS ---
io.on('connection', (socket) => {
    console.log('[SOCKET] Nueva conexión:', socket.id);

    // CARGAR JUEGOS
    require('./games/impostor')(io, socket);
    require('./games/lobo')(io, socket);
    require('./games/anecdotas')(io, socket);
    require('./games/elmas')(io, socket);
    require('./games/feedback')(io, socket);
    require('./games/tabu')(io, socket);

    // --- UNIRSE A SALA (JOIN) ---
    socket.on('joinRoom', ({ name, room }) => {
        socket.join(room);
        
        if (room === 'impostor') {
            const game = require('./games/impostor');
            if(game.handleJoin) game.handleJoin(socket, name);
        }
        else if (room === 'lobo') {
            const game = require('./games/lobo');
            if(game.handleJoin) game.handleJoin(socket, name);
        }
        else if (room === 'anecdotas') {
            const game = require('./games/anecdotas');
            if(game.handleJoin) game.handleJoin(socket, name);
        }
        else if (room === 'elmas') {
            const game = require('./games/elmas');
            if(game.handleJoin) game.handleJoin(socket, name);
        }
        else if (room === 'tabu') {
            const game = require('./games/tabu');
            if(game.handleJoin) game.handleJoin(socket, name);
        }
    });

    // --- RECONEXIÓN (REJOIN) - AQUÍ ESTABA EL ERROR ---
    socket.on('rejoin', ({ savedId, savedRoom }) => {
        socket.join(savedRoom);
        console.log(`[REJOIN] Jugador ${savedId} reconectado a ${savedRoom}`);
        
        // AHORA SÍ AVISAMOS AL JUEGO ESPECÍFICO
        if (savedRoom === 'impostor') {
            const game = require('./games/impostor');
            if(game.handleRejoin) game.handleRejoin(socket, savedId);
        }
        else if (savedRoom === 'lobo') {
            const game = require('./games/lobo');
            if(game.handleRejoin) game.handleRejoin(socket, savedId);
        }
        else if (savedRoom === 'anecdotas') {
            const game = require('./games/anecdotas');
            if(game.handleRejoin) game.handleRejoin(socket, savedId);
        }
        else if (savedRoom === 'elmas') {
            const game = require('./games/elmas');
            if(game.handleRejoin) game.handleRejoin(socket, savedId);
        }
        else if (savedRoom === 'tabu') {
            const game = require('./games/tabu');
            if(game.handleRejoin) game.handleRejoin(socket, savedId);
        }
        
        // Nota: Ya no hacemos socket.emit('joinedSuccess') aquí genérico,
        // porque cada juego lo hace dentro de su handleRejoin enviando además el estado del juego.
    });

    socket.on('leaveGame', ({ playerId, room }) => {
        console.log(`[LEAVE] Jugador ${playerId} sale de ${room}`);
        socket.leave(room);
        
        // OPCIONAL: Avisar al juego para que lo quite de la lista inmediatamente
        if (room === 'tabu') {
             require('./games/tabu').handleLeave(playerId);
             // Forzar actualización visual a los demás
             // (Esto requiere que el juego tenga un broadcast expuesto o que handleLeave lo haga)
        }
        // Repetir para otros juegos si quieres borrado inmediato al salir voluntariamente
    });

    socket.on('disconnect', () => {
        console.log('[SOCKET] Desconexión:', socket.id);
        // Cada juego maneja su propia desconexión internamente mediante los listeners
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ SERVIDOR MODULARIZADO LISTO EN PUERTO ${PORT}`);
});