app.anecdotas = {
    iAmAdmin: false,
    hasSaved: false,
    myLocalVote: null, // <--- 1. VARIABLE PARA RECORDAR TU VOTO LOCALMENTE
    
    send: (type, payload) => socket.emit('anecdotas_action', { type, ...payload }),
    
    save: () => {
        const text = document.getElementById('anecdotaInput').value;
        if (!text.trim()) return alert("¡Escribe algo!");
        app.anecdotas.send('saveAnecdote', { text });
        document.getElementById('saveAnecdotaBtn').innerText = "🔄 Modificar Anécdota";
        document.getElementById('saveAnecdotaBtn').style.background = "#57606f";
    },

    start: () => {
        app.anecdotas.myLocalVote = null; // Limpiar al empezar
        app.anecdotas.send('start', {});
    },
    
    vote: (targetId) => {
        console.log("Clic en: " + targetId); 
        
        // 2. GUARDAMOS EL VOTO EN LOCAL PARA QUE NO SE BORRE AL REPINTAR
        app.anecdotas.myLocalVote = targetId;

        // Efecto visual inmediato (Optimista)
        document.querySelectorAll('.vote-card').forEach(el => {
            el.classList.remove('selected-vote');
            el.style.border = ""; 
            el.style.backgroundColor = ""; 
            el.style.transform = "";
        });

        const card = document.getElementById('vote_' + targetId);
        if(card) {
            card.classList.add('selected-vote');
            // Estilos directos por si el CSS falla
            card.style.border = "4px solid #2ed573"; 
            card.style.backgroundColor = "rgba(46, 213, 115, 0.3)";
            card.style.transform = "scale(1.05)";
        }

        app.anecdotas.send('vote', { targetId });
    },

    next: () => {
        app.anecdotas.myLocalVote = null; // Limpiar para la siguiente ronda
        app.anecdotas.send('next', {});
    },
    
    reset: () => {
        app.anecdotas.myLocalVote = null;
        app.anecdotas.send('reset', {});
    }
};

// LISTENERS

socket.on('updateAnecdotasList', (data) => {
    const { players, gameInProgress, roundStage, roundInfo } = data;
    
    const me = players.find(p => p.id === app.myPlayerId);
    if (me) app.anecdotas.iAmAdmin = me.isAdmin;

    // ACTUALIZAR BOTONES ADMIN
    if (me) {
        const startBtn = document.getElementById('anecdotasStartBtn');
        const waitMsg = document.getElementById('anecdotasWaitMsg');
        if (me.isAdmin) {
            startBtn?.classList.remove('hidden');
            waitMsg?.classList.add('hidden');
        } else {
            startBtn?.classList.add('hidden');
            waitMsg?.classList.remove('hidden');
        }
        
        const nextBtn = document.getElementById('nextRoundBtn');
        if (me.isAdmin && gameInProgress && roundStage === 'VOTING') nextBtn?.classList.remove('hidden');
        else nextBtn?.classList.add('hidden');
    }

    // RENDERIZAR LOBBY
    if (!gameInProgress) {
        app.showScreen('anecdotasLobby');
        const list = document.getElementById('anecdotasList');
        list.innerHTML = "";
        
        players.forEach(p => {
            const li = document.createElement('li');
            const check = p.hasAnecdote ? '✅' : '⏳';
            li.innerHTML = `<span>${p.name} ${p.isAdmin ? '👑' : ''}</span> <span>${p.score} pts ${check}</span>`;
            
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
    
    // RENDERIZAR JUEGO
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
            
            // --- 3. AQUÍ ESTÁ EL ARREGLO ---
            // Comprobamos si el servidor dice que lo votaste (me.votedFor)
            // O SI TU VARIABLE LOCAL DICE QUE LO ACABAS DE VOTAR (app.anecdotas.myLocalVote)
            const isSelectedByServer = (me && me.votedFor === p.id);
            const isSelectedLocally = (app.anecdotas.myLocalVote === p.id);

            if(isSelectedByServer || isSelectedLocally) {
                div.classList.add('selected-vote');
                // Estilos forzados para asegurar que se ve verde
                div.style.border = "4px solid #2ed573"; 
                div.style.backgroundColor = "rgba(46, 213, 115, 0.3)";
                div.style.transform = "scale(1.05)";
            }
            // ---------------------------------
            
            const votedStatus = p.voted ? '<span style="font-size:0.8em">🗳️</span>' : '';
            div.innerHTML = `<div style="font-weight:bold">${p.name}</div><div style="font-size:0.8em; color:#aaa">${p.score} pts ${votedStatus}</div>`;
            
            div.onclick = () => app.anecdotas.vote(p.id);
            voteGrid.appendChild(div);
        });
    }
});

socket.on('roundReveal', (data) => {
    app.anecdotas.myLocalVote = null; // Limpiar voto al revelar
    const modal = document.getElementById('anecdotasRevealModal');
    modal.classList.remove('hidden');
    document.getElementById('revealAuthor').innerText = data.authorName;
    const votersDiv = document.getElementById('revealVoters');
    if (data.correctVotersNames.length === 0) votersDiv.innerText = "Nadie acertó 🤡";
    else votersDiv.innerText = "Acertaron: " + data.correctVotersNames.join(", ");
    document.getElementById('revealSound').play().catch(()=>{});
    if(navigator.vibrate) navigator.vibrate(200);
});

socket.on('gameEnded', () => {
    app.anecdotas.myLocalVote = null;
    app.showScreen('anecdotasLobby');
    document.getElementById('anecdotasRevealModal').classList.add('hidden');
    document.getElementById('anecdotasPodiumModal').classList.add('hidden');
    document.getElementById('anecdotaInput').value = "";
    document.getElementById('saveAnecdotaBtn').innerText = "💾 Salvar Anécdota";
    document.getElementById('saveAnecdotaBtn').style.background = "#ff4757";
});

socket.on('forceReset', () => {
    app.anecdotas.myLocalVote = null;
    app.showScreen('anecdotasLobby');
    document.getElementById('anecdotaInput').value = "";
    document.getElementById('saveAnecdotaBtn').innerText = "💾 Salvar Anécdota";
    document.getElementById('saveAnecdotaBtn').style.background = "#ff4757";
});

socket.on('showPodium', (winners) => {
    document.getElementById('anecdotasRevealModal').classList.add('hidden');
    const modal = document.getElementById('anecdotasPodiumModal');
    modal.classList.remove('hidden');
    const set = (i, id) => document.getElementById(id).innerText = winners[i] ? `${winners[i].name} (${winners[i].score})` : "-";
    set(0, 'anecPodium1'); set(1, 'anecPodium2'); set(2, 'anecPodium3');
    if(navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
});

socket.on('errorMsg', (msg) => alert(msg));