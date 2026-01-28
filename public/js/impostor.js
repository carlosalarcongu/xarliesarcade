app.impostor = {
    iAmAdmin: false,
    
    send: (type, val) => socket.emit('impostor_action', { type, value: val }),
    
    vote: (id) => {
        socket.emit('impostor_action', { type: 'vote', targetId: id });
    },
    
    clearVotes: () => socket.emit('impostor_action', { type: 'clearVotes' }),
    
    startGame: () => {
        app.impostor.send('startGame', {}); 
    },
    
    kick: (id) => { if(confirm("¿Echar de la sala?")) socket.emit('impostor_action', { type: 'kick', targetId: id }); },
    kill: (e, id) => { e.stopPropagation(); if(confirm("¿Matar/Revivir?")) socket.emit('impostor_action', { type: 'kill', targetId: id }); },
    resetGame: () => socket.emit('impostor_action', { type: 'reset' }),
    changeImpostors: (v) => socket.emit('impostor_action', { type: 'changeImpostors', value: v }),
    revealResults: () => socket.emit('impostor_action', { type: 'revealResults' }),
    
    backToLobby: () => { if(confirm("¿Volver al Hub?")) app.goBackToHub(false); },
    
    toggleRole: () => {
        const c = document.getElementById('roleCard');
        if(c.classList.contains('blur-content')) { c.classList.remove('blur-content'); c.classList.add('reveal-content'); }
        else { c.classList.remove('reveal-content'); c.classList.add('blur-content'); }
    },

    syncSettings: () => {
        const cat = document.getElementById('impostorCategory').value;
        const hints = document.getElementById('impostorHints').checked;
        app.impostor.send('updateSettings', { category: cat, hints: hints });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const catSelect = document.getElementById('impostorCategory');
    if (catSelect) {
        catSelect.addEventListener('change', () => {
            if (app.impostor.iAmAdmin) app.impostor.syncSettings();
        });
    }
    const hintCheck = document.getElementById('impostorHints');
    if (hintCheck) {
        hintCheck.addEventListener('change', () => {
            if (app.impostor.iAmAdmin) app.impostor.syncSettings();
        });
    }
});

// --- LISTENERS DEL SOCKET ---

socket.on('impostorCategories', (cats) => {
    const sel = document.getElementById('impostorCategory');
    if(sel) {
        const currentVal = sel.value;
        sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
        if (currentVal && Array.from(sel.options).some(o => o.value === currentVal)) {
            sel.value = currentVal;
        } else if(cats.find(c => c.id === 'MIX')) {
            sel.value = 'MIX';
        }
    }
});

