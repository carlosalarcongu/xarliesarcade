app.lobo = {
    iAmAdmin: false,
    myRole: null,
    settings: {}, 
    phase: null,
    players: [], // Almacén local de jugadores para buscar nombres
    
    // Ajustes
    adj: (key, val) => {
        let curr = app.lobo.settings.wolvesCount || 2;
        socket.emit('lobo_action', { type: 'updateSetting', key: 'wolvesCount', value: curr + val });
    },
    tog: (key) => {
        const currentVal = app.lobo.settings[key]; 
        socket.emit('lobo_action', { type: 'updateSetting', key, value: !currentVal });
    },
    
    start: () => socket.emit('lobo_action', { type: 'start' }),
    reset: () => socket.emit('lobo_action', { type: 'reset' }),
    backToLobby: () => { if(confirm("¿Volver?")) app.goBackToHub(false); },
    
    sendPhaseAction: () => {
        socket.emit('lobo_action', { type: 'phaseReady' });
        const btn = document.getElementById('btnLoboPhaseAction');
        if(btn) {
            btn.innerText = "⏳ Esperando...";
            btn.disabled = true;
            btn.style.opacity = "0.5";
        }
    },

    wolfAttack: (id) => {
        document.querySelectorAll('.wolf-target-btn').forEach(b => b.style.borderColor = '#444');
        const btn = document.getElementById('wolf_target_' + id);
        if(btn) btn.style.borderColor = '#ff4757';
        socket.emit('lobo_action', { type: 'wolfAttack', targetId: id });
    },

    useRevive: () => {
        if(confirm("¿Usar poción para revivir a esta persona?")) {
            socket.emit('lobo_action', { type: 'witchAction', subType: 'revive' });
            document.getElementById('witchReviveArea').classList.add('hidden');
        }
    },
    
    useKill: (id) => {
        if(confirm("¿Usar poción de MUERTE contra este jugador?")) {
            socket.emit('lobo_action', { type: 'witchAction', subType: 'kill', targetId: id });
            document.getElementById('witchKillArea').innerHTML = "<p>☠️ Poción usada</p>";
        }
    },

    vote: (id) => { socket.emit('lobo_action', { type: 'vote', targetId: id }); },
    clearVotes: () => socket.emit('lobo_action', { type: 'clearVotes' }),
    kill: (e, id) => { 
        e.stopPropagation(); 
        if(confirm("¿Ejecutar/Revivir (Admin)?")) socket.emit('lobo_action', { type: 'kill', targetId: id }); 
    },
    toggleRole: () => {
        const c = document.getElementById('loboCard');
        if(c) {
            if(c.classList.contains('blur-content')) { c.classList.remove('blur-content'); c.classList.add('reveal-content'); }
            else { c.classList.remove('reveal-content'); c.classList.add('blur-content'); }
        }
    },

    renderTimeline: (currentPhase, sequence, defs) => {
        const container = document.getElementById('loboTimeline');
        if(!container) return;
        container.innerHTML = "";
        
        if(!sequence || sequence.length === 0) return;

        sequence.forEach((phaseId, index) => {
            const def = defs[phaseId];
            if(!def) return;

            const span = document.createElement('span');
            span.className = "timeline-step";
            span.innerText = def.label;
            
            if (phaseId === currentPhase) {
                span.classList.add('active');
            }
            
            container.appendChild(span);

            if (index < sequence.length - 1) {
                const arrow = document.createElement('span');
                arrow.className = "timeline-arrow";
                arrow.innerText = "→";
                container.appendChild(arrow);
            }
        });
    }
};

