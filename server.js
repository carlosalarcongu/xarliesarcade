require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// --- BASE DE DATOS DE USUARIOS ---
const db = new Database(path.join(__dirname, 'arcade.db'));
db.prepare('CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT, email TEXT)').run();

const REQ_FILE = path.join(__dirname, 'pending_requests.json');
if (!fs.existsSync(REQ_FILE)) {
    fs.writeFileSync(REQ_FILE, JSON.stringify([]));
}

const getRequests = () => JSON.parse(fs.readFileSync(REQ_FILE));
const saveRequests = (reqs) => fs.writeFileSync(REQ_FILE, JSON.stringify(reqs, null, 2));

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
    fiesta: require('./games/fiesta'),
    trivial: require('./games/trivial'),
    fifa: require('./games/fifa'),
    torres: require('./games/torres'),
    darkstories: require('./games/darkstories'),
    beber: require('./games/beber'),
    analytics: require('./games/analytics'),
    feedback: require('./games/feedback')
};

Object.keys(gamesModules).forEach(key => {
    if (gamesModules[key] && typeof gamesModules[key].init === 'function') {
        gamesModules[key].init(io);
    }
});

io.on('connection', (socket) => {

    // --- NUEVO: GESTIÓN DE AUTENTICACIÓN Y REGISTRO ---

    socket.on('checkAuthRequirement', (name, callback) => {
        const username = name.toLowerCase();
        // Comprobar variables de entorno (admins legacy)
        if (['musero', 'administrador m', 'xarlie'].includes(username)) {
            return callback({ needsPassword: true });
        }
        // Comprobar base de datos
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (user) {
            return callback({ needsPassword: true });
        }
        callback({ needsPassword: false });
    });

    socket.on('verifyPassword', (data, callback) => {
        const { username, password } = data;
        const lowerName = username.toLowerCase();
        let isValid = false;
        
        // Admins Legacy
        if (lowerName === 'musero' && password === process.env.MUSERO_PASSWORD) isValid = true;
        else if (['administrador m', 'xarlie'].includes(lowerName) && password === process.env.ADMIN_PASSWORD) isValid = true;
        else {
            // Usuarios registrados
            const user = db.prepare('SELECT * FROM users WHERE username = ?').get(lowerName);
            if (user && user.password === password) {
                isValid = true;
            }
        }
        callback({ success: isValid });
    });

    socket.on('checkUsernameAvailability', (name, callback) => {
        const lowerName = name.toLowerCase();
        if (['musero', 'administrador m', 'xarlie'].includes(lowerName)) return callback({ available: false });
        
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(lowerName);
        if (user) return callback({ available: false });

        const reqs = getRequests();
        const pending = reqs.find(r => r.username === lowerName && r.type === 'register');
        if (pending) return callback({ available: false, pending: true });

        callback({ available: true });
    });

    socket.on('submitAuthRequest', (data, callback) => {
        const reqs = getRequests();
        const newReq = {
            id: String(Date.now()),
            date: new Date().toISOString(),
            type: data.type, // 'register' o 'forgot'
            username: data.username.toLowerCase(),
            password: data.password,
            email: data.email || ''
        };
        
        // Quitar solicitudes previas del mismo usuario y tipo para evitar spam
        const filteredReqs = reqs.filter(r => !(r.username === newReq.username && r.type === newReq.type));
        filteredReqs.push(newReq);
        saveRequests(filteredReqs);
        
        if (callback) callback({ success: true });
    });

    // --- PANEL DE ADMINISTRADORES (AUTH) ---
    socket.on('getAuthRequests', (adminName) => {
        if (!['musero', 'administrador m', 'xarlie'].includes((adminName || '').toLowerCase())) return;
        socket.emit('authRequestsList', getRequests());
    });

    socket.on('resolveAuthRequest', (data) => {
        const { adminName, reqId, action } = data;
        if (!['musero', 'administrador m', 'xarlie'].includes((adminName || '').toLowerCase())) return;

        let reqs = getRequests();
        const request = reqs.find(r => r.id === reqId);
        
        if (request) {
            if (action === 'approve') {
                db.prepare('INSERT OR REPLACE INTO users (username, password, email) VALUES (?, ?, ?)')
                  .run(request.username, request.password, request.email);
                
                // Si es un nuevo registro, expulsar retroactivamente a quien lo esté usando sin auth
                if (request.type === 'register') {
                    io.emit('forceKickIfUnregistered', request.username);
                }
            }
            // Eliminar de pendientes
            reqs = reqs.filter(r => r.id !== reqId);
            saveRequests(reqs);
        }
        
        socket.emit('authRequestsList', reqs);
    });

    // ----------------------------------------------------

    Object.keys(gamesModules).forEach(key => {
        const module = gamesModules[key];
        if (module && typeof module.handleSocket === 'function') {
            module.handleSocket(io, socket);
        } else if (typeof module === 'function') {
            module(io, socket);
        }
    });

    socket.on('requestHubRooms', () => {
        const allRooms = [];
        Object.keys(gamesModules).forEach(gameKey => {
            const module = gamesModules[gameKey];
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

    socket.on('joinRoom', ({ name, room, roomId }) => {
        if (!name || !room) return;
        const module = gamesModules[room];
        if (module && typeof module.handleJoin === 'function') {
            module.handleJoin(socket, name, roomId);
        } else if (module && typeof module === 'function') {
             if (room === 'lobo') require('./games/lobo').handleJoin(socket, name);
             else if (room === 'anecdotas') require('./games/anecdotas').handleJoin(socket, name);
             else if (room === 'elmas') require('./games/elmas').handleJoin(socket, name);
             else if (room === 'pinturilloImp') require('./games/pinturilloImp').handleJoin(socket, name);
        }
    });

    socket.on('rejoin', ({ savedId, savedRoom, savedRoomId }) => {
        if (!savedId || !savedRoom) return;
        const module = gamesModules[savedRoom];
        if (module && typeof module.handleRejoin === 'function') {
            module.handleRejoin(socket, savedId, savedRoomId);
        } else {
             if (savedRoom === 'lobo') require('./games/lobo').handleRejoin(socket, savedId);
             else if (savedRoom === 'anecdotas') require('./games/anecdotas').handleRejoin(socket, savedId);
             else if (savedRoom === 'elmas') require('./games/elmas').handleRejoin(socket, savedId);
             else if (savedRoom === 'pinturilloImp') require('./games/pinturilloImp').handleRejoin(socket, savedId);
        }
    });

    socket.on('leaveGame', ({ playerId, room, roomId }) => {
        const module = gamesModules[room];
        if (module && typeof module.handleLeave === 'function') {
            module.handleLeave(playerId, roomId, io);
        } else {
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