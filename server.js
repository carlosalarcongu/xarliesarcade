const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const logger = require('./debug_logger'); // Importamos logger si existe, opcional

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
    require('./games/pinturilloImp')(io, socket);

    // --- UNIRSE A SALA (JOIN) ---
    socket.on('joinRoom', ({ name, room }) => {
        // Validación básica
        if (!name || !room) return;
        
        socket.join(room);
        
        // Delegación dinámica (Switch más limpio)
        switch(room) {
            case 'impostor': require('./games/impostor').handleJoin(socket, name); break;
            case 'lobo': require('./games/lobo').handleJoin(socket, name); break;
            case 'anecdotas': require('./games/anecdotas').handleJoin(socket, name); break;
            case 'elmas': require('./games/elmas').handleJoin(socket, name); break;
            case 'tabu': require('./games/tabu').handleJoin(socket, name); break;
            case 'pinturilloImp': require('./games/pinturilloImp').handleJoin(socket, name); break;
        }
    });

    // --- RECONEXIÓN (REJOIN) ---
    // ESTA ES LA CLAVE DE LA PERSISTENCIA
    socket.on('rejoin', ({ savedId, savedRoom }) => {
        if (!savedId || !savedRoom) return;

        socket.join(savedRoom);
        console.log(`[REJOIN] Jugador ${savedId} intentando volver a ${savedRoom}`);
        
        // Delegamos al juego específico para que restaure el estado (roles, cartas, etc.)
        switch(savedRoom) {
            case 'impostor': 
                if(require('./games/impostor').handleRejoin) 
                    require('./games/impostor').handleRejoin(socket, savedId); 
                break;
            case 'lobo': 
                if(require('./games/lobo').handleRejoin) 
                    require('./games/lobo').handleRejoin(socket, savedId); 
                break;
            case 'anecdotas': 
                if(require('./games/anecdotas').handleRejoin) 
                    require('./games/anecdotas').handleRejoin(socket, savedId); 
                break;
            case 'elmas': 
                if(require('./games/elmas').handleRejoin) 
                    require('./games/elmas').handleRejoin(socket, savedId); 
                break;
            case 'tabu': 
                if(require('./games/tabu').handleRejoin) 
                    require('./games/tabu').handleRejoin(socket, savedId); 
                break;
            case 'pinturilloImp': 
                if(require('./games/pinturilloImp').handleRejoin) 
                    require('./games/pinturilloImp').handleRejoin(socket, savedId); 
                break;
            default:
                console.log(`[REJOIN] Sala desconocida: ${savedRoom}`);
                console.log(`[REJOIN] Socket ID: ${socket.id}, visto hace ${new Date().toISOString()}`); 
        }
    });

    // --- SALIR (LEAVE) ---
    socket.on('leaveGame', ({ playerId, room }) => {
        console.log(`[LEAVE] Jugador ${playerId} sale voluntariamente de ${room}`);
        socket.leave(room);
        
        // Avisar al juego para borrado inmediato (sin timeout)
        switch(room) {
            case 'impostor': require('./games/impostor').handleLeave(playerId); break;
            case 'lobo': require('./games/lobo').handleLeave(playerId); break;
            case 'anecdotas': require('./games/anecdotas').handleLeave(playerId); break;
            case 'elmas': require('./games/elmas').handleLeave(playerId); break;
            case 'tabu': require('./games/tabu').handleLeave(playerId); break;
            case 'pinturilloImp': require('./games/pinturilloImp').handleLeave(playerId); break;
        }
    });

    // --- RESET DE MEMORIA (PARA TESTS) ---
    socket.on('debug_reset', () => {
        console.log('[SERVER] 🧹 EJECUTANDO RESET DE MEMORIA...');
        try {
            if(require('./games/impostor').resetInternalState) require('./games/impostor').resetInternalState();
            if(require('./games/lobo').resetInternalState) require('./games/lobo').resetInternalState();
            if(require('./games/anecdotas').resetInternalState) require('./games/anecdotas').resetInternalState();
            if(require('./games/elmas').resetInternalState) require('./games/elmas').resetInternalState();
            if(require('./games/tabu').resetInternalState) require('./games/tabu').resetInternalState();
            if(require('./games/pinturilloImp').resetInternalState) require('./games/pinturilloImp').resetInternalState();
            
            socket.emit('debug_reset_ok');
        } catch (e) {
            console.error('[SERVER] Error en reset:', e);
        }
    });

    socket.on('disconnect', () => {
        // La desconexión se maneja en cada módulo de juego individualmente
        // para aplicar los timeouts de seguridad.

    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ SERVIDOR LISTO EN PUERTO ${PORT}`);
});