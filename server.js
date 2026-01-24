const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Módulos de juegos
const ImpostorGame = require('./games/impostor');
const LoboGame = require('./games/lobo');
const FeedbackModule = require('./games/feedback');
const AnecdotasGame = require('./games/anecdotas');
const ElMasGame = require('./games/elmas');

// Configuración Express
const PUBLIC_PATH = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_PATH));

// Logs globales
app.use((req, res, next) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const isCloudflare = req.headers['cf-ray'] ? '☁️' : '🔌';
    console.log(`[WEB] ${req.method} ${req.originalUrl} | ${isCloudflare} | IP: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);
    next();
});

app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_PATH, 'index.html')));

// --- SOCKET.IO GLOBAL ---
io.on('connection', (socket) => {
    console.log(`[SOCKET] Nueva conexión: ${socket.id}`);

    // Inicializar módulos para este socket
    ImpostorGame.init(io, socket);
    LoboGame.init(io, socket);
    FeedbackModule.init(io, socket);
    AnecdotasGame.init(io, socket);
    ElMasGame.init(io, socket); 

    // Sistema de desconexión global (Delegado a los módulos)
    socket.on('disconnect', () => {
        ImpostorGame.handleDisconnect(socket);
        LoboGame.handleDisconnect(socket);
        AnecdotasGame.handleDisconnect(socket);
        ElMasGame.handleDisconnect(socket);
    });

    // Enrutador de Reconexión
    socket.on('rejoin', ({ savedId, savedRoom }) => {
        if (savedRoom === 'impostor') ImpostorGame.handleRejoin(socket, savedId);
        else if (savedRoom === 'lobo') LoboGame.handleRejoin(socket, savedId);
        else if (savedRoom === 'anecdotas') AnecdotasGame.handleRejoin(socket, savedId);
        else if (savedRoom === 'elmas') ElMasGame.handleRejoin(socket, savedId);
        else socket.emit('sessionExpired');
    });

    // Enrutador de Entrada
    socket.on('joinRoom', (data) => {
        if (data.room === 'impostor') ImpostorGame.handleJoin(socket, data.name);
        else if (data.room === 'lobo') LoboGame.handleJoin(socket, data.name);
        else if (data.room === 'anecdotas') AnecdotasGame.handleJoin(socket, data.name);
        else if (data.room === 'elmas') ElMasGame.handleJoin(socket, data.name);
    });

    // Enrutador de Salida
    socket.on('leaveGame', (data) => {
        if (data.room === 'impostor') ImpostorGame.handleLeave(data.playerId);
        else if (data.room === 'lobo') LoboGame.handleLeave(data.playerId);
        else if (data.room === 'anecdotas') AnecdotasGame.handleLeave(data.playerId);
        else if (data.room === 'elmas') ElMasGame.handleLeave(data.playerId);
    });
});

http.listen(3000, '0.0.0.0', () => {
    console.log('✅ SERVIDOR MODULARIZADO LISTO EN PUERTO 3000');
});