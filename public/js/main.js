const socket = io();

const GAME_RULES = {
    impostor: "🕵️ FLUJO: 1) Lobby → 2) Roles → 3) Describir → 4) Votar.\nREGLA: Todos ven palabra menos el Impostor.",
    lobo: "🐺 FLUJO: 1) Roles → 2) Noche → 3) Día.\nREGLA: Pueblo vs Lobos. Roles especiales.",
    anecdotas: "📜 Escribe anécdota → Adivina autor → Puntos.",
    elmas: "🏆 Preguntas '¿Quién es más...?'. Vota al que más encaje.",
    tabu: "🚫 Describe palabra sin decir las prohibidas. Equipos."
};

const ROOM_EMOJIS = {
    impostor: "🕵️",
    lobo: "🐺",
    anecdotas: "📜",
    elmas: "🏆",
    tabu: "🚫",
    pinturilloImp: "🎨",
    feedback: "💌"
};

window.app = {
    currentRoom: null,
    myPlayerId: null,
    myPlayerName: null, // <--- NUEVO: Variable para guardar el nombre
    categoriesCache: {},

    showScreen: (id) => {
        const screens = ['hubScreen', 'loginScreen', 'feedbackScreen', 'impostorLobby', 'impostorGame', 'loboLobby', 'loboGame', 'anecdotasLobby', 'anecdotasGame', 'elmasLobby', 'elmasGame', 'tabuLobby', 'tabuGame', 'pinturilloImpLobby', 'pinturilloImpGame'];
        screens.forEach(s => {
            const el = document.getElementById(s);
            if(el) el.classList.add('hidden');
        });
        const target = document.getElementById(id);
        if(target) target.classList.remove('hidden');

        // --- ACTUALIZAR INDICADOR SUPERIOR ---
        const roomName = app.currentRoom ? app.currentRoom.toUpperCase() : "HUB";
        const emoji = (app.currentRoom && ROOM_EMOJIS[app.currentRoom]) ? ROOM_EMOJIS[app.currentRoom] : "🏠";
        
        let finalText = "";
        
        if (id === 'hubScreen') {
            finalText = "HUB 🏠";
            // Opcional: Limpiar nombre al volver al hub si quieres
            // app.myPlayerName = null; 
        } else {
            // Si tenemos nombre, lo mostramos
            const nameDisplay = app.myPlayerName ? ` | 👤 ${app.myPlayerName}` : "";
            finalText = `${roomName} ${emoji}${nameDisplay}`;
        }
        
        const indicator = document.getElementById('globalRoomText');
        if(indicator) indicator.innerText = finalText;
        // -------------------------------------
    },

    findActiveSession: () => {
        const rooms = ['impostor', 'lobo', 'anecdotas', 'elmas', 'tabu', 'pinturilloImp'];
        for (let r of rooms) {
            if (localStorage.getItem(r + '_playerId')) return r;
        }
        return null;
    },

    selectRoom: (room) => {
        if (room === 'feedback') {
            app.feedback.populateCats(); 
            return app.showScreen('feedbackScreen');
        }
        
        const active = app.findActiveSession();
        if (active && active !== room) {
            if(confirm(`⚠️ Ya estás en "${active.toUpperCase()}". ¿Ir allí?`)) {
                return app.selectRoom(active);
            } else {
                return;
            }
        }
        
        app.currentRoom = room;
        const savedId = localStorage.getItem(room + '_playerId');
        
        if (savedId) {
            console.log("Intentando reconectar con ID:", savedId);
            app.myPlayerId = savedId;
            socket.emit('rejoin', { savedId, savedRoom: room });
        } else {
            const titleEl = document.getElementById('loginTitle');
            const emoji = ROOM_EMOJIS[room] || "🎮";
            const roomName = room.charAt(0).toUpperCase() + room.slice(1);
            if(titleEl) titleEl.innerText = `Entrada a sala de ${roomName} ${emoji}`;
            
            const rulesDiv = document.getElementById('loginRulesArea');
            const rulesText = document.getElementById('loginRulesText');
            if (rulesDiv && rulesText) {
                if (GAME_RULES[room]) {
                    rulesText.innerText = GAME_RULES[room];
                    rulesDiv.classList.remove('hidden');
                } else {
                    rulesDiv.classList.add('hidden');
                }
            }
            
            app.showScreen('loginScreen');
            setTimeout(() => document.getElementById('username')?.focus(), 100);
        }
    },

    joinGame: () => {
        const name = document.getElementById('username').value;
        if (!name) return alert('¡Ponte un nombre!');
        
        app.myPlayerName = name; // <--- GUARDADO TEMPORAL
        socket.emit('joinRoom', { name, room: app.currentRoom });
    },

    changeName: () => {
        // Esta función antigua la redirigimos a la nueva lógica de logout
        app.goBackToHub(true);
    },

goBackToHub: (forceLogout = false) => {
        if (forceLogout) {
            if (confirm("¿Quieres salir para cambiar tu nombre?")) {
                if (app.currentRoom) {
                    const r = app.currentRoom;
                    const id = localStorage.getItem(r + '_playerId');
                    if (id) socket.emit('leaveGame', { playerId: id, room: r });
                    localStorage.removeItem(r + '_playerId');
                }
                app.currentRoom = null;
                app.myPlayerId = null;
                app.myPlayerName = null;
                
                // Volvemos al login
                app.showScreen('loginScreen');
            }
        } 
        else {
            app.currentRoom = null; 
            app.showScreen('hubScreen');
        }
    },

    impostor: {}, lobo: {}, anecdotas: {}, elmas: {}, tabu: {}, feedback: {}, pinturilloImp: {}
};

socket.on('joinedSuccess', (data) => {
    console.log("Unido con éxito. ID:", data.playerId);
    localStorage.setItem(data.room + '_playerId', data.playerId);
    app.myPlayerId = data.playerId;
    app.currentRoom = data.room;
    
    // <--- NUEVO: RECUPERAR NOMBRE DEL SERVIDOR (IMPORTANTE PARA RECONEXIONES) ---
    if(data.name) app.myPlayerName = data.name;
    
    if (data.room === 'impostor') app.showScreen('impostorLobby');
    else if (data.room === 'lobo') app.showScreen('loboLobby');
    else if (data.room === 'anecdotas') app.showScreen('anecdotasLobby'); 
    else if (data.room === 'elmas') app.showScreen('elmasLobby');
    else if (data.room === 'tabu') app.showScreen('tabuLobby');
    else if (data.room === 'pinturilloImp') app.showScreen('pinturilloImpLobby');
});

socket.on('joinError', (msg) => { alert("⛔ " + msg); });

socket.on('sessionExpired', () => {
    console.warn("Sesión expirada.");
    if (app.currentRoom) localStorage.removeItem(app.currentRoom + '_playerId');
    app.myPlayerId = null;
    app.currentRoom = null;
    app.myPlayerName = null;
    alert("Tu sesión ha caducado.");
    app.showScreen('hubScreen');
});

socket.on('initSetup', (data) => { if(data.categories) app.categoriesCache = data.categories; });

window.onload = function() {
    if(app.feedback && app.feedback.init) app.feedback.init();
    const activeSession = app.findActiveSession();
    if (activeSession) {
        console.log("Sesión detectada en:", activeSession);
        app.selectRoom(activeSession);
    } else {
        app.showScreen('hubScreen');
    }
};