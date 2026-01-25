app.impostor = {
    iAmAdmin: false,
    send: (type, val) => socket.emit('impostor_action', { type, value: val }),
    vote: (id) => {
        document.querySelectorAll('.vote-btn').forEach(b => b.classList.remove('selected'));
        const btn = document.getElementById(`vote_${id}`);
        if(btn) btn.classList.add('selected');
        socket.emit('impostor_action', { type: 'vote', targetId: id });
    },
    clearVotes: () => socket.emit('impostor_action', { type: 'clearVotes' }),
    kick: (id) => { if(confirm("¿Echar?")) socket.emit('impostor_action', { type: 'kick', targetId: id }); },
    kill: (e, id) => { e.stopPropagation(); if(confirm("¿Matar/Revivir?")) socket.emit('impostor_action', { type: 'kill', targetId: id }); },
    
    startGame: () => socket.emit('impostor_action', { type: 'start' }),
    resetGame: () => socket.emit('impostor_action', { type: 'reset' }),
    changeImpostors: (v) => socket.emit('impostor_action', { type: 'changeImpostorCount', value: v }),
    toggleCategory: (cat) => socket.emit('impostor_action', { type: 'toggleCategory', value: cat }),
    toggleHints: () => socket.emit('impostor_action', { type: 'toggleHints' }),
    revealResults: () => socket.emit('impostor_action', { type: 'revealResults' }),
    
    backToLobby: () => { if(confirm("¿Volver?")) app.showScreen('hubScreen'); },
    toggleRole: () => {
        const c = document.getElementById('roleCard');
        if(c.classList.contains('blur-content')) { c.classList.remove('blur-content'); c.classList.add('reveal-content'); }
        else { c.classList.remove('reveal-content'); c.classList.add('blur-content'); }
    }
};

socket.on('initSetup', (data) => {
    app.impostor.iAmAdmin = data.isAdmin;
    app.categoriesCache = data.categories;

    const grid = document.getElementById('catButtons');
    grid.innerHTML = "";
    Object.keys(data.categories).forEach(k => {
        if(k === 'MIX') return;
        const btn = document.createElement('div');
        btn.className = "cat-btn";
        btn.id = "cat_" + k;
        btn.innerText = data.categories[k].label;
        btn.onclick = () => app.impostor.send('toggleCategory', k);
        grid.appendChild(btn);
    });

    document.getElementById('adminControls').classList.toggle('hidden', !data.isAdmin);
    document.getElementById('waitMsg').classList.toggle('hidden', data.isAdmin);
});

socket.on('updateSettings', (s) => {
    document.getElementById('impostorCountDisp').innerText = s.impostorCount;
    document.getElementById('btnToggleHints').innerText = s.hintsEnabled ? "SI" : "NO";
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
    s.selectedCategories.forEach(c => document.getElementById('cat_'+c)?.classList.add('selected'));
});

