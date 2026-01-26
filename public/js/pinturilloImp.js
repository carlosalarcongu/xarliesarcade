app.pinturilloImp = {
    iAmAdmin: false,
    ctx: null,
    isMyTurn: false,
    hasDrawn: false,
    
    // Envío de acciones al servidor con el tipo 'pintuImp_action'
    send: (type, val) => socket.emit('pintuImp_action', { type, value: val }),
    
    start: () => app.pinturilloImp.send('start'),
    reset: () => app.pinturilloImp.send('reset'),
    changeImpostors: (v) => app.pinturilloImp.send('changeImpostors', v),
    
    undo: () => app.pinturilloImp.send('undo'),
    passTurn: () => app.pinturilloImp.send('pass'),
    
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
        const c = document.getElementById('pintuImpRoleCard'); // ID actualizado
        if(c.classList.contains('blur-content')) { c.classList.remove('blur-content'); c.classList.add('reveal-content'); }
        else { c.classList.remove('reveal-content'); c.classList.add('blur-content'); }
    },
    backToLobby: () => { if(confirm("¿Salir?")) app.showScreen('hubScreen'); },

    initCanvas: () => {
        const canvas = document.getElementById('pintuImpCanvas'); // ID actualizado
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
            const btnPass = document.getElementById('btnPassTurn');
            if(btnPass) btnPass.disabled = false;
            
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
        // Usamos window para capturar si se sale del canvas
        window.addEventListener('mousemove', move);
        window.addEventListener('touchmove', (e) => { if(drawing) e.preventDefault(); move(e); }, {passive: false});
        window.addEventListener('mouseup', end);
        window.addEventListener('touchend', end);
    },

    redraw: (history) => {
        const ctx = app.pinturilloImp.ctx;
        if(!ctx) return;
        ctx.clearRect(0, 0, 300, 300); // Asumiendo tamaño fijo 300x300
        
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

// Escuchar actualizaciones del estado del juego
socket.on('pintuImpUpdate', (data) => {
    const { players, gameInProgress, settings, turn, phase } = data;
    const me = players.find(p => p.id === app.myPlayerId);
    app.pinturilloImp.iAmAdmin = me ? me.isAdmin : false;

    // LOBBY
    if (!gameInProgress) {
        app.showScreen('pinturilloImpLobby'); // ID actualizado
        document.getElementById('pintuImpCount').innerText = players.length; // ID actualizado
        document.getElementById('pintuImpImpostorCount').innerText = settings.impostors; // ID actualizado
        
        const list = document.getElementById('pintuImpList'); // ID actualizado
        list.innerHTML = players.map(p => `<li>${p.name} ${p.isAdmin?'👑':''} ${app.pinturilloImp.iAmAdmin && !p.isAdmin ? `<button class="kick-btn" style="width:auto; padding:2px 8px;" onclick="app.pinturilloImp.kick('${p.id}')">❌</button>`:''}</li>`).join('');

        const adminControls = document.getElementById('pintuImpAdminControls'); // ID actualizado
        const waitMsg = document.getElementById('pintuImpWaitMsg'); // ID actualizado
        
        if (app.pinturilloImp.iAmAdmin) {
            adminControls.classList.remove('hidden');
            waitMsg.classList.add('hidden');
        } else {
            adminControls.classList.add('hidden');
            waitMsg.classList.remove('hidden');
        }
        
        // Reset canvas context si existe
        if(app.pinturilloImp.ctx) app.pinturilloImp.ctx.clearRect(0,0,300,300);
    } 
    // GAME
    else {
        app.showScreen('pinturilloImpGame'); // ID actualizado
        if(!app.pinturilloImp.ctx) app.pinturilloImp.initCanvas();

        if (phase === 'DRAW') {
            document.getElementById('pintuImpDrawArea').classList.remove('hidden'); // ID actualizado
            document.getElementById('pintuImpVoteSection').classList.add('hidden'); // ID actualizado
            
            const drawer = players.find(p => p.id === turn.currentDrawer);
            const isMe = drawer && drawer.id === me.id;
            app.pinturilloImp.isMyTurn = isMe;
            
            const drawControls = document.getElementById('myDrawControls');
            if(isMe) drawControls.classList.remove('hidden');
            else drawControls.classList.add('hidden');
            
            document.getElementById('drawStatus').innerText = isMe ? "🖌️ TU TURNO: DIBUJA" : `Esperando a ${drawer ? drawer.name : '...'}`;
            
            if(isMe && !app.pinturilloImp.hasDrawn) {
                const btnPass = document.getElementById('btnPassTurn');
                if(btnPass) btnPass.disabled = true;
            }

        } else {
            // VOTING
            document.getElementById('pintuImpDrawArea').classList.add('hidden');
            document.getElementById('pintuImpVoteSection').classList.remove('hidden');
            
            const grid = document.getElementById('pintuImpVoteGrid'); // ID actualizado
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

                if(app.pinturilloImp.iAmAdmin && p.id !== me.id) { // Permitir admin acciones sobre otros
                    html += `<div style="margin-top:5px; z-index:5"><button style="padding:2px; width:30px;" onclick="app.pinturilloImp.kill(event,'${p.id}')">💀</button></div>`;
                }

                btn.innerHTML = html;
                btn.onclick = (e) => { if(e.target.tagName!=='BUTTON' && !p.isDead) app.pinturilloImp.vote(p.id); };
                grid.appendChild(btn);
            });

            // Admin buttons visibility
            ['pintuImpShowRes','pintuImpEndVote','pintuImpClearVote'].forEach(id => { // IDs actualizados
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
    const roleTitle = document.getElementById('pintuImpRoleTitle'); // ID actualizado
    const roleWord = document.getElementById('pintuImpRoleWord'); // ID actualizado
    
    if(roleTitle) {
        roleTitle.innerText = data.role;
        roleTitle.style.color = data.role === 'IMPOSTOR' ? '#ff4757' : '#2ed573';
    }
    if(roleWord) {
        roleWord.innerText = data.role === 'IMPOSTOR' ? 'Sin palabra' : data.word;
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
    const modal = document.getElementById('pintuImpSummaryModal'); // ID actualizado
    if(modal) modal.classList.remove('hidden');
    
    const sumWord = document.getElementById('pintuImpSumWord'); // ID actualizado
    if(sumWord) sumWord.innerText = data.word;
    
    const sumImpostors = document.getElementById('pintuImpSumImpostors'); // ID actualizado
    if(sumImpostors) {
        sumImpostors.innerHTML = data.impostors.map(i => `<div>${i.name} ${i.isDead?'(💀)':''}</div>`).join('');
    }
});