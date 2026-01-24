// Lógica Lobo
app.lobo = {
    iAmAdmin: false,
    settings: {},
    sendSetting: (key, change) => socket.emit('lobo_action', {type:'updateSetting', key, value: app.lobo.settings.wolvesCount + change}),
    toggleRole: (key) => { if(app.lobo.iAmAdmin) socket.emit('lobo_action', {type:'updateSetting', key, value: !app.lobo.settings[key]}); }
};

socket.on('updateLoboList', (data) => {
    document.getElementById('loboPlayerCount').innerText = data.players.length;
    const lobbyList = document.getElementById('loboPlayerList');
    const gameList = document.getElementById('loboGamePlayerList');
    lobbyList.innerHTML = ""; gameList.innerHTML = "";

    const me = data.players.find(p => p.id === app.myPlayerId);
    if(me) { 
        app.lobo.iAmAdmin = me.isAdmin;
        // Toggle Controls
        const show = me.isAdmin ? 'remove' : 'add';
        const hide = me.isAdmin ? 'add' : 'remove';
        document.getElementById('loboAdminControls1').classList[show]('hidden');
        document.getElementById('wolvesCountUser').classList[hide]('hidden');
        document.getElementById('startLoboBtn').classList[show]('hidden');
        document.getElementById('resetLoboBtn').classList[show]('hidden');
    }

    data.players.forEach(p => {
        // Lobby
        const li = document.createElement('li');
        li.innerHTML = `<span>${p.name} ${p.isAdmin ? '👑' : ''}</span>`;
        if (app.lobo.iAmAdmin) li.innerHTML += `<button class="kick-btn" onclick="socket.emit('lobo_action', {type:'kick', targetId:'${p.id}'})">Echar</button>`;
        lobbyList.appendChild(li);

        // Game
        const liGame = document.createElement('li');
        let html = `<span>${p.name}</span>`;
        if(p.isDead) {
            liGame.classList.add('dead-player');
            html += `<span style="font-size:0.8em; color:#ff4757">MUERTO</span>`;
            if(app.lobo.iAmAdmin) html += ` <button class="kick-btn" style="background:#555" onclick="socket.emit('lobo_action', {type:'kill', targetId:'${p.id}'})">Revivir</button>`;
        } else {
            html += `<span style="font-size:0.8em; color:#2ed573">VIVO</span>`;
            if(app.lobo.iAmAdmin) html += ` <button class="kill-btn" onclick="socket.emit('lobo_action', {type:'kill', targetId:'${p.id}'})">💀</button>`;
        }
        liGame.innerHTML = html;
        gameList.appendChild(liGame);
    });

    if(data.gameInProgress && document.getElementById('loboGame').classList.contains('hidden')) {
        app.showScreen('loboGame');
    }
});

socket.on('loboSettingsUpdate', (s) => {
    app.lobo.settings = s;
    document.getElementById('wolvesCountDisp').innerText = s.wolvesCount;
    document.getElementById('wolvesCountUser').innerText = s.wolvesCount;
    ['hasSeer', 'hasGirl', 'hasCupid', 'hasHunter'].forEach(k => {
        const el = document.getElementById('role_' + k.replace('has','').toLowerCase()); // role_seer
        const val = document.getElementById('val_' + k);
        if(s[k]) { document.getElementById('role_'+(k==='hasSeer'?'seer':k==='hasGirl'?'girl':k==='hasCupid'?'cupid':'hunter')).classList.add('selected'); val.innerText="SI"; }
        else { document.getElementById('role_'+(k==='hasSeer'?'seer':k==='hasGirl'?'girl':k==='hasCupid'?'cupid':'hunter')).classList.remove('selected'); val.innerText="NO"; }
    });
});

socket.on('loboRoleAssigned', (data) => {
    app.showScreen('loboGame');
    const title = document.getElementById('loboRoleTitle');
    const card = document.getElementById('loboCard');
    title.innerText = data.role;
    document.getElementById('loboRoleDesc').innerText = data.description;
    
    title.className = "";
    if(data.role === 'LOBO') { title.classList.add('role-lobo'); card.style.borderColor = '#ff7675'; }
    else if(data.role === 'ALDEANO') { title.classList.add('role-aldeano'); card.style.borderColor = '#55efc4'; }
    else { title.classList.add('role-especial'); card.style.borderColor = '#ffeaa7'; }

    if(data.wolfPartners && data.wolfPartners.length > 0) {
        document.getElementById('wolvesListArea').classList.remove('hidden');
        document.getElementById('wolvesListText').innerText = data.wolfPartners.join(", ");
    } else {
        document.getElementById('wolvesListArea').classList.add('hidden');
    }
});