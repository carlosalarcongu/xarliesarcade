app.cyl = {
    iAmAdmin: false,
    send: (type, payload) => socket.emit('cyl_action', { type, ...payload }),
    
    syncSettings: () => {
        const r = document.getElementById('cylRounds').value;
        const d = document.getElementById('cylDuration').value;
        app.cyl.send('updateSettings', { rounds: r, duration: d });
    },

    start: () => app.cyl.send('start', {}),
    reset: () => app.cyl.send('reset', {}),
    confirmRound: () => app.cyl.send('confirmRound', {}),
    
    // Acciones de puntuación
    scoreNumber: (targetId, val) => app.cyl.send('scoreNumber', { targetId, val }),
    scoreLetter: (targetId, val) => app.cyl.send('scoreLetter', { targetId, val })
};

document.addEventListener('DOMContentLoaded', () => {
    const attachSync = (id) => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('change', () => { if(app.cyl.iAmAdmin) app.cyl.syncSettings(); });
    };
    attachSync('cylRounds');
    attachSync('cylDuration');
});

socket.on('updateCyL', (data) => {
    if (app.currentRoom !== 'cifrasyletras') return;

    const { players, state, settings } = data;
    const me = players.find(p => p.id === app.myPlayerId);
    if(me) app.cyl.iAmAdmin = me.isAdmin;

    // --- LOBBY ---
    if (state.phase === 'LOBBY') {
        document.getElementById('cylGame').classList.add('hidden'); // SEGURIDAD EXTRA
        app.showScreen('cylLobby');
        
        // Settings Inputs
        const rInp = document.getElementById('cylRounds');
        const dInp = document.getElementById('cylDuration');
        if(settings) {
            if(!app.cyl.iAmAdmin || document.activeElement !== rInp) rInp.value = settings.totalRounds;
            if(!app.cyl.iAmAdmin || document.activeElement !== dInp) dInp.value = settings.turnDuration;
        }
        
        const adminPanel = document.getElementById('cylAdminPanel');
        const waitMsg = document.getElementById('cylWaitMsg');
        
        if (app.cyl.iAmAdmin) {
            adminPanel.classList.remove('hidden');
            waitMsg.classList.add('hidden');
            rInp.disabled = false; dInp.disabled = false;
        } else {
            adminPanel.classList.remove('hidden'); // Ver config
            waitMsg.classList.remove('hidden');
            rInp.disabled = true; dInp.disabled = true;
            document.getElementById('btnStartCyL').classList.add('hidden');
        }

        const list = document.getElementById('cylPlayerList');
        list.innerHTML = players.map(p => `
            <li>
                <span>${p.name} ${p.isAdmin?'👑':''}</span>
                ${app.cyl.iAmAdmin && !p.isAdmin ? `<button class="kick-btn" style="padding:2px 8px; width:auto;" onclick="app.cyl.send('kick',{targetId:'${p.id}'})">❌</button>` : ''}
            </li>
        `).join('');
    } 
    
    // --- JUEGO (PODIO) ---
    else if (state.phase === 'PODIUM') {
        document.getElementById('cylLobby').classList.add('hidden');
        app.showScreen('cylGame');
        document.getElementById('cylGameArea').classList.add('hidden');
        document.getElementById('cylPodiumArea').classList.remove('hidden');
        
        const sorted = [...players].sort((a,b) => b.score - a.score).slice(0, 3);
        const podiumDiv = document.getElementById('cylPodium');
        podiumDiv.innerHTML = sorted.map((p, i) => `
            <div class="podium-bar ${i===0?'p-gold':(i===1?'p-silver':'p-bronze')}" style="height:${150 - i*30}px; width:80px;">
                <span style="font-size:2em;">${i===0?'🥇':(i===1?'🥈':'🥉')}</span>
                <span class="p-name">${p.name}</span>
                <span style="font-weight:bold">${p.score}</span>
            </div>
        `).join('');
    }

    // --- JUEGO (RONDAS) ---
    else {
        document.getElementById('cylLobby').classList.add('hidden');
        app.showScreen('cylGame');
        document.getElementById('cylPodiumArea').classList.add('hidden');
        document.getElementById('cylGameArea').classList.remove('hidden');

        // Header
        const typeLabel = state.type === 'NUMBERS' ? 'CIFRAS' : 'LETRAS';
        document.getElementById('cylHeader').innerHTML = `
            <span style="color:#aaa">Ronda ${state.round}/${settings.totalRounds}</span>
            <h2 style="margin:5px 0; color:${state.type==='NUMBERS'?'#74b9ff':'#ff7675'}">${typeLabel}</h2>
        `;

        // Content (Numbers / Letters)
        const contentDiv = document.getElementById('cylContent');
        if (state.phase === 'PRE_ROUND') {
            contentDiv.innerHTML = `<h1 style="font-size:4em; animation:pulse 0.5s infinite">${state.timer}</h1>`;
        } else {
            let html = "";
            
            // TARGET (Solo Cifras)
            if (state.type === 'NUMBERS' && state.target) {
                html += `<div style="background:#2f3542; padding:10px; border-radius:10px; margin-bottom:15px; border:2px solid #74b9ff;">
                    <div style="font-size:0.9em; color:#aaa;">OBJETIVO</div>
                    <div style="font-size:3em; font-weight:900; color:white;">${state.target}</div>
                </div>`;
            }

            // CARDS
            html += `<div style="display:flex; flex-wrap:wrap; justify-content:center; gap:5px;">`;
            state.dataset.forEach(item => {
                const color = state.type === 'NUMBERS' ? '#0984e3' : '#d63031';
                html += `<div style="background:${color}; color:white; width:50px; height:60px; display:flex; justify-content:center; align-items:center; font-size:1.5em; font-weight:bold; border-radius:5px; box-shadow:0 3px 0 rgba(0,0,0,0.3);">${item}</div>`;
            });
            html += `</div>`;
            
            // TIMER
            if (state.phase === 'PLAYING') {
                html += `<div style="margin-top:20px; font-size:2em; font-family:monospace;">⏱️ ${state.timer}</div>`;
            } else {
                html += `<div style="margin-top:20px; color:#aaa;">TIEMPO AGOTADO</div>`;
            }

            contentDiv.innerHTML = html;
        }

        // SCORING PANEL (Solo admin en fase SCORING)
        const scoringDiv = document.getElementById('cylScoring');
        if (state.phase === 'SCORING') {
            scoringDiv.classList.remove('hidden');
            
            let html = `<h3 style="margin-bottom:10px;">Puntuaciones</h3>`;
            
            if (app.cyl.iAmAdmin) {
                html += `<div style="display:flex; flex-direction:column; gap:5px;">`;
                players.forEach(p => {
                    const currentVal = p.roundScore !== null ? p.roundScore : '-';
                    
                    html += `<div style="background:#2f3542; padding:8px; border-radius:5px; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:bold;">${p.name}</span>
                        <div style="display:flex; gap:5px; align-items:center;">
                            <span style="margin-right:10px; color:#e1b12c; font-weight:bold;">+${currentVal}</span>`;
                    
                    if (state.type === 'NUMBERS') {
                        html += `
                            <button onclick="app.cyl.scoreNumber('${p.id}', 0)" style="background:#ff4757; padding:5px 10px;">❌</button>
                            <button onclick="app.cyl.scoreNumber('${p.id}', 2)" style="background:#ffa502; padding:5px 10px;">&lt;10</button>
                            <button onclick="app.cyl.scoreNumber('${p.id}', 5)" style="background:#2ed573; padding:5px 10px;">✅</button>
                        `;
                    } else {
                        // Letras: Input numérico
                        html += `
                            <input type="number" style="width:50px; padding:5px; text-align:center;" 
                                   value="${currentVal !== '-' ? currentVal : ''}" 
                                   onchange="app.cyl.scoreLetter('${p.id}', this.value)">
                        `;
                    }
                    html += `</div></div>`;
                });
                html += `</div>`;
                html += `<button onclick="app.cyl.confirmRound()" class="main-btn" style="margin-top:15px; background:#6c5ce7;">Siguiente Ronda ➡</button>`;
            } else {
                // Vista Jugador Esperando
                html += `<p style="color:#aaa;">El administrador está verificando resultados...</p>`;
                html += `<ul style="text-align:left;">`;
                players.forEach(p => {
                    html += `<li>${p.name}: <span style="float:right; color:#e1b12c; font-weight:bold;">+${p.roundScore!==null?p.roundScore:'?'}</span></li>`;
                });
                html += `</ul>`;
            }
            scoringDiv.innerHTML = html;

        } else {
            scoringDiv.classList.add('hidden');
        }
    }
});

socket.on('timerTick', (val) => {
    if (app.currentRoom !== 'cifrasyletras') return;
    
    const contentDiv = document.getElementById('cylContent');
    if (!contentDiv) return;
    const giantTimer = contentDiv.querySelector('h1');
    if (giantTimer) {
        giantTimer.innerText = val;
        return;
    }
    const timerDiv = contentDiv.querySelector('div[style*="monospace"]');
    if (timerDiv) {
        timerDiv.innerText = `⏱️ ${val}`;
    }
});

socket.on('playSound', (type) => {
    if (app.currentRoom === 'cifrasyletras' && type === 'timeout') {
        document.getElementById('dieSound').play().catch(()=>{});
    }
});