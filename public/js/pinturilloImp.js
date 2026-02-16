app.pinturilloImp = {
    iAmAdmin: false,
    ctx: null,
    isMyTurn: false,
    hasDrawn: false,
    myStrokesThisTurn: 0,
    
    init: () => {
        app.showScreen('pinturilloImpLobby');
        app.pinturilloImp.isMyTurn = false;
        app.pinturilloImp.hasDrawn = false;
        app.pinturilloImp.myStrokesThisTurn = 0;

        // Inicializar Chat (Enter y Drag)
        app.pinturilloImp.initChatFeatures();

        // --- LISTENERS PARA SINCRONIZACIÓN EN TIEMPO REAL ---
        const roundsInput = document.getElementById('pintuRounds');
        const catInput = document.getElementById('pintuCategory');
        const hintsInput = document.getElementById('pintuHints');
        
        const sync = () => app.pinturilloImp.syncSettings();
        
        if(roundsInput) roundsInput.onchange = sync;
        if(catInput) catInput.onchange = sync;
        if(hintsInput) hintsInput.onchange = sync;
    },

    send: (type, val) => socket.emit('pintuImp_action', { type, value: val }),
    
    syncSettings: () => {
        if (!app.pinturilloImp.iAmAdmin) return;
        const rounds = document.getElementById('pintuRounds').value;
        const cat = document.getElementById('pintuCategory').value;
        const hints = document.getElementById('pintuHints').checked;
        app.pinturilloImp.send('update_settings', { rounds, category: cat, hints });
    },
    
    initChatFeatures: () => {
        const input = document.getElementById('pintuChatInput');
        if(input) {
            input.onkeydown = null; 
            input.onkeydown = (e) => { if(e.key === 'Enter') app.pinturilloImp.sendChat(); };
        }

        const container = document.getElementById('pintuChatContainer');
        const chatBox = document.getElementById('pintuChatBox'); 
        const handle = document.getElementById('btnOpenChat');
        
        if(!container || !handle) return;

        // --- FIX SCROLL CHAT ---
        // Evita que tocar dentro de la caja de mensajes inicie el arrastre de la ventana
        if(chatBox) {
            chatBox.addEventListener('touchmove', (e) => e.stopPropagation(), {passive: true});
            chatBox.addEventListener('mousedown', (e) => e.stopPropagation());
        }

        let isDragging = false;
        let shiftX, shiftY; 

        const startDrag = (e) => {
            // No iniciar drag si tocamos input, boton cerrar o DENTRO de la caja de mensajes
            if(e.target.tagName === 'INPUT' || e.target.innerText === '✖' || e.target.closest('#pintuChatBox')) return;

            isDragging = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const rect = container.getBoundingClientRect();
            shiftX = clientX - rect.left;
            shiftY = clientY - rect.top;

            // Fijar posición absoluta al iniciar arrastre
            container.style.bottom = 'auto';
            container.style.right = 'auto';
            container.style.left = rect.left + 'px';
            container.style.top = rect.top + 'px';
            
            handle.style.cursor = 'grabbing';
        };

        const onDrag = (e) => {
            if (!isDragging) return;
            e.preventDefault(); 

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            let newLeft = clientX - shiftX;
            let newTop = clientY - shiftY;

            const maxLeft = window.innerWidth - container.offsetWidth;
            const maxTop = window.innerHeight - container.offsetHeight;
            
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            newTop = Math.max(0, Math.min(newTop, maxTop));

            container.style.left = newLeft + 'px';
            container.style.top = newTop + 'px';
        };

        const stopDrag = () => {
            isDragging = false;
            handle.style.cursor = 'grab';
        };

        handle.removeEventListener('mousedown', startDrag);
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', stopDrag);
        handle.removeEventListener('touchstart', startDrag);
        window.removeEventListener('touchmove', onDrag);
        window.removeEventListener('touchend', stopDrag);

        handle.addEventListener('mousedown', startDrag);
        window.addEventListener('mousemove', onDrag);
        window.addEventListener('mouseup', stopDrag);
        
        handle.addEventListener('touchstart', startDrag, {passive: false});
        window.addEventListener('touchmove', onDrag, {passive: false});
        window.addEventListener('touchend', stopDrag);
    },

    toggleChat: () => {
        const inputGroup = document.getElementById('pintuChatInputGroup');
        const openBtn = document.getElementById('btnOpenChat');
        
        if (inputGroup.classList.contains('hidden')) {
            inputGroup.classList.remove('hidden');
            openBtn.classList.add('hidden'); 
            setTimeout(() => document.getElementById('pintuChatInput').focus(), 50);
        } else {
            inputGroup.classList.add('hidden');
            openBtn.classList.remove('hidden'); 
        }
    },
    
    sendChat: () => {
        const input = document.getElementById('pintuChatInput');
        const txt = input.value.trim();
        if(txt) {
            app.pinturilloImp.send('chat', txt);
            input.value = '';
            app.pinturilloImp.toggleChat(); 
        }
    },

    start: () => {
        const rounds = document.getElementById('pintuRounds').value;
        const cat = document.getElementById('pintuCategory').value;
        const hints = document.getElementById('pintuHints').checked;
        app.pinturilloImp.send('start', { rounds, category: cat, hints });
    },
    
    reset: () => app.pinturilloImp.send('reset'),
    changeImpostors: (v) => app.pinturilloImp.send('changeImpostors', v),
    
    undo: () => {
        if(app.pinturilloImp.myStrokesThisTurn > 0) {
            app.pinturilloImp.myStrokesThisTurn--;
            if(app.pinturilloImp.myStrokesThisTurn === 0) {
                document.getElementById('btnPassTurn').disabled = true;
                app.pinturilloImp.hasDrawn = false;
            }
            app.pinturilloImp.send('undo');
        } else {
            const btn = document.querySelector('#myDrawControls button:first-child');
            btn.style.background = '#555';
            setTimeout(() => btn.style.background = '#eb4d4b', 200);
        }
    },

    passTurn: () => {
        if(app.pinturilloImp.hasDrawn) {
            app.pinturilloImp.send('pass');
        }
    },
    
    vote: (id) => {
        app.pinturilloImp.send('vote', id);
    },
    
    kick: (e, id) => { if(e) e.stopPropagation(); if(confirm("¿Echar jugador?")) app.pinturilloImp.send('kick', id); },
    kill: (e, id) => { if(e) e.stopPropagation(); app.pinturilloImp.send('kill', id); },
    
    clearVotes: () => app.pinturilloImp.send('clearVotes'),
    revealResults: () => app.pinturilloImp.send('revealResults'),
    
    toggleRole: () => {
        const c = document.getElementById('pintuImpRoleCard');
        c.classList.toggle('blur-content');
        c.classList.toggle('reveal-content');
    },

    initCanvas: () => {
        const canvas = document.getElementById('pintuImpCanvas');
        if(!canvas) return;
        
        app.pinturilloImp.ctx = canvas.getContext('2d');
        app.pinturilloImp.ctx.lineWidth = 3;
        app.pinturilloImp.ctx.lineCap = 'round';
        app.pinturilloImp.ctx.strokeStyle = '#000';

        let drawing = false;

        const start = (e) => {
            if(!app.pinturilloImp.isMyTurn) return;
            drawing = true;
            app.pinturilloImp.hasDrawn = true;
            app.pinturilloImp.myStrokesThisTurn++; 
            document.getElementById('btnPassTurn').disabled = false;
            const pos = getPos(e);
            app.pinturilloImp.send('draw_start', pos);
            app.pinturilloImp.ctx.beginPath();
            app.pinturilloImp.ctx.moveTo(pos.x, pos.y);
        };
        const move = (e) => {
            if(!drawing || !app.pinturilloImp.isMyTurn) return;
            const pos = getPos(e);
            app.pinturilloImp.send('draw_move', pos);
            app.pinturilloImp.ctx.lineTo(pos.x, pos.y);
            app.pinturilloImp.ctx.stroke();
        };
        const end = () => {
            if(!drawing) return;
            drawing = false;
            if(app.pinturilloImp.isMyTurn) app.pinturilloImp.send('draw_end');
        };
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        };
        canvas.onmousedown = start;
        canvas.ontouchstart = (e) => { e.preventDefault(); start(e); };
        window.addEventListener('mousemove', move);
        window.addEventListener('touchmove', (e) => { if(drawing) e.preventDefault(); move(e); }, {passive: false});
        window.addEventListener('mouseup', end);
        window.addEventListener('touchend', end);
    },

    redraw: (history) => {
        const ctx = app.pinturilloImp.ctx;
        if(!ctx) return;
        ctx.clearRect(0, 0, 300, 300);
        history.forEach(stroke => {
            ctx.beginPath();
            if(stroke.length > 0) {
                ctx.moveTo(stroke[0].x, stroke[0].y);
                for(let i=1; i<stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
                ctx.stroke();
            }
        });
    }
};