socket.on('updateLoboList', (data) => {
    if (app.currentRoom !== 'lobo') return;

    const { players, gameInProgress, settings, turnData } = data;
    app.lobo.players = players; 
    app.lobo.settings = settings; 
    app.lobo.phase = turnData.phase;

    const me = players.find(p => p.id === app.myPlayerId);
    if(me) app.lobo.iAmAdmin = me.isAdmin;

    // 1. RENDER LOBBY
    if (!gameInProgress) {
        app.showScreen('loboLobby');
        document.getElementById('loboWinModal').classList.add('hidden');
        document.getElementById('loboTimeline').innerHTML = ""; 

        document.getElementById('val_wolvesCount').innerText = settings.wolvesCount;
        document.getElementById('loboPlayerCount').innerText = players.length;

        const roleMap = {'hasSeer': 'btn_hasSeer', 'hasGirl': 'btn_hasGirl', 'hasCupid': 'btn_hasCupid', 'hasHunter': 'btn_hasHunter', 'hasWitch': 'btn_hasWitch', 'hasSheriff': 'btn_hasSheriff'};
        Object.keys(roleMap).forEach(key => {
            const btn = document.getElementById(roleMap[key]);
            const span = document.getElementById('val_' + key);
            if(btn && span) {
                if (settings[key]) { btn.classList.add('selected'); span.innerText = "SI"; } 
                else { btn.classList.remove('selected'); span.innerText = "NO"; }
            }
        });

        const adminPanel = document.getElementById('loboAdminPanel');
        const waitMsg = document.getElementById('loboWaitMsg');
        
        adminPanel.classList.remove('hidden'); 
        
        const allBtns = adminPanel.querySelectorAll('button');
        allBtns.forEach(b => b.disabled = !app.lobo.iAmAdmin);

        if (!app.lobo.iAmAdmin) {
            adminPanel.style.opacity = "0.7";
            waitMsg.classList.remove('hidden');
            const startBtn = adminPanel.querySelector('.start-btn');
            if(startBtn) startBtn.style.display = 'none';
        } else {
            adminPanel.style.opacity = "1";
            waitMsg.classList.add('hidden');
            const startBtn = adminPanel.querySelector('.start-btn');
            if(startBtn) startBtn.style.display = 'block';
        }

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
    } 
    // 2. RENDER JUEGO
    else {
        app.showScreen('loboGame');
        
        if (turnData.phase === 'GAME_OVER') {
            document.getElementById('loboNightActionArea').classList.add('hidden');
            document.getElementById('btnLoboPhaseAction').classList.add('hidden');
            return; 
        }

        app.lobo.renderTimeline(turnData.phase, turnData.sequence, turnData.phaseDefs);

        const phaseTitle = document.getElementById('loboPhaseTitle');
        const phaseDesc = document.getElementById('loboPhaseDesc');
        const btnAction = document.getElementById('btnLoboPhaseAction');
        const nightArea = document.getElementById('loboNightActionArea');
        const daySection = document.getElementById('loboDaySection');
        const waitText = document.getElementById('loboWaitingText');

        if(nightArea) nightArea.classList.add('hidden');
        if(daySection) daySection.classList.add('hidden');
        if(btnAction) {
            btnAction.disabled = false;
            btnAction.style.opacity = "1";
            btnAction.classList.remove('hidden');
        }
        if(waitText) waitText.style.display = "none";

        if (me && me.ready && btnAction && waitText) {
            btnAction.innerText = "⏳ Esperando...";
            btnAction.disabled = true;
            btnAction.style.opacity = "0.5";
            waitText.style.display = "block";
        }

        const currentDef = turnData.phaseDefs[turnData.phase] || { label: '...', type: 'UNK' };
        if(phaseTitle) phaseTitle.innerText = currentDef.label;

        switch (turnData.phase) {
            case 'ASSIGNMENT':
                if(phaseDesc) phaseDesc.innerText = "Mira tu rol y duérmete.";
                if(btnAction) btnAction.innerText = me.ready ? "Durmiendo..." : "Me duermo 💤";
                break;

            case 'NIGHT_WOLVES':
                if(phaseTitle) phaseTitle.innerText = "🌙 NOCHE";
                if (app.lobo.myRole === 'LOBO' && !me.isDead) {
                    if(phaseDesc) phaseDesc.innerText = "Elegid una víctima.";
                    if(btnAction) btnAction.innerText = me.ready ? "Esperando..." : "Ya hemos comido 🍖";
                    if(nightArea) {
                        nightArea.classList.remove('hidden');
                        nightArea.innerHTML = "<h4>Víctimas Disponibles:</h4>";
                        let html = `<div class="category-grid">`;
                        players.filter(p => !p.isDead).forEach(p => {
                            html += `<button id="wolf_target_${p.id}" class="cat-btn wolf-target-btn" onclick="app.lobo.wolfAttack('${p.id}')">${p.name}</button>`;
                        });
                        html += `</div>`;
                        nightArea.innerHTML = html;
                    }
                } else {
                    if(phaseDesc) phaseDesc.innerText = "Los lobos están cazando...";
                    if(btnAction) btnAction.classList.add('hidden'); 
                }
                break;

            case 'NIGHT_WITCH':
                if (app.lobo.myRole === 'BRUJA' && !me.isDead) {
                    if(phaseDesc) phaseDesc.innerText = "Usa tus pociones sabiamente.";
                    if(btnAction) btnAction.innerText = me.ready ? "Listo..." : "He terminado 🧙‍♀️";
                    if(nightArea) nightArea.classList.remove('hidden');
                } else {
                    if(phaseDesc) phaseDesc.innerText = "La bruja está actuando...";
                    if(btnAction) btnAction.classList.add('hidden');
                }
                break;

            case 'NIGHT_SEER':
                if(phaseDesc) phaseDesc.innerText = (app.lobo.myRole === 'VIDENTE') ? "El narrador te indicará el rol." : "La vidente está mirando...";
                if(btnAction) {
                    btnAction.innerText = "Hecho 👁️";
                    if(app.lobo.myRole !== 'VIDENTE') btnAction.classList.add('hidden');
                }
                break;

            case 'DAY_REVEAL':
                let deadNames = "Nadie ha muerto.";
                if (turnData.deathsThisNight && turnData.deathsThisNight.length > 0) {
                    const names = players.filter(p => turnData.deathsThisNight.includes(p.id)).map(p => p.name);
                    deadNames = "⚰️ Han muerto: " + names.join(", ");
                }
                if(phaseDesc) phaseDesc.innerText = deadNames;
                if(btnAction) btnAction.innerText = me.ready ? "..." : "Aceptar 🔔";
                break;

            case 'DAY_VOTING':
                if(phaseDesc) phaseDesc.innerText = "Debatid y linchad a un sospechoso.";
                if(btnAction) btnAction.classList.add('hidden'); 
                if(daySection) {
                    daySection.classList.remove('hidden');
                    renderVoteGrid(players, me);
                }
                
                const btnReset = document.getElementById('loboResetBtn');
                const btnClear = document.getElementById('loboClearVotesBtn');
                if(btnReset) btnReset.classList.remove('hidden');
                if(btnClear && app.lobo.iAmAdmin) btnClear.classList.remove('hidden');
                break;
        }
    }
});

