const socket = io();

const GAME_RULES = {
    impostor: `🕵️ EL IMPOSTOR
--------------------------------
🎯 OBJETIVO
- Civiles: Descubrir quién es el impostor.
- Impostor: Descubrir la palabra secreta o sobrevivir sin ser detectado.

🕹️ DINÁMICA
1. Configuración: El admin elige número de impostores, categoría (ej. Comida) y si hay Pistas o no.

2. Roles:
   - Toca tu tarjeta para ver tu rol.
   - Civiles ven la "Palabra Secreta" (ej. "Pizza").
   - El Impostor ve "IMPOSTOR" (y una pista vaga si están activas).

3. Descripción:
   - Por turnos, cada jugador dice UNA sola palabra relacionada con la secreta.
   - Civiles: Sed vagos para que el impostor no sepa la palabra, pero claros para que sepan que sois ciudadanos.
   - Impostor: Escucha, deduce y miente para encajar.
   
4. Votación:
   - Pulsad los nombres en la pantalla para votar al sospechoso.

5. Resolución:
   - Si se expulsa a todos los impostores: Ganan Civiles.
   - Si el número de impostores es el mismo al de ciudadanos: Gana los Impostores.
   - Si el Impostor es pillado, tiene una última oportunidad: ¡Adivinar la palabra! Si acierta, gana él.`,

    lobo: `🐺 EL LOBO (Werewolf)
--------------------------------
🎯 OBJETIVO
- Pueblo: Eliminar a todos los Lobos.
- Lobos: Eliminar al Pueblo hasta igualarlos en número.

🕹️ DINÁMICA
(Una persona que no esté en la sala actúa como Narrador y guía las fases de viva voz)
(En el futuro se desarrollará un modo en el que cada jugador interactúe con la pantalla)

1. Roles Especiales:
   - 🔮 Vidente: Ve el rol de un jugador cada noche.
   - 👧 Niña: Puede abrir los ojos con cuidado (si la pillan, muere).
   - 💘 Cupido: Enamora a dos (si uno muere, el otro también).
   - 🔫 Cazador: Si muere, mata a otro inmediatamente.

2. La Noche (Ojos cerrados):
   - El Admin despierta a los Lobos. Ellos miran su móvil (ven a sus compañeros) y eligen víctima en silencio.
   - El Admin despierta a los roles especiales para sus acciones secuencialmente.

3. El Día (Ojos abiertos):
   - Se anuncia quién murió. Debate y acusaciones.
   - Votación: Usad la interfaz para linchar a un sospechoso.
   - El más votado muere y revela rol.`,

    anecdotas: `📜 ANÉCDOTAS
--------------------------------
🎯 OBJETIVO
Adivinar de quién es la anécdota leída y ganar puntos.

🕹️ DINÁMICA
1. Escritura:
   - Escribe una anécdota breve, secreto o historia (real o inventada).
   - Pulsa "Listo".

2. Lectura:
   - El juego muestra una anécdota anónima en pantalla grande.
   - Alguien la lee en voz alta.

3. Votación:
   - Vota en tu móvil quién crees que es el autor.
   - No puedes votarte a ti mismo.

4. Puntos:
   - Ganas puntos si adivinas el autor.
   - El autor gana puntos sial menos una persona acierta y al menos otra persona falla .`,

    elmas: `🏆 EL MÁS...
--------------------------------
🎯 OBJETIVO
Juego social de votación. Sin ganadores, solo opiniones.

🕹️ DINÁMICA
1. La Pregunta:
   - Aparece una pregunta tipo: "¿Quién es más probable que acabe en la cárcel?" o "¿Quién liga más?".

2. Votación:
   - Vota al jugador que mejor encaje con la descripción.

3. Resultados:
   - Se muestran gráficas con los votos.
   - Los puntos son proporcionales a la opinión popular`,

    tabu: `🚫 TABÚ
--------------------------------
🎯 OBJETIVO
Que tu equipo adivine la palabra clave sin decir las prohibidas.

🕹️ DINÁMICA
1. Equipos:
   - Uníos al Equipo Azul o Rojo en el lobby.

2. El Turno:
   - Un jugador sale al frente con su móvil.
   - Tarjeta: Muestra la PALABRA CLAVE (Grande) y las PROHIBIDAS (Pequeñas).

3. Controles (Quien describe):
   - ✅ BIEN: Tu equipo acierta (+1 punto).
   - ⏭️ SALTAR: Pasas palabra (Saltos limitados).
   - 🚫 MAL: Has dicho una prohibida (Rival vigila y pulsa). Anula tarjeta.

4. Tiempo:
   - Al llegar a 0, cambio de turno.`,

    pinturilloImp: `🎨 EL FALSO ARTISTA
--------------------------------
🎯 OBJETIVO
Todos dibujan algo sobre la misma palabra secreta. El impostor debe hacerse pasar por artista sin saber qué es.

🕹️ DINÁMICA
1. Roles:
   - Artistas: Ven la palabra (ej. "Gato").
   - Impostor: Ve "X" (no sabe qué dibujar) + la pista.

2. Dibujo:
   - Por turnos, cada uno dibuja UN solo trazo (una línea) en el lienzo común.
   - El trazo debe ser suficiente para demostrar que sabes la palabra, pero no tan claro para regalársela al impostor.

3. Votación:
   - Tras X vueltas, se vota quién es el Falso Artista.
   
4. Desenlace:
   - Si el Impostor es pillado, tiene una última oportunidad: ¡Adivinar la palabra! Si acierta, gana él.`,

    mus: `🐄 REGISTRO DE MUS
--------------------------------
Herramienta de seguimiento estadístico.

🕹️ USO
- + Jugador: Registra un nuevo nombre en la base de datos.
- + Partida: Registra un resultado (Pareja 1 vs Pareja 2).
- Estadísticas: Consulta Rankings, porcentajes de victoria y evolución histórica.`,

    tecnico: `🛠️ AYUDA TÉCNICA
================================

🔑 ADMINISTRADOR (Admin)
No hay contraseñas.
1. Primer Llegado: Si entras a una sala vacía, eres Admin (👑).
2. Nombres Clave: Entra como "Admin" para ser Administrador de una sala.
3. Poderes: Configurar partida, Kick (Echar), Kill (Matar en juego) y Reset.

♻️ SISTEMA
- Sala Vacía: Si todos salen, la sala se reinicia (Soft Reset).
- Reconexión: Si cierras y vuelves, el sistema te recuerda. Para cambiar de nombre o sala, pulsa "❌ Salir"(botón ROJO) arriba.
- Observador: Si entras a una partida empezada, podrás mirar pero no votar.

⚠️ SOLUCIÓN DE PROBLEMAS
1. ¿No hay botón empezar?: No eres admin. Que el admin salga y entre, o entra tú con nombre "Admin".
2. Pantalla pillada: Refresca el navegador. Si no funciona: Pide al Administrador que pulse "Reset" o "Finalizar".
3. Tarjeta cortada: Gira el móvil o sal del modo escritorio (tres puntitos: "Vista" (o "Versión") para ordenador).
4. Lag: Recarga la página (F5). No perderás tu puesto.`
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
        // 1. Limpieza visual de módulos específicos (como Mus)
        if (app.mus && app.mus.resetUI) {
            app.mus.resetUI();
        }

        if (forceLogout) {
            // --- MODO SALIR (Logout real) ---
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
            // --- MODO NAVEGACIÓN (Minimizar / Volver al Hub) ---
            
            // 1. Detectamos si hay una sala activa antes de irnos
            // (Si currentRoom es null, buscamos en localStorage por si acaso)
            const activeRoom = app.currentRoom || app.findActiveSession();

            // 2. Ponemos currentRoom a null para que el sistema sepa que estamos visualmente en el Hub
            app.currentRoom = null; 
            app.showScreen('hubScreen');

            // 3. IMPLEMENTACIÓN DEL COMENTARIO: Notificar en el widget
            // Sobrescribimos lo que puso showScreen para indicar que seguimos vinculados a una sala
            if (activeRoom) {
                const widgetText = document.getElementById('floatingUserText');
                const name = app.myPlayerName || "Sin Nombre";
                const emoji = ROOM_EMOJIS[activeRoom] || "🎮";
                const roomLabel = activeRoom.toUpperCase();

                if (widgetText) {
                    // Formato: 🏠 Hub (🐺 LOBO)
                    widgetText.innerHTML = `
                        <span style="opacity:0.7">🏠 Hub <small>(${emoji} ${roomLabel})</small></span><br>
                        <strong>👤 ${name}</strong>
                    `;
                }
            }
        }
    },

    showRules: () => {
        const room = app.currentRoom;
        const text = GAME_RULES[room] || "No hay reglas definidas para esta sala.";
        
        const modal = document.getElementById('globalRulesModal');
        const content = document.getElementById('globalRulesText');
        
        if (modal && content) {
            content.innerText = text;
            modal.classList.remove('hidden');
        }
    },

    showDevMessage: () => {
        alert("🚧 ¡Obras en proceso!\n\nEste juego aún está en desarrollo. ¡Vuelve pronto!");
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