// public/js/impostor.js
app.impostor = {
    iAmAdmin: false,
    
    send: (type, val) => socket.emit('impostor_action', { type, value: val }),
    
    vote: (id) => {
        socket.emit('impostor_action', { type: 'vote', targetId: id });
    },
    
    clearVotes: () => socket.emit('impostor_action', { type: 'clearVotes' }),
    
    startGame: () => {
        app.impostor.send('startGame', {}); 
    },
    
    kick: (e, id) => { if(e) e.stopPropagation(); if(confirm("¿Echar de la sala?")) socket.emit('impostor_action', { type: 'kick', targetId: id }); },
    kill: (e, id) => { if(e) e.stopPropagation(); if(confirm("¿Matar/Revivir?")) socket.emit('impostor_action', { type: 'kill', targetId: id }); },
    banChat: (e, id) => { if(e) e.stopPropagation(); socket.emit('impostor_action', { type: 'banChat', targetId: id }); },
    resetGame: () => socket.emit('impostor_action', { type: 'reset' }),
    changeImpostors: (v) => socket.emit('impostor_action', { type: 'changeImpostors', value: v }),
    revealResults: () => socket.emit('impostor_action', { type: 'revealResults' }),
    
    backToLobby: () => { 
        if(confirm("¿Salir de la sala?")) app.goBackToHub(true); 
    },
    
    toggleRole: () => {
        const c = document.getElementById('roleCard');
        if(c.classList.contains('blur-content')) { c.classList.remove('blur-content'); c.classList.add('reveal-content'); }
        else { c.classList.remove('reveal-content'); c.classList.add('blur-content'); }
    },

    syncSettings: () => {
        const cat = document.getElementById('impostorCategory').value;
        const hints = document.getElementById('impostorHints').checked;
        const silent = document.getElementById('impostorSilent').checked; 
        app.impostor.send('updateSettings', { category: cat, hints: hints, silent: silent });
    },

    sendChat: () => {
        const input = document.getElementById('impostorInput');
        const txt = input.value.trim();
        if(!txt) return;
        app.impostor.send('chat', txt);
        input.value = '';
    },

    sendWord: () => {
        const input = document.getElementById('impostorInput');
        const txt = input.value.trim();
        if(!txt) return alert("Escribe una palabra.");
        app.impostor.send('gameWord', txt);
        input.value = '';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const catSelect = document.getElementById('impostorCategory');
    if (catSelect) catSelect.addEventListener('change', () => { if (app.impostor.iAmAdmin) app.impostor.syncSettings(); });
    
    const hintCheck = document.getElementById('impostorHints');
    if (hintCheck) hintCheck.addEventListener('change', () => { if (app.impostor.iAmAdmin) app.impostor.syncSettings(); });

    const silentCheck = document.getElementById('impostorSilent');
    if (silentCheck) silentCheck.addEventListener('change', () => { if (app.impostor.iAmAdmin) app.impostor.syncSettings(); });

    const chatInput = document.getElementById('impostorInput');
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                app.impostor.sendChat(); 
            }
        });
    }
});

socket.on('impostorCategories', (cats) => {
    const sel = document.getElementById('impostorCategory');
    if(sel) {
        const currentVal = sel.value;
        sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
        if (currentVal && Array.from(sel.options).some(o => o.value === currentVal)) {
            sel.value = currentVal;
        } else if(cats.find(c => c.id === 'MIX')) {
            sel.value = 'MIX';
        }
    }
});