// --- RECEPCIÓN DE DATOS DEL SERVIDOR ---

socket.on('pintuImpUpdate', (data) => {
    const { players, gameInProgress, settings, turn, phase, chat } = data;
    if (!players) return;
    const me = players.find(p => p.id === app.myPlayerId);
    app.pinturilloImp.iAmAdmin = me ? me.isAdmin : false;

    // --- CHAT RENDER ---
    const chatBox = document.getElementById('pintuChatBox');
    if(chat && chatBox) {
        if (chatBox.childElementCount !== chat.length) {
            chatBox.innerHTML = chat.map(c => 
                `<div><b style="color:${c.name===(me?.name)?'#74b9ff':'#ffa502'}">${c.name}:</b> ${c.text}</div>`
            ).join('');
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    }

    // --- LISTA MODAL ---
    const inGameList = document.getElementById('pintuImpInGameList');
    if (inGameList) {
        inGameList.innerHTML = players.map(p => {
            let row = `<li style="justify-content:space-between;">
                <span>${p.name} ${p.isAdmin ? '👑' : ''} ${p.isDead ? '💀' : ''}</span>`;
            if (app.pinturilloImp.iAmAdmin && p.id !== (me?.id)) {
                row += `<button class="kick-btn" style="width:auto; padding:5px 10px; font-size:0.8em;" onclick="app.pinturilloImp.kick(event, '${p.id}')">ECHAR</button>`;
            }
            row += `</li>`;
            return row;
        }).join('');
    }

    if (!gameInProgress) {
        app.showScreen('pinturilloImpLobby');
        document.getElementById('pintuImpCount').innerText = players.length;
        document.getElementById('pintuImpImpostorCount').innerText = settings.impostors;
        
        // --- SINCRONIZACIÓN VISUAL DE INPUTS (Para no-admins) ---
        if (!app.pinturilloImp.iAmAdmin) {
            const rIn = document.getElementById('pintuRounds');
            const cIn = document.getElementById('pintuCategory');
            const hIn = document.getElementById('pintuHints');
            
            if(rIn && settings.rounds) rIn.value = settings.rounds;
            if(cIn && settings.category) cIn.value = settings.category;
            if(hIn) hIn.checked = settings.hints;
            
            // Bloquear inputs
            if(rIn) rIn.disabled = true;
            if(cIn) cIn.disabled = true;
            if(hIn) hIn.disabled = true;
        } else {
            // Desbloquear si soy admin
            document.getElementById('pintuRounds').disabled = false;
            document.getElementById('pintuCategory').disabled = false;
            document.getElementById('pintuHints').disabled = false;
        }

        document.getElementById('pintuImpList').innerHTML = players.map(p => `<li>${p.name} ${p.isAdmin?'👑':''} ${app.pinturilloImp.iAmAdmin && !p.isAdmin ? `<button class="kick-btn" style="width:auto; padding:2px 8px;" onclick="app.pinturilloImp.kick(event, '${p.id}')">❌</button>`:''}</li>`).join('');
        
        const ac = document.getElementById('pintuImpAdminControls');
        const wm = document.getElementById('pintuImpWaitMsg');
        if (app.pinturilloImp.iAmAdmin) { ac.classList.remove('hidden'); wm.classList.add('hidden'); } 
        else { ac.classList.add('hidden'); wm.classList.remove('hidden'); }
        
        if(app.pinturilloImp.ctx) app.pinturilloImp.ctx.clearRect(0,0,300,300);
    } 
    else {
        app.showScreen('pinturilloImpGame');
        if(!app.pinturilloImp.ctx) app.pinturilloImp.initCanvas();

        const drawer = players.find(p => p.id === turn.currentDrawer);
        const isMe = drawer && (me && drawer.id === me.id);

        if (isMe && !app.pinturilloImp.isMyTurn) {
            app.pinturilloImp.myStrokesThisTurn = 0;
            app.pinturilloImp.hasDrawn = false;
            document.getElementById('btnPassTurn').disabled = true;
        }
        app.pinturilloImp.isMyTurn = isMe;

        // --- INDICADOR CON CATEGORÍA ---
        const catText = settings.category === 'MIX' ? 'MIX' : settings.category;
        document.getElementById('pintuRoundIndicator').innerHTML = phase === 'VOTE' 
            ? "VOTACIÓN" 
            : `Vuelta ${turn.currentLap}/${settings.rounds} <span style="font-size:0.8em; opacity:0.8; margin-left:10px;">(${catText})</span>`;
        
        document.getElementById('drawStatus').innerText = phase === 'VOTE' ? "🗳️ ¡A VOTAR!" : (isMe ? "🖌️ TU TURNO" : `Dibuja: ${drawer?.name}`);
        
        const drawControls = document.getElementById('myDrawControls');
        if(isMe && phase === 'DRAW') drawControls.classList.remove('hidden');
        else drawControls.classList.add('hidden');

        // Grid Votación
        const grid = document.getElementById('pintuImpVoteGrid');
        grid.innerHTML = "";
        players.forEach(p => {
            const btn = document.createElement('div');
            btn.className = "vote-btn";
            btn.id = `pv_${p.id}`;
            if(p.isDead) btn.classList.add('dead');
            if(me && me.votedFor === p.id) btn.classList.add('selected');

            let html = `<div style="font-weight:bold; font-size:0.8em">${p.name}</div>`;
            if(p.isDead) html += `<div class="eliminated-text">MUERTO<br><span style="color:#74b9ff; font-size:0.7em">${p.revealedRole||''}</span></div>`;
            else {
                if(p.hasVoted) html += `<div class="voted-tick" style="font-size:0.8em; top:2px; right:2px;">✔</div>`;
                if(p.votes > 0) html += `<div style="color:#ffa502; font-weight:bold; font-size:0.8em">${p.votes} VOTOS</div>`;
            }

            if(app.pinturilloImp.iAmAdmin && p.id !== (me?.id)) {
                html += `<div style="margin-top:2px; display:flex; justify-content:center; gap:5px;">
                    <button class="kick-btn" style="padding:0 5px; font-size:1em; border:1px solid #aaa;" onclick="app.pinturilloImp.kill(event,'${p.id}')">💀</button>
                    <button class="kick-btn" style="padding:0 5px; font-size:1em; background:#ff4757; border:1px solid white;" onclick="app.pinturilloImp.kick(event,'${p.id}')">👢</button>
                </div>`;
            }
            btn.innerHTML = html;
            btn.onclick = (e) => { if(e.target.tagName!=='BUTTON' && !p.isDead) app.pinturilloImp.vote(p.id); };
            grid.appendChild(btn);
        });

        ['pintuImpShowRes','pintuImpEndVote','pintuImpClearVote'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.toggle('hidden', !app.pinturilloImp.iAmAdmin);
        });
    }
});

