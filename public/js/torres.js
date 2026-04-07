app.torres = {
    iAmAdmin: false,
    
    send: (type, val) => socket.emit('torres_action', { type, value: val }),
    
    startGame: () => app.torres.send('startGame', {}),
    kick: (id) => { if(confirm("¿Echar jugador?")) app.torres.send('kick', id); },
    kill: (id) => app.torres.send('kill', id),
    win: (id) => app.torres.send('win', id),
    resetGame: () => app.torres.send('reset'),
    revealResults: () => app.torres.send('revealResults'),

    syncSettings: () => {
        const themeSel = document.getElementById('torresTheme');
        const silentCheck = document.getElementById('torresSilent');
        const chuletasCheck = document.getElementById('torresChuletas');
        if(!themeSel || !silentCheck) return;

        app.torres.send('updateSettings', { 
            theme: themeSel.value, 
            silent: silentCheck.checked,
            chuletas: chuletasCheck ? chuletasCheck.checked : false
        });
    },

    sendChat: () => {
        const input = document.getElementById('torresInput');
        if(!input) return;
        const txt = input.value.trim();
        if(!txt) return;
        app.torres.send('chat', txt);
        input.value = '';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const themeSel = document.getElementById('torresTheme');
    if (themeSel) themeSel.addEventListener('change', () => { if (app.torres.iAmAdmin) app.torres.syncSettings(); });
    
    const silentCheck = document.getElementById('torresSilent');
    if (silentCheck) silentCheck.addEventListener('change', () => { if (app.torres.iAmAdmin) app.torres.syncSettings(); });

    const chuletasCheck = document.getElementById('torresChuletas');
    if (chuletasCheck) chuletasCheck.addEventListener('change', () => { if (app.torres.iAmAdmin) app.torres.syncSettings(); });

    const chatInput = document.getElementById('torresInput');
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                app.torres.sendChat();
            }
        });
    }
});

