app.elmas = {
    iAmAdmin: false,
    
    send: (type, payload) => socket.emit('elmas_action', { type, ...payload }),
    
    start: () => {
        const rounds = document.getElementById('elmasRoundsInput').value;
        app.elmas.send('start', { rounds });
    },
    
    vote: (targetId) => {
        document.querySelectorAll('.elmas-vote-card').forEach(el => el.classList.remove('selected-vote'));
        document.getElementById('ev_' + targetId)?.classList.add('selected-vote');
        app.elmas.send('vote', { targetId });
    },

    next: () => app.elmas.send('next', {}), // Calcular
    continue: () => app.elmas.send('continue', {}), // Pasar a siguiente ronda
    reset: () => app.elmas.send('reset', {})
};

socket.on('updateElMasList', (data) => {
    const { players, gameInProgress, roundStage, roundInfo } = data;
    
    // 1. IDENTIFICAR QUIÉN SOY Y SI SOY ADMIN
    const me = players.find(p => p.id === app.myPlayerId);
    if (me) app.elmas.iAmAdmin = me.isAdmin;

    // --- RENDER LOBBY ---
    if (!gameInProgress) {
        app.showScreen('elmasLobby');
        const list = document.getElementById('elmasList');
        list.innerHTML = "";
        
        players.forEach(p => {
            const li = document.createElement('li');
            
            // Estructura base
            li.innerHTML = `<span>${p.name} ${p.isAdmin ? '👑' : ''}</span><span>${p.score} pts</span>`;
            
            // LOGICA DEL BOTÓN ECHAR (IGUAL QUE IMPOSTOR)
            if (app.elmas.iAmAdmin && !p.isAdmin) {
                li.innerHTML += `<button class="kick-btn" style="margin-left:10px" onclick="app.elmas.send('kick', { targetId: '${p.id}' })">Echar</button>`;
            }

            list.appendChild(li);
        });
        
        // Controles Admin Lobby
        if (me && me.isAdmin) {
            document.getElementById('elmasAdminArea').classList.remove('hidden');
            document.getElementById('elmasWaitMsg').classList.add('hidden');
        } else {
            document.getElementById('elmasAdminArea').classList.add('hidden');
            document.getElementById('elmasWaitMsg').classList.remove('hidden');
        }
        document.getElementById('elmasPodiumModal').classList.add('hidden');
    }

    // --- RENDER JUEGO ---
    else {
        app.showScreen('elmasGame');
        
        if(roundInfo) {
            document.getElementById('elmasQuestionText').innerText = roundInfo.text;
            document.getElementById('elmasRoundCount').innerText = `Ronda ${roundInfo.current} / ${roundInfo.total}`;
        }

        const grid = document.getElementById('elmasGrid');
        grid.innerHTML = "";
        
        players.forEach(p => {
            const div = document.createElement('div');
            div.className = "elmas-vote-card";
            div.id = "ev_" + p.id;
            
            if(me && me.votedFor === p.id) div.classList.add('selected-vote');

            let status = p.voted ? '🗳️' : '';
            let revealInfo = "";
            
            if (roundStage === 'REVEAL' && p.votesInThisRound !== null && p.votesInThisRound > 0) {
                revealInfo = `<div style="color:#ffa502; font-weight:bold; margin-top:5px;">+${p.votesInThisRound} Votos</div>`;
                if (p.votesInThisRound > 1) div.style.borderColor = "#ffa502";
            }

            div.innerHTML = `<div style="font-weight:bold">${p.name}</div>
                             <div style="font-size:0.8em; color:#aaa">${p.score} pts ${status}</div>
                             ${revealInfo}`;
            
            if(roundStage === 'VOTING') div.onclick = () => app.elmas.vote(p.id);
            grid.appendChild(div);
        });

        const btnNext = document.getElementById('elmasNextBtn');
        const btnContinue = document.getElementById('elmasContinueBtn');
        
        btnNext.classList.add('hidden');
        btnContinue.classList.add('hidden');

        if (me && me.isAdmin) {
            if (roundStage === 'VOTING') btnNext.classList.remove('hidden');
            if (roundStage === 'REVEAL') btnContinue.classList.remove('hidden');
        }
    }
});

socket.on('showPodium', (winners) => {
    const modal = document.getElementById('elmasPodiumModal');
    modal.classList.remove('hidden');
    
    // Asignar nombres
    const set = (i, id) => document.getElementById(id).innerText = winners[i] ? `${winners[i].name} (${winners[i].score})` : "-";
    
    set(0, 'podium1');
    set(1, 'podium2');
    set(2, 'podium3');
    
    // Música triunfal
    if(navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
});

socket.on('gameEnded', () => {
    app.showScreen('elmasLobby');
    document.getElementById('elmasPodiumModal').classList.add('hidden');
});