socket.on('updateState', (data) => {
    if (app.currentRoom !== 'impostor') return;

    const { players, gameInProgress, settings, turnData, chatHistory } = data;
    const me = players.find(p => p.id === app.myPlayerId);
    
    if (me && me.isObserver) document.getElementById('observerMsg')?.classList.remove('hidden');
    else document.getElementById('observerMsg')?.classList.add('hidden');

    if(me) app.impostor.iAmAdmin = me.isAdmin;

    const countDisp = document.getElementById('impostorCountDisp');
    if(countDisp) countDisp.innerText = settings.impostors;
    const pCount = document.getElementById('playerCount');
    if(pCount) pCount.innerText = players.length;

    const catSelect = document.getElementById('impostorCategory');
    if (catSelect && document.activeElement !== catSelect) catSelect.value = settings.category;
    const hintCheck = document.getElementById('impostorHints');
    if (hintCheck && document.activeElement !== hintCheck) hintCheck.checked = settings.hints;
    const silentCheck = document.getElementById('impostorSilent');
    if (silentCheck && document.activeElement !== silentCheck) silentCheck.checked = settings.silentMode;

    if (catSelect) catSelect.disabled = !app.impostor.iAmAdmin;
    if (hintCheck) hintCheck.disabled = !app.impostor.iAmAdmin;
    if (silentCheck) silentCheck.disabled = !app.impostor.iAmAdmin;

    const adminPanel = document.getElementById('impostorAdminPanel');
    const waitMsg = document.getElementById('waitMsg');
    
    if(app.impostor.iAmAdmin) {
        if(adminPanel) adminPanel.classList.remove('hidden');
        if(waitMsg) waitMsg.classList.add('hidden');
        document.querySelector('#impostorAdminPanel .start-btn')?.classList.remove('hidden');
        
        ['btnEndVoting','btnClearVotes','btnShowResults'].forEach(id => {
            const btn = document.getElementById(id);
            if(btn) btn.classList.remove('hidden');
        });

    } else {
        if(adminPanel) adminPanel.classList.remove('hidden');
        document.querySelector('#impostorAdminPanel .start-btn')?.classList.add('hidden');
        if(waitMsg) waitMsg.classList.remove('hidden');
        
        ['btnEndVoting','btnClearVotes','btnShowResults'].forEach(id => {
            const btn = document.getElementById(id);
            if(btn) btn.classList.add('hidden');
        });
    }

    const list = document.getElementById('playerList');
    if(list) {
        list.innerHTML = players.map(p => `
            <li>
                <span>${p.name} ${p.isAdmin ? '👑' : ''} ${p.isObserver ? '👁️' : ''}</span>
                ${app.impostor.iAmAdmin ? `<button class="kick-btn" style="padding:2px 6px; width:auto; margin-left:10px;" onclick="app.impostor.kick(event, '${p.id}')">❌</button>` : ''}
            </li>`).join('');
    }

    if(gameInProgress) {
        app.showScreen('impostorGame');
        
        const voteSection = document.getElementById('voteSection');
        if(voteSection) voteSection.classList.remove('hidden');

        let spokenWordsHTML = "";

        const voteGrid = document.getElementById('voteGrid');
        if(voteGrid) {
            voteGrid.innerHTML = "";
            players.forEach(p => {
                const btn = document.createElement('div');
                btn.className = "vote-btn";
                btn.id = `vote_${p.id}`;
                if(p.isDead) btn.classList.add('dead');
                if(me && me.votedFor === p.id) btn.classList.add('selected');
                if(p.isObserver) btn.style.opacity = "0.5";

                const isTurn = settings.silentMode && turnData && turnData.currentTurn === p.id;
                if(isTurn) {
                    btn.style.borderColor = "#0984e3";
                    btn.style.boxShadow = "0 0 10px #0984e3";
                }

                let html = `<div style="font-weight:bold; margin-bottom:2px; ${isTurn ? 'color:#0984e3' : ''}">
                    ${p.name} ${isTurn ? '🖊️' : ''}
                </div>`;

                if (settings.silentMode && p.gameWord) {
                    html += `<div style="font-size:0.9em; color:#00cec9; font-style:italic; margin-bottom:5px;">"${p.gameWord}"</div>`;
                    spokenWordsHTML += `<span style="margin-right:10px;"><b>${p.name}:</b> <span style="color:#00cec9">"${p.gameWord}"</span></span>`;
                } else if (settings.silentMode) {
                    html += `<div style="height:15px; margin-bottom:5px;"></div>`;
                }

                if (p.isDead) html += `<div class="eliminated-text">ELIMINADO<br><span style="color:white">${p.revealedRole || '?'}</span></div>`;
                else if (!p.isObserver) {
                    if (p.hasVoted) html += `<div class="voted-tick">✅</div>`;
                    if (p.votesReceived > 0) html += `<div style="color:#ffa502; font-weight:900; font-size:1.2em;">${p.votesReceived} VOTOS</div>`;
                }

                if(app.impostor.iAmAdmin && !p.isObserver) {
                    html += `<div style="margin-top:5px; display:flex; justify-content:center; gap:5px; z-index:5;">
                        <button style="padding:2px 5px; background:#444; font-size:0.7em;" onclick="app.impostor.kill(event, '${p.id}')">💀</button>
                        <button style="padding:2px 5px; background:#444; font-size:0.7em;" onclick="app.impostor.kick(event, '${p.id}')">❌</button>`;
                    
                    if(settings.silentMode && !p.isDead) {
                        html += `<button style="padding:2px 5px; background:#e67e22; font-size:0.7em;" onclick="app.impostor.banChat(event, '${p.id}')">🔇</button>`;
                    }
                    html += `</div>`;
                }

                btn.innerHTML = html;
                btn.onclick = (e) => { 
                    if(e.target.tagName !== 'BUTTON' && !p.isDead && !me.isDead && !me.isObserver && !p.isObserver) {
                        app.impostor.vote(p.id); 
                    }
                };
                voteGrid.appendChild(btn);
            });
        }

        const silentArea = document.getElementById('impostorSilentArea');
        if (settings.silentMode) {
            silentArea.classList.remove('hidden');
            
            const headerDiv = document.getElementById('impostorSpokenWords');
            if (headerDiv) {
                headerDiv.innerHTML = spokenWordsHTML || "<span style='color:#aaa'>Aún no se han dicho palabras.</span>";
            }

            const logDiv = document.getElementById('impostorChatLog');
            if (chatHistory) {
                logDiv.innerHTML = chatHistory.map(msg => {
                    if (msg.type === 'gameWord') {
                        return `<div style="margin-bottom:8px; border-left:3px solid #00cec9; padding-left:5px; background:rgba(0,206,201,0.1)">
                            <div style="font-size:0.8em; color:#00cec9;">🖊️ PALABRA DE <b>${msg.name}</b>:</div>
                            <div style="font-size:1.2em; color:#fff; font-weight:bold;">${msg.text}</div>
                        </div>`;
                    } else if (msg.type === 'system_vote') {
                        return `<div style="margin-bottom:2px; color:#aaa; font-size:0.6em; font-style:italic;">
                            👉 ${msg.name} ${msg.text}
                        </div>`;
                    } else if (msg.type === 'system_elimination' || msg.type === 'system_ban') {
                        return `<div style="margin-bottom:5px; color:#ff4757; font-size:0.8em; background:rgba(255,71,87,0.1); padding:5px; border-radius:3px; border-left:2px solid #ff4757;">
                            ${msg.text}
                        </div>`;
                    } else {
                        return `<div style="margin-bottom:4px; color:#aaa; font-size:0.9em; word-break:break-word;">
                            <span style="color:#74b9ff; font-weight:bold;">${msg.name}:</span> ${msg.text}
                        </div>`;
                    }
                }).join('');
                logDiv.scrollTop = logDiv.scrollHeight;
            }

            const btnWord = document.getElementById('btnImpWord');
            const turnInd = document.getElementById('turnIndicator');
            
            if (turnData && turnData.currentTurn === null) {
                btnWord.disabled = true;
                btnWord.style.opacity = "0.4";
                btnWord.innerText = "Ronda Finalizada";
                
                turnInd.innerText = "🛑 RONDA FINALIZADA. ¡A VOTAR!";
                turnInd.style.color = "#ff4757";
                turnInd.style.background = "rgba(255, 71, 87, 0.1)";

            } else if (turnData && turnData.currentTurn === app.myPlayerId && !me.isDead) {
                btnWord.disabled = false;
                btnWord.style.opacity = "1";
                btnWord.innerText = "ENVIAR PALABRA (Tu Turno)";
                turnInd.innerText = "✅ ¡ES TU TURNO DE ESCRIBIR LA PALABRA!";
                turnInd.style.color = "#2ed573";
                turnInd.style.background = "rgba(46, 213, 115, 0.1)";
            } else {
                btnWord.disabled = true;
                btnWord.style.opacity = "0.4";
                btnWord.innerText = "Esperando turno...";
                
                const turnPlayer = players.find(p => p.id === turnData?.currentTurn);
                turnInd.innerText = turnPlayer ? `⏳ Turno de palabra: ${turnPlayer.name}` : "...";
                turnInd.style.color = "#e1b12c";
                turnInd.style.background = "rgba(225, 177, 44, 0.1)";
            }

        } else {
            silentArea.classList.add('hidden');
        }

    } else {
        app.showScreen('impostorLobby');
    }
});