socket.on('torres_updateState', (data) => {
    if (app.currentRoom !== 'torres') return;

    const { players, gameInProgress, settings, chatHistory, wordPool } = data;
    
    const me = players.find(p => p.id === app.myPlayerId);
    app.torres.iAmAdmin = me ? me.isAdmin : false;

    const themeEl = document.getElementById('torresTheme');
    const silentEl = document.getElementById('torresSilent');
    const chuletasEl = document.getElementById('torresChuletas');
    
    if (themeEl && document.activeElement !== themeEl) {
        themeEl.value = settings.theme;
        themeEl.disabled = !app.torres.iAmAdmin;
    }
    if (silentEl && document.activeElement !== silentEl) {
        silentEl.checked = settings.silentMode;
        silentEl.disabled = !app.torres.iAmAdmin;
    }
    if (chuletasEl && document.activeElement !== chuletasEl) {
        chuletasEl.checked = settings.chuletas;
        chuletasEl.disabled = !app.torres.iAmAdmin;
    }

    const adminPanel = document.getElementById('torresAdminPanel');
    const waitMsg = document.getElementById('torresWaitMsg');
    const startBtn = document.querySelector('#torresAdminPanel .start-btn');

    if(app.torres.iAmAdmin) {
        if(adminPanel) adminPanel.classList.remove('hidden');
        if(waitMsg) waitMsg.classList.add('hidden');
        if(startBtn) startBtn.classList.remove('hidden');
        document.getElementById('torresBtnRes')?.classList.remove('hidden');
        document.getElementById('torresBtnEnd')?.classList.remove('hidden');
    } else {
        if(adminPanel) adminPanel.classList.remove('hidden'); 
        if(startBtn) startBtn.classList.add('hidden');
        if(waitMsg) waitMsg.classList.remove('hidden');
        document.getElementById('torresBtnRes')?.classList.add('hidden');
        document.getElementById('torresBtnEnd')?.classList.add('hidden');
    }

    const countEl = document.getElementById('torresPlayerCount');
    if(countEl) countEl.innerText = players.length;
    
    const list = document.getElementById('torresPlayerList');
    if(list) {
        list.innerHTML = players.map(p => `
            <li>
                <span>${p.name} ${p.isAdmin ? '👑' : ''}</span>
                ${app.torres.iAmAdmin && p.id !== me?.id ? `<button class="kick-btn" style="padding:2px 6px; width:auto; margin-left:10px;" onclick="app.torres.kick('${p.id}')">❌</button>` : ''}
            </li>`).join('');
    }

    if(gameInProgress) {
        app.showScreen('torresGame');
        
        const myCardWord = document.getElementById('torresMyWord');
        if(myCardWord) {
            myCardWord.innerText = me ? me.word : "???";
            if(me && me.isWinner) myCardWord.innerText += " 🏆 ¡GANASTE!";
            if(me && me.isDead) myCardWord.innerText += " 💀 ¡ELIMINADO!";
        }

        const chuletasArea = document.getElementById('torresChuletasArea');
        const chuletasList = document.getElementById('torresChuletasList');
        if (chuletasArea && chuletasList) {
            if (settings.chuletas && wordPool && wordPool.length > 0) {
                chuletasArea.classList.remove('hidden');
                chuletasList.innerHTML = wordPool.map(w => `<div style="padding:3px; border-bottom:1px solid #444;">${w}</div>`).join('');
            } else {
                chuletasArea.classList.add('hidden');
                chuletasList.innerHTML = "";
            }
        }

        const grid = document.getElementById('torresPlayersGrid');
        if(grid) {
            grid.innerHTML = "";
            players.forEach(p => {
                if (p.id === app.myPlayerId) return;

                const div = document.createElement('div');
                div.className = "card";
                div.style.padding = "10px";
                div.style.marginBottom = "10px";
                
                if (p.isWinner) div.style.border = "2px solid #f1c40f";
                if (p.isDead) div.style.opacity = "0.5";

                let html = `<div style="font-weight:bold; font-size:1.1em; color:#74b9ff;">${p.name}</div>`;
                
                if (p.isDead) {
                    html += `<div style="color:#ff4757; font-weight:bold;">💀 ELIMINADO</div>`;
                } else if (p.isWinner) {
                    html += `<div style="color:#f1c40f; font-weight:bold;">🏆 ¡GANADOR! (${p.word})</div>`;
                } else {
                    html += `<div style="font-size:1.5em; font-weight:900; color:#fff; margin:5px 0;">${p.word}</div>`;
                }

                if (app.torres.iAmAdmin) {
                    html += `<div style="margin-top:10px; display:flex; gap:5px;">
                        <button class="main-btn" style="padding:5px; font-size:0.8em; background:#f1c40f; color:#222;" onclick="app.torres.win('${p.id}')">${p.isWinner ? 'Deshacer Ganador' : '🏆 Marcar Ganador'}</button>
                        <button class="kick-btn" style="padding:5px; font-size:0.8em; background:#ff4757;" onclick="app.torres.kill('${p.id}')">${p.isDead ? 'Revivir' : '💀 Eliminar'}</button>
                    </div>`;
                }

                div.innerHTML = html;
                grid.appendChild(div);
            });
        }

        const silentArea = document.getElementById('torresSilentArea');
        if(silentArea) {
            if (settings.silentMode) {
                silentArea.classList.remove('hidden');
                const logDiv = document.getElementById('torresChatLog');
                if (chatHistory && logDiv) {
                    logDiv.innerHTML = chatHistory.map(msg => `
                        <div style="margin-bottom:4px; color:#aaa; font-size:0.9em;">
                            <span style="color:#00cec9; font-weight:bold;">${msg.name}:</span> <span style="color:#fff;">${msg.text}</span>
                        </div>
                    `).join('');
                    logDiv.scrollTop = logDiv.scrollHeight;
                }
                const inputEl = document.getElementById('torresInput');
                if(inputEl) inputEl.disabled = (me && me.isDead);
            } else {
                silentArea.classList.add('hidden');
            }
        }

    } else {
        app.showScreen('torresLobby');
    }
});

socket.on('torres_gameSummary', (data) => {
    const modal = document.getElementById('torresSummaryModal');
    if(modal) modal.classList.remove('hidden');
    
    const wList = document.getElementById('torresWinnersList');
    if(wList) {
        wList.innerHTML = data.winners.length > 0 
            ? data.winners.map(w => `<div>🏆 <b style="color:#f1c40f">${w.name}</b> (${w.word})</div>`).join('')
            : "<div style='color:#aaa'>Nadie ganó.</div>";
    }

    const lList = document.getElementById('torresLosersList');
    if(lList) {
        lList.innerHTML = data.losers.length > 0 
            ? data.losers.map(l => `<div>💀 <b style="color:#ff4757">${l.name}</b> (${l.word})</div>`).join('')
            : "<div style='color:#aaa'>Nadie fue eliminado.</div>";
    }
});

socket.on('torres_resetGame', () => {
    const modal = document.getElementById('torresSummaryModal');
    if(modal) modal.classList.add('hidden');
    app.showScreen('torresLobby');
});