function renderVoteGrid(players, me) {
    const grid = document.getElementById('loboVoteGrid');
    if(!grid) return;
    
    grid.innerHTML = "";
    players.forEach(p => {
        const btn = document.createElement('div');
        btn.className = "vote-btn";
        if (p.isDead) btn.classList.add('dead');
        if (me && me.votedFor === p.id) btn.classList.add('selected');

        let html = `<div style="font-weight:bold;">${p.name}</div>`;
        if (p.isDead) {
            html += `<div class="eliminated-text" style="font-size:0.8em">MUERTO<br>${p.revealedRole || '?'}</div>`;
        } else {
            if (p.hasVoted) html += `<div class="voted-tick">✅</div>`;
            if (p.votesReceived > 0) html += `<div style="color:#74b9ff; font-weight:900;">${p.votesReceived} VOTOS</div>`;
            else html += `<div style="height:20px">-</div>`;
        }

        if(app.lobo.iAmAdmin) {
            html += `<div style="margin-top:5px; display:flex; justify-content:center; gap:5px;">
                <button style="padding:2px 5px; background:#444;" onclick="app.lobo.kill(event, '${p.id}')">💀</button>
                <button style="padding:2px 5px; background:#444;" onclick="socket.emit('lobo_action', {type:'kick', targetId:'${p.id}'})">❌</button>
            </div>`;
        }

        btn.innerHTML = html;
        btn.onclick = (e) => { if (e.target.tagName !== 'BUTTON' && !p.isDead) app.lobo.vote(p.id); };
        grid.appendChild(btn);
    });
}

