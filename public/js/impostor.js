app.impostor = {
    iAmAdmin: false,
    
    send: (type, val) => socket.emit('impostor_action', { type, value: val }),
    
    // Acción de Votar
    vote: (id) => {
        socket.emit('impostor_action', { type: 'vote', targetId: id });
    },
    
    // Limpiar votos (Admin)
    clearVotes: () => socket.emit('impostor_action', { type: 'clearVotes' }),
    
    // Iniciar juego (Leyendo configuración del DOM)
    startGame: () => {
        const cat = document.getElementById('impostorCategory').value;
        const hints = document.getElementById('impostorHints').checked;
        app.impostor.send('startGame', { value: { category: cat, hints } });
    },
    
    // Acciones Admin
    kick: (id) => { if(confirm("¿Echar de la sala?")) socket.emit('impostor_action', { type: 'kick', targetId: id }); },
    kill: (e, id) => { e.stopPropagation(); if(confirm("¿Matar/Revivir?")) socket.emit('impostor_action', { type: 'kill', targetId: id }); },
    resetGame: () => socket.emit('impostor_action', { type: 'reset' }),
    changeImpostors: (v) => socket.emit('impostor_action', { type: 'changeImpostors', value: v }),
    revealResults: () => socket.emit('impostor_action', { type: 'revealResults' }),
    
    // Navegación
    backToLobby: () => { if(confirm("¿Volver al Hub?")) app.goBackToHub(false); },
    
    // Efecto visual carta
    toggleRole: () => {
        const c = document.getElementById('roleCard');
        if(c.classList.contains('blur-content')) { c.classList.remove('blur-content'); c.classList.add('reveal-content'); }
        else { c.classList.remove('reveal-content'); c.classList.add('blur-content'); }
    }
};

// --- LISTENERS DEL SOCKET ---

socket.on('impostorCategories', (cats) => {
    const sel = document.getElementById('impostorCategory');
    if(sel) {
        sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
        if(cats.find(c => c.id === 'MIX')) sel.value = 'MIX';
    }
});