socket.on('pintuImpCategories', (cats) => {
    const sel = document.getElementById('pintuCategory');
    if(sel) sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
});
socket.on('pintuImpRole', (data) => {
    document.getElementById('pintuImpRoleTitle').innerText = data.role;
    document.getElementById('pintuImpRoleTitle').style.color = data.role==='IMPOSTOR'?'#ff4757':'#2ed573';
    document.getElementById('pintuImpRoleWord').innerText = data.role==='IMPOSTOR'?'???':data.word;
    const h = document.getElementById('pintuImpHint');
    if(data.hint) { h.style.display='block'; h.innerText=`Pista: ${data.hint}`; } else h.style.display='none';
});
socket.on('pintuImpCanvasHistory', (h) => app.pinturilloImp.redraw(h));
socket.on('pintuImpDrawOp', (op) => {
    const ctx = app.pinturilloImp.ctx; if(!ctx) return;
    if(op.type==='start'){ ctx.beginPath(); ctx.moveTo(op.x, op.y); }
    else { ctx.lineTo(op.x, op.y); ctx.stroke(); }
});
socket.on('pintuImpSummary', (d) => {
    document.getElementById('pintuImpSummaryModal').classList.remove('hidden');
    document.getElementById('pintuImpSumWord').innerText = d.word;
    document.getElementById('pintuImpSumImpostors').innerHTML = d.impostors.map(i=>`<div>${i.name}</div>`).join('');
});
socket.on('forceRefresh', () => location.reload());