socket.on('witchInfo', (data) => {
    if (app.currentRoom !== 'lobo') return;
    const area = document.getElementById('loboNightActionArea');
    if(!area) return;
    area.innerHTML = "";
    
    let victimName = "nadie";
    if (data.victimId) {
        const victim = app.lobo.players.find(p => p.id === data.victimId);
        if (victim) victimName = victim.name;
    }

    let reviveHtml = `<div id="witchReviveArea" style="margin-bottom:15px; border-bottom:1px solid #555; padding-bottom:10px;">`;
    if (data.hasRevive) {
        if (data.victimId) {
            reviveHtml += `<p style="color:#ff7675; font-weight:bold; font-size:1.2em">🐺 Han atacado a: ${victimName}</p>`;
            reviveHtml += `<button class="main-btn" onclick="app.lobo.useRevive()">🧪 REVIVIR</button>`;
        } else {
            reviveHtml += `<p>Nadie ha muerto esta noche.</p>`;
        }
    } else {
        reviveHtml += `<p style="color:#666; font-style:italic">Poción de Revivir gastada.</p>`;
    }
    reviveHtml += `</div>`;

    let killHtml = `<div id="witchKillArea">`;
    if (data.hasKill) {
        killHtml += `<p>Poción de Muerte:</p><div class="category-grid">`;
        if (app.lobo.players) {
            app.lobo.players.forEach(p => {
                if (!p.isDead) {
                    killHtml += `<button class="cat-btn" onclick="app.lobo.useKill('${p.id}')">☠️ ${p.name}</button>`;
                }
            });
        }
        killHtml += `</div>`;
    } else {
        killHtml += `<p style="color:#666; font-style:italic">Poción de Muerte gastada.</p>`;
    }
    killHtml += `</div>`;
    area.innerHTML = reviveHtml + killHtml;
});

socket.on('loboRoleAssigned', (data) => {
    if (app.currentRoom !== 'lobo') return;
    app.lobo.myRole = data.role;
    app.showScreen('loboGame');
    
    const title = document.getElementById('loboRoleTitle');
    const desc = document.getElementById('loboRoleDesc');
    const card = document.getElementById('loboCard');
    
    if(card) card.className = "blur-content";
    if(title) title.innerText = data.role;
    if(desc) desc.innerText = data.desc;
    
    const partnersDiv = document.getElementById('loboWolfPartners');
    if (partnersDiv) {
        if (data.wolfPartners && data.wolfPartners.length > 0) {
            partnersDiv.classList.remove('hidden');
            document.getElementById('loboPartnersText').innerText = data.wolfPartners.join(", ");
        } else {
            partnersDiv.classList.add('hidden');
        }
    }
});

socket.on('loboGameOver', (data) => {
    if (app.currentRoom !== 'lobo') return;
    const modal = document.getElementById('loboWinModal');
    if(modal) modal.classList.remove('hidden');
    
    const title = document.getElementById('loboWinTitle');
    if(title) {
        title.innerText = data.winner === 'LOBOS' ? "¡GANAN LOS LOBOS! 🐺" : "¡GANA EL PUEBLO! 🏡";
        title.style.color = data.winner === 'LOBOS' ? "#ff7675" : "#74b9ff";
    }
    
    const list = document.getElementById('loboWinList');
    if(list) {
        list.innerHTML = data.fullList.map(p => {
            const style = p.isDead ? "text-decoration:line-through; color:#666" : "color:white; font-weight:bold";
            const roleStyle = p.role === 'LOBO' ? 'color:#ff7675' : 'color:#74b9ff';
            return `<div style="margin-bottom:8px; border-bottom:1px solid #333; padding:5px; display:flex; justify-content:space-between;">
                <span style="${style}">${p.name}</span> 
                <span style="${roleStyle}">${p.role}</span>
            </div>`;
        }).join('');
    }
});

socket.on('loboReset', () => {
    if (app.currentRoom !== 'lobo') return;
    app.showScreen('loboLobby');
    const winModal = document.getElementById('loboWinModal');
    if(winModal) winModal.classList.add('hidden');
});