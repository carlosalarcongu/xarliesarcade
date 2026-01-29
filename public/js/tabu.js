app.tabu = {
    team: null,
    iAmAdmin: false, 
    
    send: (type, payload) => socket.emit('tabu_action', { type, ...payload }),
    
    joinTeam: (teamColor) => {
        app.tabu.send('joinTeam', { team: teamColor });
        document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('selected'));
        const btn = document.getElementById('btnTeam' + teamColor);
        if(btn) btn.classList.add('selected');
    },

    start: () => {
        const r = document.getElementById('tabuRounds').value;
        const d = document.getElementById('tabuDuration').value;
        const s = document.getElementById('tabuSkips').value;
        const p = document.getElementById('tabuPause').checked; // Checkbox Pausa
        app.tabu.send('start', { rounds: r, duration: d, skips: s, pauseOn: p });
    },
    
    resume: () => {
        // Misma función start, el backend sabe que es reanudar si está en pausa
        app.tabu.send('start', {}); 
    },

    randomize: () => {
        if(confirm("¿Mezclar equipos aleatoriamente?")) {
            app.tabu.send('randomizeTeams', {});
        }
    },

    kick: (id) => {
        if(confirm("¿Echar jugador?")) {
            app.tabu.send('kick', { targetId: id });
        }
    },
    
    correct: () => app.tabu.send('correct', {}),
    taboo: () => app.tabu.send('taboo', {}),
    skip: () => app.tabu.send('skip', {}),
    reset: () => app.tabu.send('reset', {})
};

socket.on('updateTabuState', (data) => {
    const { players, gameInProgress, turnData, settings, isPaused } = data;
    const me = players.find(p => p.id === app.myPlayerId);
    if(me) app.tabu.iAmAdmin = me.isAdmin;

    // ACTUALIZAR LOBBY
    if (!gameInProgress) {
        app.showScreen('tabuLobby');
        document.getElementById('tabuGameOverModal').classList.add('hidden');
        
        const blues = players.filter(p => p.team === 'BLUE');
        const reds = players.filter(p => p.team === 'RED');
        const spect = players.filter(p => !p.team);

        const renderList = (arr, id) => {
            const el = document.getElementById(id);
            if(el) {
                el.innerHTML = arr.map(p => {
                    // Botón kick solo si soy admin y no es él mismo
                    const kickBtn = (app.tabu.iAmAdmin && p.id !== me.id) 
                        ? `<button onclick="app.tabu.kick('${p.id}')" style="background:none; border:none; color:red; cursor:pointer;">❌</button>` 
                        : '';
                    return `<li><span>${p.name} ${p.isAdmin?'👑':''}</span> ${kickBtn}</li>`;
                }).join('');
            }
        };

        renderList(blues, 'listBlue');
        renderList(reds, 'listRed');
        renderList(spect, 'listSpectators');

        // Panel Admin vs Info Usuario
        const adminPanel = document.getElementById('tabuAdminPanel');
        const waitMsg = document.getElementById('tabuWaitMsg');
        
        // Sincronizar visualmente la configuración para todos (read-only si no admin)
        document.getElementById('tabuRounds').value = settings.totalRounds || 3;
        document.getElementById('tabuDuration').value = settings.turnDuration || 60;
        document.getElementById('tabuSkips').value = settings.skipsPerTurn || 3;
        document.getElementById('tabuPause').checked = settings.pauseBetweenRounds || false;

        if (me && me.isAdmin) {
            adminPanel.classList.remove('hidden');
            waitMsg.classList.add('hidden');
            
            // Habilitar inputs
            adminPanel.querySelectorAll('input').forEach(i => i.disabled = false);
            // Mostrar botones de acción
            document.getElementById('btnRandomTeams').classList.remove('hidden');
            document.getElementById('btnStartTabu').classList.remove('hidden');

        } else {
            // Mostrar panel pero deshabilitado para que vean configuración
            adminPanel.classList.remove('hidden');
            waitMsg.classList.remove('hidden'); // "Esperando al admin"
            
            // Deshabilitar inputs
            adminPanel.querySelectorAll('input').forEach(i => i.disabled = true);
            // Ocultar botones de acción
            document.getElementById('btnRandomTeams').classList.add('hidden');
            document.getElementById('btnStartTabu').classList.add('hidden');
        }
    } 
    
    // RENDER JUEGO
    else {
        app.showScreen('tabuGame');
        
        document.getElementById('scoreBlue').innerText = turnData.score.BLUE;
        document.getElementById('scoreRed').innerText = turnData.score.RED;
        document.getElementById('roundDisp').innerText = `Ronda ${turnData.roundNumber} / ${settings.totalRounds}`;
        document.getElementById('timerDisp').innerText = turnData.timer;

        const gameContainer = document.getElementById('tabuGame');
        gameContainer.className = turnData.currentTeam === 'BLUE' ? 'bg-blue-turn' : 'bg-red-turn';

        const cardArea = document.getElementById('tabuCardArea');
        const actionButtons = document.getElementById('tabuActionButtons');
        
        // ESTADO PAUSA (NUEVO)
        if (isPaused) {
            cardArea.innerHTML = `
                <div style="margin-top:50px; text-align:center;">
                    <h1>⏸️ PAUSA</h1>
                    <p>Esperando al administrador...</p>
                    ${app.tabu.iAmAdmin ? `<button onclick="app.tabu.resume()" class="main-btn" style="background:#2ed573; margin-top:20px;">▶️ REANUDAR</button>` : ''}
                </div>`;
            actionButtons.classList.add('hidden');
            return;
        }

        if (turnData.status === 'PRE_TURN') {
            const teamName = turnData.currentTeam === 'BLUE' ? 'AZUL' : 'ROJO';
            const teamColor = turnData.currentTeam === 'BLUE' ? '#54a0ff' : '#ff6b6b';
            
            const describerObj = players.find(p => p.id === turnData.describerId);
            const describerName = describerObj ? describerObj.name : '...';
            
            const guessers = players.filter(p => p.team === turnData.currentTeam && p.id !== turnData.describerId);
            const guessersNames = guessers.length > 0 ? guessers.map(g => g.name).join(', ') : 'Nadie';
            
            cardArea.innerHTML = `
                <div style="margin-top:40px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                    <h2 style="margin:0; font-size:2em; color:white;">TURNO EQUIPO <span style="color:${teamColor}">${teamName}</span></h2>
                    <hr style="border-color:#555; margin: 20px auto; width: 50%;">
                    
                    <div style="margin-bottom: 20px;">
                        <span style="display:block; font-size:0.9em; color:#aaa; margin-bottom:5px;">🗣️ EL QUE DEFINE</span>
                        <span style="font-size:1.6em; font-weight:bold; color:#fff;">${describerName}</span>
                    </div>
                    
                    <div>
                        <span style="display:block; font-size:0.9em; color:#aaa; margin-bottom:5px;">🤔 EL QUE ADIVINA</span>
                        <span style="font-size:1.3em; color:#ddd;">${guessersNames}</span>
                    </div>

                    <div style="margin-top: 30px; color: ${teamColor}; font-style: italic; font-size: 0.9em;">
                        ¡Preparaos!
                    </div>
                </div>`;
            
            actionButtons.classList.add('hidden');
        }
        
        else if (turnData.status === 'PLAYING') {
            const isMyTurnTeam = (me.team === turnData.currentTeam);
            const isDescriber = (me.id === turnData.describerId);

            const describerObj = players.find(p => p.id === turnData.describerId);
            const describerName = describerObj ? describerObj.name : '...';
            
            const guessers = players.filter(p => p.team === turnData.currentTeam && p.id !== turnData.describerId);
            const guessersNames = guessers.length > 0 ? guessers.map(g => g.name).join(', ') : 'Nadie';
            
            const playerInfoHtml = `
                <div style="margin-bottom: 20px; text-shadow: 1px 1px 3px rgba(0,0,0,0.5);">
                    <div style="font-size: 1.2em;">🗣️ Describe: <strong>${describerName}</strong></div>
                    <div style="font-size: 1em; color: #ddd;">🤔 Adivina(n): ${guessersNames}</div>
                </div>`;

            if (isDescriber || !isMyTurnTeam) { // Describe o es equipo rival (vigila)
                if (turnData.currentCard) {
                    if(isDescriber) {
                        actionButtons.classList.remove('hidden');
                        
                        const btnSkip = document.getElementById('btnSkip');
                        if (turnData.skipsRemaining > 0) {
                            btnSkip.classList.remove('hidden');
                            btnSkip.innerHTML = `⏭️ SALTAR (${turnData.skipsRemaining})`;
                        } else {
                            btnSkip.classList.add('hidden'); 
                        }

                    } else {
                        actionButtons.classList.add('hidden');
                    }

                    // TARJETA DE PALABRAS
                    cardArea.innerHTML = playerInfoHtml + `
                        <div class="tabu-card">
                            <div class="tabu-word">${turnData.currentCard.word}</div>
                            <hr style="border-color:#555">
                            <div class="forbidden-list">
                                ${turnData.currentCard.forbidden.map(w => `<div>🚫 ${w}</div>`).join('')}
                            </div>
                        </div>
                    `;
                }
            } else {
                // Es equipo adivinador (no ve tarjeta)
                cardArea.innerHTML = playerInfoHtml + `
                    <div style="margin-top:30px; animation: pulse 1s infinite;">
                        <div style="font-size:4em;">❓</div>
                        <h1>¡ADIVINA!</h1>
                        <p style="font-size:1.2em">Escucha a <strong>${describerName}</strong></p>
                    </div>
                `;
                actionButtons.classList.add('hidden');
            }
        }
    }
});

