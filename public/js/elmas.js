app.elmas = {
    iAmAdmin: false,
    myLocalVote: null, // <--- 1. MEMORIA LOCAL DEL VOTO
    
    send: (type, payload) => socket.emit('elmas_action', { type, ...payload }),
    
    start: () => {
        app.elmas.myLocalVote = null; // Reset al empezar
        const rounds = document.getElementById('elmasRoundsInput').value;
        app.elmas.send('start', { rounds });
    },
    
    vote: (targetId) => {
        console.log("Votando a: " + targetId);
        
        // 2. GUARDAMOS VOTO EN MEMORIA
        app.elmas.myLocalVote = targetId;

        // 3. LIMPIEZA VISUAL (Reseteamos estilos manuales)
        document.querySelectorAll('.elmas-vote-card').forEach(el => {
            el.classList.remove('selected-vote');
            el.style.border = "";
            el.style.backgroundColor = "";
            el.style.transform = "";
        });

        // 4. APLICAMOS ESTILO (FUERZA BRUTA)
        const card = document.getElementById('ev_' + targetId);
        if(card) {
            card.classList.add('selected-vote');
            // Inyectamos estilo directo para ignorar fallos de CSS
            card.style.border = "4px solid #2ed573";
            card.style.backgroundColor = "rgba(46, 213, 115, 0.3)";
            card.style.transform = "scale(1.05)";
        } else {
            console.error("No encuentro la tarjeta: ev_" + targetId);
        }

        // 5. Enviar al servidor
        app.elmas.send('vote', { targetId });
    },

    next: () => {
        app.elmas.myLocalVote = null; // Limpiar para siguiente calculo
        app.elmas.send('next', {}); 
    },
    continue: () => {
        app.elmas.myLocalVote = null; // Limpiar para siguiente ronda
        app.elmas.send('continue', {});
    },
    reset: () => {
        app.elmas.myLocalVote = null;
        app.elmas.send('reset', {});
    }
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
            li.innerHTML = `<span>${p.name} ${p.isAdmin ? '👑' : ''}</span><span>${p.score} pts</span>`;
            
            // LOGICA DEL BOTÓN ECHAR
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
            
            // --- AQUÍ ESTÁ EL ARREGLO (Doble comprobación) ---
            const isSelectedByServer = (me && me.votedFor === p.id);
            const isSelectedLocally = (app.elmas.myLocalVote === p.id);

            if(isSelectedByServer || isSelectedLocally) {
                div.classList.add('selected-vote');
                // Fuerza bruta visual en el repintado también
                div.style.border = "4px solid #2ed573";
                div.style.backgroundColor = "rgba(46, 213, 115, 0.3)";
                div.style.transform = "scale(1.05)";
            }
            // -------------------------------------------------

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
    app.elmas.myLocalVote = null; // Limpiar al final
    const modal = document.getElementById('elmasPodiumModal');
    modal.classList.remove('hidden');
    
    // Asignar nombres
    const set = (i, id) => document.getElementById(id).innerText = winners[i] ? `${winners[i].name} (${winners[i].score})` : "-";
    
    set(0, 'podium1');
    set(1, 'podium2');
    set(2, 'podium3');
    
    if(navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
});

socket.on('gameEnded', () => {
    app.elmas.myLocalVote = null;
    app.showScreen('elmasLobby');
    document.getElementById('elmasPodiumModal').classList.add('hidden');
});