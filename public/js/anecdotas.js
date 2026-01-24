app.anecdotas = {
    iAmAdmin: false,
    hasSaved: false,
    
    send: (type, payload) => socket.emit('anecdotas_action', { type, ...payload }),
    
    save: () => {
        const text = document.getElementById('anecdotaInput').value;
        if (!text.trim()) return alert("¡Escribe algo!");
        app.anecdotas.send('saveAnecdote', { text });
        // Cambio visual optimista
        document.getElementById('saveAnecdotaBtn').innerText = "🔄 Modificar Anécdota";
        document.getElementById('saveAnecdotaBtn').style.background = "#57606f";
    },

    start: () => app.anecdotas.send('start', {}),
    
    vote: (targetId) => {
        // Efecto visual de selección
        document.querySelectorAll('.vote-card').forEach(el => el.classList.remove('selected-vote'));
        document.getElementById('vote_' + targetId)?.classList.add('selected-vote');
        app.anecdotas.send('vote', { targetId });
    },

    next: () => app.anecdotas.send('next', {}),
    reset: () => app.anecdotas.send('reset', {})
};

// LISTENERS

socket.on('updateAnecdotasList', (data) => {
    const { players, gameInProgress, roundStage, roundInfo } = data;
    
    // 1. IDENTIFICAR QUIÉN SOY Y SI SOY ADMIN
    const me = players.find(p => p.id === app.myPlayerId);
    if (me) app.anecdotas.iAmAdmin = me.isAdmin;

    // ACTUALIZAR INTERFAZ ADMIN (BOTONES GLOBALES)
    if (me) {
        const startBtn = document.getElementById('anecdotasStartBtn');
        const waitMsg = document.getElementById('anecdotasWaitMsg');
        if (me.isAdmin) {
            startBtn.classList.remove('hidden');
            waitMsg.classList.add('hidden');
        } else {
            startBtn.classList.add('hidden');
            waitMsg.classList.remove('hidden');
        }
        
        const nextBtn = document.getElementById('nextRoundBtn');
        if (me.isAdmin && gameInProgress && roundStage === 'VOTING') nextBtn.classList.remove('hidden');
        else nextBtn.classList.add('hidden');
    }

    // 2. RENDERIZAR LISTA LOBBY (AQUÍ ESTABA EL FALLO DEL BOTÓN)
    if (!gameInProgress) {
        app.showScreen('anecdotasLobby');
        const list = document.getElementById('anecdotasList');
        list.innerHTML = "";
        
        players.forEach(p => {
            const li = document.createElement('li');
            const check = p.hasAnecdote ? '✅' : '⏳';
            
            // Estructura base
            li.innerHTML = `<span>${p.name} ${p.isAdmin ? '👑' : ''}</span> <span>${p.score} pts ${check}</span>`;
            
            // LOGICA DEL BOTÓN ECHAR (IGUAL QUE IMPOSTOR)
            if (app.anecdotas.iAmAdmin && !p.isAdmin) { 
                li.innerHTML += `<button class="kick-btn" style="margin-left:10px" onclick="app.anecdotas.send('kick', { targetId: '${p.id}' })">Echar</button>`;
            }
            
            list.appendChild(li);
        });
        
        if(me && me.hasAnecdote) {
            const btn = document.getElementById('saveAnecdotaBtn');
            btn.innerText = "🔄 Modificar Anécdota";
            btn.style.background = "#57606f";
        }
    } 
    
    // 3. RENDERIZAR JUEGO
    else if (gameInProgress && roundStage === 'VOTING') {
        app.showScreen('anecdotasGame');
        document.getElementById('anecdotasRevealModal').classList.add('hidden');
        
        if(roundInfo) {
            document.getElementById('currentAnecdotaText').innerText = `"${roundInfo.text}"`;
            document.getElementById('roundCounter').innerText = `Anécdota ${roundInfo.current} / ${roundInfo.total}`;
        }

        const voteGrid = document.getElementById('votingGrid');
        voteGrid.innerHTML = "";
        players.forEach(p => {
            const div = document.createElement('div');
            div.className = "vote-card";
            div.id = "vote_" + p.id;
            if(me && me.votedFor === p.id) div.classList.add('selected-vote');
            
            const votedStatus = p.voted ? '<span style="font-size:0.8em">🗳️</span>' : '';
            div.innerHTML = `<div style="font-weight:bold">${p.name}</div><div style="font-size:0.8em; color:#aaa">${p.score} pts ${votedStatus}</div>`;
            div.onclick = () => app.anecdotas.vote(p.id);
            voteGrid.appendChild(div);
        });
    }
});


socket.on('roundReveal', (data) => {
    // Mostrar Modal
    const modal = document.getElementById('anecdotasRevealModal');
    modal.classList.remove('hidden');
    
    document.getElementById('revealAuthor').innerText = data.authorName;
    
    const votersDiv = document.getElementById('revealVoters');
    if (data.correctVotersNames.length === 0) votersDiv.innerText = "Nadie acertó 🤡";
    else votersDiv.innerText = "Acertaron: " + data.correctVotersNames.join(", ");
    
    // Sonido
    document.getElementById('revealSound').play().catch(()=>{});
    if(navigator.vibrate) navigator.vibrate(200);
});

socket.on('gameEnded', () => {
    alert("¡Fin de las anécdotas! Volviendo al lobby...");
    app.showScreen('anecdotasLobby');
    document.getElementById('anecdotasRevealModal').classList.add('hidden');
    // Limpiar input
    document.getElementById('anecdotaInput').value = "";
    document.getElementById('saveAnecdotaBtn').innerText = "💾 Salvar Anécdota";
    document.getElementById('saveAnecdotaBtn').style.background = "#ff4757";
});

socket.on('forceReset', () => {
    app.showScreen('anecdotasLobby');
    document.getElementById('anecdotaInput').value = "";
    document.getElementById('saveAnecdotaBtn').innerText = "💾 Salvar Anécdota";
    document.getElementById('saveAnecdotaBtn').style.background = "#ff4757";
});

socket.on('errorMsg', (msg) => alert(msg));