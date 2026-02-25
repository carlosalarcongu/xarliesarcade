// public/js/main.js
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
   torres: `🗼 TORRES
--------------------------------
🎯 OBJETIVO
Adivinar qué palabra tienes asignada viendo las palabras de los demás.

🕹️ DINÁMICA
1. Tú no puedes ver tu palabra ("???"), pero ves las de los demás.
2. Hablad (o escribid en Modo Silencioso) haciendo preguntas de sí o no, o dando pistas sutiles.
3. El Administrador marcará como "Ganador" a quien la adivine, y "Eliminado" a quien se rinda o falle catastróficamente.`,

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

    cifrasyletras: `🔢 CIFRAS Y LETRAS
--------------------------------
🎯 OBJETIVO
Conseguir el número exacto o la palabra más larga.

🕹️ DINÁMICA
1. Ronda Cifras:
   - Se muestra un OBJETIVO (ej: 450) y 6 números.
   - Tienes 60s para calcular.
   - Puntuación: 
     ❌ (0 pts): Fallo.
     <10 (2 pts): Te has quedado a menos de 10 de distancia.
     ✅ (5 pts): Exacto.

2. Ronda Letras:
   - Salen 12 letras. Tienes 60s para buscar la palabra más larga.
   - Puntuación: 1 punto por cada letra de tu palabra válida.`,

   orden: `🔢 ORDEN
--------------------------------
🎯 OBJETIVO
Ordenad a los jugadores en la lista según el valor de su carta oculta.

🕹️ DINÁMICA
1. Tu Carta: Toca la tarjeta superior para ver tu número o acción.
2. Cooperación: 
   - Usa las flechas ▲ ▼ para SUGERIR dónde debe ir cada jugador.
   - El número bajo la flecha indica cuántos jugadores opinan lo mismo.
3. El Admin: Es el único que puede MOVER realmente a los jugadores basándose en las sugerencias.
4. Listo: Cuando creas que tu posición es correcta, pulsa LISTO.
5. Resolución: El Admin finalizará la ronda. ¡Necesitáis un 80% de aciertos para ganar!`,

consejo: `🦉 CONSEJO DE SABIOS
--------------------------------
Herramienta para gestionar debates o decisiones.

1. Añade a los "Sabios" (jugadores) en la lista superior.
2. Elige un tema (Filosofía, Salseo, Dilemas...).
3. Pulsa "Pregunta" para sacar un tema de conversación al azar.
4. Pulsa "Elegido" para seleccionar aleatoriamente a uno de los sabios para que empiece a hablar.`,

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
    impostor: "🕵️", lobo: "🐺", anecdotas: "📜", elmas: "🏆", tabu: "🚫",
    pinturilloImp: "🎨", cifrasyletras: "🔣", feedback: "💌", orden: "🎌", 
    consejo: "🦉", fiesta: "🎉", torres: "🗼", darkstories: "📖", beber: "🍻", analytics: "📈"
};

