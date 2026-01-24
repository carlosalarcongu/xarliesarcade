const socket = io();

// REGLAS DE LOS JUEGOS
const GAME_RULES = {
    impostor: "🕵️ FLUJO: 1) Lobby (espera jugadores) → 2) Reparto de roles → 3) Fase de descripciones → 4) Votación → 5) Resultados\n\n\
    REGLA: Encuentra al traidor. Todos (CIUDADANO) ven una palabra secreta menos el Impostor (IMPOSTOR). Describid la palabra con cuidado \
    y votad para expulsar al sospechoso.\n\n\
    👑 Nota: Quien se registre como 'admin' al final de su nombre  (p.ej: pepe -> pepe admin) será administrador.",
    lobo: "🐺 FLUJO: 1) Lobby (espera jugadores) → 2) Reparto de roles especiales → 3) Noche (Lobos actúan) → 4) Día (votación pueblo) → 5) Repetir hasta victoria\n\n\
    REGLA: El pueblo duerme. Los Lobos matan de noche. El pueblo vota de día. Roles especiales: Vidente (ve roles), \
    Niña (espía que intentará ver de noche sin que los lobos la vean), Cupido (enamora y forma un tercer grupo. Provoca muerte por amor)\
    , Cazador (tiene un tiro de gracia al morir).\n\n\
    👑 Nota: Quien se registre como 'admin' al final de su nombre  (p.ej: pepe -> pepe admin) será administrador.",
    anecdotas: "📜 FLUJO: 1) Lobby (espera jugadores) → 2) Recogida de anécdotas → 3) Votación de autores → 4) Puntuación → 5) Resultados\n\n\
    REGLA: Escribid una anécdota real. Saldrán en orden aleatorio. Adivinad de quién es cada historia. +3 puntos \
    si aciertas el autor. El autor gana puntos si despista a algunos pero no a todos.\n\n\
    👑 Nota: Quien se registre como 'admin' al final de su nombre  (p.ej: pepe -> pepe admin) será administrador.",
    elmas: "🏆 FLUJO: 1) Lobby (espera jugadores) → 2) Salen preguntas una a una → 3) Votación (quién encaja más) → 4) Puntos por mayoría → 5) Resultados\n\n\
    REGLA: Salen preguntas comprometidas (ej. ¿Quién liga más?). Votad a la persona que más encaje. Ganas puntos \
    si votas lo mismo que la mayoría. ¡Cuidado con votar solo!\n\n\
    👑 Nota: Quien se registre como 'admin' al final de su nombre  (p.ej: pepe -> pepe admin) será administrador.",
    tabu: "🚫 FLUJO: 1) Equipos Azul/Rojo → 2) Ronda (60s) → 3) Un jugador describe, su equipo adivina → 4) \
    Si aciertan, siguiente palabra. Si dicen tabú, turno pasa.\n\n" + 
          "REGLA: Describe la palabra superior SIN decir ninguna de las 4 palabras prohibidas de abajo. El \
          equipo contrario vigila. ¡Más aciertos gana!",
};

