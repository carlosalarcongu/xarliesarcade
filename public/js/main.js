const socket = io();

// REGLAS DE LOS JUEGOS (Sin cambios, las mantengo para contexto)
const GAME_RULES = {
    impostor: "🕵️ FLUJO: 1) Lobby → 2) Roles → 3) Describir → 4) Votar.\nREGLA: Todos ven palabra menos el Impostor.",
    lobo: "🐺 FLUJO: 1) Roles → 2) Noche → 3) Día.\nREGLA: Pueblo vs Lobos. Roles especiales.",
    anecdotas: "📜 Escribe anécdota → Adivina autor → Puntos.",
    elmas: "🏆 Preguntas '¿Quién es más...?'. Vota al que más encaje.",
    tabu: "🚫 Describe palabra sin decir las prohibidas. Equipos."
};

// Namespace Global
window.app = {
    currentRoom: null,
    myPlayerId: null,
    categoriesCache: {},

    // UI Helper
    showScreen: (id) => {
        const screens = ['hubScreen', 'loginScreen', 'feedbackScreen', 'impostorLobby', 'impostorGame', 'loboLobby', 'loboGame', 'anecdotasLobby', 'anecdotasGame', 'elmasLobby', 'elmasGame', 'tabuLobby', 'tabuGame'];
        screens.forEach(s => {
            const el = document.getElementById(s);
            if(el) el.classList.add('hidden');
        });
        const target = document.getElementById(id);
        if(target) target.classList.remove('hidden');
    },

    // PERSISTENCIA: Buscar sesión activa
    findActiveSession: () => {
        const rooms = ['impostor', 'lobo', 'anecdotas', 'elmas', 'tabu'];
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
        
        // Bloqueo de multisesión
        const active = app.findActiveSession();
        if (active && active !== room) {
            if(confirm(`⚠️ Ya estás en "${active.toUpperCase()}". ¿Ir allí?`)) {
                return app.selectRoom(active);
            } else {
                return; // Se queda en el hub
            }
        }
        
        app.currentRoom = room;
        const savedId = localStorage.getItem(room + '_playerId');
        
        if (savedId) {
            // RECONEXIÓN AUTOMÁTICA
            console.log("Intentando reconectar con ID:", savedId);
            app.myPlayerId = savedId;
            socket.emit('rejoin', { savedId, savedRoom: room });
        } else {
            // PANTALLA LOGIN
            const titleEl = document.getElementById('loginTitle');
            if(titleEl) titleEl.innerText = room.toUpperCase();
            
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
        socket.emit('joinRoom', { name, room: app.currentRoom });
    },

    changeName: () => {
        if (confirm('¿Salir y cambiar nombre?')) {
            app.goBackToHub(true); // True para forzar logout
            app.showScreen('loginScreen');
        }
    },

    goBackToHub: (forceLogout = false) => {
        if (app.currentRoom) {
            if (forceLogout || confirm("¿Salir de la sala? Se perderá tu rol actual.")) {
                const r = app.currentRoom;
                const id = localStorage.getItem(r + '_playerId');
                
                // Avisar al servidor para borrado inmediato
                if (id) socket.emit('leaveGame', { playerId: id, room: r });
                
                // Limpiar local
                localStorage.removeItem(r + '_playerId');
                app.currentRoom = null;
                app.myPlayerId = null;
                
                app.showScreen('hubScreen');
            }
        } else {
            app.showScreen('hubScreen');
        }
    },
    
    // Placeholders para módulos
    impostor: {}, lobo: {}, anecdotas: {}, elmas: {}, tabu: {}, feedback: {} 
};

// --- EVENTOS GLOBALES DE SOCKET ---

socket.on('joinedSuccess', (data) => {
    console.log("Unido con éxito. Guardando ID:", data.playerId);
    localStorage.setItem(data.room + '_playerId', data.playerId);
    app.myPlayerId = data.playerId;
    app.currentRoom = data.room;
    
    // Redirección según sala
    if (data.room === 'impostor') app.showScreen('impostorLobby');
    else if (data.room === 'lobo') app.showScreen('loboLobby');
    else if (data.room === 'anecdotas') app.showScreen('anecdotasLobby'); 
    else if (data.room === 'elmas') app.showScreen('elmasLobby');
    else if (data.room === 'tabu') app.showScreen('tabuLobby');
});

socket.on('joinError', (msg) => { alert("⛔ " + msg); });

socket.on('sessionExpired', () => {
    console.warn("Sesión expirada o inválida.");
    if (app.currentRoom) localStorage.removeItem(app.currentRoom + '_playerId');
    app.myPlayerId = null;
    app.currentRoom = null;
    alert("Tu sesión ha caducado o fuiste expulsado.");
    app.showScreen('hubScreen');
});

socket.on('initSetup', (data) => { 
    if(data.categories) app.categoriesCache = data.categories; 
});

// --- INICIALIZACIÓN ---
window.onload = function() {
    // Cargar módulo de feedback si existe
    if(app.feedback && app.feedback.init) app.feedback.init();

    const activeSession = app.findActiveSession();
    if (activeSession) {
        console.log("Sesión detectada en:", activeSession);
        app.selectRoom(activeSession);
    } else {
        app.showScreen('hubScreen');
    }
};