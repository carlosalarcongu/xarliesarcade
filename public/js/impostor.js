// Lógica de Impostor
app.impostor = {
    iAmAdmin: false,
    send: (type, val) => socket.emit('impostor_action', { type, value: val }),
    vote: (id) => socket.emit('impostor_action', { type: 'vote', targetId: id }),
    kick: (id) => socket.emit('impostor_action', { type: 'kick', targetId: id }),
    kill: (id) => socket.emit('impostor_action', { type: 'kill', targetId: id })
};

socket.on('initSetup', (data) => {
    app.impostor.iAmAdmin = data.isAdmin;
    
    // Guardamos cats para el feedback también
    app.categoriesCache = data.categories;

    const grid = document.getElementById('adminCats');
    grid.innerHTML = "";
    Object.keys(data.categories).forEach(key => {
        if (key !== "MIX") {
            const div = document.createElement('div');
            div.className = "cat-item";
            div.id = "cat_" + key;
            div.onclick = () => app.impostor.send('toggleCategory', key);
            div.innerHTML = `<span>${data.categories[key].label}</span>`;
            grid.appendChild(div);
        }
    });
    
    const controls = ['impControls', 'hintSwitch', 'startBtn', 'resetBtn', 'clearVotesBtn', 'adminCats'];
    controls.forEach(id => document.getElementById(id)?.classList.toggle('hidden', !data.isAdmin));
    document.getElementById('waitingMsg').classList.toggle('hidden', data.isAdmin);
});

// ACTUALIZACIÓN DE SETTINGS EN TIEMPO REAL
socket.on('updateSettings', (s) => {
    document.getElementById('impostorCountDisplay').innerText = s.impostorCount;
    
    // Limpiar selección previa
    document.querySelectorAll('.cat-item').forEach(d => d.classList.remove('selected'));
    
    // Marcar nuevas selecciones
    s.selectedCategories.forEach(c => {
        const el = document.getElementById('cat_' + c);
        if(el) el.classList.add('selected');
    });

    // Texto para usuarios
    const userCatsDiv = document.getElementById('userCats');
    if(s.selectedCategories.length === 0) {
        userCatsDiv.innerText = "Todas (Aleatorio)";
    } else {
        // Mapear IDs a Etiquetas
        const labels = s.selectedCategories.map(k => app.categoriesCache[k] ? app.categoriesCache[k].label : k);
        userCatsDiv.innerText = labels.join(" + ");
    }

    document.getElementById('adminHintCheck').checked = s.hintsEnabled;
    document.getElementById('hintStatusText').innerText = s.hintsEnabled ? "✅ PISTAS ACTIVADAS" : "❌ PISTAS DESACTIVADAS";
});

socket.on('updateList', (data) => {
    document.getElementById('playerCount').innerText = data.players.length;
    const lobbyList = document.getElementById('lobbyPlayerList');
    const gameList = document.getElementById('gamePlayerList');
    lobbyList.innerHTML = ""; gameList.innerHTML = "";

    const me = data.players.find(p => p.id === app.myPlayerId);
    if(me && me.isAdmin !== app.impostor.iAmAdmin) { 
        // Si me acabo de hacer admin, refrescar UI si fuera necesario
    }

    data.players.forEach(p => {
        // Icono desconectado
        const statusIcon = p.connected ? '' : '🔌';
        const opacity = p.connected ? '1' : '0.5';

        // Lobby
        const li = document.createElement('li');
        li.style.opacity = opacity;
        li.innerHTML = `<span>${p.name} ${p.isAdmin ? '👑' : ''} ${statusIcon}</span>`;
        if (app.impostor.iAmAdmin) li.innerHTML += `<button class="kick-btn" onclick="app.impostor.kick('${p.id}')">Echar</button>`;
        lobbyList.appendChild(li);

        // Game
        const liGame = document.createElement('li');
        liGame.style.opacity = opacity;
        let sticks = p.votesReceived > 0 ? "|".repeat(p.votesReceived) : "";
        
        let html = `<div class="vote-area"><span class="name-text">${p.name} ${statusIcon}</span><span class="vote-sticks">${sticks}</span></div>`;
        
        if (p.isDead) {
            liGame.classList.add('dead-player');
            html += `<span style="font-size:0.8em; color:#ff4757">ELIMINADO</span>`;
        } else {
            html += `<span style="font-size:0.8em; color:#2ed573">VIVO</span>`;
            if (app.impostor.iAmAdmin) html += `<button class="kill-btn" onclick="app.impostor.kill('${p.id}')">💀</button>`;
        }
        
        if(me && me.votedFor === p.id) liGame.classList.add('voted-by-me');

        liGame.innerHTML = html;
        liGame.onclick = (e) => { if(e.target.tagName !== 'BUTTON' && !p.isDead) app.impostor.vote(p.id); };
        gameList.appendChild(liGame);
    });
});

