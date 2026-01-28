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

    initFloatingWidget: () => {
        const widget = document.getElementById('floatingUserWidget');
        let isDragging = false;
        let hasMoved = false; // Para diferenciar clic de arrastre
        let offsetX, offsetY;

        //Si ya hay nombre asignado:
        if(app.myPlayerName) {
            //Si no es admin añadir silueta:
            if(!app.myPlayerName.toLowerCase().includes("admin")) {
                app.myPlayerName += " 👤";
            } // Si es admin añadir corona: 
            else {
                app.myPlayerName += " 👑";
            }
        }

        // Función unificada de inicio
        const startDrag = (x, y) => {
            isDragging = true;
            hasMoved = false;
            // Calcular dónde cogimos el widget respecto a su esquina
            const rect = widget.getBoundingClientRect();
            offsetX = x - rect.left;
            offsetY = y - rect.top;
            
            widget.style.cursor = 'grabbing';
            widget.style.transition = 'none'; // Importante para rendimiento instantáneo
        };

        // Función unificada de movimiento
        const moveDrag = (x, y) => {
            if (!isDragging) return;
            hasMoved = true;
            
            // Nueva posición absoluta
            let newX = x - offsetX;
            let newY = y - offsetY;

            // Límites de pantalla (opcional, para que no se pierda)
            newX = Math.max(0, Math.min(window.innerWidth - widget.offsetWidth, newX));
            newY = Math.max(0, Math.min(window.innerHeight - widget.offsetHeight, newY));

            widget.style.left = `${newX}px`;
            widget.style.top = `${newY}px`;
            widget.style.right = 'auto'; // Anular el right CSS
        };

        // Función unificada de fin
        const endDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            widget.style.cursor = 'grab';
            
            // Si fue un clic (no arrastre), accionamos el CAMBIO DE NOMBRE
            if (!hasMoved) {
                app.changeName(); // <--- CAMBIO AQUÍ (Antes era goBackToHub(true))
            }
        };

        // --- MOUSE EVENTS ---
        widget.addEventListener('mousedown', e => startDrag(e.clientX, e.clientY));
        
        window.addEventListener('mousemove', e => {
            if(isDragging) {
                e.preventDefault(); // Evitar selección de texto
                moveDrag(e.clientX, e.clientY);
            }
        });
        
        window.addEventListener('mouseup', endDrag);

        // --- TOUCH EVENTS (MÓVIL) ---
        // passive: false es CRÍTICO para evitar scroll/recarga
        widget.addEventListener('touchstart', e => {
            const t = e.touches[0];
            startDrag(t.clientX, t.clientY);
        }, { passive: false });

        window.addEventListener('touchmove', e => {
            if (isDragging) {
                e.preventDefault(); // ESTO BLOQUEA EL PULL-TO-REFRESH
                const t = e.touches[0];
                moveDrag(t.clientX, t.clientY);
            }
        }, { passive: false });

        window.addEventListener('touchend', endDrag);
    },

    
    showScreen: (id) => {
        const screens = ['hubScreen', 'loginScreen', 'feedbackScreen', 'impostorLobby', 'impostorGame', 'loboLobby', 'loboGame', 'anecdotasLobby', 'anecdotasGame', 'elmasLobby', 'elmasGame', 'tabuLobby', 'tabuGame', 'pinturilloImpLobby', 'pinturilloImpGame'];
        screens.forEach(s => {
            const el = document.getElementById(s);
            if(el) el.classList.add('hidden');
        });
        const target = document.getElementById(id);
        if(target) target.classList.remove('hidden');

        // --- ACTUALIZAR WIDGET ---
        const widget = document.getElementById('floatingUserWidget');
        const widgetText = document.getElementById('floatingUserText');
        
        // Si estamos en LOGIN, ocultamos widget
        if (id === 'loginScreen') {
            widget.classList.add('hidden');
        } else {
            widget.classList.remove('hidden');
            const name = app.myPlayerName || "Sin Nombre";
            const roomName = app.currentRoom ? app.currentRoom.toUpperCase() : "HUB";
            // Emoji de sala
            const emoji = (app.currentRoom && ROOM_EMOJIS[app.currentRoom]) ? ROOM_EMOJIS[app.currentRoom] : "🏠";
            
            widgetText.innerHTML = `<span style="opacity:0.7">${emoji} ${roomName}</span><br><strong>👤 ${name}</strong>`;
        }
        // -------------------------
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
            
            if (app.feedback && typeof app.feedback.populateCats === 'function') {
                app.feedback.populateCats(); 
            }
            return app.showScreen('feedbackScreen');
        }
        
        if (room === 'mus') {
            app.showScreen('musScreen');
            if (app.mus && app.mus.init) app.mus.init();
            return;
        }
        
        const active = app.findActiveSession();
        if (active && active !== room) {
            if(confirm(`⚠️ Ya estás en "${active.toUpperCase()}". ¿Ir allí (a ${active.toUpperCase()})?`)) {
                return app.selectRoom(active);
            } else {
                return;
            }
        }
        
        app.currentRoom = room;
        const savedId = localStorage.getItem(room + '_playerId');
        
        // CASO A: Reconexión (tengo ID de partida guardado)
        if (savedId) {
            console.log("Reconectando ID:", savedId);
            app.myPlayerId = savedId;
            socket.emit('rejoin', { savedId, savedRoom: room });
        } 
        // CASO B: Usuario ya tiene nombre global -> ENTRAR DIRECTO
        else if (app.myPlayerName) {
            console.log("Entrando directo como:", app.myPlayerName);
            socket.emit('joinRoom', { name: app.myPlayerName, room: room });
        }
        // CASO C: Usuario nuevo (sin nombre) -> PANTALLA LOGIN
        else {
            app.renderLoginScreen(room);
        }
    },

    renderLoginScreen: (room) => {
        const titleEl = document.getElementById('loginTitle');
        const emoji = (room && ROOM_EMOJIS[room]) ? ROOM_EMOJIS[room] : "👤";
        const roomName = room ? (room.charAt(0).toUpperCase() + room.slice(1)) : "Perfil";
        
        if(titleEl) titleEl.innerText = room ? `Entrada a sala de ${roomName} ${emoji}` : `Configurar Nombre ${emoji}`;
        
        const rulesDiv = document.getElementById('loginRulesArea');
        const rulesText = document.getElementById('loginRulesText');
        
        if (rulesDiv && rulesText) {
            if (room && GAME_RULES[room]) {
                rulesText.innerText = GAME_RULES[room];
                rulesDiv.classList.remove('hidden');
            } else {
                rulesDiv.classList.add('hidden');
            }
        }
        
        app.showScreen('loginScreen');
        setTimeout(() => document.getElementById('username')?.focus(), 100);
    },


    // FUNCIÓN CRÍTICA: GESTIÓN DE ENTRADA / GUARDADO DE NOMBRE
    joinGame: () => {
        const nameInput = document.getElementById('username');
        let name = nameInput.value.trim();
        
        if (!name) return alert('¡Ponte un nombre!');

        // --- CORRECCIÓN: LIMPIEZA DE NOMBRE ---
        // Eliminamos emojis del nombre
        // name = name.replace(/👑|👤/g, '').trim();
        // --------------------------------------
        
        localStorage.setItem('global_username', name);
        app.myPlayerName = name; 

        if (app.currentRoom) {
            socket.emit('joinRoom', { name, room: app.currentRoom });
        } else {
            app.showScreen('hubScreen');
        }
    },

    
    changeName: () => {
        if (app.currentRoom) {
             if (!confirm('Para cambiar de nombre debes salir de la sala actual. ¿Continuar?')) return;
             app.goBackToHub(true); 
        }
        if (app.mus && app.mus.resetUI) {
            app.mus.resetUI();
        }
        
        // AQUÍ SÍ BORRAMOS EL NOMBRE GLOBAL
        localStorage.removeItem('global_username');
        app.myPlayerName = null;
        app.currentRoom = null;
        
        app.renderLoginScreen(null);
    },

    goBackToHub: (forceLogout = false) => {
        // --- LIMPIEZA DE MUS ---
        if (app.mus && app.mus.resetUI) {
            app.mus.resetUI();
        }
        // -----------------------

        if (forceLogout) {
             const r = app.currentRoom;
             if (r) {
                 const id = localStorage.getItem(r + '_playerId');
                 if (id) socket.emit('leaveGame', { playerId: id, room: r });
                 localStorage.removeItem(r + '_playerId');
             }
             
             app.currentRoom = null;
             app.myPlayerId = null;
             
             app.showScreen('hubScreen');
        } else {
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
    // 1. Inicializar herramientas
    app.initFloatingWidget();
    if(app.feedback && app.feedback.init) app.feedback.init();
    
    // 2. RECUPERAR NOMBRE GLOBAL (PERSISTENCIA EN HUB)
    // Esto busca si hay un nombre guardado aunque no estés en partida
    const savedGlobalName = localStorage.getItem('global_username');
    if (savedGlobalName) {
        console.log("Nombre recuperado en Hub:", savedGlobalName);
        app.myPlayerName = savedGlobalName; 
    }

    // 3. Comprobar si hay partida activa o ir al Hub
    const activeSession = app.findActiveSession();
    if (activeSession) {
        // Si hay partida, intentamos reconectar
        app.selectRoom(activeSession);
    } else {
        // Si no hay partida, vamos al Hub. 
        // Como ya hemos seteado app.myPlayerName en el paso 2, 
        // showScreen actualizará el widget automáticamente.
        app.showScreen('hubScreen');
    }
};