app.pinturilloImp = {
    iAmAdmin: false,
    ctx: null,
    isMyTurn: false,
    hasDrawn: false,
    myStrokesThisTurn: 0,
    
    send: (type, val) => socket.emit('pintuImp_action', { type, value: val }),
    
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
        }
    },

    passTurn: () => {
        if(app.pinturilloImp.hasDrawn) {
            app.pinturilloImp.send('pass');
        }
    },
    
    vote: (id) => {
        document.querySelectorAll('.vote-btn').forEach(b => b.classList.remove('selected'));
        const btn = document.getElementById(`pv_${id}`);
        if(btn) btn.classList.add('selected');
        app.pinturilloImp.send('vote', id);
    },
    
    clearVotes: () => app.pinturilloImp.send('clearVotes'),
    revealResults: () => app.pinturilloImp.send('revealResults'),
    kick: (id) => { if(confirm("¿Echar?")) app.pinturilloImp.send('kick', id); },
    kill: (e, id) => { e.stopPropagation(); if(confirm("¿Matar?")) app.pinturilloImp.send('kill', id); },
    
    toggleRole: () => {
        const c = document.getElementById('pintuImpRoleCard');
        if(c.classList.contains('blur-content')) { c.classList.remove('blur-content'); c.classList.add('reveal-content'); }
        else { c.classList.remove('reveal-content'); c.classList.add('blur-content'); }
    },
    backToLobby: () => { if(confirm("¿Salir?")) app.showScreen('hubScreen'); },

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
                for(let i=1; i<stroke.length; i++) {
                    ctx.lineTo(stroke[i].x, stroke[i].y);
                }
                ctx.stroke();
            }
        });
    }
};

socket.on('pintuImpCategories', (cats) => {
    const sel = document.getElementById('pintuCategory');
    if(sel) {
        sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
        if(cats.find(c => c.id === 'MIX')) sel.value = 'MIX';
    }
});