socket.on('updateList', (data) => {
    const { players, gameInProgress } = data;
    const me = players.find(p => p.id === app.myPlayerId);
    if(me) app.impostor.iAmAdmin = me.isAdmin;

    document.getElementById('playerCount').innerText = players.length;

    const btnResults = document.getElementById('btnShowResults');
    if(btnResults) {
        btnResults.classList.toggle('hidden', !app.impostor.iAmAdmin);
    }
    
    // Controles Admin
    document.getElementById('adminControls').classList.toggle('hidden', !app.impostor.iAmAdmin);
    document.getElementById('waitMsg').classList.toggle('hidden', app.impostor.iAmAdmin);
    document.getElementById('btnEndVoting').classList.toggle('hidden', !app.impostor.iAmAdmin);
    document.getElementById('btnClearVotes').classList.toggle('hidden', !app.impostor.iAmAdmin);

    // 1. RENDERIZAR LISTA DE LOBBY (Siempre)
    const list = document.getElementById('playerList');
    if(list) {
        list.innerHTML = "";
        players.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${p.name} ${p.isAdmin?'👑':''}</span>`;
            if(app.impostor.iAmAdmin && !p.isAdmin) {
                li.innerHTML += `<button class="kick-btn" style="padding:5px; width:auto; margin:0;" onclick="app.impostor.kick('${p.id}')">❌</button>`;
            }
            list.appendChild(li);
        });
    }

    // 2. RENDERIZAR GRID DE JUEGO (Solo si hay partida)
    if(gameInProgress) {
        const voteGrid = document.getElementById('voteGrid');
        if(voteGrid) {
            voteGrid.innerHTML = "";
            players.forEach(p => {
                const btn = document.createElement('div');
                btn.className = "vote-btn";
                btn.id = `vote_${p.id}`;
                
                if(p.isDead) btn.classList.add('dead');
                if(me && me.votedFor === p.id) btn.classList.add('selected');

                let html = `<div style="font-weight:bold; margin-bottom:5px;">${p.name}</div>`;

                if (p.isDead) {
                    html += `<div class="eliminated-text">ELIMINADO<br><span style="color:white">${p.revealedRole || '?'}</span></div>`;
                } else {
                    if (p.hasVoted) html += `<div class="voted-tick">✅</div>`;
                    if (p.votesReceived > 0) {
                        html += `<div style="color:#ffa502; font-weight:900; font-size:1.2em;">${p.votesReceived} VOTOS</div>`;
                    } else {
                        html += `<div style="height:20px; color:#555">-</div>`;
                    }
                }

                if(app.impostor.iAmAdmin && p.id !== me.id) {
                    html += `<div style="margin-top:5px; display:flex; gap:5px; z-index:5;">
                        <button style="padding:2px 5px; background:#444; font-size:0.7em;" onclick="app.impostor.kill(event, '${p.id}')">💀</button>
                        <button style="padding:2px 5px; background:#444; font-size:0.7em;" onclick="app.impostor.kick('${p.id}')">❌</button>
                    </div>`;
                }

                btn.innerHTML = html;
                btn.onclick = (e) => { 
                    if(e.target.tagName !== 'BUTTON' && !p.isDead) app.impostor.vote(p.id); 
                };
                voteGrid.appendChild(btn);
            });
        }
        app.showScreen('impostorGame');
    } else {
        app.showScreen('impostorLobby');
    }
});

// --- LISTENER DE CUENTA ATRÁS RECUPERADO ---
socket.on('preGameCountdown', (count) => {
    // Ocultar sala actual visualmente
    app.showScreen('impostorGame'); 
    document.getElementById('roleCard').classList.add('hidden'); // Ocultar carta momentáneamente
    document.getElementById('voteSection').classList.add('hidden');

    const overlay = document.getElementById('countdownOverlay');
    const numEl = document.getElementById('countdownNumber');
    
    overlay.classList.remove('hidden');
    let current = count;
    
    // Función para reproducir y animar
    const tick = () => {
        numEl.innerText = current;
        numEl.style.transform = "scale(1.5)";
        setTimeout(() => numEl.style.transform = "scale(1)", 200);
        
        const audio = document.getElementById('countSound');
        if(audio) {
            audio.currentTime = 0;
            audio.play().catch(()=>{});
        }
    };

    tick(); // Primer tick

    const interval = setInterval(() => {
        current--;
        if (current > 0) {
            tick();
        } else {
            clearInterval(interval);
            overlay.classList.add('hidden');
            // La carta se muestra cuando llega el evento 'roleAssigned'
        }
    }, 1000);
});

socket.on('roleAssigned', (data) => {
    const card = document.getElementById('roleCard');
    card.className = "blur-content"; // Reset a oculto
    card.style.borderColor = "#57606f";
    
    document.getElementById('myRoleTitle').innerText = data.role;
    document.getElementById('myRoleTitle').style.color = "white";
    document.getElementById('myRoleWord').innerText = data.text;
    
    if (data.role === 'IMPOSTOR') document.getElementById('myRoleInfo').innerText = "Engaña a todos.";
    else document.getElementById('myRoleInfo').innerText = "Encuentra al impostor.";

    document.getElementById('starterName').innerText = data.starter;
    document.getElementById('catsPlayed').innerText = data.categoriesPlayed;
    
    document.getElementById('voteSection').classList.remove('hidden');
    app.showScreen('impostorGame');
});

// --- LISTENER DE RESUMEN MEJORADO ---
socket.on('gameSummary', (data) => {
    if(!data) return;
    
    // Mostrar modal
    document.getElementById('summaryModal').classList.remove('hidden');
    
    // Rellenar datos
    document.getElementById('sumWord').innerText = data.word;
    document.getElementById('sumHint').innerText = data.hintsWasEnabled ? `Pista: ${data.hint}` : "Sin pistas";
    
    const list = document.getElementById('sumImpostors');
    list.innerHTML = "";

    // Ordenar: Vivos primero, Muertos al final
    const sorted = data.impostorsData.sort((a, b) => (a.isDead === b.isDead) ? 0 : a.isDead ? 1 : -1);

    sorted.forEach(imp => {
        const div = document.createElement('div');
        div.style.fontSize = "1.2em";
        div.style.margin = "5px 0";
        
        if (imp.isDead) {
            div.innerHTML = `<span style="text-decoration:line-through; color:#7f8fa6;">😈 ${imp.name}</span> <span style="font-size:0.8em; color:#ff4757;">(ELIMINADO)</span>`;
        } else {
            div.innerHTML = `<span style="color:#ff4757; font-weight:bold;">😈 ${imp.name}</span>`;
        }
        list.appendChild(div);
    });
});

socket.on('resetGame', () => {
    document.getElementById('summaryModal').classList.add('hidden');
    document.getElementById('roleCard').classList.remove('hidden'); 
    app.showScreen('impostorLobby');
});

socket.on('youDied', () => {
    document.getElementById('youDiedSound').play().catch(()=>{});
    if(navigator.vibrate) navigator.vibrate(500);
});