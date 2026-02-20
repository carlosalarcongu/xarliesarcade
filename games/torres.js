const Utils = require('./utils');

const rooms = {};

const THEMES = {
    FUTBOL: [
        "Jugadores negros", "Jugadores con Balón de Oro", "Jugadores campeones del mundo", "Jugadores zurdos", 
        "Jugadores con más de 30 goles en una temporada", "Porteros", "Defensas centrales", "Laterales derechos", 
        "Centrocampistas ofensivos", "Delanteros centro", "Jugadores brasileños", "Jugadores argentinos", 
        "Jugadores franceses", "Jugadores españoles", "Jugadores que jugaron en el Real Madrid", 
        "Jugadores que jugaron en el FC Barcelona", "Jugadores que jugaron en la Premier League", 
        "Jugadores con más de 100 partidos internacionales", "Jugadores con tatuajes visibles", "Jugadores con dorsal 10", 
        "Jugadores con dorsal 7", "Jugadores con más de 3 Champions", "Jugadores que han sido expulsados en un Mundial", 
        "Jugadores con hat-trick en Champions", "Jugadores que marcaron en una final", "Jugadores que ganaron Copa América", 
        "Jugadores que ganaron Eurocopa", "Jugadores africanos", "Jugadores asiáticos", "Jugadores menores de 21 años", 
        "Jugadores mayores de 35 años", "Jugadores con doble nacionalidad", "Jugadores con apellido compuesto", 
        "Jugadores que cambiaron de selección", "Jugadores formados en La Masia", "Jugadores con más de 200 goles", 
        "Jugadores con récord Guinness", "Jugadores con hermano futbolista", "Jugadores que fueron entrenadores", 
        "Jugadores con más de 10 asistencias en una temporada", "Jugadores que jugaron en 3 ligas distintas", 
        "Jugadores campeones de Champions y Mundial", "Jugadores con gol olímpico", "Jugadores con gol desde medio campo", 
        "Jugadores con más de 1.90m", "Jugadores con menos de 1.70m", "Jugadores con contrato vitalicio", 
        "Jugadores que costaron más de 100M€", "Jugadores que jugaron en Italia y España", "Jugadores con padre futbolista", 
        "Jugadores que ganaron el Golden Boy", "Jugadores con botas doradas", "Jugadores que debutaron con 16 años", 
        "Jugadores que se retiraron antes de los 30", "Jugadores con más de 500 partidos", 
        "Jugadores campeones de liga en 3 países", "Jugadores con récord de goles en su selección", 
        "Jugadores que fallaron un penalti decisivo", "Jugadores que marcaron 5 goles en un partido", 
        "Jugadores que jugaron sin equipo un año", "Jugadores que han sido capitanes", 
        "Jugadores que jugaron en el mismo club más de 10 años", "Jugadores que ganaron el The Best", 
        "Jugadores que nacieron en África", "Jugadores con nacionalidad europea", "Jugadores con peinado icónico", 
        "Jugadores con más de 50 goles internacionales", "Jugadores que jugaron en la MLS", 
        "Jugadores que jugaron en Arabia Saudí", "Jugadores que fueron suplentes en una final", 
        "Jugadores con premio Pichichi", "Jugadores que han marcado en 3 Mundiales", 
        "Jugadores con asistencia de tacón famosa", "Jugadores que jugaron en el mismo club que Messi", 
        "Jugadores que jugaron en el mismo club que Cristiano", "Jugadores con más de 20 títulos", "Jugadores con gol en su debut"
    ],
    ESTUDIOS: [
        "Personas con carrera universitaria", "Personas con máster", "Personas con doctorado", "Personas que repitieron curso", 
        "Personas que estudiaron ingeniería", "Personas que estudiaron medicina", "Personas que estudiaron derecho", 
        "Personas que estudiaron informática", "Personas que hicieron Erasmus", "Personas que estudiaron en colegio privado", 
        "Personas que estudiaron en público", "Personas que estudiaron en el extranjero", "Personas que dejaron la universidad", 
        "Personas que sacaban sobresalientes", "Personas que copiaron en un examen", "Personas que suspendieron matemáticas", 
        "Personas que hicieron bachillerato científico", "Personas que hicieron bachillerato social", "Personas que hicieron FP", 
        "Personas con matrícula de honor", "Personas que cambiaron de carrera", "Personas que hicieron oposiciones", 
        "Personas que estudian actualmente", "Personas que estudiaron arte", "Personas que estudiaron arquitectura", 
        "Personas con beca", "Personas con idiomas certificados", "Personas que estudiaron online", 
        "Personas que hicieron prácticas en empresa", "Personas que trabajan de lo que estudiaron", 
        "Personas que no trabajan de lo que estudiaron", "Personas que hicieron doble grado", "Personas que estudiaron filosofía", 
        "Personas que estudiaron psicología", "Personas que suspendieron la selectividad", "Personas que hicieron selectividad a la primera", 
        "Personas con nota media superior a 8", "Personas con nota media inferior a 6", "Personas que odiaban estudiar", 
        "Personas que amaban estudiar", "Personas que fueron delegados de clase", "Personas que hicieron intercambio escolar", 
        "Personas que estudiaron música", "Personas que estudiaron ciencias", "Personas que estudiaron letras", 
        "Personas autodidactas", "Personas que hicieron curso online", "Personas que hicieron bootcamp", 
        "Personas que estudiaron programación", "Personas que hicieron tesis", "Personas con premio extraordinario", 
        "Personas que cambiaron de instituto", "Personas que estudiaron fuera de su ciudad", "Personas que fueron a academia", 
        "Personas que estudiaron por presión familiar", "Personas que estudiaron por vocación", "Personas que dejaron estudios por trabajo", 
        "Personas que hicieron curso intensivo", "Personas con segundo idioma fluido", "Personas que estudiaron historia"
    ], 
    ANIMALES: [
        "Animales mamíferos", "Animales reptiles", "Animales anfibios", "Animales ovíparos", "Animales vivíparos", 
        "Animales carnívoros", "Animales herbívoros", "Animales omnívoros", "Animales en peligro de extinción", 
        "Animales domésticos", "Animales salvajes", "Animales con más de 4 patas", "Animales acuáticos", 
        "Animales voladores", "Animales con veneno", "Animales con más de 100kg", "Animales nocturnos", 
        "Animales diurnos", "Animales que hibernan", "Animales con cola", "Animales sin patas", "Animales con plumas", 
        "Animales con escamas", "Animales que viven en África", "Animales que viven en el océano", "Animales que pueden volar", 
        "Animales que nadan", "Animales que corren rápido", "Animales con rayas", "Animales con manchas", 
        "Animales con cuernos", "Animales con trompa", "Animales con colmillos", "Animales que cambian de color", 
        "Animales que viven en el Ártico", "Animales que viven en la selva", "Animales que viven en el desierto", 
        "Animales que son mascotas comunes", "Animales que ponen huevos", "Animales con alas", "Animales con caparazón", 
        "Animales que saltan", "Animales con bigotes", "Animales que viven bajo tierra", "Animales con pico", 
        "Animales sociales", "Animales solitarios", "Animales con más de 20 años de vida", "Animales que migran", 
        "Animales considerados peligrosos"
    ], 
    COMIDA: [
        "Comidas picantes", "Comidas dulces", "Comidas saladas", "Comidas veganas", "Comidas vegetarianas", 
        "Comidas con carne", "Comidas con pescado", "Comidas fritas", "Comidas al horno", "Comidas crudas", 
        "Comidas típicas españolas", "Comidas italianas", "Comidas mexicanas", "Comidas japonesas", "Comidas rápidas", 
        "Comidas gourmet", "Comidas con queso", "Comidas con chocolate", "Comidas con arroz", "Comidas con pasta", 
        "Comidas con huevo", "Comidas con pollo", "Comidas con ternera", "Comidas con cerdo", "Comidas con marisco", 
        "Comidas con verduras", "Comidas con fruta", "Comidas con salsa", "Comidas con pan", "Comidas sin gluten", 
        "Comidas sin lactosa", "Comidas altas en proteínas", "Comidas bajas en calorías", "Comidas típicas de Navidad", 
        "Comidas típicas de verano", "Comidas para desayunar", "Comidas para cenar", "Comidas para llevar", 
        "Comidas congeladas", "Comidas caseras", "Comidas ultraprocesadas", "Comidas con ajo", "Comidas con cebolla", 
        "Comidas con tomate", "Comidas con patata", "Comidas con especias", "Comidas tradicionales", "Comidas exóticas", 
        "Comidas callejeras", "Comidas con frutos secos", "Comidas con legumbres", "Comidas con azúcar", "Comidas con miel", 
        "Comidas fermentadas", "Comidas que se comen frías", "Comidas que se comen calientes", "Comidas con aceite de oliva", 
        "Comidas típicas de Asia", "Comidas típicas de América", "Comidas típicas de Europa"
    ] 
}