socket.on('preGameCountdown', (count) => {
    if (app.currentRoom !== 'impostor') return;

    app.showScreen('impostorGame'); 
    document.getElementById('roleCard').classList.add('hidden'); 
    document.getElementById('voteSection').classList.add('hidden');
    document.getElementById('impostorSilentArea').classList.add('hidden');

    const overlay = document.getElementById('countdownOverlay');
    const numEl = document.getElementById('countdownNumber');
    
    overlay.classList.remove('hidden');
    let current = count;
    
    const tick = () => {
        numEl.innerText = current;
        numEl.style.transform = "scale(1.5)";
        setTimeout(() => numEl.style.transform = "scale(1)", 200);
        
        const audio = document.getElementById('countSound');
        if(audio) {
            audio.currentTime = 0;
            audio.play().catch(()=>{});
        }
    };

    tick(); 

    const interval = setInterval(() => {
        current--;
        if (current > 0) {
            tick();
        } else {
            clearInterval(interval);
            overlay.classList.add('hidden');
        }
    }, 1000);
});

socket.on('privateRole', (data) => {
    if (app.currentRoom !== 'impostor') return;

    const card = document.getElementById('roleCard');
    card.classList.remove('hidden');
    card.className = "blur-content"; 
    
    const title = document.getElementById('myRoleTitle');
    const word = document.getElementById('myRoleWord');
    const info = document.getElementById('myRoleInfo');

    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    title.innerText = data.role;
    title.style.color = isDark ? 'white' : '#262626'; 

    word.innerText = data.word;
    word.style.color = isDark ? '#ffeaa7' : '#4a148c'; // Dark purple for light mode
    
    if (data.role === 'IMPOSTOR') {
        info.innerText = data.hint ? `Tu Pista: ${data.hint}` : "Engaña a todos.";
        if(data.hint) info.style.color = "#ffa502";
        else info.style.color = "#ccc";
    }
    else {
        info.innerText = "Encuentra al impostor.";
        info.style.color = "#ccc";
    }

    const starter = document.getElementById('starterName');
    if(starter && data.starter) starter.innerText = data.starter;
    
    const cats = document.getElementById('catsPlayed');
    if(cats && data.categoriesPlayed) cats.innerText = data.categoriesPlayed;
    
    document.getElementById('voteSection').classList.remove('hidden');
    app.showScreen('impostorGame');
});

