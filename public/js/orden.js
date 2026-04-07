app.orden = {
    iAmAdmin: false,
    myCard: null,
    
    send: (type, payload) => socket.emit('orden_action', { type, ...payload }),
    
    syncSettings: () => {
        const cat = document.getElementById('ordenCategory').value;
        const diff = document.getElementById('ordenDifficulty').value;
        const ch = document.getElementById('ordenChuletas')?.checked || false;
        app.orden.send('updateSettings', { category: cat, difficulty: diff, chuletas: ch });
    },

    start: () => app.orden.send('start', {}),
    reset: () => app.orden.send('reset', {}),
    
    toggleReady: () => app.orden.send('toggleReady', {}),
    
    suggest: (targetId, dir) => {
        const btn = document.getElementById(`btn-${dir}-${targetId}`);
        if(btn) {
            btn.classList.add('pulse-anim');
            setTimeout(() => btn.classList.remove('pulse-anim'), 200);
        }
        app.orden.send('suggest', { targetId, dir });
    },

    move: (targetId, dir) => {
        app.orden.send('move', { targetId, dir });
    },

    resolve: () => {
        if(confirm("¿Confirmar orden y terminar ronda?")) {
            app.orden.send('resolve', {});
        }
    },

    toggleCard: () => {
        const c = document.getElementById('ordenCard');
        if(c.classList.contains('blur-content')) { 
            c.classList.remove('blur-content'); 
            c.classList.add('reveal-content'); 
        } else { 
            c.classList.remove('reveal-content'); 
            c.classList.add('blur-content'); 
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const attach = (id) => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('change', () => { if(app.orden.iAmAdmin) app.orden.syncSettings(); });
    };
    attach('ordenCategory');
    attach('ordenDifficulty');
    attach('ordenChuletas');
});

socket.on('ordenPrivate', (valObj) => {
    app.orden.myCard = valObj;
    const wordEl = document.getElementById('ordenMyWord');
    if(wordEl) wordEl.innerText = valObj.val;
    
    const card = document.getElementById('ordenCard');
    if(card) {
        card.classList.remove('reveal-content');
        card.classList.add('blur-content');
    }
});