socket.on('updateState', (data) => {
    const { players, gameInProgress, settings } = data;
    const me = players.find(p => p.id === app.myPlayerId);
    
    if (me && me.isObserver) {
        const msg = document.getElementById('observerMsg');
        if (msg) msg.classList.remove('hidden');
    } else {
        const msg = document.getElementById('observerMsg');
        if (msg) msg.classList.add('hidden');
    }

    if(me) app.impostor.iAmAdmin = me.isAdmin;

    // --- SINCRONIZACIÓN DE INTERFAZ ---
    const countDisp = document.getElementById('impostorCountDisp');
    if(countDisp) countDisp.innerText = settings.impostors;
    
    const pCount = document.getElementById('playerCount');
    if(pCount) pCount.innerText = players.length;

    const catSelect = document.getElementById('impostorCategory');
    if (catSelect && document.activeElement !== catSelect) {
        catSelect.value = settings.category;
    }
    const hintCheck = document.getElementById('impostorHints');
    if (hintCheck && document.activeElement !== hintCheck) {
        hintCheck.checked = settings.hints;
    }

    // --- VISIBILIDAD DE CONTROLES ---
    const adminPanel = document.getElementById('impostorAdminPanel');
    const waitMsg = document.getElementById('waitMsg');
    const settingsRows = document.querySelectorAll('#impostorAdminPanel .control-row');
    
    if (catSelect) catSelect.disabled = !app.impostor.iAmAdmin;
    if (hintCheck) hintCheck.disabled = !app.impostor.iAmAdmin;

    const btnEnd = document.getElementById('btnEndVoting');
    const btnClear = document.getElementById('btnClearVotes');
    const btnRes = document.getElementById('btnShowResults');

    if(app.impostor.iAmAdmin) {
        if(adminPanel) adminPanel.classList.remove('hidden');
        if(waitMsg) waitMsg.classList.add('hidden');
        
        // Admin ve todo
        if(settingsRows.length > 0) settingsRows.forEach(row => row.classList.remove('hidden'));

        if(btnEnd) btnEnd.classList.remove('hidden');
        if(btnClear) btnClear.classList.remove('hidden');
        if(btnRes) btnRes.classList.remove('hidden');
    } else {
        // NO ADMIN
        if(adminPanel) adminPanel.classList.remove('hidden'); // Panel visible para ver categoría
        
        // MODIFICACIÓN: Ocultar la fila del contador de impostores para los civiles
        if(settingsRows.length > 0) {
            // Asumimos que la primera fila es la de impostores (por orden HTML)
            settingsRows[0].classList.add('hidden'); 
        }

        // Ocultar botón START
        const startBtn = document.querySelector('#impostorAdminPanel .start-btn');
        if(startBtn) startBtn.classList.add('hidden');

        if(waitMsg) waitMsg.classList.remove('hidden');
        
        if(btnEnd) btnEnd.classList.add('hidden');
        if(btnClear) btnClear.classList.add('hidden');
        if(btnRes) btnRes.classList.add('hidden');
    }

    // 1. RENDERIZAR LISTA DE LOBBY
    const list = document.getElementById('playerList');
    if(list) {
        list.innerHTML = "";
        players.forEach(p => {
            const badge = p.isAdmin ? '👑' : '';
            const obsBadge = p.isObserver ? '👁️' : '';
            const li = document.createElement('li');
            li.innerHTML = `<span>${p.name} ${badge} ${obsBadge}</span>`;
            
            if(app.impostor.iAmAdmin && !p.isAdmin) {
                li.innerHTML += `<button class="kick-btn" style="padding:2px 6px; width:auto; margin-left:10px;" onclick="app.impostor.kick('${p.id}')">❌</button>`;
            }
            list.appendChild(li);
        });
    }

    // 2. RENDERIZAR GRID DE JUEGO
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
                if(p.isObserver) btn.style.opacity = "0.5";

                let html = `<div style="font-weight:bold; margin-bottom:5px;">${p.name}</div>`;

                if (p.isDead) {
                    html += `<div class="eliminated-text">ELIMINADO<br><span style="color:white">${p.revealedRole || '?'}</span></div>`;
                } else if (p.isObserver) {
                    html += `<div style="font-size:0.8em; color:#aaa">Observando</div>`;
                } else {
                    if (p.hasVoted) html += `<div class="voted-tick">✅</div>`;
                    if (p.votesReceived > 0) {
                        html += `<div style="color:#ffa502; font-weight:900; font-size:1.2em;">${p.votesReceived} VOTOS</div>`;
                    } else {
                        html += `<div style="height:20px; color:#555">-</div>`;
                    }
                }

                if(app.impostor.iAmAdmin && p.id !== me.id && !p.isObserver) {
                    html += `<div style="margin-top:5px; display:flex; justify-content:center; gap:5px; z-index:5;">
                        <button style="padding:2px 5px; background:#444; font-size:0.7em;" onclick="app.impostor.kill(event, '${p.id}')">💀</button>
                        <button style="padding:2px 5px; background:#444; font-size:0.7em;" onclick="app.impostor.kick('${p.id}')">❌</button>
                    </div>`;
                }

                btn.innerHTML = html;
                btn.onclick = (e) => { 
                    if(e.target.tagName !== 'BUTTON' && !p.isDead && !me.isDead && !me.isObserver && !p.isObserver) {
                        app.impostor.vote(p.id); 
                    }
                };
                voteGrid.appendChild(btn);
            });
        }
        app.showScreen('impostorGame');
    } else {
        app.showScreen('impostorLobby');
    }
});

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

socket.on('privateRole', (data) => {
    const card = document.getElementById('roleCard');
    card.classList.remove('hidden');
    card.className = "blur-content"; 
    
    const title = document.getElementById('myRoleTitle');
    const word = document.getElementById('myRoleWord');
    const info = document.getElementById('myRoleInfo');

    title.innerText = data.role;
    title.style.color = 'white'; // Neutro para no delatar por color

    word.innerText = data.word;
    
    if (data.role === 'IMPOSTOR') {
        info.innerText = data.hint ? `Tu Pista: ${data.hint}` : "Engaña a todos.";
        // Si hay pista, la mostramos en color llamativo
        if(data.hint) info.style.color = "#ffa502";
        else info.style.color = "#ccc";
    }
    else {
        // Ciudadano: No ve pista
        info.innerText = "Encuentra al impostor.";
        info.style.color = "#ccc";
    }

    const starter = document.getElementById('starterName');
    if(starter && data.starter) starter.innerText = data.starter;
    
    const cats = document.getElementById('catsPlayed');
    if(cats && data.categoriesPlayed) cats.innerText = data.categoriesPlayed;
    
    document.getElementById('voteSection').classList.remove('hidden');
    app.showScreen('impostorGame');
});

socket.on('gameSummary', (data) => {
    if(!data) return;
    document.getElementById('summaryModal').classList.remove('hidden');
    
    document.getElementById('sumWord').innerText = data.word;
    document.getElementById('sumHint').innerText = data.hintsWasEnabled ? `Pista: ${data.hint}` : "Sin pistas";
    
    const list = document.getElementById('sumImpostors');
    list.innerHTML = "";

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