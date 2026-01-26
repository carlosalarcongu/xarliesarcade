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
        const d = document.getElementById('tabuDuration').value; // Nuevo
        const s = document.getElementById('tabuSkips').value;    // Nuevo
        app.tabu.send('start', { rounds: r, duration: d, skips: s });
    },
    
    correct: () => app.tabu.send('correct', {}),
    taboo: () => app.tabu.send('taboo', {}),
    
    // NUEVA FUNCIÓN SALTAR
    skip: () => app.tabu.send('skip', {}),
    
    reset: () => app.tabu.send('reset', {})
};

socket.on('updateTabuState', (data) => {
    const { players, gameInProgress, turnData, settings } = data;
    const me = players.find(p => p.id === app.myPlayerId);
    if(me) app.tabu.iAmAdmin = me.isAdmin;

    // 1. RENDER LOBBY
    if (!gameInProgress) {
        app.showScreen('tabuLobby');
        document.getElementById('tabuGameOverModal').classList.add('hidden');
        
        const blues = players.filter(p => p.team === 'BLUE');
        const reds = players.filter(p => p.team === 'RED');
        const spect = players.filter(p => !p.team);

        const renderList = (arr, id) => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = arr.map(p => `<li>${p.name} ${p.isAdmin?'👑':''}</li>`).join('');
        };

        renderList(blues, 'listBlue');
        renderList(reds, 'listRed');
        renderList(spect, 'listSpectators');

        if (me && me.isAdmin) {
            document.getElementById('tabuAdminPanel').classList.remove('hidden');
            document.getElementById('tabuWaitMsg').classList.add('hidden');
        } else {
            document.getElementById('tabuAdminPanel').classList.add('hidden');
            document.getElementById('tabuWaitMsg').classList.remove('hidden');
        }
    } 
    
    // 2. RENDER JUEGO
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
        
        if (turnData.status === 'PRE_TURN') {
            const teamName = turnData.currentTeam === 'BLUE' ? 'AZUL' : 'ROJO';
            const teamColor = turnData.currentTeam === 'BLUE' ? '#54a0ff' : '#ff6b6b';
            
            // 1. Identificar al que describe
            const describerObj = players.find(p => p.id === turnData.describerId);
            const describerName = describerObj ? describerObj.name : '...';
            
            // 2. Identificar a los que adivinan (resto del equipo)
            const guessers = players.filter(p => p.team === turnData.currentTeam && p.id !== turnData.describerId);
            const guessersNames = guessers.length > 0 ? guessers.map(g => g.name).join(', ') : 'Nadie (Modo Solo)';
            
            // 3. Renderizar Info de Roles (Sin cuenta atrás central)
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
            const guessersNames = guessers.length > 0 ? guessers.map(g => g.name).join(', ') : 'Nadie (Modo Solo)';
            
            const playerInfoHtml = `
                <div style="margin-bottom: 20px; text-shadow: 1px 1px 3px rgba(0,0,0,0.5);">
                    <div style="font-size: 1.2em;">🗣️ Describe: <strong>${describerName}</strong></div>
                    <div style="font-size: 1em; color: #ddd;">🤔 Adivina(n): ${guessersNames}</div>
                </div>`;

            if (isDescriber || !isMyTurnTeam) {
                if (turnData.currentCard) {
                    if(isDescriber) {
                        actionButtons.classList.remove('hidden');
                        
                        // GESTIÓN DEL BOTÓN SALTAR
                        const btnSkip = document.getElementById('btnSkip');
                        if (turnData.skipsRemaining > 0) {
                            btnSkip.classList.remove('hidden');
                            btnSkip.innerHTML = `⏭️ SALTAR (${turnData.skipsRemaining})`;
                        } else {
                            btnSkip.classList.add('hidden'); // Se oculta si no quedan saltos
                        }

                    } else {
                        actionButtons.classList.add('hidden');
                    }

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
    if(type === 'skip') { /* Opcional: sonido de salto, o reusar uno */ }
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
});