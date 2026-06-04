// public/js/main.js
window.socket = io();
const socket = window.socket;

if (!localStorage.getItem('arcade_uuid')) {
    localStorage.setItem('arcade_uuid', 'id-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36));
}
window.arcadeUUID = localStorage.getItem('arcade_uuid');

const GAME_RULES = {
    impostor: `🕵️ EL IMPOSTOR\n--------------------------------\n🎯 OBJETIVO\n- Civiles: Descubrir quién es el impostor.\n- Impostor: Descubrir la palabra secreta o sobrevivir sin ser detectado.\n\n🕹️ DINÁMICA\n1. Configuración: El admin elige número de impostores, categoría (ej. Comida) y si hay Pistas o no.\n\n2. Roles:\n   - Toca tu tarjeta para ver tu rol.\n   - Civiles ven la "Palabra Secreta" (ej. "Pizza").\n   - El Impostor ve "IMPOSTOR" (y una pista vaga si están activas).\n\n3. Descripción:\n   - Por turnos, cada jugador dice UNA sola palabra relacionada con la secreta.\n   - Civiles: Sed vagos para que el impostor no sepa la palabra, pero claros para que sepan que sois ciudadanos.\n   - Impostor: Escucha, deduce y miente para encajar.\n   \n4. Votación:\n   - Pulsad los nombres en la pantalla para votar al sospechoso.\n\n5. Resolución:\n   - Si se expulsa a todos los impostores: Ganan Civiles.\n   - Si el número de impostores es el mismo al de ciudadanos: Gana los Impostores.\n   - Si el Impostor es pillado, tiene una última oportunidad: ¡Adivinar la palabra! Si acierta, gana él.`,
    lobo: `🐺 EL LOBO (Werewolf)\n--------------------------------\n🎯 OBJETIVO\n- Pueblo: Eliminar a todos los Lobos.\n- Lobos: Eliminar al Pueblo hasta igualarlos en número.\n\n🕹️ DINÁMICA\n(Una persona que no esté en la sala actúa como Narrador y guía las fases de viva voz)\n(En el futuro se desarrollará un modo en el que cada jugador interactúe con la pantalla)\n\n1. Roles Especiales:\n   - 🔮 Vidente: Ve el rol de un jugador cada noche.\n   - 👧 Niña: Puede abrir los ojos con cuidado (si la pillan, muere).\n   - 💘 Cupido: Enamora a dos (si uno muere, el otro también).\n   - 🔫 Cazador: Si muere, mata a otro inmediatamente.\n\n2. La Noche (Ojos cerrados):\n   - El Admin despierta a los Lobos. Ellos miran su móvil (ven a sus compañeros) y eligen víctima en silencio.\n   - El Admin despierta a los roles especiales para sus acciones secuencialmente.\n\n3. El Día (Ojos abiertos):\n   - Se anuncia quién murió. Debate y acusaciones.\n   - Votación: Usad la interfaz para linchar a un sospechoso.\n   - El más votado muere y revela rol.`,
    anecdotas: `📜 ANÉCDOTAS\n--------------------------------\n🎯 OBJETIVO\nAdivinar de quién es la anécdota leída y ganar puntos.\n\n🕹️ DINÁMICA\n1. Escritura:\n   - Escribe una anécdota breve, secreto o historia (real o inventada).\n   - Pulsa "Listo".\n\n2. Lectura:\n   - El juego muestra una anécdota anónima en pantalla grande.\n   - Alguien la lee en voz alta.\n\n3. Votación:\n   - Vota en tu móvil quién crees que es el autor.\n   - No puedes votarte a ti mismo.\n\n4. Puntos:\n   - Ganas puntos si adivinas el autor.\n   - El autor gana puntos sial menos una persona acierta y al menos otra persona falla .`,
    elmas: `🏆 EL MÁS...\n--------------------------------\n🎯 OBJETIVO\nJuego social de votación. Sin ganadores, solo opiniones.\n\n🕹️ DINÁMICA\n1. La Pregunta:\n   - Aparece una pregunta tipo: "¿Quién es más probable que acabe en la cárcel?" o "¿Quién liga más?".\n\n2. Votación:\n   - Vota al jugador que mejor encaje con la descripción.\n\n3. Resultados:\n   - Se muestran gráficas con los votos.\n   - Los puntos son proporcionales a la opinión popular`,
    tabu: `🚫 TABÚ\n--------------------------------\n🎯 OBJETIVO\nQue tu equipo adivine la palabra clave sin decir las prohibidas.\n\n🕹️ DINÁMICA\n1. Equipos:\n   - Uníos al Equipo Azul o Rojo en el lobby.\n\n2. El Turno:\n   - Un jugador sale al frente con su móvil.\n   - Tarjeta: Muestra la PALABRA CLAVE (Grande) y las PROHIBIDAS (Pequeñas).\n\n3. Controles (Quien describe):\n   - ✅ BIEN: Tu equipo acierta (+1 punto).\n   - ⏭️ SALTAR: Pasas palabra (Saltos limitados).\n   - 🚫 MAL: Has dicho una prohibida (Rival vigila y pulsa). Anula tarjeta.\n\n4. Tiempo:\n   - Al llegar a 0, cambio de turno.`,
    torres: `🗼 TORRES\n--------------------------------\n🎯 OBJETIVO\nAdivinar qué palabra tienes asignada viendo las palabras de los demás.\n\n🕹️ DINÁMICA\n1. Tú no puedes ver tu palabra ("???"), pero ves las de los demás.\n2. Hablad (o escribid en Modo Silencioso) haciendo preguntas de sí o no, o dando pistas sutiles.\n3. El Administrador marcará como "Ganador" a quien la adivine, y "Eliminado" a quien se rinda o falle catastróficamente.`,
    pinturilloImp: `🎨 EL FALSO ARTISTA\n--------------------------------\n🎯 OBJETIVO\nTodos dibujan algo sobre la misma palabra secreta. El impostor debe hacerse pasar por artista sin saber qué es.\n\n🕹️ DINÁMICA\n1. Roles:\n   - Artistas: Ven la palabra (ej. "Gato").\n   - Impostor: Ve "X" (no sabe qué dibujar) + la pista.\n\n2. Dibujo:\n   - Por turnos, cada uno dibuja UN solo trazo (una línea) en el lienzo común.\n   - El trazo debe ser suficiente para demostrar que sabes la palabra, pero no tan claro para regalársela al impostor.\n\n3. Votación:\n   - Tras X vueltas, se vota quién es el Falso Artista.\n   \n4. Desenlace:\n   - Si el Impostor es pillado, tiene una última oportunidad: ¡Adivinar la palabra! Si acierta, gana él.`,
    mus: `🐄 REGISTRO DE MUS\n--------------------------------\nHerramienta de seguimiento estadístico.\n\n🕹️ USO\n- + Jugador: Registra un nuevo nombre en la base de datos.\n- + Partida: Registra un resultado (Pareja 1 vs Pareja 2).\n- Estadísticas: Consulta Rankings, porcentajes de victoria y evolución histórica.`,
    cifrasyletras: `🔢 CIFRAS Y LETRAS\n--------------------------------\n🎯 OBJETIVO\nConseguir el número exacto o la palabra más larga.\n\n🕹️ DINÁMICA\n1. Ronda Cifras:\n   - Se muestra un OBJETIVO (ej: 450) y 6 números.\n   - Tienes 60s para calcular.\n   - Puntuación: \n     ❌ (0 pts): Fallo.\n     <10 (2 pts): Te has quedado a menos de 10 de distancia.\n     ✅ (5 pts): Exacto.\n\n2. Ronda Letras:\n   - Salen 12 letras. Tienes 60s para buscar la palabra más larga.\n   - Puntuación: 1 punto por cada letra de tu palabra válida.`,
    orden: `🔢 ORDEN\n--------------------------------\n🎯 OBJETIVO\nOrdenad a los jugadores en la lista según el valor de su carta oculta.\n\n🕹️ DINÁMICA\n1. Tu Carta: Toca la tarjeta superior para ver tu número o acción.\n2. Cooperación: \n   - Usa las flechas ▲ ▼ para SUGERIR dónde debe ir cada jugador.\n   - El número bajo la flecha indica cuántos jugadores opinan lo mismo.\n3. El Admin: Es el único que puede MOVER realmente a los jugadores basándose en las sugerencias.\n4. Listo: Cuando creas que tu posición es correcta, pulsa LISTO.\n5. Resolución: El Admin finalizará la ronda. ¡Necesitáis un 80% de aciertos para ganar!`,
    consejo: `🦉 CONSEJO DE SABIOS\n--------------------------------\nHerramienta para gestionar debates o decisiones.\n\n1. Añade a los "Sabios" (jugadores) en la lista superior.\n2. Elige un tema (Filosofía, Salseo, Dilemas...).\n3. Pulsa "Pregunta" para sacar un tema de conversación al azar.\n4. Pulsa "Elegido" para seleccionar aleatoriamente a uno de los sabios para que empiece a hablar.`,
    tecnico: `🛠️ AYUDA TÉCNICA\n================================\n\n🔑 ADMINISTRADOR (Admin)\nNo hay contraseñas.\n1. Primer Llegado: Si entras a una sala vacía, eres Admin (👑).\n2. Nombres Clave: Entra como "Admin" para ser Administrador de una sala.\n3. Poderes: Configurar partida, Kick (Echar), Kill (Matar en juego) y Reset.\n\n♻️ SISTEMA\n- Sala Vacía: Si todos salen, la sala se reinicia (Soft Reset).\n- Reconexión: Si cierras y vuelves, el sistema te recuerda. Para cambiar de nombre o sala, pulsa "❌ Salir"(botón ROJO) arriba.\n- Observador: Si entras a una partida empezada, podrás mirar pero no votar.\n\n⚠️ SOLUCIÓN DE PROBLEMAS\n1. ¿No hay botón empezar?: No eres admin. Que el admin salga y entre, o entra tú con nombre "Admin".\n2. Pantalla pillada: Refresca el navegador. Si no funciona: Pide al Administrador que pulse "Reset" o "Finalizar".\n3. Tarjeta cortada: Gira el móvil o sal del modo escritorio (tres puntitos: "Vista" (o "Versión") para ordenador).\n4. Lag: Recarga la página (F5). No perderás tu puesto.`
};

const ROOM_EMOJIS = {
    impostor: "🕵️", lobo: "🐺", anecdotas: "📜", elmas: "🏆", tabu: "🚫",
    pinturilloImp: "🎨", cifrasyletras: "🔣", feedback: "💌", orden: "🎌", 
    consejo: "🦉", fiesta: "🎉", torres: "🗼", darkstories: "📖", beber: "🍻", analytics: "📈"
};

window.app = {
    sessionToken: null,
    currentRoom: null,
    currentRoomId: null, 
    pendingRoomId: null,
    myPlayerId: null,
    myPlayerName: null,
    isAuthenticatedUser: false, 
    categoriesCache: {},
    currentScreenId: 'hubScreen', 

    syncSession: () => {
        if (app.sessionToken) {
            socket.emit('updateSession', {
                token: app.sessionToken,
                username: app.myPlayerName,
                isAuthenticated: app.isAuthenticatedUser
            });
        }
    },

    updateRestrictedButtons: () => {
        const btn = document.getElementById('tierlistBtn');
        if (!btn) return;
        
        const lowerName = (app.myPlayerName || "").toLowerCase();
        const inWhitelist = app.musWhitelist && app.musWhitelist.includes(lowerName);
        
        if (!inWhitelist) {
            btn.classList.add('disabled');
            btn.onclick = () => {
                alert("🔒 Acceso Restringido.\nSolo los jugadores de la Whitelist pueden acceder a la Tier List.");
            };
        } else {
            btn.classList.remove('disabled');
            btn.onclick = () => app.selectRoom('tierlist');
        }
    },

    currentNews: null,

    dismissNews: (e) => {
        if (e) e.stopPropagation();
        if (app.currentNews) {
            // Guardar en el navegador que ya hemos visto ESTA noticia específica
            localStorage.setItem('arcade_news_dismissed', app.currentNews.id);
        }
        const widget = document.getElementById('hubNewsWidget');
        if (widget) widget.classList.add('hidden');
    },

    auth: {
        pendingCallback: null,
        pendingName: null,
        checkTimeout: null,

        openRegister: () => {
            document.getElementById('registerModal').classList.remove('hidden');
            document.getElementById('regUsername').value = document.getElementById('username').value.trim();
            app.auth.checkAvailability();
        },

        closeRegister: () => { document.getElementById('registerModal').classList.add('hidden'); },

        checkAvailability: () => {
            clearTimeout(app.auth.checkTimeout);
            const nameRaw = document.getElementById('regUsername').value.trim();
            const name = nameRaw.toLowerCase();
            const statusEl = document.getElementById('regStatus');
            
            if (name.length < 3) {
                statusEl.innerHTML = "Mínimo 3 letras";
                statusEl.style.color = "var(--accent-red)";
                return;
            }
            if (name !== 'administrador m' && !/^[a-z0-9]+$/.test(name)) {
                statusEl.innerHTML = "Sin espacios, solo letras/números";
                statusEl.style.color = "var(--accent-red)";
                return;
            }

            statusEl.innerHTML = "Comprobando... ⏳";
            statusEl.style.color = "var(--text-muted)";

            app.auth.checkTimeout = setTimeout(() => {
                socket.emit('checkUsernameAvailability', name, (res) => {
                    if (res.available) {
                        statusEl.innerHTML = "✅ Disponible";
                        statusEl.style.color = "var(--accent-green)";
                    } else if (res.pending) {
                        statusEl.innerHTML = "⚠️ Pendiente de aprobación";
                        statusEl.style.color = "var(--accent-gold)";
                    } else {
                        statusEl.innerHTML = "❌ Nombre ya registrado";
                        statusEl.style.color = "var(--accent-red)";
                    }
                });
            }, 500);
        },

        submitRegistration: () => {
            const nameRaw = document.getElementById('regUsername').value.trim();
            const name = nameRaw.toLowerCase();
            const pass = document.getElementById('regPassword').value;
            const email = document.getElementById('regEmail').value.trim();

            if (name.length < 3) return alert("Nombre demasiado corto.");
            if (name !== 'administrador m' && !/^[a-z0-9]+$/.test(name)) return alert("El nombre solo puede contener letras minúsculas y números (sin espacios).");
            if (pass.length < 4) return alert("Contraseña mínima de 4 caracteres.");
            
            socket.emit('submitAuthRequest', { type: 'register', username: name, password: pass, email: email }, () => {
                alert("Solicitud enviada. Los administradores revisarán tu petición pronto. Puedes usar el nombre mientras tanto, pero si se aprueba necesitarás la contraseña.");
                app.auth.closeRegister();
            });
        },

        openForgotPassword: () => {
            app.cancelPassword();
            const pass = prompt(`¿Has olvidado la contraseña de "${app.auth.pendingName}"?\nEscribe aquí una NUEVA contraseña. Se enviará a los administradores para que la aprueben:`);
            if (!pass || pass.length < 4) return alert("Operación cancelada o contraseña muy corta.");
            socket.emit('submitAuthRequest', { type: 'forgot', username: app.auth.pendingName, password: pass, email: '' }, () => {
                alert("Petición de cambio de contraseña enviada a los administradores.");
            });
        },

        openAdminPanel: () => {
            app.showScreen('authAdminScreen');
            socket.emit('getAuthRequests', app.myPlayerName);
            app.dbAdmin.init();
            app.auth.loadAnnouncements();
        },

        resolveRequest: (reqId, action) => {
            if (confirm(`¿Estás seguro de ${action === 'approve' ? 'APROBAR' : 'RECHAZAR'} esta solicitud?`)) {
                socket.emit('resolveAuthRequest', { adminName: app.myPlayerName, reqId, action });
            }
        },

        updateNews: () => {
            const room = document.getElementById('adminNewsRoom').value;
            const text = document.getElementById('adminNewsText').value.trim();
            
            if (!text) return alert("Debes escribir un texto para la novedad.");
            
            socket.emit('adminUpdateNews', { user: app.myPlayerName, room: room, text: text });
            alert("✅ Novedad publicada. Todos los usuarios la verán en su menú principal.");
            document.getElementById('adminNewsText').value = ""; // Limpiar textarea
        },

        loadAnnouncements: () => {
            socket.emit('adminManageAnnouncements', { action: 'get', user: app.myPlayerName });
        },

        showAddAnnouncementForm: () => {
            document.getElementById('addAnnouncementForm').classList.remove('hidden');
        },

        hideAddAnnouncementForm: () => {
            document.getElementById('addAnnouncementForm').classList.add('hidden');
            document.getElementById('newAnnText').value = '';
        },

        addAnnouncement: () => {
            const room = document.getElementById('newAnnRoom').value;
            const text = document.getElementById('newAnnText').value.trim();
            if (!text) return alert("Debes escribir un texto para el anuncio.");
            socket.emit('adminManageAnnouncements', { action: 'add', user: app.myPlayerName, room, text, active: false });
        },

        toggleAnnouncement: (id) => {
            socket.emit('adminManageAnnouncements', { action: 'toggle', user: app.myPlayerName, id });
        },

        deleteAnnouncement: (id) => {
            if (confirm("¿Eliminar este anuncio?")) {
                socket.emit('adminManageAnnouncements', { action: 'delete', user: app.myPlayerName, id });
            }
        },
    },
    
    dbAdmin: {
        currentTable: '',
        
        init: () => {
            socket.emit('db_admin_action', { action: 'get_tables', user: app.myPlayerName });
        },
        
        loadTable: () => {
            const table = document.getElementById('dbTableSelect').value;
            if (!table) return alert('Selecciona una tabla.');
            app.dbAdmin.currentTable = table;
            document.getElementById('dbInsertArea').classList.add('hidden');
            document.getElementById('dbCustomQueryArea').classList.add('hidden');
            socket.emit('db_admin_action', { action: 'select_all', table: table, user: app.myPlayerName });
        },
        
        deleteRow: (table, pkColumn, pkValue) => {
            if (confirm(`¿Estás 100% seguro de borrar este registro?\n${pkColumn} = ${pkValue}`)) {
                socket.emit('db_admin_action', { action: 'delete_row', table, pkColumn, pkValue, user: app.myPlayerName });
            }
        },
        
        dropTable: () => {
            const table = document.getElementById('dbTableSelect').value;
            if (!table) return alert('Selecciona una tabla.');
            if (confirm(`🚨 PELIGRO 🚨\n\nEstás a punto de borrar la tabla entera '${table}' y todos los datos que contiene.\n¿Continuar?`)) {
                if (prompt('Escribe "BORRAR" en mayúsculas para confirmar:') === 'BORRAR') {
                    socket.emit('db_admin_action', { action: 'drop_table', table, user: app.myPlayerName });
                } else {
                    alert("Operación cancelada.");
                }
            }
        },
        
        toggleCustomQuery: () => {
            document.getElementById('dbCustomQueryArea').classList.toggle('hidden');
        },
        
        runCustomQuery: () => {
            const sql = document.getElementById('dbCustomQuery').value.trim();
            if (!sql) return;
            socket.emit('db_admin_action', { action: 'custom_query', sql, user: app.myPlayerName });
        },
        
        showInsertForm: () => {
            const table = document.getElementById('dbTableSelect').value;
            if (!table) return alert('Selecciona una tabla primero para cargar sus columnas.');
            socket.emit('db_admin_action', { action: 'get_columns', table, user: app.myPlayerName });
        },
        
        executeInsert: () => {
            const inputs = document.querySelectorAll('.db-insert-input');
            const data = {};
            inputs.forEach(inp => {
                if (inp.value.trim() !== '') data[inp.dataset.col] = inp.value;
            });
            
            if(Object.keys(data).length === 0) return alert("Rellena algún campo.");
            
            socket.emit('db_admin_action', { action: 'insert_row', table: app.dbAdmin.currentTable, data, user: app.myPlayerName });
            document.getElementById('dbInsertArea').classList.add('hidden');
        }
    },

    showPasswordModal: (name, callback) => {
        app.auth.pendingName = name;
        app.auth.pendingCallback = callback;
        document.getElementById('passwordModal').classList.remove('hidden');
        const input = document.getElementById('adminPasswordInput');
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 100);
        }
    },

    cancelPassword: () => {
        document.getElementById('passwordModal').classList.add('hidden');
        app.auth.pendingCallback = null;
    },

    submitPassword: () => {
        const pwd = document.getElementById('adminPasswordInput').value;
        const name = app.auth.pendingName;
        const callback = app.auth.pendingCallback;
        
        if (!pwd) return alert("Introduce la contraseña.");

        socket.emit('verifyPassword', { username: name, password: pwd }, (response) => {
            if (!response.success) {
                alert("Contraseña incorrecta.");
                document.getElementById('adminPasswordInput').value = '';
                return;
            }
            app.isAuthenticatedUser = true; 
            app.syncSession();
            document.getElementById('passwordModal').classList.add('hidden');
            if (callback) callback();
        });
    },

    forceFiestaStyles: () => {
        const menu = document.getElementById('fiestaMenu');
        if (!menu) return;
        menu.classList.remove('hidden');
        menu.style.display = 'block';
    },

    initFloatingWidget: () => {
        const widget = document.getElementById('floatingUserWidget');
        if(!widget) return;
        let isDragging = false;
        let hasMoved = false; 
        let offsetX, offsetY;
        let startX, startY; 

        const startDrag = (x, y) => {
            isDragging = true;
            hasMoved = false;
            startX = x;
            startY = y;
            const rect = widget.getBoundingClientRect();
            offsetX = x - rect.left;
            offsetY = y - rect.top;
            widget.style.cursor = 'grabbing';
            widget.style.transition = 'none';
        };

        const moveDrag = (x, y) => {
            if (!isDragging) return;
            if (Math.abs(x - startX) > 5 || Math.abs(y - startY) > 5) hasMoved = true;
            
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
            if (!hasMoved) {
                setTimeout(() => app.changeName(), 50); 
            }
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
            'analyticsScreen', 'authAdminScreen', 'tierlistScreen',
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
        const btnAdminAuth = document.getElementById('btnAdminAuth');
        const btnHubAnalytics = document.getElementById('btnHubAnalytics'); 
        
        if (id === 'hubScreen') {
            const lowerName = (app.myPlayerName || '').toLowerCase();
            const isAdm = ['musero', 'administrador m', 'xarlie', 'japa'].includes(lowerName);
            
            const btnHubStats = document.getElementById('btnHubStats');

            if (isAdm && app.isAuthenticatedUser) {
                if (btnAdminAuth) btnAdminAuth.classList.remove('hidden');
                if (btnHubAnalytics) btnHubAnalytics.classList.remove('hidden');
            } else {
                if (btnAdminAuth) btnAdminAuth.classList.add('hidden');
                if (btnHubAnalytics) btnHubAnalytics.classList.add('hidden');
            }

            if (btnHubStats && (isAdm || (app.musWhitelist && app.musWhitelist.includes(lowerName)))) {
                btnHubStats.classList.remove('hidden');
            }
        }

        // --- LÓGICA DEL WIDGET FLOTANTE (SIEMPRE VISIBLE) ---
        if (widget) {
            widget.classList.remove('hidden');
            const playerName = app.myPlayerName || "Anónimo";
            
            // 1. Pantallas de Menú / Perfil
            const profileScreens = ['hubScreen', 'loginScreen', 'statsSelectionScreen', 'authAdminScreen'];
            
            // 2. Pantallas Globales (Juegos sin sala del servidor)
            const globalScreens = [
                'analyticsScreen', 'musScreen', 'fifaScreen', 'beberScreen', 'beberStatsScreen', 
                'contextoScreen', 'consejoScreen', 'fiestaScreen', 'darkstoriesScreen', 
                'torneosLobby', 'torneosViewScreen', 'giveScreen', 'feedbackScreen', 'tierlistScreen'
            ];
            
            if (profileScreens.includes(id)) {
                // Estado 1: Hub y Perfil
                if (widgetText) {
                    widgetText.innerHTML = `
                        <div style="font-size:0.8em; opacity:0.8; text-transform:uppercase;">Tu Perfil</div>
                        <div style="font-weight:bold; font-size:1.1em; color:var(--accent-green);">👤 ${playerName}</div>
                    `;
                }
            } else if (globalScreens.includes(id) || !app.currentRoom) {
                // Estado 2: Juegos Globales (Solo muestra el nombre)
                if (widgetText) {
                    widgetText.innerHTML = `
                        <div style="font-weight:bold; font-size:1.1em; color:var(--accent-green);">👤 ${playerName}</div>
                    `;
                }
            } else {
                // Estado 3: En una sala de juego
                const roomDisplayNames = {
                    'impostor': 'El Impostor', 'tabu': 'Tabú', 'elmas': 'El MÁS...',
                    'orden': 'Orden', 'anecdotas': 'Anécdotas', 'cifrasyletras': 'Cifras y Letras',
                    'pinturilloImp': 'El Falso Artista', 'torres': 'Torres', 'trivial': 'Trivial'
                };
                
                const roomName = roomDisplayNames[app.currentRoom] || app.currentRoom;
                const roomEmoji = (typeof ROOM_EMOJIS !== 'undefined' && ROOM_EMOJIS[app.currentRoom]) ? ROOM_EMOJIS[app.currentRoom] : "🎮";
                
                if (widgetText) {
                    widgetText.innerHTML = `
                        <div style="font-size:0.8em; opacity:0.8; text-transform:uppercase;">${roomEmoji} ${roomName}</div>
                        <div style="font-weight:bold; font-size:1.1em; color:var(--accent-blue);">${playerName} - ${app.currentRoomId || '-'}</div>
                    `;
                }
            }
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (id === 'statsSelectionScreen') {
            app.updateRestrictedButtons();
        }

        // if (id === 'statsSelectionScreen') {
        //     const musCard = document.getElementById('cardMusStats');
        //     if (musCard) {
        //         const lowerName = (app.myPlayerName || '').toLowerCase();
        //         const isAdm = ['musero', 'administrador m', 'xarlie', 'japa'].includes(lowerName);
        //         if (isAdm || (app.musWhitelist && app.musWhitelist.includes(lowerName))) {
        //             musCard.classList.remove('hidden');
        //         }
        //     }
        // }
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

        // 1. SALAS GLOBALES (No requieren crear sala ni unirse a un lobby)
        const globalRooms = ['feedback', 'mus', 'give', 'contexto', 'consejo', 'fiesta', 'trivial', 'fifa', 'darkstories', 'beber', 'analytics', 'tierlist'];

        if (globalRooms.includes(room)) {
            if(room === 'mus') { app.showScreen('musScreen'); if(app.mus.init) app.mus.init(); return; }
            if(room === 'fifa') { app.showScreen('fifaScreen'); if(app.fifa.init) app.fifa.init(); return; }
            if(room === 'give') { app.showScreen('giveScreen'); return; }
            if(room === 'trivial') { if(app.trivial.init) app.trivial.init(); return; }
            if(room === 'contexto') { app.showScreen('contextoScreen'); if(app.contexto.init) app.contexto.init(); return; }
            if(room === 'feedback') { if(app.feedback.populateCats) app.feedback.populateCats(); return app.showScreen('feedbackScreen'); }
            if(room === 'darkstories') { app.showScreen('darkstoriesScreen'); if(app.darkstories.init) app.darkstories.init(); return; }
            if(room === 'beber') { app.showScreen('beberScreen'); if(app.beber.init) app.beber.init(); return; }
            if(room === 'analytics') { app.showScreen('analyticsScreen'); if(app.analytics.init) app.analytics.init(); return; }
            
            // ---> AQUÍ ESTÁ EL ENRUTAMIENTO DIRECTO A LA TIER LIST
            if(room === 'tierlist') { 
                app.showScreen('tierlistScreen'); 
                if(app.tierlist && app.tierlist.init) app.tierlist.init(); 
                return; 
            }
            
            if (room === 'fiesta') {
                 const name = app.myPlayerName || "Fiestero";
                 const uniqueRoomId = 'FIESTA-MAIN'; 
                 socket.emit('joinRoom', { name, room: 'fiesta', roomId: uniqueRoomId, uuid: window.arcadeUUID }); 
                 return;
            }

            if(room === 'consejo') { 
                const autoName = app.myPlayerName || "Sabio";
                const autoRoomId = 'CONSEJO-' + Math.floor(Math.random() * 10000);
                socket.emit('joinRoom', { name: autoName, room: 'consejo', roomId: autoRoomId, uuid: window.arcadeUUID });
                return; 
            }
        }
        
        // 2. JUEGOS NORMALES (Piden crear o unirse a una sala)
        const savedId = localStorage.getItem(room + '_playerId');
        const savedRoomId = localStorage.getItem(room + '_roomId');
        
        if (savedId && savedRoomId) {
            app.myPlayerId = savedId;
            app.currentRoom = room;
            app.currentRoomId = savedRoomId;
            socket.emit('rejoin', { savedId, savedRoom: room, savedRoomId, uuid: window.arcadeUUID });
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
        app.isAuthenticatedUser = false;
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

        socket.emit('checkAuthRequirement', name, (res) => {
            const finalizeLogin = () => {
                localStorage.setItem('global_username', name);
                app.myPlayerName = name; 
                socket.emit('registerVisit', name);
                app.currentRoom = null;
                app.pendingRoomId = null;
                app.showScreen('hubScreen'); 
            };

            if (res.needsPassword) {
                app.showPasswordModal(name, finalizeLogin);
            } else {
                app.isAuthenticatedUser = false;
                finalizeLogin();
            }
        });
    },

    joinGame: (roomIdOverride = null) => {
        const targetId = roomIdOverride || app.pendingRoomId || null;
        app.pendingRoomId = null; 

        const nameInput = document.getElementById('username');
        let name = "";

        if (nameInput && nameInput.value.trim().length > 0) {
            name = nameInput.value.trim().toLowerCase();
        } else if (app.myPlayerName) {
            name = app.myPlayerName.toLowerCase();
        }

        if (!name) return alert('¡Ponte un nombre!');
        if (name !== 'administrador m' && !/^[a-z0-9]+$/.test(name)) {
            return alert('El nombre solo puede contener letras minúsculas y números (sin espacios).');
        }

        const finalizeJoin = () => {
            localStorage.setItem('global_username', name);
            app.myPlayerName = name; 
            socket.emit('registerVisit', name);
            if (app.currentRoom) {
                socket.emit('joinRoom', { name, room: app.currentRoom, roomId: targetId, uuid: window.arcadeUUID });
            } else {
                app.showScreen('hubScreen');
            }
        };

        if (app.myPlayerName === name && app.isAuthenticatedUser) {
            finalizeJoin();
        } else {
            socket.emit('checkAuthRequirement', name, (res) => {
                if (res.needsPassword) {
                    app.showPasswordModal(name, finalizeJoin);
                } else {
                    app.isAuthenticatedUser = false;
                    finalizeJoin();
                }
            });
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
        if (app.isAuthenticatedUser) {
            if(!confirm("Tienes tu nombre protegido activado. Si lo cambias, tendrás que volver a introducir la contraseña la próxima vez. ¿Continuar?")) return;
        }

        if (app.currentRoom) {
             if (!confirm(`Para cambiar de nombre debes salir de la sala actual. ¿Continuar?`)) return;
             app.goBackToHub(true); 
        }
        if (app.mus && app.mus.resetUI) app.mus.resetUI();
        
        localStorage.removeItem('global_username');
        app.myPlayerName = null;
        app.isAuthenticatedUser = false;
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

socket.on('forceKickIfUnregistered', (kickedName) => {
    if (app.myPlayerName === kickedName && !app.isAuthenticatedUser) {
        alert("⚠️ ATENCIÓN: Alguien acaba de registrar tu nickname oficialmente. Has sido desconectado.");
        app.changeName(); 
    }
});

socket.on('authRequestsList', (data) => {
    const list = document.getElementById('authAdminList');
    if (!list) return;
    
    const requests = data.requests || [];
    const musWhitelist = data.musWhitelist || [];
    
    let reqHtml = `<div class="admin-glass-box">
        <h3 class="admin-gold-title">🆕 Peticiones de Cuenta</h3>`;
    
    if (requests.length === 0) {
        reqHtml += "<p style='color:var(--text-muted); font-size:0.9em; text-align:center;'>No hay solicitudes pendientes.</p>";
    } else {
        requests.forEach(r => {
            const typeEmoji = r.type === 'register' ? '🆕 Registro' : '🔑 Cambio de Clave';
            const color = r.type === 'register' ? '#2ed573' : '#ffa502';
            reqHtml += `
            <div class="admin-glass-item" style="border-left: 4px solid ${color};">
                <div style="font-weight:bold; color:${color}; margin-bottom:5px; -webkit-text-stroke:0;">${typeEmoji}</div>
                <div><span style="color:var(--text-muted); -webkit-text-stroke:0;">Usuario:</span> <b style="font-size:1.1em">${r.username}</b></div>
                <div><span style="color:var(--text-muted); -webkit-text-stroke:0;">Clave:</span> <span style="font-family:monospace; color:var(--accent-red); -webkit-text-stroke:0;">${r.password}</span></div>
                <div><span style="color:var(--text-muted); -webkit-text-stroke:0;">Email:</span> <span style="-webkit-text-stroke:0;">${r.email || '<i>N/A</i>'}</span></div>
                <div style="display:flex; gap:10px; margin-top:15px;">
                    <button onclick="app.auth.resolveRequest('${r.id}', 'reject')" class="main-btn" style="background:var(--accent-red); padding:8px; margin:0;">❌ RECHAZAR</button>
                    <button onclick="app.auth.resolveRequest('${r.id}', 'approve')" class="main-btn" style="background:var(--accent-green); padding:8px; margin:0;">✅ ACEPTAR</button>
                </div>
            </div>`;
        });
    }
    reqHtml += `</div>`;

    let musHtml = `<div class="admin-glass-box">
        <h3 class="admin-gold-title">🐄 Permisos de Mus</h3>
        <div style="display:flex; gap:10px; margin-bottom:15px;">
            <input type="text" id="addMusInput" placeholder="Nombre exacto..." style="flex:1; margin:0; padding:10px; border-radius:var(--btn-radius); background:var(--bg-main); color:var(--text-main); border:1px solid var(--border-input); box-shadow:inset 0 2px 5px rgba(0,0,0,0.1);">
            <button class="main-btn" onclick="const n=document.getElementById('addMusInput').value; if(n) { socket.emit('addMusWhitelist', {admin: app.myPlayerName, name: n}); }" style="width:auto; margin:0; padding:0 20px; background:#e1b12c; color:#222; text-shadow:none;">Añadir</button>
        </div>
        <ul style="list-style:none; padding:0; margin:0; max-height:250px; overflow-y:auto;">`;
    
    musWhitelist.forEach(name => {
        musHtml += `
            <li class="admin-glass-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px 15px; margin-bottom:8px;">
                <b style="font-size:1.1em;">${name}</b>
                <button class="kick-btn" onclick="if(confirm('¿Quitar acceso a ${name}?')) socket.emit('removeMusWhitelist', {admin: app.myPlayerName, name: '${name}'})" style="background:var(--accent-red); padding:6px 12px; width:auto; margin:0; font-size:0.8em; box-shadow:none;">Eliminar</button>
            </li>`;
    });
    
    if (musWhitelist.length === 0) musHtml += "<p style='color:var(--text-muted); text-align:center;'>Lista vacía.</p>";
    
    musHtml += `</ul></div>`;

    list.innerHTML = reqHtml + musHtml;
});

socket.on('hubRoomsUpdate', (rooms) => {
    const hubContainer = document.getElementById('activeRoomsList');
    if (hubContainer) {
        if (rooms.length === 0) {
            hubContainer.innerHTML = "<p style='color:var(--text-muted); font-size:0.8em'>No hay salas activas.</p>";
        } else {
            let html = "<h3>Salas Activas</h3><div class='hub-grid'>";
            rooms.forEach(r => {
                html += `
                <div class="hub-card" style="border-left-color: #00cec9; padding: 10px;" onclick="app.selectActiveRoom('${r.game}', '${r.id}')">
                    <div style="font-weight:bold; color:var(--text-main);">${ROOM_EMOJIS[r.game] || '🎮'} ${r.id}</div>
                    <div style="font-size:0.8em; color:var(--text-muted);">${r.players} Jugadores - ${r.status}</div>
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
            gameContainer.innerHTML = "<p style='color:var(--text-muted); font-style:italic;'>No hay salas creadas. ¡Crea una!</p>";
        } else {
            let html = "";
            myGameRooms.forEach(r => {
                html += `
                <div class="hub-card" style="border-left-color: var(--accent-green); padding: 15px; margin-bottom:10px;" onclick="app.joinGame('${r.id}')">
                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                        <span style="font-weight:bold; font-size:1.2em; color:var(--text-main);">${r.id}</span>
                        <span style="background:var(--admin-row); padding:2px 8px; border-radius:5px; font-size:0.8em; color:var(--text-muted);">${r.status}</span>
                    </div>
                    <div style="font-size:0.9em; color:var(--text-muted); text-align:left; width:100%; margin-top:5px;">👤 ${r.players} Jugadores</div>
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

socket.on('torneos_forceRefresh', () => {
    if (app.currentRoom === 'torneos' || !document.getElementById('torneosLobby').classList.contains('hidden') || !document.getElementById('torneosViewScreen').classList.contains('hidden')) {
        socket.emit('torneos_requestData', app.myPlayerName);
    }
});

app.musWhitelist = [];

socket.on('updateMusWhitelist', (list) => {
    app.musWhitelist = list;
    if (app.updateRestrictedButtons) app.updateRestrictedButtons();
    if (app.currentScreenId === 'hubScreen' || app.currentScreenId === 'statsSelectionScreen') {
        app.showScreen(app.currentScreenId, true); 
    }
});

socket.on('updateHubNews', (news) => {
    app.currentNews = news;
    const widget = document.getElementById('hubNewsWidget');
    const textEl = document.getElementById('hubNewsText');
    const contentEl = document.getElementById('hubNewsContent');
    
    // Solo mostrar el globo de noticias si estamos en la pantalla principal (Hub)
    if (widget && textEl && contentEl && app.currentScreenId === 'hubScreen') {
        textEl.innerText = news.text;
        contentEl.onclick = () => app.selectRoom(news.room);
        
        const dismissedId = localStorage.getItem('arcade_news_dismissed');
        
        if (dismissedId !== news.id) {
            widget.classList.remove('hidden');
        } else {
            widget.classList.add('hidden');
        }
    } else if (widget) {
        widget.classList.add('hidden');
    }
});

socket.on('hideHubNews', () => {
    app.currentNews = null;
    const widget = document.getElementById('hubNewsWidget');
    if (widget) widget.classList.add('hidden');
});

// --- LISTENERS DE LA BASE DE DATOS ADMIN ---
socket.on('db_admin_tables', (tables) => {
    const select = document.getElementById('dbTableSelect');
    if(!select) return;
    select.innerHTML = '<option value="">-- Seleccionar Tabla --</option>' + tables.map(t => `<option value="${t}">${t}</option>`).join('');
});

socket.on('db_admin_result', (res) => {
    const tableEl = document.getElementById('dbResultTable');
    if(!tableEl) return;
    
    if (res.error) {
        tableEl.innerHTML = `<tr><td style="color:#ff4757; padding:15px;">❌ Error: ${res.error}</td></tr>`;
        return;
    }
    if (res.message) {
        tableEl.innerHTML = `<tr><td style="color:#2ed573; padding:15px; font-weight:bold;">✅ ${res.message}</td></tr>`;
        if (res.refresh && res.table) {
            setTimeout(() => {
                document.getElementById('dbTableSelect').value = res.table;
                app.dbAdmin.loadTable();
            }, 1500);
        }
        return;
    }
    
    const rows = res.data;
    if (!rows || rows.length === 0) {
        tableEl.innerHTML = `<tr><td style="color:#aaa; padding:15px; text-align:center;">La tabla está vacía o no hay resultados.</td></tr>`;
        return;
    }
    
    const cols = Object.keys(rows[0]);
    // Intenta buscar una columna clave para el botón borrar. Preferencia: id, id_unitario, name, o la primera.
    let pk = cols.find(c => ['id', 'id_unitario', 'name'].includes(c.toLowerCase())) || cols[0];
    
    let html = `<thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}<th>Acciones</th></tr></thead><tbody>`;
    rows.forEach(r => {
        const pkValue = r[pk] ? r[pk].toString().replace(/'/g, "\\'") : '';
        html += `<tr>${cols.map(c => `<td title="${r[c]}">${r[c] !== null ? r[c] : '<i>NULL</i>'}</td>`).join('')}
        <td><button onclick="app.dbAdmin.deleteRow('${res.table}', '${pk}', '${pkValue}')" style="background:#e74c3c; padding:4px 8px; font-size:0.9em; border:none; border-radius:3px; color:white; cursor:pointer;" title="Borrar Fila">❌</button></td>
        </tr>`;
    });
    html += `</tbody>`;
    tableEl.innerHTML = html;
});

socket.on('db_admin_columns', (res) => {
    if(res.error) return alert(res.error);
    const area = document.getElementById('dbInsertArea');
    const fields = document.getElementById('dbInsertFields');
    document.getElementById('dbInsertTableName').innerText = res.table;
    
    fields.innerHTML = res.columns.map(c => `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <label style="color:#aaa; font-size:0.85em; width:120px; text-align:left; overflow:hidden; text-overflow:ellipsis;">${c}</label>
            <input type="text" class="db-insert-input" data-col="${c}" placeholder="Valor..." style="flex:1; padding:8px; border-radius:3px; border:none; outline:none; background:#fff; color:#000;">
        </div>
    `).join('');
    
    document.getElementById('dbCustomQueryArea').classList.add('hidden');
    area.classList.remove('hidden');
});

socket.on('adminAnnouncementList', (announcements) => {
    const listEl = document.getElementById('announcementsList');
    if (!listEl) return;
    let html = '<div style="max-height:300px; overflow-y:auto; background:#1e272e; padding:10px; border-radius:5px;">';
    if (announcements.length === 0) {
        html += '<p style="color:#aaa; text-align:center;">No hay anuncios.</p>';
    } else {
        announcements.forEach(ann => {
            const isActive = ann.active;
            const isExpired = Date.now() - ann.createdAt > 2 * 24 * 60 * 60 * 1000;
            const status = isExpired ? 'Expirado' : (isActive ? 'Activo' : 'Inactivo');
            const statusColor = isExpired ? '#ff4757' : (isActive ? '#2ed573' : '#ffa502');
            html += `
                <div style="background:#333; padding:10px; margin-bottom:10px; border-radius:5px; border-left:4px solid ${statusColor};">
                    <p style="margin:0 0 5px 0; color:#fff; font-size:0.9em;">${ann.text}</p>
                    <p style="margin:0; color:#aaa; font-size:0.8em;">Sala: ${ann.room} | Estado: <span style="color:${statusColor};">${status}</span></p>
                    <div style="display:flex; gap:5px; margin-top:5px;">
                        <button onclick="app.auth.toggleAnnouncement('${ann.id}')" style="background:${isActive ? '#ffa502' : '#2ed573'}; padding:4px 8px; font-size:0.8em; border:none; border-radius:3px; color:white; cursor:pointer;">${isActive ? 'Desactivar' : 'Activar'}</button>
                        <button onclick="app.auth.deleteAnnouncement('${ann.id}')" style="background:#e74c3c; padding:4px 8px; font-size:0.8em; border:none; border-radius:3px; color:white; cursor:pointer;">Eliminar</button>
                    </div>
                </div>
            `;
        });
    }
    html += '</div>';
    listEl.innerHTML = html;
});

socket.on('adminAnnouncementResult', (res) => {
    if (res.error) {
        alert('Error: ' + res.error);
    } else {
        alert(res.message);
        app.auth.loadAnnouncements();
        app.auth.hideAddAnnouncementForm();
    }
});

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
            
            socket.emit('checkAuthRequirement', correctedName, (res) => {
                if (res.needsPassword) {
                    app.isAuthenticatedUser = true;
                } else {
                    app.isAuthenticatedUser = false;
                }
                if(app.currentScreenId) app.showScreen(app.currentScreenId, true);
            });
            
            socket.emit('registerVisit', correctedName);
        } else {
            localStorage.removeItem('global_username');
            app.myPlayerName = null;
            socket.emit('registerVisit', 'Anónimo'); 
        }
    } else {
        socket.emit('registerVisit', 'Anónimo');
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
    socket.emit('requestMusWhitelist'); 
    socket.emit('requestHubNews'); // Solicitamos la noticia actual al cargar
    
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