// Namespace Global
window.app = {
    currentRoom: null,
    myPlayerId: null,
    categoriesCache: {},

    showScreen: (id) => {
        ['hubScreen', 'loginScreen', 'feedbackScreen', 'impostorLobby', 'impostorGame', 'loboLobby', 'loboGame', 'anecdotasLobby', 'anecdotasGame', 'elmasLobby', 'elmasGame'].forEach(s => {
            const el = document.getElementById(s);
            if(el) el.classList.add('hidden');
        });
        document.getElementById(id).classList.remove('hidden');
    },

    // BUSCA SI YA ESTOY EN ALGUNA SALA REGISTRADO
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
        
        // --- PROTECCIÓN DE SALA ÚNICA ---
        const active = app.findActiveSession();
        if (active && active !== room) {
            alert(`⚠️ Ya estás registrado en la sala "${active.toUpperCase()}".\n\nDebes salir de esa sala primero (botón "Salir") para entrar aquí.`);
            // Intentamos reconectarle a su sala activa
            return app.selectRoom(active);
        }
        // -------------------------------
        
        let title = 'Juego';
        if (room === 'impostor') title = '🕵️ El Impostor';
        else if (room === 'lobo') title = '🐺 El Lobo';
        else if (room === 'anecdotas') title = '📜 Anécdotas'; 
        else if (room === 'elmas') title = '🏆 El MÁS de todos';
        else if (room === 'tabu') title = '🚫 Tabú';
        
        app.currentRoom = room;
        const savedId = localStorage.getItem(room + '_playerId');
        
        if (savedId) {
            // RECONEXIÓN AUTOMÁTICA
            app.myPlayerId = savedId;
            socket.emit('rejoin', { savedId, savedRoom: room });
        } else {
            // PANTALLA LOGIN + REGLAS
            document.getElementById('loginTitle').innerText = title;
            
            // Mostrar reglas
            const rulesDiv = document.getElementById('loginRulesArea');
            const rulesText = document.getElementById('loginRulesText');
            if (GAME_RULES[room]) {
                rulesText.innerText = GAME_RULES[room];
                rulesDiv.classList.remove('hidden');
            } else {
                rulesDiv.classList.add('hidden');
            }
            
            app.showScreen('loginScreen');
            // Auto-focus al input
            setTimeout(() => document.getElementById('username').focus(), 100);
        }
    },

    joinGame: () => {
        const name = document.getElementById('username').value;
        if (!name) return alert('¡Ponte un nombre!');
        socket.emit('joinRoom', { name, room: app.currentRoom });
    },

    changeName: () => {
        if (confirm('¿Salir y cambiar nombre?')) {
            const r = app.currentRoom;
            const id = localStorage.getItem(r + '_playerId');
            if (id) socket.emit('leaveGame', { playerId: id, room: r });
            localStorage.removeItem(r + '_playerId');
            app.showScreen('loginScreen');
        }
    },

    goBackToHub: () => {
        if (app.currentRoom) {
            if (!confirm("¿Salir de la sala? Se borrará tu progreso.")) return;
            const r = app.currentRoom;
            const id = localStorage.getItem(r + '_playerId');
            if (id) socket.emit('leaveGame', { playerId: id, room: r });
            localStorage.removeItem(r + '_playerId');
            app.currentRoom = null;
        }
        app.showScreen('hubScreen');
    },
    
    // CONTROLADORES DE JUEGOS (Se rellenan en sus archivos js específicos)
    impostor: {}, lobo: {}, anecdotas: {}, elmas: {},

    // --- MÓDULO FEEDBACK ---
    feedback: {
        cache: [], // Almacén local de mensajes recibidos

        populateCats: () => {
            const sel = document.getElementById('fbCatSelect');
            if (!app.categoriesCache || Object.keys(app.categoriesCache).length === 0) {
                socket.emit('getCategories');
                sel.innerHTML = '<option>Cargando...</option>';
                return;
            }
            sel.innerHTML = '<option value="" disabled selected>Selecciona...</option>';
            Object.keys(app.categoriesCache).forEach(k => {
                if(k !== 'MIX') {
                    const opt = document.createElement('option');
                    opt.value = app.categoriesCache[k].label;
                    opt.innerText = app.categoriesCache[k].label;
                    sel.appendChild(opt);
                }
            });
            const other = document.createElement('option');
            other.value = "OTHER"; other.innerText = "➕ Otra categoría..."; sel.appendChild(other);
        },

        checkOtherCat: () => {
            const val = document.getElementById('fbCatSelect').value;
            const input = document.getElementById('fbCatOther');
            if(val === 'OTHER') input.classList.remove('hidden'); else input.classList.add('hidden');
        },

        renderForm: () => {
            const type = document.getElementById('fbType').value;
            document.getElementById('fbStandardForm').classList.toggle('hidden', type === 'newword');
            document.getElementById('fbWordForm').classList.toggle('hidden', type !== 'newword');
            if(type === 'newword') app.feedback.populateCats();
        },

        submit: () => {
            const type = document.getElementById('fbType').value;
            let data = { type, content: '' };
            if (type === 'newword') {
                const selectVal = document.getElementById('fbCatSelect').value;
                let finalCat = selectVal;
                if(selectVal === 'OTHER') {
                    finalCat = document.getElementById('fbCatOther').value;
                    if(!finalCat) return alert("Escribe el nombre de la nueva categoría.");
                }
                if(!finalCat) return alert("Selecciona una categoría.");
                data.content = `[PALABRA] ${document.getElementById('fbWord').value}`;
                data.extra = { cat: finalCat, word: document.getElementById('fbWord').value, hint: document.getElementById('fbHint').value };
                if(!data.extra.word || !data.extra.hint) return alert("Rellena palabra y pista.");
            } else {
                data.content = document.getElementById('fbContent').value;
                if(!data.content) return alert("Escribe algo.");
            }
            socket.emit('sendFeedback', data);
            alert('¡Gracias pisha! Mensaje enviado.');
            app.goBackToHub();
        },

        // --- FUNCIONES DE LECTURA (NUEVO QUE FALTABA) ---
        toggleReadMode: () => {
            const section = document.getElementById('feedbackReadSection');
            const isHidden = section.classList.contains('hidden');
            
            if (isHidden) {
                section.classList.remove('hidden');
                socket.emit('getFeedback'); // Pedir historial
                document.getElementById('feedbackList').innerHTML = '<li style="text-align:center">Cargando...</li>';
            } else {
                section.classList.add('hidden');
            }
        },

        renderList: () => {
            const filter = document.getElementById('fbFilterSelect').value;
            const list = document.getElementById('feedbackList');
            list.innerHTML = "";

            // Filtramos los mensajes
            const filtered = app.feedback.cache.filter(item => filter === 'ALL' || item.type === filter);

            if (filtered.length === 0) {
                list.innerHTML = '<li style="color:#777; text-align:center;">No hay mensajes en esta sección.</li>';
                return;
            }

            filtered.forEach(item => {
                const li = document.createElement('li');
                li.style.flexDirection = "column";
                li.style.alignItems = "flex-start";
                li.style.borderLeft = "4px solid " + app.feedback.getColor(item.type);
                
                // Formatear fecha
                const date = new Date(item.date).toLocaleString();
                
                // Contenido extra
                let extraHtml = "";
                if (item.extra && item.extra.word) {
                    extraHtml = `
                        <div style="background:#222; padding:5px; margin-top:5px; border-radius:4px; font-size:0.9em; width:100%; box-sizing:border-box;">
                            <strong>Cat:</strong> ${item.extra.cat || "?"} <br>
                            <strong>Palabra:</strong> ${item.extra.word || "?"} <br>
                            <strong>Pista:</strong> ${item.extra.hint || "?"}
                        </div>`;
                }

                li.innerHTML = `
                    <div style="display:flex; justify-content:space-between; width:100%; font-size:0.8em; color:#aaa; margin-bottom:5px;">
                        <span style="text-transform:uppercase; font-weight:bold; color:${app.feedback.getColor(item.type)}">${item.type}</span>
                        <span>${date}</span>
                    </div>
                    <div style="font-size:1.1em; word-break:break-word;">${item.content}</div>
                    ${extraHtml}
                `;
                list.appendChild(li);
            });
        },

        getColor: (type) => {
            if(type === 'bug') return '#ff4757';
            if(type === 'newword') return '#2ed573';
            if(type === 'impostor') return '#ffa502';
            if(type === 'lobo') return '#74b9ff';
            return '#a29bfe'; // General
        }
    }
};

