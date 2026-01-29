app.elmas = {
    iAmAdmin: false,
    myLocalVote: null, 
    lastRoundSeen: -1, 
    hasRatedCurrent: false, 
    
    send: (type, payload) => socket.emit('elmas_action', { type, ...payload }),
    
    // Función para enviar cambios de configuración en tiempo real
    syncSettings: () => {
        const r = document.getElementById('elmasRoundsInput').value;
        app.elmas.send('updateSettings', { rounds: r });
    },

    start: () => {
        app.elmas.myLocalVote = null; 
        app.elmas.send('start', {}); 
    },
    
    vote: (targetId) => {
        app.elmas.myLocalVote = targetId;
        document.querySelectorAll('.vote-btn').forEach(el => el.classList.remove('selected'));
        const card = document.getElementById('ev_' + targetId);
        if(card) card.classList.add('selected');
        app.elmas.send('vote', { targetId });
    },

    rateQuestion: (voteType) => {
        if (app.elmas.hasRatedCurrent) return; 
        app.elmas.hasRatedCurrent = true;
        app.elmas.send('rateQuestion', { vote: voteType });
        
        document.getElementById('btnLike').style.opacity = "0.3";
        document.getElementById('btnDislike').style.opacity = "0.3";
        
        if(voteType === 'like') document.getElementById('btnLike').style.opacity = "1";
        else document.getElementById('btnDislike').style.opacity = "1";
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

// LISTENERS DE INPUTS PARA SINCRONIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    const inp = document.getElementById('elmasRoundsInput');
    if (inp) {
        // Solo enviamos si somos admin (aunque el servidor también valida)
        inp.addEventListener('input', () => { if(app.elmas.iAmAdmin) app.elmas.syncSettings(); });
        inp.addEventListener('change', () => { if(app.elmas.iAmAdmin) app.elmas.syncSettings(); });
    }
});

socket.on('updateElMasList', (data) => {
    const { players, gameInProgress, roundStage, roundInfo, settings } = data;
    
    const me = players.find(p => p.id === app.myPlayerId);
    if (me) app.elmas.iAmAdmin = me.isAdmin;
    
    // Resetear feedback local al cambiar de ronda
    if (roundInfo && roundInfo.current !== app.elmas.lastRoundSeen) {
        app.elmas.myLocalVote = null;
        app.elmas.lastRoundSeen = roundInfo.current;
        app.elmas.hasRatedCurrent = false; 
        const bL = document.getElementById('btnLike');
        const bD = document.getElementById('btnDislike');
        if(bL && bD) { bL.style.opacity = "1"; bD.style.opacity = "1"; }
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
        
        // --- SINCRONIZACIÓN DE INPUTS ---
        const inp = document.getElementById('elmasRoundsInput');
        if (inp) {
            // Si hay settings del servidor, actualizamos
            if (settings) {
                // Solo sobrescribimos si NO soy el admin (para no molestar mientras escribe)
                // O si soy admin pero el valor es diferente (por si otro admin cambió algo)
                if (!app.elmas.iAmAdmin || document.activeElement !== inp) {
                    inp.value = settings.maxRounds;
                }
            }

            // Habilitar/Deshabilitar según rol
            if (app.elmas.iAmAdmin) {
                inp.disabled = false;
                document.getElementById('elmasAdminPanel').classList.remove('hidden');
                document.getElementById('elmasWaitMsg').classList.add('hidden');
                document.getElementById('btnStartElMas').classList.remove('hidden');
            } else {
                inp.disabled = true; // El usuario ve el valor pero no lo cambia
                document.getElementById('elmasAdminPanel').classList.remove('hidden'); // Panel visible
                document.getElementById('elmasWaitMsg').classList.remove('hidden');
                document.getElementById('btnStartElMas').classList.add('hidden');
            }
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

        const grid = document.getElementById('elmasVotingGrid');
        if(grid) {
            grid.innerHTML = "";
            players.forEach(p => {
                const div = document.createElement('div');
                div.className = "vote-btn"; 
                div.id = "ev_" + p.id;
                
                const isSelectedByServer = (me && me.votedFor === p.id);
                const isSelectedLocally = (app.elmas.myLocalVote === p.id);

                if(isSelectedByServer || isSelectedLocally) {
                    div.classList.add('selected');
                }

                let status = p.voted ? '<span style="color:#2ed573">🗳️</span>' : '';
                let revealInfo = "";
                
                if (roundStage === 'REVEAL' && p.votesInThisRound !== null && p.votesInThisRound > 0) {
                    revealInfo = `<div style="color:#ffa502; font-weight:bold; margin-top:5px; font-size:1.2em">+${p.votesInThisRound}</div>`;
                    if (p.votesInThisRound > 1) div.style.borderColor = "#ffa502";
                }

                div.innerHTML = `<div style="font-weight:bold">${p.name}</div>
                                 <div style="font-size:0.8em; color:#aaa">${p.score} pts ${status}</div>
                                 ${revealInfo}`;
                
                if(roundStage === 'VOTING') div.onclick = () => app.elmas.vote(p.id);
                
                grid.appendChild(div);
            });
        }

        const btnNext = document.getElementById('elmasNextBtn');
        const btnContinue = document.getElementById('elmasContinueBtn');
        
        btnNext.classList.add('hidden');
        btnContinue.classList.add('hidden');

        if (app.elmas.iAmAdmin) {
            if (roundStage === 'VOTING') {
                btnNext.classList.remove('hidden'); 
            } else if (roundStage === 'REVEAL') {
                btnContinue.classList.remove('hidden'); 
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