socket.on('updateOrden', (data) => {
    if (app.currentRoom !== 'orden') return;

    const { players, orderedList, state, settings, categories, wordPool } = data;
    const me = players.find(p => p.id === app.myPlayerId);
    if(me) app.orden.iAmAdmin = me.isAdmin;

    if (state.phase === 'LOBBY') {
        app.showScreen('ordenLobby');
        
        const catSel = document.getElementById('ordenCategory');
        if (catSel && catSel.children.length === 0) {
            categories.forEach(c => {
                catSel.innerHTML += `<option value="${c.key}">${c.label}</option>`;
            });
        }

        if (settings) {
            if(!app.orden.iAmAdmin || document.activeElement !== catSel) catSel.value = settings.category;
            const diffSel = document.getElementById('ordenDifficulty');
            if(!app.orden.iAmAdmin || document.activeElement !== diffSel) diffSel.value = settings.difficulty;
            const chSel = document.getElementById('ordenChuletas');
            if(chSel && (!app.orden.iAmAdmin || document.activeElement !== chSel)) chSel.checked = settings.chuletas;
        }

        const adminPanel = document.getElementById('ordenAdminPanel');
        const waitMsg = document.getElementById('ordenWaitMsg');
        
        if (app.orden.iAmAdmin) {
            adminPanel.classList.remove('hidden');
            waitMsg.classList.add('hidden');
            document.getElementById('ordenCategory').disabled = false;
            document.getElementById('ordenDifficulty').disabled = false;
            const ch = document.getElementById('ordenChuletas');
            if(ch) ch.disabled = false;
        } else {
            adminPanel.classList.remove('hidden');
            waitMsg.classList.remove('hidden');
            document.getElementById('ordenCategory').disabled = true;
            document.getElementById('ordenDifficulty').disabled = true;
            const ch = document.getElementById('ordenChuletas');
            if(ch) ch.disabled = true;
            document.getElementById('btnStartOrden').classList.add('hidden');
        }

        const list = document.getElementById('ordenPlayerList');
        list.innerHTML = players.map(p => `
            <li>
                <span>${p.name} ${p.isAdmin?'👑':''}</span>
                ${app.orden.iAmAdmin && !p.isAdmin ? `<button class="kick-btn" style="padding:2px 8px; width:auto;" onclick="app.orden.send('kick',{targetId:'${p.id}'})">❌</button>` : ''}
            </li>
        `).join('');
    }
    else {
        app.showScreen('ordenGame');
        
        const resArea = document.getElementById('ordenResultArea');
        const listArea = document.getElementById('ordenListArea');
        const controls = document.getElementById('ordenControls');
        const adminControls = document.getElementById('ordenAdminControls');

        const chuletasArea = document.getElementById('ordenChuletasArea');
        const chuletasList = document.getElementById('ordenChuletasList');
        if(chuletasArea && chuletasList) {
            if (settings.chuletas && wordPool && wordPool.length > 0) {
                chuletasArea.classList.remove('hidden');
                chuletasList.innerHTML = wordPool.map(w => `<div style="padding:3px; border-bottom:1px solid #444;">${w}</div>`).join('');
            } else {
                chuletasArea.classList.add('hidden');
            }
        }

        if (state.phase === 'RESULT') {
            resArea.classList.remove('hidden');
            controls.classList.add('hidden');
            adminControls.classList.add('hidden');
            
            const success = state.result.success;
            document.getElementById('ordenResultTitle').innerText = success ? "¡VICTORIA!" : "DERROTA";
            document.getElementById('ordenResultTitle').style.color = success ? "#2ed573" : "#ff4757";
            document.getElementById('ordenResultScore').innerText = `${state.result.score}% Ordenado`;
            
            const correctDiv = document.getElementById('ordenCorrectContainer');
            if (correctDiv && state.result.correctList) {
                let html = '<h4 style="color:#aaa; margin-top:0; border-bottom:1px solid #555; padding-bottom:5px;">Orden Correcto:</h4><ul style="padding:0; list-style:none;">';
                
                state.result.correctList.forEach((item, idx) => {
                    html += `
                        <li style="padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; gap:10px; align-items:center;">
                            <span style="color:#00cec9; font-weight:bold; min-width:20px;">${idx + 1}.</span>
                            <div style="display:flex; flex-direction:column; line-height:1.2;">
                                <span style="font-size:1.1em;">${item.val}</span>
                                <span style="font-size:0.8em; color:#aaa; font-style:italic;">(${item.name})</span>
                            </div>
                        </li>`;
                });
                html += '</ul>';
                correctDiv.innerHTML = html;
            }
            
            if(app.orden.iAmAdmin) document.getElementById('btnOrdenReset').classList.remove('hidden');
            else document.getElementById('btnOrdenReset').classList.add('hidden');

        } else {
            const correctDiv = document.getElementById('ordenCorrectContainer');
            if(correctDiv) correctDiv.innerHTML = "";
            
            resArea.classList.add('hidden');
            controls.classList.remove('hidden');
            if(app.orden.iAmAdmin) adminControls.classList.remove('hidden');
            else adminControls.classList.add('hidden');
        }

        const ul = document.getElementById('ordenSortList');
        ul.innerHTML = "";

        orderedList.forEach((p, index) => {
            const li = document.createElement('li');
            li.className = "orden-item";
            if (state.phase === 'RESULT') {
                li.style.flexDirection = "column";
                li.style.alignItems = "flex-start";
                li.innerHTML = `
                    <div style="width:100%; display:flex; justify-content:space-between; font-weight:bold;">
                        <span>${index+1}. ${p.name}</span>
                        ${p.value ? `<span style="color:#e1b12c">${p.value.val}</span>` : ''}
                    </div>
                `;
            } else {
                const upAction = app.orden.iAmAdmin ? `app.orden.move('${p.id}', 'up')` : `app.orden.suggest('${p.id}', 'up')`;
                const downAction = app.orden.iAmAdmin ? `app.orden.move('${p.id}', 'down')` : `app.orden.suggest('${p.id}', 'down')`;
                
                const upColor = app.orden.iAmAdmin ? '#2ed573' : '#74b9ff';
                const downColor = app.orden.iAmAdmin ? '#2ed573' : '#74b9ff';

                const readyIcon = p.isReady ? '✅' : '⏳';

                li.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px; flex:1;">
                        <span style="font-weight:bold; font-size:1.2em; width:20px;">${index+1}</span>
                        <div style="display:flex; flex-direction:column;">
                            <span style="font-weight:bold;">${p.name}</span>
                            <span style="font-size:0.8em; color:#aaa;">${readyIcon}</span>
                        </div>
                    </div>
                    
                    <div style="display:flex; gap:5px; align-items:center;">
                        <div style="display:flex; flex-direction:column; align-items:center;">
                            <button id="btn-up-${p.id}" onclick="${upAction}" style="padding:5px 10px; background:${upColor}; font-size:1.2em;">▲</button>
                            <span style="font-size:0.7em; color:#aaa;">${p.suggestions.up}</span>
                        </div>
                        <div style="display:flex; flex-direction:column; align-items:center;">
                            <button id="btn-down-${p.id}" onclick="${downAction}" style="padding:5px 10px; background:${downColor}; font-size:1.2em;">▼</button>
                            <span style="font-size:0.7em; color:#aaa;">${p.suggestions.down}</span>
                        </div>
                        ${app.orden.iAmAdmin ? `<button onclick="app.orden.send('kick',{targetId:'${p.id}'})" style="background:#ff4757; padding:5px; font-size:0.8em; margin-left:5px;">❌</button>` : ''}
                    </div>
                `;
            }
            ul.appendChild(li);
        });

        const btnReady = document.getElementById('btnOrdenReady');
        if (me.isReady) {
            btnReady.innerText = "ESPERANDO...";
            btnReady.style.background = "#57606f";
        } else {
            btnReady.innerText = "¡LISTO!";
            btnReady.style.background = "#2ed573";
        }
    }
});