window.app = {
    currentRoom: null,
    currentRoomId: null, 
    pendingRoomId: null,
    myPlayerId: null,
    myPlayerName: null,
    categoriesCache: {},
    currentScreenId: 'hubScreen', 

    forceFiestaStyles: () => {
        const menu = document.getElementById('fiestaMenu');
        if (!menu) return;

        menu.classList.remove('hidden');
        menu.style.display = 'block';
        menu.style.width = '100%';

        const grid = menu.querySelector('.hub-grid');
        if (grid) {
            grid.style.cssText = "display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 15px !important; width: 100% !important;";
        }

        const cards = menu.querySelectorAll('.hub-card');
        cards.forEach(card => {
            card.style.cssText = "display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; min-height: 120px !important; background-color: #2f3542 !important; border-radius: 12px !important; padding: 15px !important; box-shadow: 0 4px 0 rgba(0,0,0,0.2) !important; cursor: pointer !important; opacity: 1 !important; visibility: visible !important;";
            
            const originalBorder = card.getAttribute('style');
            if(originalBorder && originalBorder.includes('border-left')) {
                const colorMatch = originalBorder.match(/border-left:\s*4px\s*solid\s*(#[0-9a-fA-F]+)/);
                if(colorMatch) {
                    card.style.borderLeft = `4px solid ${colorMatch[1]}`;
                }
            }
        });
    },

    initFloatingWidget: () => {
        const widget = document.getElementById('floatingUserWidget');
        if(!widget) return;
        let isDragging = false;
        let hasMoved = false; 
        let offsetX, offsetY;

        const startDrag = (x, y) => {
            isDragging = true;
            hasMoved = false;
            const rect = widget.getBoundingClientRect();
            offsetX = x - rect.left;
            offsetY = y - rect.top;
            widget.style.cursor = 'grabbing';
            widget.style.transition = 'none';
        };

        const moveDrag = (x, y) => {
            if (!isDragging) return;
            hasMoved = true;
            let newX = x - offsetX;
            let newY = y - offsetY;
            newX = Math.max(0, Math.min(window.innerWidth - widget.offsetWidth, newX));
            newY = Math.max(0, Math.min(window.innerHeight - widget.offsetHeight, newY));
            widget.style.left = `${newX}px`;
            widget.style.top = `${newY}px`;
            widget.style.right = 'auto';
        };

        const endDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            widget.style.cursor = 'grab';
            if (!hasMoved) app.changeName(); 
        };

        widget.addEventListener('mousedown', e => startDrag(e.clientX, e.clientY));
        window.addEventListener('mousemove', e => { if(isDragging) { e.preventDefault(); moveDrag(e.clientX, e.clientY); } });
        window.addEventListener('mouseup', endDrag);
        widget.addEventListener('touchstart', e => { startDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
        window.addEventListener('touchmove', e => { if (isDragging) { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); } }, { passive: false });
        window.addEventListener('touchend', endDrag);
    },

    resetVisuals: () => {
        document.querySelectorAll('.modal-overlay').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.reveal-content').forEach(el => {
            el.classList.remove('reveal-content');
            el.classList.add('blur-content');
        });
        document.getElementById('voteSection')?.classList.add('hidden');
        document.getElementById('roleCard')?.classList.remove('hidden'); 
        document.getElementById('loboNightActionArea')?.classList.add('hidden');
        document.getElementById('loboDaySection')?.classList.add('hidden');
        document.getElementById('tabuActionButtons')?.classList.add('hidden');
        document.getElementById('cylPodiumArea')?.classList.add('hidden');
        document.getElementById('cylGameArea')?.classList.remove('hidden');
        document.getElementById('ordenResultArea')?.classList.add('hidden');
        document.getElementById('ordenControls')?.classList.remove('hidden');
        
        document.getElementById('fiestaScreen')?.classList.add('hidden');
        if(app.fiesta && app.fiesta.hideAll) app.fiesta.hideAll(); 
        else {
             const fIds = ['fiestaMenu', 'fiestaGameORACULO', 'fiestaGameRONDA', 'fiestaGamePUERTA', 'fiestaGameACUSADO', 'fiestaGameCONEXION', 'fiestaGameCADENA'];
             fIds.forEach(id => document.getElementById(id)?.classList.add('hidden'));
        }
    },

    showScreen: (id, skipHistory = false) => {
        const screens = [
            'hubScreen', 'loginScreen', 'feedbackScreen', 
            'impostorLobby', 'impostorGame', 
            'loboLobby', 'loboGame', 
            'anecdotasLobby', 'anecdotasGame', 
            'elmasLobby', 'elmasGame', 
            'tabuLobby', 'tabuGame', 
            'pinturilloImpLobby', 'pinturilloImpGame', 
            'cylLobby', 'cylGame', 
            'ordenLobby', 'ordenGame',
            'giveScreen', 'musScreen',
            'contextoScreen', 'consejoScreen',
            'fiestaScreen', 'statsSelectionScreen',
            'fifaScreen', 'torresLobby', 'torresGame',
            'darkstoriesScreen', 'beberScreen', 'beberStatsScreen',
            'analyticsScreen'
        ];
        
        screens.forEach(s => {
            const el = document.getElementById(s);
            if(el) el.classList.add('hidden');
        });

        app.resetVisuals();

        const target = document.getElementById(id);
        if(target) target.classList.remove('hidden');

        if (!skipHistory && app.currentScreenId !== id) {
            history.pushState({ screen: id }, '', window.location.href);
        }
        app.currentScreenId = id;

        const widget = document.getElementById('floatingUserWidget');
        const widgetText = document.getElementById('floatingUserText');
        
        if (id === 'loginScreen' && !app.myPlayerName) {
            widget.classList.add('hidden');
        } else {
            widget.classList.remove('hidden');
            const name = app.myPlayerName || "Sin Nombre";
            const roomName = app.currentRoom ? app.currentRoom.toUpperCase() : "HUB";
            const roomId = app.currentRoomId ? ` - ${app.currentRoomId}` : "";
            const emoji = (app.currentRoom && ROOM_EMOJIS[app.currentRoom]) ? ROOM_EMOJIS[app.currentRoom] : "🏠";
            widgetText.innerHTML = `<span style="opacity:0.7">${emoji} ${roomName}${roomId}</span><br><strong>👤 ${name}</strong>`;
        }
    },

    findActiveSession: () => {
        const rooms = ['impostor', 'lobo', 'anecdotas', 'elmas', 'tabu', 'pinturilloImp', 'cifrasyletras', 'orden', 'torres'];
        for (let r of rooms) {
            if (localStorage.getItem(r + '_playerId') && localStorage.getItem(r + '_roomId')) return r;
        }
        return null;
    },

    selectRoom: (room) => {
        if (app.myPlayerName) {
            socket.emit('registerRoomVisit', { name: app.myPlayerName, room: room });
        }

        if (['feedback', 'mus', 'give', 'contexto', 'consejo', 'fiesta', 'trivial', 'fifa', 'darkstories', 'beber', 'analytics'].includes(room)) {
            if(room === 'mus') { app.showScreen('musScreen'); if(app.mus.init) app.mus.init(); return; }
            if(room === 'fifa') { app.showScreen('fifaScreen'); if(app.fifa.init) app.fifa.init(); return; }
            if(room === 'give') { app.showScreen('giveScreen'); return; }
            if(room === 'trivial') { if(app.trivial.init) app.trivial.init(); return; }
            if(room === 'contexto') { app.showScreen('contextoScreen'); if(app.contexto.init) app.contexto.init(); return; }
            if(room === 'feedback') { if(app.feedback.populateCats) app.feedback.populateCats(); return app.showScreen('feedbackScreen'); }
            if(room === 'darkstories') { app.showScreen('darkstoriesScreen'); if(app.darkstories.init) app.darkstories.init(); return; }
            if(room === 'beber') { app.showScreen('beberScreen'); if(app.beber.init) app.beber.init(); return; }
            if(room === 'analytics') { app.showScreen('analyticsScreen'); if(app.analytics.init) app.analytics.init(); return; }
            
            if (room === 'fiesta') {
                 const name = app.myPlayerName || "Fiestero";
                 const uniqueRoomId = 'FIESTA-MAIN'; 
                 socket.emit('joinRoom', { name, room: 'fiesta', roomId: uniqueRoomId }); 
                 return;
            }

            if(room === 'consejo') { 
                const autoName = app.myPlayerName || "Sabio";
                const autoRoomId = 'CONSEJO-' + Math.floor(Math.random() * 10000);
                socket.emit('joinRoom', { name: autoName, room: 'consejo', roomId: autoRoomId });
                return; 
            }
        }
        
        const savedId = localStorage.getItem(room + '_playerId');
        const savedRoomId = localStorage.getItem(room + '_roomId');
        
        if (savedId && savedRoomId) {
            app.myPlayerId = savedId;
            app.currentRoom = room;
            app.currentRoomId = savedRoomId;
            socket.emit('rejoin', { savedId, savedRoom: room, savedRoomId });
        } 
        else {
            app.currentRoom = room;
            socket.emit('requestHubRooms'); 
            app.renderLoginScreen(room);
        }
    },

    renderLoginScreen: (room) => {
        const titleEl = document.getElementById('loginTitle');
        const emoji = (room && ROOM_EMOJIS[room]) ? ROOM_EMOJIS[room] : "👤";
        const roomName = room ? (room.charAt(0).toUpperCase() + room.slice(1)) : "Perfil";
        
        if(titleEl) titleEl.innerText = `${roomName} ${emoji}`;
        
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
        
        const nameEntry = document.getElementById('nameEntryArea');
        const roomSelect = document.getElementById('roomSelectionArea');
        const nameDisplay = document.getElementById('displayName');

        if (app.myPlayerName) {
            nameEntry.classList.add('hidden');
            roomSelect.classList.remove('hidden');
            if(nameDisplay) nameDisplay.innerText = app.myPlayerName;
        } else {
            nameEntry.classList.remove('hidden');
            roomSelect.classList.add('hidden');
            setTimeout(() => document.getElementById('username')?.focus(), 100);
        }

        app.showScreen('loginScreen');
    },

    editName: () => {
        localStorage.removeItem('global_username');
        app.myPlayerName = null;
        const input = document.getElementById('username');
        if(input) input.value = "";
        app.renderLoginScreen(app.currentRoom);
    },

    saveNameAndContinue: () => {
        const nameInput = document.getElementById('username');
        let name = nameInput.value.trim().toLowerCase();
        
        if (!name) return alert('¡Ponte un nombre!');

        if (name !== 'administrador m' && !/^[a-z0-9]+$/.test(name)) {
            return alert('El nombre solo puede contener letras minúsculas y números (sin espacios).');
        }

        const protectedNames = ['musero', 'administrador m', 'xarlie'];
        
        const finalizeLogin = () => {
            localStorage.setItem('global_username', name);
            app.myPlayerName = name; 
            socket.emit('registerVisit', name);
            app.currentRoom = null;
            app.pendingRoomId = null;
            app.showScreen('hubScreen'); 
        };

        if (protectedNames.includes(name)) {
            const pwd = prompt("Esta cuenta está protegida. Introduce la contraseña:");
            if (!pwd) return; // Si cancela, no hacemos nada

            // Preguntamos al servidor de forma invisible
            socket.emit('verifyPassword', { username: name, password: pwd }, (response) => {
                if (!response.success) {
                    alert("Contraseña incorrecta.");
                    return;
                }
                finalizeLogin();
            });
        } else {
            finalizeLogin();
        }
    },

    joinGame: (roomIdOverride = null) => {
        const targetId = roomIdOverride || app.pendingRoomId || null;
        app.pendingRoomId = null; 

        const nameInput = document.getElementById('username');
        let name = "";

        if (nameInput && nameInput.value.trim().length > 0) {
            name = nameInput.value.trim().toLowerCase();
        } 
        else if (app.myPlayerName) {
            name = app.myPlayerName.toLowerCase();
        }

        if (!name) return alert('¡Ponte un nombre!');

        if (name !== 'administrador m' && !/^[a-z0-9]+$/.test(name)) {
            return alert('El nombre solo puede contener letras minúsculas y números (sin espacios).');
        }

        const protectedNames = ['musero', 'administrador m', 'xarlie'];

        const finalizeJoin = () => {
            localStorage.setItem('global_username', name);
            app.myPlayerName = name; 
            socket.emit('registerVisit', name);

            if (app.currentRoom) {
                socket.emit('joinRoom', { name, room: app.currentRoom, roomId: targetId });
            } else {
                app.showScreen('hubScreen');
            }
        };

        if (protectedNames.includes(name) && app.myPlayerName !== name) {
            const pwd = prompt("Esta cuenta está protegida. Introduce la contraseña:");
            if (!pwd) return;

            // Preguntamos al servidor de forma invisible
            socket.emit('verifyPassword', { username: name, password: pwd }, (response) => {
                if (!response.success) {
                    alert("Contraseña incorrecta.");
                    return;
                }
                finalizeJoin();
            });
        } else {
            finalizeJoin();
        }
    },

    deleteAnalyticsRecord: (name, type) => {
        const msg = type === 'last' 
            ? `¿Seguro que quieres borrar el ÚLTIMO acceso registrado de "${name}"?`
            : `🚨 ATENCIÓN: ¿Seguro que quieres borrar TODOS los registros históricos de "${name}"? Esto no se puede deshacer.`;
        
        if (confirm(msg)) {
            socket.emit('analytics_deleteRecord', {
                admin: app.myPlayerName,
                name: name,
                type: type
            });
        }
    },
    
    changeName: () => {
        if (app.currentRoom) {
             if (!confirm(`Para cambiar de nombre debes salir de la sala actual. ¿Continuar?`)) return;
             app.goBackToHub(true); 
        }
        if (app.mus && app.mus.resetUI) app.mus.resetUI();
        
        localStorage.removeItem('global_username');
        app.myPlayerName = null;
        app.currentRoom = null;
        app.currentRoomId = null;
        
        app.renderLoginScreen(null);
    },

    showStatsMenu: () => {
        app.showScreen('statsSelectionScreen');
    },

    goBackToHub: (forceLogout = false, skipHistory = false) => {
        if (app.mus && app.mus.resetUI) app.mus.resetUI();

        if (forceLogout) {
             const r = app.currentRoom;
             const rid = app.currentRoomId;
             if (r && rid) {
                 const id = localStorage.getItem(r + '_playerId');
                 if (id) socket.emit('leaveGame', { playerId: id, room: r, roomId: rid });
                 localStorage.removeItem(r + '_playerId');
                 localStorage.removeItem(r + '_roomId');
             }
             app.currentRoom = null;
             app.currentRoomId = null;
             app.myPlayerId = null;
             app.showScreen('hubScreen', skipHistory);
        } else {
            app.currentRoom = null; 
            app.showScreen('hubScreen', skipHistory);
            socket.emit('requestHubRooms');
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

    showLegalModal: () => {
        document.getElementById('legalModal').classList.remove('hidden');
    },

    closeLegalModal: () => {
        document.getElementById('legalModal').classList.add('hidden');
    },

    acceptLegal: () => {
        localStorage.setItem('legal_accepted', 'true');
        document.getElementById('legalBanner').classList.add('hidden');
    },
    
    impostor: {}, lobo: {}, anecdotas: {}, elmas: {}, tabu: {}, feedback: {}, pinturilloImp: {}, mus: {}, cyl: {}, orden: {}, contexto: {}, consejo: {},
    fiesta: {}, torres: {}, darkstories: {}, beber: {}, analytics: {}
};

window.addEventListener('popstate', (event) => {
    const openModals = document.querySelectorAll('.modal-overlay:not(.hidden)');
    if (openModals.length > 0) {
        openModals.forEach(m => m.classList.add('hidden'));
        history.pushState({ screen: app.currentScreenId }, '', window.location.href);
        return;
    }

    const targetScreen = event.state ? event.state.screen : 'hubScreen';

    if (app.currentRoom && targetScreen !== app.currentScreenId) {
        if (confirm("¿Seguro que quieres salir de la sala actual?")) {
            app.goBackToHub(true, true); 
        } else {
            history.pushState({ screen: app.currentScreenId }, '', window.location.href);
        }
    } else {
        app.showScreen(targetScreen, true);
    }
});

socket.on('hubRoomsUpdate', (rooms) => {
    const hubContainer = document.getElementById('activeRoomsList');
    if (hubContainer) {
        if (rooms.length === 0) {
            hubContainer.innerHTML = "<p style='color:#555; font-size:0.8em'>No hay salas activas.</p>";
        } else {
            let html = "<h3>Salas Activas</h3><div class='hub-grid'>";
            rooms.forEach(r => {
                html += `
                <div class="hub-card" style="border-left-color: #00cec9; padding: 10px;" onclick="app.selectActiveRoom('${r.game}', '${r.id}')">
                    <div style="font-weight:bold">${ROOM_EMOJIS[r.game] || '🎮'} ${r.id}</div>
                    <div style="font-size:0.8em; color:#aaa">${r.players} Jugadores - ${r.status}</div>
                </div>`;
            });
            html += "</div>";
            hubContainer.innerHTML = html;
        }
    }

    const gameContainer = document.getElementById('gameActiveRooms');
    if (gameContainer && app.currentRoom) {
        const myGameRooms = rooms.filter(r => r.game === app.currentRoom);
        
        if (myGameRooms.length === 0) {
            gameContainer.innerHTML = "<p style='color:#666; font-style:italic;'>No hay salas creadas. ¡Crea una!</p>";
        } else {
            let html = "";
            myGameRooms.forEach(r => {
                html += `
                <div class="hub-card" style="border-left-color: #2ed573; padding: 15px; margin-bottom:10px;" onclick="app.joinGame('${r.id}')">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:bold; font-size:1.2em;">${r.id}</span>
                        <span style="background:#2f3542; padding:2px 8px; border-radius:5px; font-size:0.8em;">${r.status}</span>
                    </div>
                    <div style="font-size:0.9em; color:#aaa; text-align:left;">👤 ${r.players} Jugadores</div>
                </div>`;
            });
            gameContainer.innerHTML = html;
        }
    }
});

app.selectActiveRoom = (game, roomId) => {
    app.currentRoom = game;
    if (app.myPlayerName) {
        app.joinGame(roomId);
    } else {
        app.pendingRoomId = roomId; 
        app.renderLoginScreen(game);
    }
};

socket.on('joinedSuccess', (data) => {
    localStorage.setItem(data.room + '_playerId', data.playerId);
    localStorage.setItem(data.room + '_roomId', data.roomId);
    
    app.myPlayerId = data.playerId;
    app.currentRoom = data.room;
    app.currentRoomId = data.roomId;
    
    if(data.name) app.myPlayerName = data.name;
    
    if (data.room === 'impostor') app.showScreen('impostorLobby');
    else if (data.room === 'lobo') app.showScreen('loboLobby');
    else if (data.room === 'anecdotas') app.showScreen('anecdotasLobby'); 
    else if (data.room === 'elmas') app.showScreen('elmasLobby');
    else if (data.room === 'tabu') app.showScreen('tabuLobby');
    else if (data.room === 'pinturilloImp') app.showScreen('pinturilloImpLobby');
    else if (data.room === 'cifrasyletras') app.showScreen('cylLobby');
    else if (data.room === 'orden') app.showScreen('ordenLobby');
    else if (data.room === 'consejo') app.showScreen('consejoScreen');
    else if (data.room === 'torres') app.showScreen('torresLobby');
    
    else if (data.room === 'fiesta') {
        app.showScreen('fiestaScreen');
        
        const screen = document.getElementById('fiestaScreen');
        screen.classList.remove('hidden');

        app.forceFiestaStyles();

        setTimeout(() => {
            if (app.fiesta && app.fiesta.init) app.fiesta.init();
        }, 100);
    }
});

socket.on('joinError', (msg) => { alert("⛔ " + msg); });

socket.on('sessionExpired', () => {
    if (app.currentRoom) {
        localStorage.removeItem(app.currentRoom + '_playerId');
        localStorage.removeItem(app.currentRoom + '_roomId');
    }
    app.myPlayerId = null;
    app.currentRoom = null;
    app.currentRoomId = null;
    alert("Tu sesión ha caducado o la sala se ha cerrado.");
    app.showScreen('hubScreen');
});

socket.on('initSetup', (data) => { if(data.categories) app.categoriesCache = data.categories; });

window.onload = function() {
    if (!localStorage.getItem('legal_accepted')) {
        const banner = document.getElementById('legalBanner');
        if (banner) banner.classList.remove('hidden');
    }

    history.replaceState({ screen: 'hubScreen' }, '', window.location.href);

    app.initFloatingWidget();
    if(app.feedback && app.feedback.init) app.feedback.init();
    
    const savedGlobalName = localStorage.getItem('global_username');
    if (savedGlobalName) {
        let correctedName = savedGlobalName.toLowerCase();
        
        if (correctedName !== 'administrador m') {
            correctedName = correctedName.replace(/[^a-z0-9]/g, '');
        }

        if (correctedName.length > 0) {
            localStorage.setItem('global_username', correctedName);
            app.myPlayerName = correctedName; 
            socket.emit('registerVisit', correctedName);
        } else {
            localStorage.removeItem('global_username');
            app.myPlayerName = null;
        }
    }

    const nameInput = document.getElementById('username');
    if (nameInput) {
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                app.saveNameAndContinue();
            }
        });
    }

    socket.emit('requestHubRooms');
    setInterval(() => {
        if (!document.getElementById('hubScreen').classList.contains('hidden') || 
            !document.getElementById('loginScreen').classList.contains('hidden')) {
            socket.emit('requestHubRooms');
        }
    }, 5000);

    const activeSession = app.findActiveSession();
    if (activeSession) {
        app.selectRoom(activeSession);
    } else {
        app.showScreen('hubScreen');
    }
};