app.tabu = {
    team: null,
    
    send: (type, payload) => socket.emit('tabu_action', { type, ...payload }),
    
    joinTeam: (teamColor) => {
        app.tabu.send('joinTeam', { team: teamColor });
        // Feedback visual inmediato
        document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('selected'));
        document.getElementById('btnTeam' + teamColor).classList.add('selected');
    },

    start: () => {
        const r = document.getElementById('tabuRounds').value;
        app.tabu.send('start', { rounds: r });
    },
    
    correct: () => app.tabu.send('correct', {}),
    taboo: () => app.tabu.send('taboo', {}),
    reset: () => app.tabu.send('reset', {})
};

socket.on('updateTabuState', (data) => {
    const { players, gameInProgress, turnData, settings } = data;
    const me = players.find(p => p.id === app.myPlayerId);

    // 1. RENDER LOBBY / SELECCIÓN EQUIPOS
    if (!gameInProgress) {
        app.showScreen('tabuLobby');
        document.getElementById('tabuGameOverModal').classList.add('hidden');
        
        // Listas de equipos
        const blues = players.filter(p => p.team === 'BLUE');
        const reds = players.filter(p => p.team === 'RED');
        const spect = players.filter(p => !p.team);

        const renderList = (arr, id) => {
            const el = document.getElementById(id);
            el.innerHTML = arr.map(p => `<li>${p.name} ${p.isAdmin?'👑':''}</li>`).join('');
        };

        renderList(blues, 'listBlue');
        renderList(reds, 'listRed');
        renderList(spect, 'listSpectators');

        // Admin controls
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
        
        // Marcador superior
        document.getElementById('scoreBlue').innerText = turnData.score.BLUE;
        document.getElementById('scoreRed').innerText = turnData.score.RED;
        document.getElementById('roundDisp').innerText = `Ronda ${turnData.roundNumber} / ${settings.totalRounds}`;
        document.getElementById('timerDisp').innerText = turnData.timer;

        // Color de fondo según turno
        const gameContainer = document.getElementById('tabuGame');
        gameContainer.className = turnData.currentTeam === 'BLUE' ? 'bg-blue-turn' : 'bg-red-turn';

        // LÓGICA DE VISTAS (¿Qué veo yo?)
        const cardArea = document.getElementById('tabuCardArea');
        const actionButtons = document.getElementById('tabuActionButtons');
        
        // Estado: PREPARACIÓN (Cuenta atrás 5s)
        if (turnData.status === 'PRE_TURN') {
            const teamName = turnData.currentTeam === 'BLUE' ? 'AZUL' : 'ROJO';
            const describerName = players.find(p => p.id === turnData.describerId)?.name || '...';
            
            cardArea.innerHTML = `
                <div style="font-size:2em; margin-top:50px;">
                    TURNO EQUIPO ${teamName}<br>
                    <span style="color:#fff; font-weight:bold">${describerName}</span> explica.
                    <br><br>
                    <span style="font-size:3em; color:#ffeaa7">${turnData.timer}</span>
                </div>`;
            actionButtons.classList.add('hidden');
        }
        
// Estado: JUGANDO
        else if (turnData.status === 'PLAYING') {
            const isMyTurnTeam = (me.team === turnData.currentTeam);
            const isDescriber = (me.id === turnData.describerId);

            // --- NUEVO: Obtener nombres de jugadores ---
            const describer = players.find(p => p.id === turnData.describerId);
            const guessers = players.filter(p => p.team === turnData.currentTeam && p.id !== turnData.describerId);
            const describerName = describer ? describer.name : '...';
            const guessersNames = guessers.map(g => g.name).join(', ');
            
            // HTML para la info de jugadores (se mostrará encima de la carta)
            const playerInfoHtml = `
                <div style="margin-bottom: 20px; text-shadow: 1px 1px 3px rgba(0,0,0,0.5);">
                    <div style="font-size: 1.2em;">
                        🗣️ Describe: <strong>${describerName}</strong>
                    </div>
                    <div style="font-size: 1em; color: #ddd;">
                        🤔 Adivina(n): ${guessersNames || 'Nadie'}
                    </div>
                </div>
            `;
            // -------------------------------------------

            // A) SOY EL QUE EXPLICA -> Veo carta y controles
            // B) SOY DEL EQUIPO RIVAL -> Veo carta y botón TABÚ (para chivarme)
            // C) SOY DE MI EQUIPO (ADIVINADOR) -> NO veo carta, solo "ADIVINA"
            
            if (isDescriber || !isMyTurnTeam) {
                // VEO CARTA
                if (turnData.currentCard) {
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
                actionButtons.classList.remove('hidden');
            } else {
                // SOY COMPAÑERO -> ADIVINA
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

// Optimización: Solo actualizar número del timer
socket.on('timerTick', (val) => {
    const el = document.getElementById('timerDisp');
    if(el) {
        el.innerText = val;
        if(val <= 10) el.style.color = "#ff4757"; // Rojo al final
        else el.style.color = "#fff";
    }
});

socket.on('playSound', (type) => {
    if(type === 'correct') document.getElementById('revealSound').play().catch(()=>{}); // Reusamos sonidos
    if(type === 'wrong') document.getElementById('dieSound').play().catch(()=>{});
    if(type === 'timeout') document.getElementById('dieSound').play().catch(()=>{});
});

socket.on('gameOver', (data) => {
    const modal = document.getElementById('tabuGameOverModal');
    modal.classList.remove('hidden');
    
    document.getElementById('winnerText').innerText = data.winner === 'DRAW' ? '¡EMPATE!' : `¡EQUIPO ${data.winner === 'BLUE'?'AZUL':'ROJO'} GANA!`;
    document.getElementById('finalScoreText').innerText = `${data.finalScores.BLUE} - ${data.finalScores.RED}`;
    
    const list = document.getElementById('mvpList');
    list.innerHTML = data.mvp.map(p => `<li>${p.name} <span style="float:right">${p.individualScore} pts</span></li>`).join('');
});