socket.on('roleAssigned', (data) => {
    app.showScreen('impostorGame');
    document.getElementById('countdownOverlay').classList.add('hidden');
    document.getElementById('summaryModal').classList.add('hidden');
    document.getElementById('roleCard').classList.remove('hidden');
    
    document.getElementById('revealSound').play().catch(()=>{});
    if(navigator.vibrate) navigator.vibrate(200);

    document.getElementById('starterDisplay').innerText = "Empieza: " + data.starter;
    document.getElementById('roleTitle').innerText = data.role;
    const content = document.getElementById('roleContent');
    const card = document.getElementById('roleCard');

    if (data.role === 'IMPOSTOR') {
        content.innerHTML = `<p style="font-size:1.2em">${data.text}</p>`;
        card.style.borderColor = "#ff4757";
    } else {
        const parts = data.text.split(":");
        content.innerHTML = `<p>${parts[0]}:</p><div class="word-reveal">${parts[1]}</div>`;
        card.style.borderColor = "#2ed573";
    }
});

socket.on('preGameCountdown', (sec) => {
    app.showScreen('impostorGame');
    document.getElementById('roleCard').classList.add('hidden');
    document.getElementById('countdownOverlay').classList.remove('hidden');
    let c = sec;
    const el = document.getElementById('countdownNumber');
    el.innerText = c;
    document.getElementById('countSound').play().catch(()=>{});
    const i = setInterval(() => {
        c--;
        if(c>0) { el.innerText = c; document.getElementById('countSound').play().catch(()=>{}); }
        else { clearInterval(i); document.getElementById('countdownOverlay').classList.add('hidden'); }
    }, 1000);
});

socket.on('updateSettings', (s) => {
    document.getElementById('impostorCountDisplay').innerText = s.impostorCount;
    document.querySelectorAll('.cat-item').forEach(d => d.classList.remove('selected'));
    s.selectedCategories.forEach(c => document.getElementById('cat_' + c)?.classList.add('selected'));
    document.getElementById('adminHintCheck').checked = s.hintsEnabled;
    document.getElementById('hintStatusText').innerText = s.hintsEnabled ? "✅ PISTAS ACTIVADAS" : "❌ PISTAS DESACTIVADAS";
});

socket.on('gameSummary', (data) => {
    if(!data) return;
    document.getElementById('sumWord').innerText = data.word;
    document.getElementById('sumHint').innerText = data.hint;
    document.getElementById('sumImpostors').innerText = data.impostors.join(", ");
    document.getElementById('summaryModal').classList.remove('hidden');
});

socket.on('resetGame', () => {
    // Si el modal de resumen está abierto, nos quedamos ahí hasta que el usuario lo cierre
    // Si no, vamos al lobby.
    // Como el 'gameSummary' se emite justo antes, el modal debería estar visible.
    // Al cerrar el modal (función en HTML), ya deberíamos estar viendo el lobby por debajo si navegamos ahora.
    // Para evitar flasheos, navegamos al lobby "por debajo" del modal.
    if(app.currentRoom === 'impostor') {
        // Asegurar que el lobby es visible debajo del modal
        document.getElementById('impostorGame').classList.add('hidden');
        document.getElementById('impostorLobby').classList.remove('hidden');
    }
});

socket.on('youDied', () => { document.getElementById('dieSound').play().catch(()=>{}); if(navigator.vibrate) navigator.vibrate([100,50,100]); });