socket.on('pintuImpUpdate', (data) => {
    const { players, gameInProgress, settings, turn, phase } = data;
    const me = players.find(p => p.id === app.myPlayerId);
    app.pinturilloImp.iAmAdmin = me ? me.isAdmin : false;

    if (!gameInProgress) {
        app.showScreen('pinturilloImpLobby');
        document.getElementById('pintuImpCount').innerText = players.length;
        document.getElementById('pintuImpImpostorCount').innerText = settings.impostors;
        document.getElementById('pintuImpSummaryModal').classList.add('hidden'); 
        
        const list = document.getElementById('pintuImpList');
        list.innerHTML = players.map(p => `<li>${p.name} ${p.isAdmin?'👑':''} ${app.pinturilloImp.iAmAdmin && !p.isAdmin ? `<button class="kick-btn" style="width:auto; padding:2px 8px;" onclick="app.pinturilloImp.kick('${p.id}')">❌</button>`:''}</li>`).join('');

        const adminControls = document.getElementById('pintuImpAdminControls');
        const waitMsg = document.getElementById('pintuImpWaitMsg');
        
        if (app.pinturilloImp.iAmAdmin) {
            adminControls.classList.remove('hidden');
            waitMsg.classList.add('hidden');
        } else {
            adminControls.classList.add('hidden');
            waitMsg.classList.remove('hidden');
        }
        
        if(app.pinturilloImp.ctx) app.pinturilloImp.ctx.clearRect(0,0,300,300);
    } 
    else {
        app.showScreen('pinturilloImpGame');
        if(!app.pinturilloImp.ctx) app.pinturilloImp.initCanvas();

        document.getElementById('pintuImpSummaryModal').classList.add('hidden');

        if (phase === 'DRAW') {
            document.getElementById('pintuImpDrawArea').classList.remove('hidden');
            document.getElementById('pintuImpVoteSection').classList.add('hidden');
            document.getElementById('pintuRoundIndicator').innerText = `Vuelta ${turn.currentLap}/${settings.rounds}`;
            
            const drawer = players.find(p => p.id === turn.currentDrawer);
            const isMe = drawer && drawer.id === me.id;
            
            if (isMe && !app.pinturilloImp.isMyTurn) {
                app.pinturilloImp.myStrokesThisTurn = 0;
                app.pinturilloImp.hasDrawn = false;
                document.getElementById('btnPassTurn').disabled = true;
            }
            
            app.pinturilloImp.isMyTurn = isMe;
            
            const drawControls = document.getElementById('myDrawControls');
            if(isMe) drawControls.classList.remove('hidden');
            else drawControls.classList.add('hidden');
            
            document.getElementById('drawStatus').innerText = isMe ? "🖌️ TU TURNO: DIBUJA" : `Esperando a ${drawer ? drawer.name : '...'}`;

        } else {
            document.getElementById('pintuImpDrawArea').classList.remove('hidden'); 
            document.getElementById('myDrawControls').classList.add('hidden');     
            document.getElementById('drawStatus').innerText = "🗳️ Analizad el dibujo y votad";
            app.pinturilloImp.isMyTurn = false; 
            document.getElementById('pintuImpVoteSection').classList.remove('hidden');
            document.getElementById('pintuRoundIndicator').innerText = "Fase de Votación";
            
            const grid = document.getElementById('pintuImpVoteGrid');
            grid.innerHTML = "";
            
            players.forEach(p => {
                const btn = document.createElement('div');
                btn.className = "vote-btn";
                btn.id = `pv_${p.id}`;
                if(p.isDead) btn.classList.add('dead');
                if(me && me.votedFor === p.id) btn.classList.add('selected');

                let html = `<div style="font-weight:bold">${p.name}</div>`;
                if(p.isDead) html += `<div class="eliminated-text">ELIMINADO<br><span style="color:white">${p.revealedRole||'?'}</span></div>`;
                else {
                    if(p.hasVoted) html += `<div class="voted-tick">✅</div>`;
                    if(p.votes > 0) html += `<div style="color:#ffa502; font-weight:bold">${p.votes} VOTOS</div>`;
                }

                if(app.pinturilloImp.iAmAdmin && p.id !== me.id) {
                    html += `<div style="margin-top:5px; z-index:5"><button style="padding:2px; width:30px;" onclick="app.pinturilloImp.kill(event,'${p.id}')">💀</button></div>`;
                }

                btn.innerHTML = html;
                btn.onclick = (e) => { if(e.target.tagName!=='BUTTON' && !p.isDead) app.pinturilloImp.vote(p.id); };
                grid.appendChild(btn);
            });

            ['pintuImpShowRes','pintuImpEndVote','pintuImpClearVote'].forEach(id => {
                const el = document.getElementById(id);
                if(el) {
                    if(app.pinturilloImp.iAmAdmin) el.classList.remove('hidden');
                    else el.classList.add('hidden');
                }
            });
        }
    }
});

socket.on('pintuImpRole', (data) => {
    const roleTitle = document.getElementById('pintuImpRoleTitle');
    const roleWord = document.getElementById('pintuImpRoleWord');
    const hintEl = document.getElementById('pintuImpHint');
    
    if(roleTitle) {
        roleTitle.innerText = data.role;
        roleTitle.style.color = data.role === 'IMPOSTOR' ? '#ff4757' : '#2ed573';
    }
    if(roleWord) {
        roleWord.innerText = data.role === 'IMPOSTOR' ? 'Sin palabra' : data.word;
    }
    if(hintEl) {
        if(data.hint) {
            hintEl.style.display = 'block';
            hintEl.innerText = `Pista: ${data.hint}`;
        } else {
            hintEl.style.display = 'none';
        }
    }
});

socket.on('pintuImpCanvasHistory', (history) => {
    app.pinturilloImp.redraw(history);
});

socket.on('pintuImpDrawOp', (op) => {
    const ctx = app.pinturilloImp.ctx;
    if(!ctx) return;
    
    if(op.type === 'start') {
        ctx.beginPath();
        ctx.moveTo(op.x, op.y);
    } else if (op.type === 'move') {
        ctx.lineTo(op.x, op.y);
        ctx.stroke();
    }
});

socket.on('pintuImpSummary', (data) => {
    const modal = document.getElementById('pintuImpSummaryModal');
    if(modal) modal.classList.remove('hidden');
    const sumWord = document.getElementById('pintuImpSumWord');
    if(sumWord) sumWord.innerText = data.word;
    const sumImpostors = document.getElementById('pintuImpSumImpostors');
    if(sumImpostors) {
        sumImpostors.innerHTML = data.impostors.map(i => `<div>${i.name} ${i.isDead?'(💀)':''}</div>`).join('');
    }
});