const defaultSettings = { 
    theme: 'MIX', 
    silentMode: false 
};

function createRoom(roomId) {
    rooms[roomId] = {
        id: roomId,
        players: [],
        settings: { ...defaultSettings },
        gameInProgress: false,
        chatHistory: [],
        inactivityTimer: null
    };
    return rooms[roomId];
}

function destroyRoom(roomId) {
    if (rooms[roomId]) delete rooms[roomId];
}

function checkRoomInactivity(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    const activePlayers = room.players.filter(p => p.connected);
    if (activePlayers.length === 0) {
        if (room.inactivityTimer) clearTimeout(room.inactivityTimer);
        room.inactivityTimer = setTimeout(() => { destroyRoom(roomId); }, 20 * 60 * 1000); 
    } else {
        if (room.inactivityTimer) { clearTimeout(room.inactivityTimer); room.inactivityTimer = null; }
    }
}

function broadcastRoom(io, roomId) {
    const room = rooms[roomId];
    if (!room || !io) return;

    room.players.forEach(targetPlayer => {
        if (!targetPlayer.connected || !targetPlayer.socketId) return;

        const publicPlayers = room.players.map(p => ({
            id: p.id,
            name: p.name,
            isAdmin: p.isAdmin,
            isDead: p.isDead,
            isWinner: p.isWinner,
            connected: p.connected,
            // CORRECCIÓN CLAVE: Si el jugador ha ganado o ha muerto, se le revela su propia palabra.
            word: (room.gameInProgress && p.id === targetPlayer.id && !p.isDead && !p.isWinner) ? "???" : p.word 
        }));

        io.to(targetPlayer.socketId).emit('torres_updateState', {
            players: publicPlayers,
            gameInProgress: room.gameInProgress,
            settings: room.settings,
            chatHistory: room.chatHistory,
            roomId: roomId
        });
    });
}