socket.on('gameSummary', (data) => {
    if(!data) return;
    document.getElementById('summaryModal').classList.remove('hidden');
    document.getElementById('sumWord').innerText = data.word;
    document.getElementById('sumHint').innerText = data.hintsWasEnabled ? `Pista: ${data.hint}` : "Sin pistas";
    const list = document.getElementById('sumImpostors');
    list.innerHTML = "";
    const sorted = data.impostorsData.sort((a, b) => (a.isDead === b.isDead) ? 0 : a.isDead ? 1 : -1);
    sorted.forEach(imp => {
        const div = document.createElement('div');
        div.style.fontSize = "1.2em";
        div.style.margin = "5px 0";
        if (imp.isDead) {
            div.innerHTML = `<span style="text-decoration:line-through; color:#7f8fa6;">😈 ${imp.name}</span> <span style="font-size:0.8em; color:#ff4757;">(ELIMINADO)</span>`;
        } else {
            div.innerHTML = `<span style="color:#ffeaa7; font-weight:bold;">😈 ${imp.name}</span>`;
        }
        list.appendChild(div);
    });
});

socket.on('resetGame', () => {
    document.getElementById('summaryModal').classList.add('hidden');
    document.getElementById('roleCard').classList.remove('hidden'); 
    app.showScreen('impostorLobby');
});

socket.on('youDied', () => {
    const sound = document.getElementById('youDiedSound');
    if(sound) sound.play().catch(()=>{});
    if(navigator.vibrate) navigator.vibrate(500);
});