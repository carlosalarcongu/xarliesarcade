app.lobo = {
    iAmAdmin: false,
    settings: {}, 
    
    // Ajustes
    adj: (key, val) => {
        let curr = app.lobo.settings.wolvesCount || 2;
        socket.emit('lobo_action', { type: 'updateSetting', key, value: curr + val });
    },
    tog: (key) => {
        const currentVal = app.lobo.settings[key]; 
        socket.emit('lobo_action', { type: 'updateSetting', key, value: !currentVal });
    },
    
    start: () => socket.emit('lobo_action', { type: 'start' }),
    reset: () => socket.emit('lobo_action', { type: 'reset' }),
    backToLobby: () => { if(confirm("¿Volver?")) app.showScreen('hubScreen'); },
    
    // Acciones Juego
    vote: (id) => {
        document.querySelectorAll('.vote-btn').forEach(b => b.classList.remove('selected'));
        const btn = document.getElementById(`lobo_vote_${id}`);
        if(btn) btn.classList.add('selected');
        socket.emit('lobo_action', { type: 'vote', targetId: id });
    },
    clearVotes: () => socket.emit('lobo_action', { type: 'clearVotes' }),
    kill: (e, id) => { 
        e.stopPropagation(); 
        if(confirm("¿Matar/Revivir?")) socket.emit('lobo_action', { type: 'kill', targetId: id }); 
    },
    toggleRole: () => {
        const c = document.getElementById('loboCard');
        if(c.classList.contains('blur-content')) { c.classList.remove('blur-content'); c.classList.add('reveal-content'); }
        else { c.classList.remove('reveal-content'); c.classList.add('blur-content'); }
    }
};

socket.on('updateLoboList', (data) => {
    const { players, gameInProgress, settings } = data;
    app.lobo.settings = settings; 
    const me = players.find(p => p.id === app.myPlayerId);
    if(me) app.lobo.iAmAdmin = me.isAdmin;

    // 1. ACTUALIZAR SETTINGS VISUALES (LOBBY)
    document.getElementById('val_wolvesCount').innerText = settings.wolvesCount;
    document.getElementById('loboPlayerCount').innerText = players.length;

    const roleMap = {'hasSeer': 'btn_hasSeer', 'hasGirl': 'btn_hasGirl', 'hasCupid': 'btn_hasCupid', 'hasHunter': 'btn_hasHunter'};
    Object.keys(roleMap).forEach(key => {
        const btn = document.getElementById(roleMap[key]);
        const span = document.getElementById('val_' + key);
        if(btn && span) {
            if (settings[key]) {
                btn.classList.add('selected'); span.innerText = "SI";
            } else {
                btn.classList.remove('selected'); span.innerText = "NO";
            }
        }
    });

    // Controles Admin
    document.getElementById('loboAdminPanel').classList.toggle('hidden', !app.lobo.iAmAdmin);
    document.getElementById('loboWaitMsg').classList.toggle('hidden', app.lobo.iAmAdmin);
    document.getElementById('loboResetBtn').classList.toggle('hidden', !(app.lobo.iAmAdmin && gameInProgress));
    document.getElementById('loboClearVotesBtn').classList.toggle('hidden', !app.lobo.iAmAdmin);

    // 2. RENDER LISTA LOBBY
    const listLobby = document.getElementById('loboPlayerList');
    if (listLobby) {
        listLobby.innerHTML = "";
        players.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${p.name} ${p.isAdmin?'👑':''}</span>`;
            if(app.lobo.iAmAdmin && !p.isAdmin) {
                li.innerHTML += `<button class="kick-btn" style="padding:2px 8px; width:auto; margin:0" onclick="socket.emit('lobo_action', {type:'kick', targetId:'${p.id}'})">❌</button>`;
            }
            listLobby.appendChild(li);
        });
    }

    // 3. RENDER GRID JUEGO
    if (gameInProgress) {
        const voteGrid = document.getElementById('loboVoteGrid');
        if (voteGrid) {
            voteGrid.innerHTML = "";
            players.forEach(p => {
                const btn = document.createElement('div');
                btn.className = "vote-btn";
                btn.id = `lobo_vote_${p.id}`;
                
                if(p.isDead) btn.classList.add('dead');
                if(me && me.votedFor === p.id) btn.classList.add('selected');

                let html = `<div style="font-weight:bold; margin-bottom:5px;">${p.name}</div>`;

                if (p.isDead) {
                    html += `<div class="eliminated-text">ELIMINADO<br><span style="color:white">${p.revealedRole || '?'}</span></div>`;
                } else {
                    if (p.hasVoted) html += `<div class="voted-tick">✅</div>`;
                    if (p.votesReceived > 0) {
                        html += `<div style="color:#74b9ff; font-weight:900; font-size:1.2em;">${p.votesReceived} VOTOS</div>`;
                    } else {
                        html += `<div style="height:20px; color:#555">-</div>`;
                    }
                }

                if(app.lobo.iAmAdmin && p.id !== me.id) {
                    html += `<div style="margin-top:5px; display:flex; gap:5px; z-index:5;">
                        <button style="padding:2px 5px; background:#444; font-size:0.7em;" onclick="app.lobo.kill(event, '${p.id}')">💀</button>
                        <button style="padding:2px 5px; background:#444; font-size:0.7em;" onclick="socket.emit('lobo_action', {type:'kick', targetId:'${p.id}'})">❌</button>
                    </div>`;
                }

                btn.innerHTML = html;
                btn.onclick = (e) => { 
                    if(e.target.tagName !== 'BUTTON' && !p.isDead) app.lobo.vote(p.id); 
                };
                voteGrid.appendChild(btn);
            });
        }
        app.showScreen('loboGame');
    } else {
        app.showScreen('loboLobby');
    }
});

socket.on('loboRoleAssigned', (data) => {
    app.showScreen('loboGame');
    const card = document.getElementById('loboCard');
    card.className = "blur-content"; // Oculto por defecto
    card.style.borderColor = "#57606f"; 
    
    document.getElementById('loboRoleTitle').innerText = data.role;
    document.getElementById('loboRoleTitle').style.color = "white"; 
    document.getElementById('loboRoleDesc').innerText = data.description;
    
    if(data.wolfPartners && data.wolfPartners.length > 0) {
        document.getElementById('loboWolfPartners').classList.remove('hidden');
        document.getElementById('loboPartnersText').innerText = data.wolfPartners.join(", ");
    } else {
        document.getElementById('loboWolfPartners').classList.add('hidden');
    }
});

socket.on('loboReset', () => {
    app.showScreen('loboLobby');
});