const handleSocket = (io, socket) => {
    socket.on('torres_action', (action) => {
        const roomId = socket.data.roomId; 
        const room = rooms[roomId];
        if (!room) return;

        const me = room.players.find(p => p.socketId === socket.id);
        if (!me) return; 

        if (action.type === 'updateSettings' && me.isAdmin) {
            if (action.value.theme) room.settings.theme = action.value.theme;
            if (typeof action.value.silent !== 'undefined') room.settings.silentMode = !!action.value.silent;
            broadcastRoom(io, roomId);
        }

        if (action.type === 'chat' && room.gameInProgress) {
            const msgText = String(action.value).trim().substring(0, 100);
            if(msgText && !me.isDead) {
                room.chatHistory.push({ name: me.name, text: msgText });
                if(room.chatHistory.length > 50) room.chatHistory.shift();
                broadcastRoom(io, roomId);
            }
        }

        if (action.type === 'startGame' && me.isAdmin) {
            if (room.players.length <= 1) return; 

            // Si es MIX o una temática que no existe, juntar todas
            let wordPool = [];
            if (room.settings.theme === 'MIX' || !THEMES[room.settings.theme]) {
                Object.values(THEMES).forEach(arr => {
                    wordPool = wordPool.concat(arr);
                });
            } else {
                wordPool = [...THEMES[room.settings.theme]];
            }

            wordPool = wordPool.sort(() => Math.random() - 0.5); 

            room.players.forEach(p => { 
                p.isDead = false; 
                p.isWinner = false;
                p.word = wordPool.length > 0 ? wordPool.pop() : "Sin palabra";
            });
            
            room.gameInProgress = true;
            room.chatHistory = []; 
            
            broadcastRoom(io, roomId);
        }

        if (me.isAdmin && room.gameInProgress) {
             if (action.type === 'kill') {
                const p = room.players.find(pl => pl.id === action.value);
                if (p && !p.isWinner) { 
                    p.isDead = !p.isDead; 
                    broadcastRoom(io, roomId); 
                }
             }
             if (action.type === 'win') {
                const p = room.players.find(pl => pl.id === action.value);
                if (p && !p.isDead) { 
                    p.isWinner = !p.isWinner; 
                    broadcastRoom(io, roomId); 
                }
             }
             if (action.type === 'revealResults') {
                const winners = room.players.filter(p => p.isWinner).map(p => ({ name: p.name, word: p.word }));
                const losers = room.players.filter(p => p.isDead).map(p => ({ name: p.name, word: p.word }));
                io.to('torres_' + roomId).emit('torres_gameSummary', { winners, losers });
             }
        }

        if (me.isAdmin) {
             if (action.type === 'reset') {
                room.gameInProgress = false;
                room.chatHistory = [];
                room.players.forEach(p => { p.isDead=false; p.isWinner=false; p.word=null; });
                io.to('torres_' + roomId).emit('torres_resetGame');
                broadcastRoom(io, roomId);
            }
            if (action.type === 'kick') {
                handleLeave(action.value, roomId, io, true); 
            }
        }
    });

    socket.on('disconnect', () => {
        const rId = socket.data.roomId;
        if (rId && rooms[rId]) {
            const changed = Utils.handleDisconnect(socket.id, rooms[rId].players, () => { checkRoomInactivity(rId); });
            if (changed) {
                if (rooms[rId].players.length > 0 && !rooms[rId].players.some(p => p.isAdmin)) {
                    rooms[rId].players[0].isAdmin = true;
                }
                broadcastRoom(io, rId);
            }
        }
    });
};