socket.on('updateState', (data) => {
    const { players, gameInProgress, settings } = data;
    const me = players.find(p => p.id === app.myPlayerId);
    if(me) app.impostor.iAmAdmin = me.isAdmin;

    // Actualizar contadores (texto)
    const countDisp = document.getElementById('impostorCountDisp');
    if(countDisp) countDisp.innerText = settings.impostors;
    
    const pCount = document.getElementById('playerCount');
    if(pCount) pCount.innerText = players.length;

    // --- CONTROLES ADMIN (VISIBILIDAD) ---
    // CAMBIO AQUÍ: Buscamos 'impostorAdminPanel'
    const adminPanel = document.getElementById('impostorAdminPanel');
    const waitMsg = document.getElementById('waitMsg');
    
    // Botones de juego
    const btnEnd = document.getElementById('btnEndVoting');
    const btnClear = document.getElementById('btnClearVotes');
    const btnRes = document.getElementById('btnShowResults');

    if(app.impostor.iAmAdmin) {
        // SI SOY ADMIN: Muestro panel, oculto mensaje de espera
        if(adminPanel) adminPanel.classList.remove('hidden');
        if(waitMsg) waitMsg.classList.add('hidden');
        
        if(btnEnd) btnEnd.classList.remove('hidden');
        if(btnClear) btnClear.classList.remove('hidden');
        if(btnRes) btnRes.classList.remove('hidden');
    } else {
        // SI NO SOY ADMIN: Oculto panel, muestro mensaje de espera
        if(adminPanel) adminPanel.classList.add('hidden');
        if(waitMsg) waitMsg.classList.remove('hidden');
        
        if(btnEnd) btnEnd.classList.add('hidden');
        if(btnClear) btnClear.classList.add('hidden');
        if(btnRes) btnRes.classList.add('hidden');
    }

    // 1. RENDERIZAR LISTA DE LOBBY (Siempre visible en pantalla lobby)
    const list = document.getElementById('playerList');
    if(list) {
        list.innerHTML = "";
        players.forEach(p => {
            // CAMBIO: Solo corona para admin, nada más.
            const badge = p.isAdmin ? '👑' : '';
            const li = document.createElement('li');
            li.innerHTML = `<span>${p.name} ${badge}</span>`;
            
            // Botón Kick solo para admin y no a sí mismo
            if(app.impostor.iAmAdmin && !p.isAdmin) {
                li.innerHTML += `<button class="kick-btn" style="padding:2px 6px; width:auto; margin-left:10px;" onclick="app.impostor.kick('${p.id}')">❌</button>`;
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

                if(app.impostor.iAmAdmin && p.id !== me.id) { // Admin no se puede matar a sí mismo aquí
                    html += `<div style="margin-top:5px; display:flex; justify-content:center; gap:5px; z-index:5;">
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

// --- CUENTA ATRÁS ---
socket.on('preGameCountdown', (count) => {
    app.showScreen('impostorGame'); 
    document.getElementById('roleCard').classList.add('hidden'); 
    document.getElementById('voteSection').classList.add('hidden');

    const overlay = document.getElementById('countdownOverlay');
    const numEl = document.getElementById('countdownNumber');
    
    overlay.classList.remove('hidden');
    let current = count;
    
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

    tick(); 

    const interval = setInterval(() => {
        current--;
        if (current > 0) {
            tick();
        } else {
            clearInterval(interval);
            overlay.classList.add('hidden');
        }
    }, 1000);
});

// --- ASIGNACIÓN DE ROL ---
socket.on('privateRole', (data) => {
    const card = document.getElementById('roleCard');
    card.classList.remove('hidden');
    card.className = "blur-content"; // Reset a oculto
    
    // Actualizar Textos
    const title = document.getElementById('myRoleTitle');
    const word = document.getElementById('myRoleWord');
    const info = document.getElementById('myRoleInfo');

    title.innerText = data.role;
    title.style.color = data.role === 'IMPOSTOR' ? '#ff4757' : '#2ed573';
    
    word.innerText = data.word;
    
    if (data.role === 'IMPOSTOR') info.innerText = "Engaña a todos.";
    else info.innerText = data.hint ? `Pista: ${data.hint}` : "Encuentra al impostor.";

    // Datos extra
    const starter = document.getElementById('starterName');
    if(starter && data.starter) starter.innerText = data.starter;
    
    const cats = document.getElementById('catsPlayed');
    if(cats && data.categoriesPlayed) cats.innerText = data.categoriesPlayed;
    
    document.getElementById('voteSection').classList.remove('hidden');
    app.showScreen('impostorGame');
});

// --- RESUMEN ---
socket.on('gameSummary', (data) => {
    if(!data) return;
    document.getElementById('summaryModal').classList.remove('hidden');
    
    document.getElementById('sumWord').innerText = data.word;
    document.getElementById('sumHint').innerText = data.hintsWasEnabled ? `Pista: ${data.hint}` : "Sin pistas";
    
    const list = document.getElementById('sumImpostors');
    list.innerHTML = "";

    // Ordenar: Vivos primero
    const sorted = data.impostorsData.sort((a, b) => (a.isDead === b.isDead) ? 0 : a.isDead ? 1 : -1);

    sorted.forEach(imp => {
        const div = document.createElement('div');
        div.style.fontSize = "1.2em";
        div.style.margin = "5px 0";
        
        if (imp.isDead) {
            div.innerHTML = `<span style="text-decoration:line-through; color:#7f8fa6;">😈 ${imp.name}</span> <span style="font-size:0.8em; color:#ff4757;">(ELIMINADO)</span>`;
        } else {
            div.innerHTML = `<span style="color:#ffeaa7; font-weight:bold;">😈 ${imp.name}</span>`;
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
    const sound = document.getElementById('youDiedSound');
    if(sound) sound.play().catch(()=>{});
    if(navigator.vibrate) navigator.vibrate(500);
});