socket.on('tabu_error', (msg) => { alert(msg); });

socket.on('timerTick', (val) => {
    const el = document.getElementById('timerDisp');
    if(el) {
        el.innerText = val;
        el.style.color = (val <= 10) ? "#ff4757" : "#fff";
    }
});

socket.on('playSound', (type) => {
    if(type === 'correct') document.getElementById('revealSound').play().catch(()=>{}); 
    if(type === 'wrong') document.getElementById('dieSound').play().catch(()=>{});
    if(type === 'timeout') document.getElementById('dieSound').play().catch(()=>{});
});

socket.on('gameOver', (data) => {
    const modal = document.getElementById('tabuGameOverModal');
    modal.classList.remove('hidden');
    
    const btnReset = document.getElementById('tabuAdminResetBtn');
    if(app.tabu.iAmAdmin) btnReset.classList.remove('hidden');
    else btnReset.classList.add('hidden');

    document.getElementById('winnerText').innerText = data.winner === 'DRAW' ? '¡EMPATE!' : `¡EQUIPO ${data.winner === 'BLUE'?'AZUL':'ROJO'} GANA!`;
    document.getElementById('finalScoreText').innerText = `${data.finalScores.BLUE} - ${data.finalScores.RED}`;
    
    const list = document.getElementById('mvpList');
    list.innerHTML = data.mvp.map(p => `<li>${p.name} <span style="float:right">${p.individualScore} pts</span></li>`).join('');

    // AUTO-CIERRE EN 10 SEGUNDOS (Feature pedida)
    setTimeout(() => {
        if (!modal.classList.contains('hidden')) {
            // Solo si el admin no ha reseteado ya
             app.tabu.reset(); // Esto lanzará reset para todos
        }
    }, 10000);
});