const handleJoin = (socket, nameRaw, targetRoomId) => {
    const cleanName = nameRaw.replace(/👑|👤/g, '').trim();
    let room;
    if (!targetRoomId || targetRoomId === 'NEW') {
        if (Object.keys(rooms).length >= 4) return socket.emit('joinError', 'Máximo de salas alcanzado.');
        const newId = Utils.getRandomCapital(Object.keys(rooms));
        room = createRoom(newId);
    } else {
        room = rooms[targetRoomId];
        if (!room) {
             if (Object.keys(rooms).length < 4) room = createRoom(targetRoomId);
             else return socket.emit('joinError', 'La sala no existe.');
        }
    }
    
    socket.join('torres_' + room.id);
    socket.data.roomId = room.id; 
    
    const existing = room.players.find(p => p.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
        if (!existing.connected) return handleRejoin(socket, existing.id, room.id);
        return socket.emit('joinError', 'Nombre en uso.');
    }
    
    const p = Utils.createPlayer(socket.id, cleanName);
    p.connected = true; 
    
    if (room.players.length === 0 || cleanName.toLowerCase().includes('admin')) {
        p.isAdmin = true;
    }
    
    room.players.push(p);
    
    socket.emit('joinedSuccess', { playerId: p.id, name: p.name, room: 'torres', roomId: room.id });
    checkRoomInactivity(room.id); 
    broadcastRoom(socket.server, room.id);
};

const handleRejoin = (socket, savedId, savedRoomId) => {
    const room = rooms[savedRoomId];
    if (!room) return socket.emit('sessionExpired');
    const p = room.players.find(x => x.id === savedId);
    if(p) {
        if (p.timeout) clearTimeout(p.timeout);
        p.socketId = socket.id;
        p.connected = true;
        socket.join('torres_' + room.id);
        socket.data.roomId = room.id;
        socket.emit('joinedSuccess', { playerId: p.id, name: p.name, room: 'torres', roomId: room.id, isRejoin: true });
        checkRoomInactivity(room.id);
        
        setTimeout(() => broadcastRoom(socket.server, room.id), 100);
    } else socket.emit('sessionExpired');
};

const handleLeave = (playerId, roomId, io, forced = false) => {
    const room = rooms[roomId];
    if (!room) return;
    if (forced) {
        const p = room.players.find(x => x.id === playerId);
        if(p && p.socketId) io.to(p.socketId).emit('sessionExpired');
    }
    const wasAdmin = room.players.find(p => p.id === playerId)?.isAdmin;
    room.players = room.players.filter(p => p.id !== playerId);
    
    if (room.players.length > 0 && !room.players.some(p => p.isAdmin)) {
        room.players[0].isAdmin = true;
    }

    checkRoomInactivity(roomId);
    if (room.players.length === 0) delete rooms[roomId];
    else broadcastRoom(io, roomId);
};

module.exports = { 
    init: ()=>{}, 
    handleSocket, 
    handleJoin, 
    handleRejoin, 
    handleLeave, 
    getRooms: () => Object.values(rooms).map(r => ({ id: r.id, players: r.players.length, state: r.gameInProgress ? 'JUGANDO' : 'LOBBY' })) 
};