const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir archivos estáticos (HTML, CSS, JS del cliente)
app.use(express.static(path.join(__dirname, 'public')));

// --- GESTIÓN DE SOCKETS ---
io.on('connection', (socket) => {
    console.log('[SOCKET] Nueva conexión:', socket.id);

    // 1. CARGAR JUEGO IMPOSTOR
    require('./games/impostor')(io, socket);

    // 2. CARGAR JUEGO LOBO
    require('./games/lobo')(io, socket);

    // 3. CARGAR JUEGO ANÉCDOTAS
    require('./games/anecdotas')(io, socket);

    // 4. CARGAR JUEGO EL MÁS
    require('./games/elmas')(io, socket);

    // 5. CARGAR MÓDULO FEEDBACK (CORREGIDO AQUÍ)
    // Se llama directamente a la función exportada, sin .init
    require('./games/feedback')(io, socket);


    // --- GESTIÓN DE SALAS Y DESCONEXIÓN GENÉRICA ---
    
    socket.on('joinRoom', ({ name, room }) => {
        // Unirse a la sala de socket.io
        socket.join(room);
        
        // Delegar la lógica específica al archivo del juego correspondiente
        // (La lógica de añadir al array 'players' está dentro de cada require de arriba)
        
        // En este punto, los módulos de arriba ya han escuchado el evento 'joinRoom'
        // si lo tienen configurado, o usan sus propios eventos.
        // Nota: En tu arquitectura actual, cada juego tiene su propio "handleJoin" 
        // interno o escucha eventos específicos, pero mantenemos esto por compatibilidad.
        
        if (room === 'impostor') {
            const impGame = require('./games/impostor');
            if(impGame.handleJoin) impGame.handleJoin(socket, name);
        }
        else if (room === 'lobo') {
            const loboGame = require('./games/lobo');
            if(loboGame.handleJoin) loboGame.handleJoin(socket, name);
        }
        else if (room === 'anecdotas') {
            const anecGame = require('./games/anecdotas');
            if(anecGame.handleJoin) anecGame.handleJoin(socket, name);
        }
        else if (room === 'elmas') {
            const elmasGame = require('./games/elmas');
            if(elmasGame.handleJoin) elmasGame.handleJoin(socket, name);
        }
    });

    // Reconexión
    socket.on('rejoin', ({ savedId, savedRoom }) => {
        // Lógica simple de reconexión: volver a meter al socket en la sala
        socket.join(savedRoom);
        console.log(`[REJOIN] Jugador ${savedId} reconectado a ${savedRoom}`);
        
        // Notificar al cliente que todo ok
        socket.emit('joinedSuccess', { playerId: savedId, room: savedRoom });
        
        // Pedir a los juegos que refresquen la lista para este socket
        // (Esto es un truco: forzamos una actualización enviando un evento vacío si es necesario)
    });

    socket.on('leaveGame', ({ playerId, room }) => {
        console.log(`[LEAVE] Jugador ${playerId} sale de ${room}`);
        socket.leave(room);
        
        // Aquí deberíamos llamar a la lógica de borrado de cada juego si fuera necesario
        // Pero por ahora tu lógica elimina por desconexión o manualmente.
    });

    socket.on('disconnect', () => {
        // Cada juego maneja su propia desconexión en sus archivos (variable 'players')
        // o marcan como desconectado.
        console.log('[SOCKET] Desconexión:', socket.id);
    });
});

// --- ARRANCAR SERVIDOR ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ SERVIDOR MODULARIZADO LISTO EN PUERTO ${PORT}`);
});