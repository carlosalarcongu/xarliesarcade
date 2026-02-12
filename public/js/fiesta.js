window.app = window.app || {};

app.fiesta = {
    // Wrapper con logs para depurar
    send: (type, payload) => {
        console.log(`📤 Enviando acción fiesta: ${type}`, payload);
        if (typeof socket !== 'undefined') {
            socket.emit('fiesta_action', { type, ...payload });
        } else {
            alert("Error: No hay conexión con el servidor (Socket undefined)");
        }
    },

    // --- ACCIONES (Vinculadas a los onclick) ---
    selectGame: (game) => {
        console.log("🖱️ Click detectado: Seleccionando juego", game);
        app.fiesta.send('changeGame', { game });
    },
    
    oraculoSpin: () => app.fiesta.send('oraculo_spin'),
    rondaSpin: () => app.fiesta.send('ronda_spin'),
    puertaOpen: () => app.fiesta.send('puerta_open'),
    puertaVote: (v) => app.fiesta.send('puerta_vote', { vote: v }),
    acusadoSpin: () => app.fiesta.send('acusado_spin'),
    conexionStart: () => app.fiesta.send('conexion_start'),
    conexionVote: (v) => app.fiesta.send('conexion_vote', { vote: v }),
    cadenaStart: () => app.fiesta.send('cadena_start'),
    cadenaFail: () => app.fiesta.send('cadena_fail'),
    
    // Función visual auxiliar
    hideAllSubScreens: () => {
        const ids = [
            'fiestaMenu', 'fiestaGameORACULO', 'fiestaGameRONDA', 
            'fiestaGamePUERTA', 'fiestaGameACUSADO', 
            'fiestaGameCONEXION', 'fiestaGameCADENA'
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
    }
};

// --- RECEPCIÓN DE DATOS DEL SERVIDOR ---
if (typeof socket !== 'undefined') {
    socket.on('fiestaUpdate', (data) => {
        console.log("📥 Recibido fiestaUpdate:", data);

        // 1. Asegurar que estamos en la pantalla principal
        const mainScreen = document.getElementById('fiestaScreen');
        if (mainScreen && mainScreen.classList.contains('hidden')) {
            app.showScreen('fiestaScreen');
        }

        const { players, currentGame, gameState } = data;

        // 2. Contador
        const countEl = document.getElementById('fiestaCount');
        if (countEl) countEl.innerText = players ? players.length : 0;

        // 3. Resetear vistas
        app.fiesta.hideAllSubScreens();

        // 4. Elegir qué mostrar
        const game = currentGame || 'MENU';
        
        // Mapeo de Juego -> ID del Div
        const map = {
            'MENU': 'fiestaMenu',
            'ORACULO': 'fiestaGameORACULO',
            'RONDA': 'fiestaGameRONDA',
            'PUERTA': 'fiestaGamePUERTA',
            'ACUSADO': 'fiestaGameACUSADO',
            'CONEXION': 'fiestaGameCONEXION',
            'CADENA': 'fiestaGameCADENA'
        };

        const targetId = map[game];
        const targetDiv = document.getElementById(targetId);
        
        if (targetDiv) {
            targetDiv.classList.remove('hidden');
        } else {
            console.error(`❌ No se encuentra el div: ${targetId}`);
            // Fallback al menú si falla
            document.getElementById('fiestaMenu').classList.remove('hidden');
        }

        // 5. Actualizar contenidos dinámicos
        if (game === 'ORACULO') {
            const el = document.getElementById('oraculoText');
            if(el) el.innerHTML = gameState.text || "Invoca al oráculo...";
        }
        
        if (game === 'RONDA') {
            const active = document.getElementById('rondaActive');
            const idle = document.getElementById('rondaIdle');
            if(active && idle) {
                if (gameState.active) {
                    active.classList.remove('hidden'); idle.classList.add('hidden');
                    document.getElementById('rondaTimer').innerText = gameState.timer;
                    document.getElementById('rondaCategory').innerText = gameState.category;
                    document.getElementById('rondaVictim').innerText = gameState.victim;
                } else {
                    active.classList.add('hidden'); idle.classList.remove('hidden');
                }
            }
        }

        if (game === 'PUERTA') {
            const q = document.getElementById('puertaQuestion');
            const v = document.getElementById('puertaVictim');
            if(q) q.innerText = gameState.question || "?";
            if(v) v.innerText = gameState.victim || "?";
            
            const vo = gameState.votes || {fake:0, honest:0, brutal:0};
            document.getElementById('btnVoteFake').innerText = `🤥 Falso (${vo.fake})`;
            document.getElementById('btnVoteHonest').innerText = `🙂 Honesto (${vo.honest})`;
            document.getElementById('btnVoteBrutal').innerText = `🔥 Brutal (${vo.brutal})`;
        }

        if (game === 'ACUSADO') {
            const vic = document.getElementById('acusadoVictim');
            const tsk = document.getElementById('acusadoTask');
            if(vic) vic.innerText = gameState.victim || "?";
            if(tsk) tsk.innerText = gameState.task || "...";
        }

        if (game === 'CONEXION') {
            const g = document.getElementById('conexionGazing');
            const v = document.getElementById('conexionVoting');
            const l = document.getElementById('conexionLobby');
            if(g && v && l) {
                g.classList.add('hidden'); v.classList.add('hidden'); l.classList.add('hidden');
                if (gameState.status === 'GAZING') {
                    g.classList.remove('hidden');
                    document.getElementById('conexionPlayers').innerText = `${gameState.p1} 👁️ ${gameState.p2}`;
                    document.getElementById('conexionTimer').innerText = gameState.timer;
                } else if (gameState.status === 'VOTING') {
                    v.classList.remove('hidden');
                    const votes = gameState.votes || {tension:0, nada:0};
                    document.getElementById('btnVoteTension').innerText = `🔥 SÍ (${votes.tension})`;
                    document.getElementById('btnVoteNada').innerText = `❄️ NO (${votes.nada})`;
                } else {
                    l.classList.remove('hidden');
                }
            }
        }

        if (game === 'CADENA') {
            const p = document.getElementById('cadenaPlaying');
            const f = document.getElementById('cadenaFailed');
            const s = document.getElementById('cadenaStart');
            if(p && f && s) {
                p.classList.add('hidden'); f.classList.add('hidden'); s.classList.add('hidden');
                if (gameState.status === 'PLAYING') {
                    p.classList.remove('hidden');
                    document.getElementById('cadenaWord').innerText = gameState.word;
                } else if (gameState.status === 'FAILED') {
                    f.classList.remove('hidden');
                } else {
                    s.classList.remove('hidden');
                }
            }
        }
    });

    socket.on('fiestaTimer', (val) => {
        const r = document.getElementById('rondaTimer');
        if(r) r.innerText = val;
        const c = document.getElementById('conexionTimer');
        if(c) c.innerText = val;
    });
}