app.elmas = {
    iAmAdmin: false,
    myLocalVote: null, 
    lastRoundSeen: 0, // <--- NUEVO: Para detectar cambio de ronda
    
    send: (type, payload) => socket.emit('elmas_action', { type, ...payload }),
    
    start: () => {
        app.elmas.myLocalVote = null; 
        const rounds = document.getElementById('elmasRoundsInput').value;
        app.elmas.send('start', { rounds });
    },
    
    vote: (targetId) => {
        app.elmas.myLocalVote = targetId;

        // Limpieza visual inmediata
        document.querySelectorAll('.vote-btn').forEach(el => el.classList.remove('selected'));

        // Aplicar estilo seleccionado localmente
        const card = document.getElementById('ev_' + targetId);
        if(card) card.classList.add('selected');

        app.elmas.send('vote', { targetId });
    },

    next: () => app.elmas.send('next', {}),
    continue: () => {
        app.elmas.myLocalVote = null;
        app.elmas.send('continue', {});
    },
    reset: () => {
        app.elmas.myLocalVote = null;
        app.elmas.send('reset', {});
    }
};

socket.on('updateElMasList', (data) => {
    const { players, gameInProgress, roundStage, roundInfo } = data;
    
    const me = players.find(p => p.id === app.myPlayerId);
    if (me) app.elmas.iAmAdmin = me.isAdmin;
    if (roundInfo && roundInfo.current !== app.elmas.lastRoundSeen) {
        // Ha cambiado la ronda, limpiamos el voto local de TODOS (admins y usuarios)
        app.elmas.myLocalVote = null;
        app.elmas.lastRoundSeen = roundInfo.current;
        console.log("Nueva ronda detectada. Limpiando voto local.");
    }
    // --- LOBBY ---
    if (!gameInProgress) {
        app.showScreen('elmasLobby');
        
        const list = document.getElementById('elmasList');
        if(list) {
            list.innerHTML = "";
            players.forEach(p => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${p.name} ${p.isAdmin ? '👑' : ''}</span><span>${p.score} pts</span>`;
                if (app.elmas.iAmAdmin && !p.isAdmin) {
                    li.innerHTML += `<button class="kick-btn" style="padding:2px 8px; width:auto; margin:0" onclick="app.elmas.send('kick', { targetId: '${p.id}' })">❌</button>`;
                }
                list.appendChild(li);
            });
        }
        
        // Panel Admin
        if (me && me.isAdmin) {
            document.getElementById('elmasAdminPanel').classList.remove('hidden');
            document.getElementById('elmasWaitMsg').classList.add('hidden');
        } else {
            document.getElementById('elmasAdminPanel').classList.add('hidden');
            document.getElementById('elmasWaitMsg').classList.remove('hidden');
        }
        document.getElementById('elmasPodiumModal').classList.add('hidden');
    }

    // --- JUEGO ---
    else {
        app.showScreen('elmasGame');
        
        if(roundInfo) {
            document.getElementById('elmasQuestionText').innerText = roundInfo.text;
            document.getElementById('elmasRoundCount').innerText = `Ronda ${roundInfo.current} / ${roundInfo.total}`;
        }

        // RENDERIZADO GRID VOTACIÓN
        const grid = document.getElementById('elmasVotingGrid');
        if(grid) {
            grid.innerHTML = "";
            players.forEach(p => {
                const div = document.createElement('div');
                div.className = "vote-btn"; // Usamos la clase unificada del CSS
                div.id = "ev_" + p.id;
                
                // Lógica de Selección (Local + Servidor)
                const isSelectedByServer = (me && me.votedFor === p.id);
                const isSelectedLocally = (app.elmas.myLocalVote === p.id);

                if(isSelectedByServer || isSelectedLocally) {
                    div.classList.add('selected');
                }

                let status = p.voted ? '<span style="color:#2ed573">🗳️</span>' : '';
                let revealInfo = "";
                
                // Mostrar +Votos solo en fase de REVELACIÓN
                if (roundStage === 'REVEAL' && p.votesInThisRound !== null && p.votesInThisRound > 0) {
                    revealInfo = `<div style="color:#ffa502; font-weight:bold; margin-top:5px; font-size:1.2em">+${p.votesInThisRound}</div>`;
                    if (p.votesInThisRound > 1) div.style.borderColor = "#ffa502";
                }

                div.innerHTML = `<div style="font-weight:bold">${p.name}</div>
                                 <div style="font-size:0.8em; color:#aaa">${p.score} pts ${status}</div>
                                 ${revealInfo}`;
                
                // Click solo si estamos votando
                if(roundStage === 'VOTING') div.onclick = () => app.elmas.vote(p.id);
                
                grid.appendChild(div);
            });
        }

        // CONTROL DE BOTONES ADMIN
        const btnNext = document.getElementById('elmasNextBtn');
        const btnContinue = document.getElementById('elmasContinueBtn');
        
        // Primero ocultamos ambos
        btnNext.classList.add('hidden');
        btnContinue.classList.add('hidden');

        // Luego mostramos según fase, SOLO si soy admin
        if (app.elmas.iAmAdmin) {
            if (roundStage === 'VOTING') {
                btnNext.classList.remove('hidden'); // Botón "Ver Votos"
            } else if (roundStage === 'REVEAL') {
                btnContinue.classList.remove('hidden'); // Botón "Siguiente"
            }
        }
    }
});

socket.on('showPodium', (winners) => {
    app.elmas.myLocalVote = null;
    const modal = document.getElementById('elmasPodiumModal');
    modal.classList.remove('hidden');
    
    const set = (i, id) => document.getElementById(id).innerText = winners[i] ? `${winners[i].name} (${winners[i].score})` : "-";
    set(0, 'podium1'); set(1, 'podium2'); set(2, 'podium3');
    
    if(navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
});

socket.on('gameEnded', () => {
    app.elmas.myLocalVote = null;
    app.showScreen('elmasLobby');
    document.getElementById('elmasPodiumModal').classList.add('hidden');
});