// --- EVENTOS GLOBALES ---

socket.on('joinedSuccess', (data) => {
    localStorage.setItem(data.room + '_playerId', data.playerId);
    app.myPlayerId = data.playerId;
    if (data.room === 'impostor') app.showScreen('impostorLobby');
    if (data.room === 'lobo') app.showScreen('loboLobby');
    if (data.room === 'anecdotas') app.showScreen('anecdotasLobby'); 
    if (data.room === 'elmas') app.showScreen('elmasLobby');
});

socket.on('joinError', (msg) => { alert("⛔ " + msg); });

socket.on('sessionExpired', () => {
    if (app.currentRoom) localStorage.removeItem(app.currentRoom + '_playerId');
    // Si la sesión expira, volvemos al hub o login
    if (app.findActiveSession()) {
        // Opción: reconectar a la otra sala activa
    }
    app.showScreen('loginScreen');
});

socket.on('categoriesList', (data) => {
    app.categoriesCache = data;
    if (!document.getElementById('fbWordForm').classList.contains('hidden')) app.feedback.populateCats();
});

socket.on('initSetup', (data) => { if(data.categories) app.categoriesCache = data.categories; });

// --- EVENTO HISTORIAL DE FEEDBACK (NUEVO QUE FALTABA) ---
socket.on('feedbackHistory', (data) => {
    app.feedback.cache = data;
    app.feedback.renderList();
});

// --- AUTO-LOGIN AL CARGAR ---
window.onload = function() {
    const activeSession = app.findActiveSession();
    if (activeSession) {
        console.log("Sesión encontrada en: " + activeSession);
        app.selectRoom(activeSession);
    } else {
        app.showScreen('hubScreen');
    }
};