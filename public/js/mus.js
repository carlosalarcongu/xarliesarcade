app.mus = {
    data: null,
    chartInstance: null,
    currentRoom: "Entre Nosotros (Las monjas)", 
    
    // Estados de visualización
    dayByDayActive: false,
    dayByDayLimit: 0,
    min3RoundsActive: false,
    normalizeActive: false,
    rachasPlayerSelected: "",

    adminUsers: ['administrador m', 'administrador g', 'administrador de mus', 'xarlie', 'musero', 'japa'],

    isAdmin: function() {
        const safeUser = (app.myPlayerName || "").toLowerCase();
        return this.adminUsers.includes(safeUser);
    },
    
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷','🕸','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🐓','🦃','🦚','🦜','🦢','🦩','🕊','🐇','🦝','🦨','🦡','🦦','🦫','🐁','🐀','🐿','🦔','🐉','🐲'],

    init: () => {
        const vm = document.getElementById('musViewMode');
        if (vm && !vm.querySelector('option[value="rachas"]')) {
            const opt = document.createElement('option'); opt.value = 'rachas'; opt.innerHTML = '🔥 Rachas y Curiosidades'; vm.appendChild(opt);
        }
        if (vm && !vm.querySelector('option[value="predictor"]')) {
            const optP = document.createElement('option'); optP.value = 'predictor'; optP.innerHTML = '🔮 Predictor de Partidas'; vm.appendChild(optP);
        }
        // Permisos actualizados
        if (app.mus.isAdmin()) {
            if (vm && !vm.querySelector('option[value="administracion"]')) {
                const optAdmin = document.createElement('option'); optAdmin.value = 'administracion'; optAdmin.innerHTML = '⚙️ Administración'; vm.appendChild(optAdmin);
            }
        }
        app.mus.refresh();
    },

    resetUI: () => {
        document.getElementById('musScreen').classList.add('hidden');
    },

    refresh: () => {
        socket.emit('mus_action', { type: 'getData' });
    },

    getAvatar: (name) => {
        if (!name) return '👤';
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % app.mus.emojis.length;
        return app.mus.emojis[index];
    },

    getColor: (pct) => {
        const colors = ['#ff4757', '#ff6b81', '#ff7f50', '#ffa502', '#eccc68', '#f1c40f', '#7bed9f', '#2ed573', '#26de81', '#009432'];
        const index = Math.min(Math.floor(pct / 10), 9);
        return colors[index];
    },

    randomizeArrayIndices: (length) => {
        const indices = Array.from({ length }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        return indices;
    },

    renderRoomSelector: () => {
        const sel = document.getElementById('musRoomSelect');
        if(!sel || !app.mus.data) return;
        const current = app.mus.currentRoom;
        
        let html = `<option value="ABSOLUTA">⭐ ABSOLUTA (Todas)</option>`;
        app.mus.data.rooms.forEach(r => {
            const icon = r.isTournament ? '🏆 ' : '';
            html += `<option value="${r.name}">${icon}${r.name}</option>`;
        });
        sel.innerHTML = html;
        
        if (app.mus.data.rooms.map(x=>x.name).includes(current) || current === 'ABSOLUTA') {
            sel.value = current;
        } else {
            sel.value = app.mus.data.rooms[0] ? app.mus.data.rooms[0].name : 'ABSOLUTA';
            app.mus.currentRoom = sel.value;
        }
    },

    changeRoom: () => {
        const sel = document.getElementById('musRoomSelect');
        app.mus.currentRoom = sel.value;
        app.mus.dayByDayActive = false;
        app.mus.changeView(); 
    },

    toggleControls: () => {
        const area = document.getElementById('musControlsArea');
        if (area) area.classList.toggle('hidden');
    },

    // --- CREACIÓN DE SALAS / TORNEOS ---
    createRoom: () => {
        if (!app.mus.isAdmin()) {
            return alert('🔒 Solo los administradores pueden crear salas o torneos.');
        }
        document.getElementById('musCreateRoomModal').classList.remove('hidden');
    },

    submitCreateRoom: () => {
        const name = document.getElementById('mcRoomName').value.trim();
        if(!name) return alert("Ponle nombre a la sala.");
        
        const isTournament = document.getElementById('mcIsTournament').checked;
        const description = isTournament ? (document.getElementById('mcDescription').value.trim() || '') : '';
        const config = {
            format: document.getElementById('mcFormat').value,
            numGroups: parseInt(document.getElementById('mcNumGroups').value),
            matchesPerRival: parseInt(document.getElementById('mcMatchesRival').value),
            randomizePairs: document.getElementById('mcRandPairs').checked,
            randomizeBracket: document.getElementById('mcRandBracket').checked
        };

        socket.emit('mus_action', { type: 'addRoom', value: name, user: app.myPlayerName, isTournament, config, description });
        document.getElementById('musCreateRoomModal').classList.add('hidden');
    },

    // --- GESTIÓN DE VISTAS (TORNEO VS NORMAL) ---
    changeView: () => {
        const roomData = app.mus.data.rooms.find(r => r.name === app.mus.currentRoom);
        
        const normalControls = document.getElementById('musControlsArea');
        const viewFilters = document.querySelector('.card[style*="padding: 15px"]'); 
        const tArea = document.getElementById('musTournamentArea');
        const container = document.getElementById('musStatsContainer');
        const chart = document.getElementById('musChartSection');
        const divExamPlayer = document.getElementById('divExamPlayer');
        const divExamPair = document.getElementById('divExamPair');

        if (chart) chart.classList.add('hidden');
        if (divExamPlayer) divExamPlayer.classList.add('hidden');
        if (divExamPair) divExamPair.classList.add('hidden');

        if (roomData && roomData.isTournament) {
            // ES UN TORNEO
            if(normalControls) normalControls.classList.add('hidden');
            if(viewFilters) viewFilters.classList.add('hidden');
            container.innerHTML = "";
            tArea.classList.remove('hidden');
            app.mus.renderTournamentDashboard(roomData);
        } else {
            // ES UNA SALA NORMAL
            tArea.classList.add('hidden');
            if(viewFilters) viewFilters.classList.remove('hidden');
            if(normalControls) normalControls.classList.remove('hidden');
            
            const mode = document.getElementById('musViewMode').value;
            container.innerHTML = "";

            if (mode === 'ranking_pair' || mode === 'ranking_player') app.mus.renderRanking(container, mode);
            else if (mode === 'recent_log') app.mus.renderLog(container, 'ALL');
            else if (mode === 'examinar_persona') { if(divExamPlayer) divExamPlayer.classList.remove('hidden'); app.mus.renderPlayerSelects(); app.mus.runAnalysis(); }
            else if (mode === 'examinar_pareja') { if(divExamPair) divExamPair.classList.remove('hidden'); app.mus.renderPlayerSelects(); app.mus.runAnalysis(); }
            else if (mode === 'rachas') app.mus.renderRachas(container);
            else if (mode === 'predictor') app.mus.renderPredictor(container);
            else if (mode === 'administracion') app.mus.renderAdminPanel(container);
        }
    },

    // --- DASHBOARD DE TORNEO ---
    renderTournamentDashboard: (room) => {
        const state = JSON.parse(room.tournamentState || "{}");
        document.getElementById('musTName').innerText = room.name;
        
        const safeUser = (app.myPlayerName || "").toLowerCase();
        const isAdmin = ['administrador m', 'xarlie', 'musero', 'japa', 'administrador g'].includes(safeUser);
        
        const cAdmin = document.getElementById('musTAdminControls');
        cAdmin.classList.toggle('hidden', !isAdmin);
        const btnStart = cAdmin.querySelector('.start-btn');
        const btnAdvance = document.getElementById('musTAdvanceBtn');
        const cArea = document.getElementById('musTContent');

        if (state.phase === 'REGISTRATION') {
            document.getElementById('musTInfo').innerText = "Fase: Inscripción Abierta";
            btnStart.classList.remove('hidden'); btnAdvance.classList.add('hidden');
            
            cArea.innerHTML = `
                <div style="background:#1e272e; padding:15px; border-radius:10px;">
                    <h3 style="color:#74b9ff; margin-top:0;">Jugadores Inscritos (${state.players.length})</h3>
                    
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <input type="text" id="tAddPlayerName" placeholder="Nombre..." style="flex:1; padding:10px; border-radius:5px; border:none;" autocomplete="off">
                        <button class="main-btn" style="width:auto; margin:0;" onclick="app.mus.tourneyAction('addPlayer')">Añadir</button>
                    </div>
                    
                    ${isAdmin ? `<button class="kick-btn" style="background:#f39c12; color:#000; border:none; padding:8px; margin-bottom:15px; width:100%; font-weight:bold; border-radius:5px;" onclick="app.mus.loadPredefinedPlayers()">⚡ Cargar Plantilla (12 Jugadores)</button>` : ''}
                    
                    <ul style="list-style:none; padding:0; display:grid; grid-template-columns:1fr 1fr; gap:5px;">
                        ${state.players.map(p => `
                            <li style="background:#222; padding:8px; border-radius:5px; display:flex; justify-content:space-between; align-items:center;">
                                <span style="color:white; font-weight:bold; font-size:0.9em;">${app.mus.getAvatar(p)} ${p}</span>
                                ${isAdmin ? `<button style="background:transparent; border:none; color:#ff4757; font-size:1.2em; padding:0; cursor:pointer;" onclick="app.mus.tourneyAction('removePlayer', '${p}')">✖</button>` : ''}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
        else if (state.phase === 'PAIR_ASSIGNMENT') {
            document.getElementById('musTInfo').innerText = "Fase: Asignación de Parejas";
            btnStart.classList.add('hidden'); btnAdvance.classList.add('hidden');

            const currentPairs = state.pairs || [];
            const allPlayers = state.players || [];
            if (!app.mus.tempPairs) {
                if (state.config && state.config.randomizePairs) {
                    app.mus.tempPairs = currentPairs.map(p => {
                        const parts = (p || '').split(' y ');
                        return [parts[0] || '', parts[1] || ''];
                    });
                } else {
                    const shuffledPlayers = app.mus.shuffleArray(allPlayers);
                    app.mus.tempPairs = [];
                    for (let i = 0; i < shuffledPlayers.length; i += 2) {
                        app.mus.tempPairs.push([shuffledPlayers[i] || '', shuffledPlayers[i+1] || '']);
                    }
                }
            }

            if (state.config && state.config.randomizePairs) {
                // Pares aleatorios: no edición
                let html = `<div style="background:#1e272e; padding:15px; border-radius:10px;">`;
                html += `<h3 style="color:#74b9ff; margin-top:0;">Parejas aleatorias (bloqueadas)</h3>`;
                html += `<ul style="list-style:none; padding:0; margin:0;">`;
                const randomizedIndices = app.mus.randomizeArrayIndices(currentPairs.length);
                randomizedIndices.forEach(idx => {
                    const pairText = currentPairs[idx] || '';
                    const parts = pairText.split(' y ').map(x => x.trim()).filter(Boolean);
                    const shuffled = app.mus.shuffleArray(parts);
                    html += `<li style="background:#222; color:#fff; padding:8px; border-radius:5px; margin-bottom:6px;">${shuffled.join(' y ')}</li>`;
                });
                html += `</ul>`;
                html += `<button class="main-btn" style="width:100%; margin-top:12px;" onclick="app.mus.proceedToGroupAssignment()">▶️ Continuar</button>`;
                html += `</div>`;
                cArea.innerHTML = html;
                return;
            }

            // Pares manuales: edición individual
            const assigned = app.mus.tempPairs.flat().filter(Boolean);
            const unassigned = (state.players || []).filter(p => !assigned.includes(p));

            let html = `<div style="background:#1e272e; padding:15px; border-radius:10px;">`;
            html += `<h3 style="color:#74b9ff; margin-top:0;">Editar Parejas</h3>`;
            html += `<div style="display:flex; gap:8px; margin-bottom:12px;"><button class="main-btn" style="flex:1;" onclick="app.mus.addEmptyPair()">➕ Añadir pareja</button><button class="kick-btn" style="flex:1;" onclick="app.mus.savePairsAndContinue()">✅ Guardar y continuar</button></div>`;

            if (app.mus.tempPairs.length === 0) {
                html += `<p style="color:#aaa;">No hay parejas. Añade una o vuelve a iniciar con mínimo 4 jugadores.</p>`;
            } else {
                const randomizedIndices = app.mus.randomizeArrayIndices(app.mus.tempPairs.length);
                randomizedIndices.forEach(idx => {
                    const pair = app.mus.tempPairs[idx];
                    const pairOrder = app.mus.shuffleArray([0, 1]);

                    html += `<div style="background:#222; border:1px solid #444; border-radius:8px; padding:8px; margin-bottom:8px;">`;

                    pairOrder.forEach((slotPosition, displayPosition) => {
                        const playerName = pair[slotPosition] || '';
                        const isEmpty = !playerName;
                        const label = `Jugador ${displayPosition + 1}`;

                        if (isEmpty) {
                            html += `<div style="background:#2f3640; color:#ddd; border-radius:6px; padding:8px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:0.85em;">${label} vacío</span>
                                <select style="background:#333; color:#fff; border:1px solid #555; border-radius:4px; padding:4px;" onchange="app.mus.assignToEmptySlot(${idx}, this.value, ${slotPosition})"><option value="">-- seleccionar --</option>${unassigned.map(x => `<option value="${x}">${x}</option>`).join('')}</select>
                            </div>`;
                        } else {
                            html += `<div style="background:#333; color:#fff; border-radius:6px; padding:8px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-weight:bold;">${playerName}</span>
                                <button class="kick-btn" style="background:#e74c3c; width:24px; height:24px; border:none; border-radius:50%; font-size:0.8em; line-height:1;" onclick="app.mus.removePlayerFromPair(${idx}, ${slotPosition})">✖</button>
                            </div>`;
                        }
                    });

                    html += `</div>`;
                });
            }

            if (unassigned.length > 0) {
                html += `<div style="margin-top:10px; color:#f1c40f;">Jugadores sin pareja: ${unassigned.join(', ')}</div>`;
            }

            html += `</div>`;
            cArea.innerHTML = html;
        }
        else if (state.phase === 'GROUP_ASSIGNMENT') {
            document.getElementById('musTInfo').innerText = "Fase: Asignación de Grupos";
            btnStart.classList.add('hidden'); btnAdvance.classList.add('hidden');

            const assignments = state.groupAssignments || {};
            const pairList = Object.keys(assignments);
            const groupCount = (state.config && state.config.numGroups) ? state.config.numGroups : 2;

            let html = `<div style="background:#1e272e; padding:15px; border-radius:10px;">`;
            html += `<h3 style="color:#74b9ff; margin-top:0;">Asignar parejas a grupos</h3>`;

            if (pairList.length === 0) {
                html += `<p style="color:#aaa;">No hay parejas para asignar. Vuelve a paso anterior.</p>`;
            } else if (state.config && state.config.format === 'GROUPS') {
                pairList.forEach(pair => {
                    const selected = assignments[pair] || '';
                    html += `<div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;"><span style="flex:1; color:#fff;">${pair}</span><select style="background:#333; color:#fff; border:1px solid #555; border-radius:4px; padding:4px;" onchange="app.mus.tourneyAction('assignPairToGroup', { pair: '${pair}', group: this.value })">`;
                    html += `<option value="">Sin grupo</option>`;
                    for (let i = 1; i <= groupCount; i++) {
                        html += `<option value="${i}" ${selected == i ? 'selected' : ''}>Grupo ${i}</option>`;
                    }
                    html += `</select></div>`;
                });
            } else {
                html += `<p style="color:#aaa;">Formato eliminatorias: ya se ha generado el cuadro.</p>`;
            }

            html += `<div style="display:flex; gap:8px; margin-top:12px;"><button class="main-btn" style="flex:1;" onclick="app.mus.finalizeGroupAssignmentUI()">▶️ Finalizar Asignación</button><button class="kick-btn" style="flex:1;" onclick="app.mus.tourneyAction('start', null)">⟲ Reiniciar</button></div>`;
            html += `</div>`;
            cArea.innerHTML = html;
        }
        else if (state.phase === 'GROUPS') {
            document.getElementById('musTInfo').innerText = "Fase: Liguilla de Grupos";
            btnStart.classList.add('hidden'); btnAdvance.classList.remove('hidden');

            let html = `<div style="display:flex; flex-direction:column; gap:20px;">`;
            Object.keys(state.groups).forEach(gName => {
                const g = state.groups[gName];
                html += `<div class="card" style="background:#222; border-left:4px solid #3498db; padding:15px;">
                    <h3 style="color:#3498db; margin-top:0;">Grupo ${gName}</h3>
                    <table class="mus-table" style="width:100%; margin-bottom:15px;">
                        <tr><th>Pareja</th><th>PTS</th><th>G</th><th>P</th><th>Dif</th></tr>
                        ${g.standings.map(s => `<tr>
                            <td style="text-align:left; font-weight:bold;">${s.pair}</td>
                            <td style="color:#f1c40f; font-weight:900;">${s.pts}</td>
                            <td style="color:#2ed573;">${s.w}</td><td style="color:#ff4757;">${s.l}</td>
                            <td>${s.diff > 0 ? '+'+s.diff : s.diff}</td>
                        </tr>`).join('')}
                    </table>
                    <h4 style="color:#aaa;">Partidos del Grupo:</h4>
                    <div style="display:flex; flex-direction:column; gap:5px;">
                        ${g.matches.map(m => `
                            <div style="background:#1e272e; padding:10px; border-radius:5px; display:flex; justify-content:space-between; align-items:center; ${m.winner?'opacity:0.6;':''}">
                                <div style="flex:1; text-align:right; font-size:0.9em; ${m.winner===m.p1?'color:#2ed573; font-weight:bold;':''}">${m.p1}</div>
                                <div style="padding:0 10px; font-weight:bold; color:#f1c40f;">${m.winner ? `${m.s1} - ${m.s2}` : 'vs'}</div>
                                <div style="flex:1; text-align:left; font-size:0.9em; ${m.winner===m.p2?'color:#2ed573; font-weight:bold;':''}">${m.p2}</div>
                                ${!m.winner && !m.p1.includes('BYE') && !m.p2.includes('BYE') ? `<button class="main-btn" style="width:auto; padding:5px 10px; margin:0; font-size:0.8em; background:#2ed573;" onclick="app.mus.showAddMatchModal('${m.id}')">JUGAR</button>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>`;
            });
            html += `</div>`;
            cArea.innerHTML = html;
        }
        else if (state.phase === 'BRACKET') {
            document.getElementById('musTInfo').innerText = "Fase: Eliminatorias";
            btnStart.classList.add('hidden'); btnAdvance.classList.add('hidden');

            let html = `<div style="display:flex; overflow-x:auto; gap:30px; padding:20px; min-height:300px; align-items:center;">`;
            state.bracket.rounds.forEach((round, rIndex) => {
                html += `<div style="display:flex; flex-direction:column; justify-content:space-around; min-width:180px; gap:20px;">`;
                html += `<h4 style="text-align:center; color:#aaa; margin:0;">${round.matches[0].isFinal ? 'GRAN FINAL' : (round.matches[0].isSemi ? 'SEMIFINAL' : 'RONDA '+(rIndex+1))}</h4>`;
                
                round.matches.forEach(m => {
                    const border = m.winner ? 'border-color:#555;' : 'border-color:#e1b12c; box-shadow:0 0 10px rgba(225,177,44,0.3);';
                    html += `<div class="card" style="padding:10px; background:#222; border:2px solid; ${border} margin:0;">
                        <div style="font-size:0.9em; ${m.winner===m.p1?'color:#2ed573; font-weight:bold;':(m.winner?'color:#555; text-decoration:line-through;':'color:#fff;')} border-bottom:1px solid #444; padding-bottom:5px; margin-bottom:5px;">${m.p1 || '???'}</div>
                        <div style="font-size:0.9em; ${m.winner===m.p2?'color:#2ed573; font-weight:bold;':(m.winner?'color:#555; text-decoration:line-through;':'color:#fff;')}">${m.p2 || '???'}</div>
                        ${!m.winner && m.p1 && m.p2 && m.p1!=='???' && m.p2!=='???' && !m.p1.includes('BYE') && !m.p2.includes('BYE') ? `<button class="main-btn" style="width:100%; padding:5px; margin-top:10px; font-size:0.8em; background:#2ed573;" onclick="app.mus.showAddMatchModal('${m.id}')">JUGAR</button>` : ''}
                    </div>`;
                });
                html += `</div>`;
            });

            if (state.bracket.champion) {
                html += `<div style="display:flex; flex-direction:column; justify-content:center; padding-left:20px;">
                    <h2 style="color:#f1c40f; margin:0; text-align:center;">🏆 CAMPEÓN</h2>
                    <div class="card" style="background:#f1c40f; color:#000; font-weight:900; font-size:1.5em; text-align:center;">${state.bracket.champion}</div>
                </div>`;
            }
            html += `</div>`;
            cArea.innerHTML = html;
        }
    },

    // --- NUEVA FUNCIÓN: CARGAR PLANTILLA ---
    loadPredefinedPlayers: () => {
        const players = ['xarlie', 'japa', 'luis', 'marcos', 'acebo', 'nacho', 'lucas', 'mario', 'javimali', 'dani', 'clau', 'maria'];
        if (confirm("¿Añadir a los 12 jugadores predefinidos de golpe?")) {
            app.mus.tourneyAction('addPlayers', players);
        }
    },

    // --- MANEJO LOCAL DE PAREJAS ---
    removePlayerFromPair: (pairIdx, slotIdx) => {
        if (!app.mus.tempPairs || !app.mus.tempPairs[pairIdx]) return;
        app.mus.tempPairs[pairIdx][slotIdx] = '';
        app.mus.changeView();
    },

    assignToEmptySlot: (pairIdx, playerName, slotIdx) => {
        if (!app.mus.tempPairs || !app.mus.tempPairs[pairIdx] || !playerName) return;
        if (slotIdx !== 0 && slotIdx !== 1) return;
        app.mus.tempPairs[pairIdx][slotIdx] = playerName;
        app.mus.changeView();
    },

    addPlayerToPair: (pairIdx, slotIdx, playerName) => {
        if(!playerName) return;
        app.mus.tempPairs[pairIdx][slotIdx] = playerName;
        app.mus.changeView();
    },

    savePairsAndContinue: () => {
        const finalPairs = [];
        for (let p of app.mus.tempPairs) {
            if (p[0] && p[1]) finalPairs.push([p[0], p[1]].sort().join(' y '));
            else if (p[0] || p[1]) return alert("⚠️ Hay parejas incompletas. Por favor, asigna los huecos vacíos o elimina al jugador para que sea impar.");
        }
        app.mus.tempPairs = null; 
        app.mus.tourneyAction('updatePairs', { pairs: finalPairs });
        
        setTimeout(() => {
            app.mus.tourneyAction('proceedToGroupAssignment', null);
        }, 500);
    },

    addEmptyPair: () => {
        if (!Array.isArray(app.mus.tempPairs)) app.mus.tempPairs = [];
        app.mus.tempPairs.push(['', '']);
        app.mus.changeView();
    },

    shuffleArray: (arr) => {
        const list = arr.slice();
        for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [list[i], list[j]] = [list[j], list[i]];
        }
        return list;
    },

    randomizeArrayIndices: (length) => {
        const indices = Array.from({ length }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        return indices;
    },

    finalizeGroupAssignmentUI: () => {
        app.mus.tourneyAction('finalizeGroupAssignment', null);
    },

    proceedToGroupAssignment: () => {
        app.mus.tourneyAction('proceedToGroupAssignment', null);
    },

    tourneyAction: (action, payload) => {
        // Solo sobrescribimos payload con el input si NO se está mandando por código (como en la plantilla)
        if (action === 'addPlayer' && typeof payload !== 'string') {
            const inputEl = document.getElementById('tAddPlayerName');
            if (inputEl) payload = inputEl.value.trim();
        }

        if (!payload && !['start','advanceToBracket','proceedToGroupAssignment','finalizeGroupAssignment','deleteTournament'].includes(action)) return;
        
        socket.emit('mus_action', { 
            type: 'tourneyAction', 
            user: app.myPlayerName, 
            room: app.mus.currentRoom, 
            actionType: action, 
            value: payload,
            pair: payload?.pair,
            group: payload?.group,
            pairs: payload?.pairs
        });
        
        // Limpiar el input solo si existe
        if (action === 'addPlayer' && document.getElementById('tAddPlayerName')) {
            document.getElementById('tAddPlayerName').value = "";
        }
    },

    startTournament: () => { if(confirm("¿Cerrar inscripciones e iniciar el torneo?")) app.mus.tourneyAction('start', null); },
    advanceToBracket: () => { if(confirm("¿Finalizar fase de grupos y crear eliminatorias?")) app.mus.tourneyAction('advanceToBracket', null); },
    deleteTournament: () => {
        if(!confirm("⚠️ ¿Seguro que quieres ELIMINAR este torneo?\n\nSe generará un PDF con el resumen que se descargará automáticamente.")) return;
        
        // Mostrar estado
        alert("⏳ Generando PDF del torneo... Por favor espera.");
        
        socket.emit('mus_deleteTournamentPDF', { room: app.mus.currentRoom, user: app.myPlayerName }, (result) => {
            if (result.success) {
                setTimeout(() => {
                    // Descargar el PDF
                    const a = document.createElement('a');
                    a.href = `/downloads/${result.fileName}`;
                    a.download = result.fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }, 300);
                
                // Eliminar el torneo después de un tiempo
                setTimeout(() => {
                    socket.emit('mus_action', { type: 'deleteTournament', room: app.mus.currentRoom, user: app.myPlayerName });
                }, 2000);
            } else {
                alert('❌ Error al generar PDF: ' + (result.error || 'Desconocido'));
            }
        });
    },

    // --- FUNCIONES COMUNES DE PARTIDAS ---
    getRoomMatches: () => {
        if (!app.mus.data) return [];
        if (app.mus.currentRoom === 'ABSOLUTA') return app.mus.data.matches;
        return app.mus.data.matches.filter(m => m.roomId === app.mus.currentRoom);
    },

    getFilteredMatches: () => {
        const roomMatches = app.mus.getRoomMatches();
        const period = document.getElementById('musPeriodFilter').value;
        const now = new Date();
        let limitDate = null;
        
        if(period === '7days') limitDate = new Date(now.setDate(now.getDate() - 7));
        else if(period === '30days') limitDate = new Date(now.setDate(now.getDate() - 30));
        else if(period === 'year') limitDate = new Date(now.setFullYear(now.getFullYear() - 1));
        
        if (!limitDate) return roomMatches;
        return roomMatches.filter(m => new Date(m.date) >= limitDate);
    },

    showAddMatchModal: (tourneyMatchId = null) => {
        if(!app.myPlayerName) return alert("Identifícate primero.");
        if(app.mus.currentRoom === 'ABSOLUTA') return alert("Selecciona una sala específica.");
        
        document.getElementById('musAddMatchModal').classList.remove('hidden');
        document.getElementById('matchRoomIndicator').innerText = "Sala: " + app.mus.currentRoom;
        document.getElementById('musS1').innerText = "0"; 
        document.getElementById('musS2').innerText = "0";

        app.mus.renderMatchPlayerSelects();

        const modal = document.getElementById('musAddMatchModal');
        delete modal.dataset.tourneyMatchId;

        // Auto rellenar si venimos de un cuadro de torneo
        if (tourneyMatchId && typeof tourneyMatchId === 'string') {
            modal.dataset.tourneyMatchId = tourneyMatchId;
            const roomData = app.mus.data.rooms.find(r => r.name === app.mus.currentRoom);
            if(roomData) {
                const state = JSON.parse(roomData.tournamentState);
                let match = null;
                if (state.phase === 'GROUPS') Object.values(state.groups).forEach(g => { const m = g.matches.find(x=>x.id===tourneyMatchId); if(m) match=m; });
                else if (state.phase === 'BRACKET') state.bracket.rounds.forEach(r => { const m = r.matches.find(x=>x.id===tourneyMatchId); if(m) match=m; });

                if (match) {
                    const [p1A, p1B] = match.p1.split(' y ');
                    const [p2A, p2B] = match.p2.split(' y ');
                    setTimeout(() => {
                        app.mus.forceSelectValue('musP1', p1A); app.mus.forceSelectValue('musP2', p1B);
                        app.mus.forceSelectValue('musP3', p2A); app.mus.forceSelectValue('musP4', p2B);
                    }, 50);
                }
            }
        }
    },

    forceSelectValue: (id, val) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (!Array.from(el.options).some(o => o.value === val)) {
            el.innerHTML += `<option value="${val}">${val}</option>`;
        }
        el.value = val;
    },

    submitMatch: () => {
        const p1 = document.getElementById('musP1').value; const p2 = document.getElementById('musP2').value;
        const p3 = document.getElementById('musP3').value; const p4 = document.getElementById('musP4').value;
        const s1 = document.getElementById('musS1').innerText; const s2 = document.getElementById('musS2').innerText;

        if (!p1 || !p2 || !p3 || !p4 || s1==="" || s2==="") return alert("Datos incompletos.");
        if (new Set([p1,p2,p3,p4]).size !== 4) return alert("Jugadores duplicados.");

        const tourneyMatchId = document.getElementById('musAddMatchModal').dataset.tourneyMatchId || null;

        socket.emit('mus_action', { 
            type: 'addMatch', 
            value: { roomId: app.mus.currentRoom, p1, p2, p3, p4, s1: parseInt(s1), s2: parseInt(s2), addedBy: app.myPlayerName, tourneyMatchId } 
        });
        document.getElementById('musAddMatchModal').classList.add('hidden');
    },

    changeScore: (team, delta) => {
        const el = document.getElementById('musS' + team);
        let val = parseInt(el.innerText) + delta;
        if (val < 0) val = 0;
        el.innerText = val;
    },

    currentMatchPlayers: [], 

    renderMatchPlayerSelects: () => {
        if (!app.mus.data) return;
        
        const roomMatches = app.mus.getRoomMatches();
        let roomPlayers = new Set();
        roomMatches.forEach(m => {
            roomPlayers.add(m.p1); roomPlayers.add(m.p2);
            roomPlayers.add(m.p3); roomPlayers.add(m.p4);
        });

        const allMatches = app.mus.data.matches;
        let playersWithMatches = new Set();
        allMatches.forEach(m => {
            playersWithMatches.add(m.p1); playersWithMatches.add(m.p2);
            playersWithMatches.add(m.p3); playersWithMatches.add(m.p4);
        });

        let playersToList = app.mus.data.players.filter(p => roomPlayers.has(p) || !playersWithMatches.has(p));
        if (roomMatches.length === 0) playersToList = [...app.mus.data.players];
        
        // Si estamos en un torneo, añadimos a la lista a los inscritos
        const roomData = app.mus.data.rooms.find(r => r.name === app.mus.currentRoom);
        if (roomData && roomData.isTournament) {
            const state = JSON.parse(roomData.tournamentState || "{}");
            if(state.players) state.players.forEach(p => { if(!playersToList.includes(p)) playersToList.push(p); });
        }
        
        playersToList.sort();
        app.mus.currentMatchPlayers = playersToList; 

        ['musP1', 'musP2', 'musP3', 'musP4'].forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.innerHTML = `<option value="">-- Elige --</option>` + playersToList.map(p => `<option value="${p}">${p}</option>`).join('');
                el.value = "";
                el.setAttribute("onchange", "app.mus.updateMatchSelects()");
            }
        });
    },

    updateMatchSelects: () => {
        const selects = ['musP1', 'musP2', 'musP3', 'musP4'];
        const selectedValues = selects.map(id => document.getElementById(id).value).filter(v => v !== "");

        selects.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const currentVal = el.value;
            
            let html = `<option value="">-- Elige --</option>`;
            app.mus.currentMatchPlayers.forEach(p => {
                if (!selectedValues.includes(p) || p === currentVal) {
                    html += `<option value="${p}" ${p === currentVal ? 'selected' : ''}>${p}</option>`;
                }
            });
            el.innerHTML = html;
        });
    },

    // --- FUNCIONES DE ANÁLISIS, RANKING Y LOGS ---
    toggleDayByDay: (active, max) => {
        app.mus.dayByDayActive = active;
        if (active) app.mus.dayByDayLimit = max;
        app.mus.changeView();
    },

    changeDayByDay: (delta) => {
        const max = app.mus.getFilteredMatches().length;
        app.mus.dayByDayLimit += delta;
        if (app.mus.dayByDayLimit < 0) app.mus.dayByDayLimit = 0;
        if (app.mus.dayByDayLimit > max) app.mus.dayByDayLimit = max;
        app.mus.changeView();
    },

    toggleMin3Rounds: (active) => {
        app.mus.min3RoundsActive = active;
        app.mus.changeView();
    },

    toggleNormalize: (active) => {
        app.mus.normalizeActive = active;
        app.mus.changeView();
    },

    renderLog: (container, filterAuthor = 'ALL') => {
        const allMatches = app.mus.getRoomMatches();
        if(allMatches.length === 0) { container.innerHTML = "<p>Sin partidas registradas.</p>"; return; }

        const authors = [...new Set(allMatches.map(m => m.addedBy).filter(Boolean))].sort();
        let matches = [...allMatches].sort((a,b) => b.id - a.id);
        if (filterAuthor !== 'ALL') matches = matches.filter(m => m.addedBy === filterAuthor);
        
        matches = matches.slice(0, 30);

        let html = `
        <div style="margin-bottom:15px; text-align:left;">
            <label style="color:#aaa; font-size:0.8em; margin-right:5px;">Filtrar autor:</label>
            <select id="logAuthorFilter" onchange="app.mus.renderLog(document.getElementById('musStatsContainer'), this.value)" style="padding:5px; border-radius:5px; background:#222; color:#fff; border:1px solid #444;">
                <option value="ALL">🌟 Todos</option>
                ${authors.map(a => `<option value="${a}" ${a===filterAuthor?'selected':''}>${a}</option>`).join('')}
            </select>
        </div>
        <div class="mus-table-wrapper"><table class="mus-table">
            <tr>
                <th style="width:25%">Fecha</th>
                <th>Resultado</th>
                <th>Autor</th>
                <th style="width:10%"></th>
            </tr>`;
            
        matches.forEach(m => {
            const d = new Date(m.date);
            const dateStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${d.getMinutes()<10?'0':''}${d.getMinutes()}`;
            const res = `<span style="color:#74b9ff">${m.p1}+${m.p2}</span> (${m.s1}) <br>vs<br> <span style="color:#ff7675">${m.p3}+${m.p4}</span> (${m.s2})`;
            let delBtn = "";
            
            const reqUser = app.myPlayerName ? app.myPlayerName.toLowerCase() : "";
            const addedByUser = m.addedBy ? m.addedBy.toLowerCase() : "";
            const isAdmin = app.mus.isAdmin();
            const isOwner = reqUser !== "" && reqUser === addedByUser;

            if (isAdmin || isOwner) {
                delBtn = `<button onclick="if(confirm('¿Borrar partida?')) socket.emit('mus_action', { type: 'deleteMatch', id: ${m.id}, user: app.myPlayerName })" style="padding:4px 8px; background:#e74c3c; font-size:0.8em; cursor:pointer;">🗑️</button>`;
            }
            html += `<tr>
                <td style="font-size:0.8em; color:#aaa">${dateStr}</td>
                <td style="line-height:1.2">${res}</td>
                <td style="font-size:0.8em; color:#e1b12c">${m.addedBy || '?'}</td>
                <td>${delBtn}</td>
            </tr>`;
        });
        html += `</table></div>`;
        container.innerHTML = html;
    },

    runAnalysis: () => {
        const mode = document.getElementById('musViewMode').value;
        const container = document.getElementById('musStatsContainer');
        const chartSection = document.getElementById('musChartSection');
        
        container.innerHTML = "";
        chartSection.classList.add('hidden');

        if (mode === 'examinar_persona') {
            const player = document.getElementById('musExamPlayer').value;
            const examType = document.getElementById('musExamTypeP').value;
            if (!player || player === 'all') return;

            if (examType === 'vs_win') {
                chartSection.classList.remove('hidden');
                app.mus.renderChart(player);
            } else {
                app.mus.renderDetailedAnalysis(container, player, examType);
            }
        } 
        else if (mode === 'examinar_pareja') {
            const p1 = document.getElementById('musExamPair1').value;
            const p2 = document.getElementById('musExamPair2').value;
            const examType = document.getElementById('musExamTypePair').value;
            
            if (!p1 || p1 === 'all' || !p2 || p2 === 'all') return;

            const pair = [p1, p2].sort().join(' y ');

            if (examType === 'vs_pair_win') {
                chartSection.classList.remove('hidden');
                app.mus.renderChart(pair);
            } else {
                app.mus.renderDetailedAnalysis(container, pair, examType);
            }
        }
    },

    renderAdminPanel: (container) => {
        if (!app.mus.isAdmin()) return;
        
        let html = `<h3 style="color:#f1c40f">⚙️ Panel de Administración</h3>`;
        html += `<h4 style="color:#aaa; border-bottom:1px solid #444; padding-bottom:5px; text-align:left;">👤 Jugadores</h4>`;
        html += `<ul style="list-style:none; padding:0; text-align:left; max-height: 250px; overflow-y: auto;">`;
        app.mus.data.players.forEach(p => {
            html += `<li style="margin-bottom:5px; background:#222; padding:8px; border-radius:5px; display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#fff; font-weight:bold;">${p}</span>
                <div style="display:flex; gap:5px;">
                    <button onclick="app.mus.adminRenamePlayer('${p}')" style="background:#3498db; padding:4px 8px; font-size:0.8em; width:auto;">✏️ Modificar</button>
                    <button onclick="app.mus.adminDeletePlayer('${p}')" style="background:#e74c3c; padding:4px 8px; font-size:0.8em; width:auto;">🗑️ Eliminar</button>
                </div>
            </li>`;
        });
        html += `</ul>`;

        html += `<h4 style="color:#aaa; border-bottom:1px solid #444; padding-bottom:5px; margin-top:20px; text-align:left;">📝 Partidas (Sala: ${app.mus.currentRoom})</h4>`;
        const matches = app.mus.getRoomMatches().sort((a,b) => b.id - a.id);
        
        if (matches.length === 0) {
            html += `<p style="text-align:left;">No hay partidas registradas en esta sala.</p>`;
        } else {
            html += `<div style="display:flex; flex-direction:column; gap:10px; max-height: 500px; overflow-y: auto;">`;
            matches.forEach(m => {
                const d = new Date(m.date);
                const dateStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${d.getMinutes()<10?'0':''}${d.getMinutes()}`;
                
                html += `<div style="background:#222; padding:10px; border-radius:5px; text-align:left; border-left:3px solid #f1c40f;">
                    <div style="font-size:0.8em; color:#aaa; margin-bottom:5px; display:flex; justify-content:space-between;">
                        <span>🗓️ ${dateStr}</span>
                        <span>ID: ${m.id}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="color:#fff; font-size:0.9em; flex:1;">
                            <span style="color:#74b9ff">${m.p1} y ${m.p2}</span> (<span style="color:#fff; font-weight:bold">${m.s1}</span>)<br>
                            <span style="color:#aaa; font-size:0.8em">VS</span><br>
                            <span style="color:#ff7675">${m.p3} y ${m.p4}</span> (<span style="color:#fff; font-weight:bold">${m.s2}</span>)
                        </div>
                        <div style="display:flex; flex-direction:column; gap:5px; align-items:flex-end;">
                            <button onclick="app.mus.adminEditMatchPlayers(${m.id})" style="background:#9b59b6; padding:4px 8px; font-size:0.8em; width:auto;">👥 Jugadores</button>
                            <button onclick="app.mus.adminEditMatchScore(${m.id})" style="background:#e67e22; padding:4px 8px; font-size:0.8em; width:auto;">🔢 Resultado</button>
                        </div>
                    </div>
                </div>`;
            });
            html += `</div>`;
        }
        container.innerHTML = html;
    },

    adminRenamePlayer: (oldName) => {
        const newName = prompt(`Modificar nombre de "${oldName}":`, oldName);
        if(newName && newName.trim() !== "" && newName !== oldName) {
            socket.emit('mus_action', { type: 'adminEditPlayer', user: app.myPlayerName, value: { oldName, newName: newName.trim() } });
        }
    },
    
    adminDeletePlayer: (name) => {
        if(confirm(`¿Seguro que quieres eliminar al jugador "${name}" de la lista?\n(Las partidas que haya jugado se mantendrán intactas en el historial)`)) {
            socket.emit('mus_action', { type: 'adminDeletePlayer', user: app.myPlayerName, value: name });
        }
    },
    
    adminEditMatchPlayers: (id) => {
        const m = app.mus.data.matches.find(x => x.id === id);
        if(!m) return;
        const p1 = prompt("Jugador 1 (Equipo 1):", m.p1) || m.p1;
        const p2 = prompt("Jugador 2 (Equipo 1):", m.p2) || m.p2;
        const p3 = prompt("Jugador 3 (Equipo 2):", m.p3) || m.p3;
        const p4 = prompt("Jugador 4 (Equipo 2):", m.p4) || m.p4;
        
        if(confirm(`Nuevos equipos:\nAzul: ${p1} y ${p2}\nRojo: ${p3} y ${p4}\n\n¿Guardar cambios?`)) {
            socket.emit('mus_action', { type: 'adminEditMatch', user: app.myPlayerName, value: { id, p1, p2, p3, p4, s1: m.s1, s2: m.s2 } });
        }
    },
    
    adminEditMatchScore: (id) => {
        const m = app.mus.data.matches.find(x => x.id === id);
        if(!m) return;
        const s1 = prompt(`Puntuación Equipo Azul (${m.p1} y ${m.p2}):`, m.s1);
        const s2 = prompt(`Puntuación Equipo Rojo (${m.p3} y ${m.p4}):`, m.s2);
        
        if(s1 !== null && s2 !== null) {
            socket.emit('mus_action', { type: 'adminEditMatch', user: app.myPlayerName, value: { id, p1: m.p1, p2: m.p2, p3: m.p3, p4: m.p4, s1: parseInt(s1), s2: parseInt(s2) } });
        }
    },

    renderRanking: (container, mode) => {
        const matches = app.mus.getFilteredMatches();
        let matchesToProcess = [...matches].sort((a,b) => a.id - b.id);
        const totalMatches = matchesToProcess.length;
        
        if (app.mus.dayByDayActive) {
            matchesToProcess = matchesToProcess.slice(0, app.mus.dayByDayLimit);
        }
        
        if (app.mus.min3RoundsActive) {
            matchesToProcess = matchesToProcess.filter(m => (m.s1 + m.s2) >= 3);
        }

        let stats = {}; 

        if (app.mus.normalizeActive) {
            const uniquePlayers = Array.from(new Set(matchesToProcess.flatMap(m => [m.p1, m.p2, m.p3, m.p4])));
            const allPairs = [];
            for (let i = 0; i < uniquePlayers.length; i++) {
                for (let j = i + 1; j < uniquePlayers.length; j++) {
                    allPairs.push([uniquePlayers[i], uniquePlayers[j]].sort().join(' y '));
                }
            }
            
            const getForce = (pairStr) => {
                let won = 0, lost = 0, recentWon = 0, recentLost = 0;
                const limit14 = Date.now() - (14 * 24 * 3600 * 1000);
                matchesToProcess.forEach(m => {
                    const t1 = [m.p1, m.p2].sort().join(' y ');
                    const t2 = [m.p3, m.p4].sort().join(' y ');
                    const isRecent = new Date(m.date).getTime() > limit14;
                    if (t1 === pairStr) { won += m.s1; lost += m.s2; if(isRecent) { recentWon += m.s1; recentLost += m.s2; } } 
                    else if (t2 === pairStr) { won += m.s2; lost += m.s1; if(isRecent) { recentWon += m.s2; recentLost += m.s1; } }
                });
                const total = won + lost;
                if (total === 0) return 0.5;
                const histWR = won / total;
                const recentTotal = recentWon + recentLost;
                const recentWR = recentTotal > 0 ? (recentWon / recentTotal) : histWR;
                return (histWR * 0.4) + (recentWR * 0.6); 
            };

            const pairForces = {};
            allPairs.forEach(p => pairForces[p] = getForce(p));

            const addSim = (k, w, l) => {
                if(!stats[k]) stats[k] = {rWon:0, rLost:0, pPlayed:0};
                stats[k].pPlayed += 1; 
                stats[k].rWon += w;
                stats[k].rLost += l;
            };

            for(let i=0; i<allPairs.length; i++){
                for(let j=i+1; j<allPairs.length; j++){
                    const pA = allPairs[i];
                    const pB = allPairs[j];
                    const pA_arr = pA.split(' y ');
                    const pB_arr = pB.split(' y ');
                    
                    if (pA_arr.some(player => pB_arr.includes(player))) continue; 

                    let f1 = pairForces[pA];
                    let f2 = pairForces[pB];
                    
                    let h2hW1 = 0, h2hW2 = 0;
                    matchesToProcess.forEach(m => {
                        const t1 = [m.p1, m.p2].sort().join(' y ');
                        const t2 = [m.p3, m.p4].sort().join(' y ');
                        if (t1 === pA && t2 === pB) { h2hW1 += m.s1; h2hW2 += m.s2; }
                        else if (t2 === pA && t1 === pB) { h2hW1 += m.s2; h2hW2 += m.s1; }
                    });
                    if (h2hW1 + h2hW2 > 0) {
                        const h2hRatio1 = h2hW1 / (h2hW1 + h2hW2);
                        f1 = (f1 * 0.7) + (h2hRatio1 * 0.3);
                        f2 = (f2 * 0.7) + ((1 - h2hRatio1) * 0.3);
                    }
                    if (f1===0 && f2===0) { f1=0.5; f2=0.5; }
                    
                    const probA = f1 / (f1 + f2);
                    const probB = f2 / (f1 + f2);

                    const wA = probA * 10;
                    const wB = probB * 10;

                    if (mode === 'ranking_pair') {
                        addSim(pA, wA, wB);
                        addSim(pB, wB, wA);
                    } else {
                        addSim(pA_arr[0], wA, wB);
                        addSim(pA_arr[1], wA, wB);
                        addSim(pB_arr[0], wB, wA);
                        addSim(pB_arr[1], wB, wA);
                    }
                }
            }
        } else {
            const add = (k, myS, oppS) => {
                if(!stats[k]) stats[k] = {rWon:0, rLost:0, pPlayed:0};
                stats[k].pPlayed++;
                stats[k].rWon += myS;
                stats[k].rLost += oppS;
            };

            if (mode === 'ranking_pair') {
                 matchesToProcess.forEach(m => {
                    add([m.p1, m.p2].sort().join(' y '), m.s1, m.s2);
                    add([m.p3, m.p4].sort().join(' y '), m.s2, m.s1);
                });
            } else {
                matchesToProcess.forEach(m => {
                    [m.p1, m.p2, m.p3, m.p4].forEach((p, idx) => {
                        const pTeam = (idx < 2) ? 1 : 2;
                        add(p, pTeam === 1 ? m.s1 : m.s2, pTeam === 1 ? m.s2 : m.s1);
                    });
                });
            }
        }
        
        let rows = Object.keys(stats).map(k => {
             const s = stats[k];
             const totalR = s.rWon + s.rLost;
             return {
                 name: k,
                 rWon: s.rWon,
                 rLost: s.rLost,
                 pPlayed: s.pPlayed,
                 pct: totalR > 0 ? (s.rWon / totalR) * 100 : 0,
                 dgp: s.rWon - s.rLost
             };
        });
        
        rows.sort((a,b) => {
            if (Math.abs(b.pct - a.pct) > 0.01) return b.pct - a.pct;
            const totalA = a.rWon + a.rLost;
            const totalB = b.rWon + b.rLost;
            if (a.pct > 50) return totalB - totalA; 
            if (a.pct < 50) return totalA - totalB; 
            if (b.dgp !== a.dgp) return b.dgp - a.dgp; 
            return totalB - totalA; 
        }); 
        
        const percentages = rows.map(r => r.pct);
        const maxPct = percentages.length > 0 ? Math.max(...percentages) : 100;
        const minPct = percentages.length > 0 ? Math.min(...percentages) : 0;
        const range = (maxPct - minPct) || 1; 
        
        const formatNumber = num => Number.isInteger(num) ? num : num.toFixed(1);

        let html = `<div class="mus-table-wrapper"><table class="mus-table">
            <tr>
                <th>Pareja / Jugador</th>
                <th>% WR</th>
                <th>DGP</th>
                <th>R.G.</th>
                <th>R.P.</th>
            </tr>`;
        
        rows.forEach(r => {
            let nameHtml = "";
            if (mode === 'ranking_pair') {
                const [n1, n2] = r.name.split(' y ');
                nameHtml = `<span class="player-avatar">${app.mus.getAvatar(n1)}</span>${n1} & <span class="player-avatar">${app.mus.getAvatar(n2)}</span>${n2}`;
            } else {
                nameHtml = `<span class="player-avatar">${app.mus.getAvatar(r.name)}</span>${r.name}`;
            }

            const norm = (r.pct - minPct) / range;
            const hue = 120 + ((1 - norm) * 240); 
            const winRateColor = `hsl(${hue}, 85%, 60%)`;

            const dgpColor = r.dgp > 0 ? '#2ed573' : (r.dgp < 0 ? '#ff4757' : '#aaa');
            const dgpStr = r.dgp > 0 ? `+${formatNumber(r.dgp)}` : formatNumber(r.dgp);
            
            html += `<tr>
                <td style="font-weight:bold; color:#fff" title="${r.name}">${nameHtml}</td>
                <td style="color:${winRateColor}; font-weight:900">${r.pct.toFixed(1)}%</td>
                <td style="color:${dgpColor}; font-weight:bold;">${dgpStr}</td>
                <td style="color:#2ed573">${formatNumber(r.rWon)}</td>
                <td style="color:#ff4757">${formatNumber(r.rLost)}</td>
            </tr>`;
        });
        html += `</table></div>`;

        html += `
        <div style="display:flex; flex-wrap:wrap; justify-content:flex-end; gap:10px; margin-top: 5px; margin-bottom: 20px;">
            <label style="color:#666; font-size: 0.75em; cursor:pointer;">
                <input type="checkbox" ${app.mus.min3RoundsActive ? 'checked' : ''} onchange="app.mus.toggleMin3Rounds(this.checked)" style="vertical-align: middle; margin-right: 3px;">
                +3 Rondas
            </label>
            <label style="color:#666; font-size: 0.75em; cursor:pointer;">
                <input type="checkbox" ${app.mus.normalizeActive ? 'checked' : ''} onchange="app.mus.toggleNormalize(this.checked)" style="vertical-align: middle; margin-right: 3px;">
                Normalizar
            </label>
            <label style="color:#666; font-size: 0.75em; cursor:pointer;">
                <input type="checkbox" ${app.mus.dayByDayActive ? 'checked' : ''} onchange="app.mus.toggleDayByDay(this.checked, ${totalMatches})" style="vertical-align: middle; margin-right: 3px;">
                Día a Día
            </label>
            ${app.mus.dayByDayActive ? `
            <div style="display:flex; justify-content:flex-end; align-items:center; gap:10px; width: 100%;">
                <button onclick="app.mus.changeDayByDay(-2)" style="background:transparent; border:none; color:#e74c3c; cursor:pointer; font-size:1.2em; padding:0; text-shadow:none !important;">⬅️</button>
                <span style="color:#888; font-size:0.8em; font-family:monospace; text-shadow:none !important;">Partidas: ${app.mus.dayByDayLimit} / ${totalMatches}</span>
                <button onclick="app.mus.changeDayByDay(2)" style="background:transparent; border:none; color:#2ed573; cursor:pointer; font-size:1.2em; padding:0; text-shadow:none !important;">➡️</button>
            </div>
            ` : ''}
        </div>`;

        // --- HISTORIAL TOP 20 RACHAS ---
        const ascMatches = [...matchesToProcess].sort((a,b) => a.id - b.id);
        let streaks = {}; 
        let allWinStreaks = [];
        let allLossStreaks = [];

        ascMatches.forEach(m => {
            if (m.s1 + m.s2 <= 1) return; // Ignorar partidas nulas o incompletas
            let t1Won = null;
            if (m.s1 > m.s2) t1Won = true;
            else if (m.s1 < m.s2) t1Won = false;

            const processEntity = (entity, won, myScore, oppScore) => {
                if (won === null) return; 
                if (!streaks[entity]) streaks[entity] = { type: null, val: 0 };
                
                if (won) {
                    if (streaks[entity].type === 'loss') {
                        // Racha de derrota cortada
                        allLossStreaks.push({ n: entity, val: streaks[entity].val, active: false });
                        streaks[entity] = { type: 'win', val: myScore };
                    } else {
                        // Sigue ganando
                        streaks[entity].type = 'win';
                        streaks[entity].val += myScore;
                    }
                } else {
                    if (streaks[entity].type === 'win') {
                        // Racha de victoria cortada
                        allWinStreaks.push({ n: entity, val: streaks[entity].val, active: false });
                        streaks[entity] = { type: 'loss', val: oppScore };
                    } else {
                        // Sigue perdiendo
                        streaks[entity].type = 'loss';
                        streaks[entity].val += oppScore;
                    }
                }
            };

            if (mode === 'ranking_pair') {
                const t1 = [m.p1, m.p2].sort().join(' y ');
                const t2 = [m.p3, m.p4].sort().join(' y ');
                processEntity(t1, t1Won, m.s1, m.s2);
                processEntity(t2, t1Won === null ? null : !t1Won, m.s2, m.s1);
            } else {
                [m.p1, m.p2].forEach(p => processEntity(p, t1Won, m.s1, m.s2));
                [m.p3, m.p4].forEach(p => processEntity(p, t1Won === null ? null : !t1Won, m.s2, m.s1));
            }
        });

        // Al terminar de iterar, guardamos las rachas actuales (que nunca se cortaron) y las marcamos como ACTIVAS
        Object.entries(streaks).forEach(([n, data]) => {
            if (data.type === 'win') allWinStreaks.push({ n, val: data.val, active: true });
            if (data.type === 'loss') allLossStreaks.push({ n, val: data.val, active: true });
        });

        // Ordenar de mayor racha a menor
        allWinStreaks.sort((a,b) => b.val - a.val);
        allLossStreaks.sort((a,b) => b.val - a.val);

        const formatStreak = (s, i, color, isWin) => `
            <div style="margin-bottom:8px; font-size:0.95em; border-bottom:1px solid #333; padding-bottom:5px;">
                <div style="display:flex; justify-content:space-between;">
                    <span><b>${i+1}. ${s.n}</b></span>
                    <span style="color:${color}; font-weight:bold;">${isWin ? '+' : '-'}${s.val} rondas</span>
                </div>
                ${s.active ? `<div style="font-size:0.85em; color:${color}; margin-top:2px; font-weight:bold;">🔥 AÚN ACTIVA</div>` : ''}
            </div>
        `;

        const titleText = mode === 'ranking_pair' ? 'Parejas' : 'Individual';

        html += `
            <h3 style="color:#e1b12c; margin-top:20px; margin-bottom:5px;">📜 Salón de la Fama: Top 20 Rachas (${titleText})</h3>
            <div style="display:grid; grid-template-columns: 1fr; gap:10px; text-align:left; margin-bottom:20px;">
                <div class="card" style="background:#222; border-left: 4px solid #2ed573; max-height:300px; overflow-y:auto;">
                    <div style="font-size:1em; font-weight:bold; color:#2ed573; margin-bottom:10px;">🏆 Mayores Rachas de Victoria</div>
                    ${allWinStreaks.slice(0,20).map((s, i) => formatStreak(s, i, '#2ed573', true)).join('')}
                </div>
                
                <div class="card" style="background:#222; border-left: 4px solid #ff4757; max-height:300px; overflow-y:auto;">
                    <div style="font-size:1em; font-weight:bold; color:#ff4757; margin-bottom:10px;">💀 Mayores Rachas de Derrota</div>
                    ${allLossStreaks.slice(0,20).map((s, i) => formatStreak(s, i, '#ff4757', false)).join('')}
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    updateRachasPlayer: (playerName) => {
        app.mus.rachasPlayerSelected = playerName;
        app.mus.changeView();
    },

    renderRachas: (container) => {
        try {
            const matches = app.mus.getFilteredMatches();
            const ascMatches = [...matches].sort((a,b) => a.id - b.id);
            
            let pStreaks = {}; 
            let pairStreaks = {};
            let allWinStreaks = [];
            let allLossStreaks = [];
            let pDiffHistory = {}; 
            let pairDiffHistory = {};

            ascMatches.forEach(m => {
                if (m.s1 + m.s2 <= 1) return;
                let t1Won = null;
                if (m.s1 > m.s2) t1Won = true;
                else if (m.s1 < m.s2) t1Won = false;

                const d = new Date(m.date);
                const dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;

                const processEntity = (entity, won, myScore, oppScore, oppNames, isPair) => {
                    let dict = isPair ? pairStreaks : pStreaks;
                    let hist = isPair ? pairDiffHistory : pDiffHistory;
                    
                    if (!hist[entity]) hist[entity] = [];
                    hist[entity].push(myScore - oppScore);

                    if (won === null) return; 

                    if (!dict[entity]) dict[entity] = { type: null, val: 0, start: dateStr };
                    
                    if (won) {
                        if (dict[entity].type === 'loss') {
                            allLossStreaks.push({ n: entity, val: dict[entity].val, endedBy: oppNames });
                            dict[entity] = { type: 'win', val: myScore };
                        } else {
                            dict[entity].type = 'win';
                            dict[entity].val += myScore;
                        }
                    } else {
                        if (dict[entity].type === 'win') {
                            allWinStreaks.push({ n: entity, val: dict[entity].val, endedBy: oppNames });
                            dict[entity] = { type: 'loss', val: oppScore };
                        } else {
                            dict[entity].type = 'loss';
                            dict[entity].val += oppScore;
                        }
                    }
                };

                const t1Names = `${m.p1} & ${m.p2}`;
                const t2Names = `${m.p3} & ${m.p4}`;

                const t1 = [m.p1, m.p2].sort().join(' y ');
                const t2 = [m.p3, m.p4].sort().join(' y ');
                
                [m.p1, m.p2].forEach(p => processEntity(p, t1Won, m.s1, m.s2, t2Names, false));
                [m.p3, m.p4].forEach(p => processEntity(p, t1Won === null ? null : !t1Won, m.s2, m.s1, t1Names, false));

                processEntity(t1, t1Won, m.s1, m.s2, t2Names, true);
                processEntity(t2, t1Won === null ? null : !t1Won, m.s2, m.s1, t1Names, true);
            });

            let maxWinP = {n: '-', val: 0}, maxLossP = {n: '-', val: 0};
            let maxWinPair = {n: '-', val: 0}, maxLossPair = {n: '-', val: 0};

            Object.entries(pStreaks).forEach(([n, data]) => {
                if (data.type === 'win' && data.val > maxWinP.val) maxWinP = {n, val: data.val};
                if (data.type === 'loss' && data.val > maxLossP.val) maxLossP = {n, val: data.val}; 
            });
            Object.entries(pairStreaks).forEach(([n, data]) => {
                if (data.type === 'win' && data.val > maxWinPair.val) maxWinPair = {n, val: data.val};
                if (data.type === 'loss' && data.val > maxLossPair.val) maxLossPair = {n, val: data.val}; 
            });

            Object.entries(pStreaks).forEach(([n, data]) => {
                if (data.type === 'win') allWinStreaks.push({ n, val: data.val, end: 'AÚN ACTIVA', endedBy: '-' });
                if (data.type === 'loss') allLossStreaks.push({ n, val: data.val, end: 'AÚN ACTIVA', endedBy: '-' });
            });
            Object.entries(pairStreaks).forEach(([n, data]) => {
                if (data.type === 'win') allWinStreaks.push({ n, val: data.val, end: 'AÚN ACTIVA', endedBy: '-' });
                if (data.type === 'loss') allLossStreaks.push({ n, val: data.val, end: 'AÚN ACTIVA', endedBy: '-' });
            });

            allWinStreaks.sort((a,b) => b.val - a.val);
            allLossStreaks.sort((a,b) => b.val - a.val);

            const getStdDev = (arr) => {
                if(!arr || arr.length < 5) return 0;
                const mean = arr.reduce((a, b) => a + b) / arr.length;
                return Math.sqrt(arr.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / arr.length);
            };
            
            let mostIrregularP = {n: '-', dev: 0};
            Object.keys(pDiffHistory).forEach(p => {
                const dev = getStdDev(pDiffHistory[p]);
                if (dev > mostIrregularP.dev) mostIrregularP = {n: p, dev};
            });
            let mostIrregularPair = {n: '-', dev: 0};
            Object.keys(pairDiffHistory).forEach(pair => {
                const dev = getStdDev(pairDiffHistory[pair]);
                if (dev > mostIrregularPair.dev) mostIrregularPair = {n: pair, dev};
            });

            const limit7 = Date.now() - (7 * 24 * 3600 * 1000);
            const recentMatches7 = ascMatches.filter(m => new Date(m.date).getTime() > limit7);
            
            let pRoundsCount = {};
            recentMatches7.forEach(m => {
                const totalRounds = m.s1 + m.s2;
                [m.p1, m.p2, m.p3, m.p4].forEach(p => pRoundsCount[p] = (pRoundsCount[p] || 0) + totalRounds);
            });
            let pRoundsArray = Object.entries(pRoundsCount).map(([n, c]) => ({n, c})).sort((a,b) => b.c - a.c);
            const top3Viciados = pRoundsArray.slice(0, 3);
            
            let viciadosHtml = "";
            const medals = ['🥇', '🥈', '🥉'];
            top3Viciados.forEach((v, i) => {
                viciadosHtml += `<div style="font-size:1.2em; font-weight:bold; color:#fff; margin-bottom:5px;">
                    ${medals[i] || '🎖️'} ${v.n} <span style="color:#74b9ff; font-weight:900; font-size:0.9em;">(${v.c} Rondas)</span>
                </div>`;
            });
            if(top3Viciados.length === 0) viciadosHtml = "<span style='color:#aaa;'>Nadie ha jugado esta semana.</span>";

            let histPairRounds = {};
            ascMatches.forEach(m => {
                const t1 = [m.p1, m.p2].sort().join(' y ');
                const t2 = [m.p3, m.p4].sort().join(' y ');
                const total = m.s1 + m.s2;
                histPairRounds[t1] = (histPairRounds[t1] || 0) + total;
                histPairRounds[t2] = (histPairRounds[t2] || 0) + total;
            });
            const top3Pairs = Object.entries(histPairRounds).sort((a,b) => b[1] - a[1]).slice(0, 3);

            let stomps = [];
            ascMatches.forEach(m => {
                const diff = Math.abs(m.s1 - m.s2);
                const t1 = [m.p1, m.p2].sort().join(' y ');
                const t2 = [m.p3, m.p4].sort().join(' y ');
                const d = new Date(m.date);
                const dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
                
                if (m.s1 > m.s2) {
                    stomps.push({ winner: t1, loser: t2, wScore: m.s1, lScore: m.s2, diff, date: dateStr });
                } else if (m.s2 > m.s1) {
                    stomps.push({ winner: t2, loser: t1, wScore: m.s2, lScore: m.s1, diff, date: dateStr });
                }
            });
            stomps.sort((a,b) => b.diff - a.diff);
            const top15Stomps = stomps.slice(0, 15);

            let stompsTableHtml = `<div class="mus-table-wrapper"><table class="mus-table" style="font-size:0.9em;">
                <tr><th>#</th><th>Fecha</th><th>Ganadores</th><th>Perdedores</th><th>Dif</th></tr>`;
            top15Stomps.forEach((s, i) => {
                stompsTableHtml += `<tr>
                    <td style="font-weight:bold;">${i+1}</td>
                    <td style="color:#aaa;">${s.date}</td>
                    <td style="color:#2ed573; font-weight:bold;">${s.winner} <span style="color:#fff">(${s.wScore})</span></td>
                    <td style="color:#ff4757;">${s.loser} <span style="color:#fff">(${s.lScore})</span></td>
                    <td style="color:#f1c40f; font-weight:900;">+${s.diff}</td>
                </tr>`;
            });
            stompsTableHtml += `</table></div>`;

            let playersList = [...new Set(ascMatches.flatMap(m => [m.p1, m.p2, m.p3, m.p4]))].sort();
            let playerSelectHtml = `<select id="rachasPlayerSelect" onchange="app.mus.updateRachasPlayer(this.value)" style="padding:5px; background:#fff; color:#000; border-radius:5px;">
                <option value="">-- Selecciona jugador --</option>
                ${playersList.map(p => `<option value="${p}" ${p===app.mus.rachasPlayerSelected?'selected':''}>${p}</option>`).join('')}
            </select>`;

            let playerVictoriesHtml = "";
            if (app.mus.rachasPlayerSelected) {
                let pWins = [];
                ascMatches.forEach(m => {
                    let p12 = [m.p1, m.p2];
                    let p34 = [m.p3, m.p4];
                    let isT1 = p12.includes(app.mus.rachasPlayerSelected);
                    let isT2 = p34.includes(app.mus.rachasPlayerSelected);
                    
                    if (isT1 && m.s1 > m.s2) {
                        pWins.push({ partner: p12.find(x => x !== app.mus.rachasPlayerSelected), rivals: p34.join(' y '), sW: m.s1, sL: m.s2, diff: m.s1 - m.s2, date: m.date });
                    } else if (isT2 && m.s2 > m.s1) {
                        pWins.push({ partner: p34.find(x => x !== app.mus.rachasPlayerSelected), rivals: p12.join(' y '), sW: m.s2, sL: m.s1, diff: m.s2 - m.s1, date: m.date });
                    }
                });
                pWins.sort((a,b) => b.diff - a.diff);
                
                playerVictoriesHtml = `<div class="mus-table-wrapper" style="margin-top:10px;"><table class="mus-table" style="font-size:0.9em;">
                    <tr><th>#</th><th>Fecha</th><th>Pareja</th><th>Contra</th><th>Res.</th><th>Dif</th></tr>`;
                pWins.slice(0, 10).forEach((w, i) => {
                    const d = new Date(w.date);
                    const dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
                    playerVictoriesHtml += `<tr>
                        <td style="font-weight:bold;">${i+1}</td>
                        <td style="color:#aaa;">${dateStr}</td>
                        <td style="color:#74b9ff;">${w.partner}</td>
                        <td style="color:#ff7675;">${w.rivals}</td>
                        <td><span style="color:#2ed573; font-weight:bold">${w.sW}</span> - <span style="color:#ff4757; font-weight:bold">${w.sL}</span></td>
                        <td style="color:#f1c40f; font-weight:900;">+${w.diff}</td>
                    </tr>`;
                });
                if(pWins.length === 0) playerVictoriesHtml += `<tr><td colspan="6">No tiene victorias registradas.</td></tr>`;
                playerVictoriesHtml += `</table></div>`;
            }

            let rHTML = `
                <h3 style="color:#0984e3; margin-bottom:5px;">📅 Más Viciados (Últimos 7 Días)</h3>
                <div style="display:grid; grid-template-columns: 1fr; gap:10px; text-align:left; margin-bottom:20px;">
                    <div class="card" style="background:#222; border-left: 4px solid #74b9ff;">
                        ${viciadosHtml}
                    </div>
                </div>

                <h3 style="color:#ffa502; margin-bottom:5px;">🔥 Rachas Actuales (Activas)</h3>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; text-align:left; margin-bottom:20px;">
                    <div class="card" style="background:#222; border-left: 4px solid #2ed573;">
                        <div style="font-size:0.8em; color:#aaa;">👤 Rondas Ganadas Seguidas</div>
                        <div style="font-size:1.2em; font-weight:bold; color:#fff;">${maxWinP.n}</div>
                        <div style="color:#2ed573; font-weight:900; font-size:1.3em;">+${maxWinP.val}</div>
                    </div>
                    <div class="card" style="background:#222; border-left: 4px solid #ff4757;">
                        <div style="font-size:0.8em; color:#aaa;">👤 Rondas Perdidas Seguidas</div>
                        <div style="font-size:1.2em; font-weight:bold; color:#fff;">${maxLossP.n}</div>
                        <div style="color:#ff4757; font-weight:900; font-size:1.3em;">-${maxLossP.val}</div>
                    </div>
                    <div class="card" style="background:#222; border-left: 4px solid #2ed573;">
                        <div style="font-size:0.8em; color:#aaa;">👥 Pareja Ganadora Seguidas</div>
                        <div style="font-size:1em; font-weight:bold; color:#fff;">${maxWinPair.n}</div>
                        <div style="color:#2ed573; font-weight:900; font-size:1.3em;">+${maxWinPair.val}</div>
                    </div>
                    <div class="card" style="background:#222; border-left: 4px solid #ff4757;">
                        <div style="font-size:0.8em; color:#aaa;">👥 Pareja Perdedora Seguidas</div>
                        <div style="font-size:1em; font-weight:bold; color:#fff;">${maxLossPair.n}</div>
                        <div style="color:#ff4757; font-weight:900; font-size:1.3em;">-${maxLossPair.val}</div>
                    </div>
                </div>

                <h3 style="color:#e1b12c; margin-bottom:5px;">📜 Salón de la Fama: Top 20 Rachas Históricas</h3>
                <div style="display:grid; grid-template-columns: 1fr; gap:10px; text-align:left; margin-bottom:20px;">
                    <div class="card" style="background:#222; border-left: 4px solid #2ed573; max-height:300px; overflow-y:auto;">
                        <div style="font-size:1em; font-weight:bold; color:#2ed573; margin-bottom:10px;">🏆 Mayores Rachas de Victoria</div>
                        ${allWinStreaks.slice(0,20).map((s, i) => `
                            <div style="margin-bottom:8px; font-size:0.95em; border-bottom:1px solid #333; padding-bottom:5px;">
                                <div style="display:flex; justify-content:space-between;">
                                    <span><b>${i+1}. ${s.n}</b></span>
                                    <span style="color:#2ed573; font-weight:bold;">+${s.val} rondas</span>
                                </div>
                                <div style="font-size:0.85em; color:#aaa; margin-top:2px;">
                                    ${s.end === 'AÚN ACTIVA' ? '<span style="color:#2ed573">🟢 AÚN ACTIVA</span>' : ``}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="card" style="background:#222; border-left: 4px solid #ff4757; max-height:300px; overflow-y:auto;">
                        <div style="font-size:1em; font-weight:bold; color:#ff4757; margin-bottom:10px;">💀 Mayores Rachas de Derrota</div>
                        ${allLossStreaks.slice(0,20).map((s, i) => `
                            <div style="margin-bottom:8px; font-size:0.95em; border-bottom:1px solid #333; padding-bottom:5px;">
                                <div style="display:flex; justify-content:space-between;">
                                    <span><b>${i+1}. ${s.n}</b></span>
                                    <span style="color:#ff4757; font-weight:bold;">-${s.val} rondas</span>
                                </div>
                                <div style="font-size:0.85em; color:#aaa; margin-top:2px;">
                                    ${s.end === 'AÚN ACTIVA' ? '<span style="color:#ff4757">🔴 AÚN ACTIVA</span>' : ``}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <h3 style="color:#f1c40f; margin-bottom:5px;">🥊 Top 15 Mayores Palizas (Stomps)</h3>
                <div style="margin-bottom:20px;">
                    ${stompsTableHtml}
                </div>
                
                <h3 style="color:#3498db; margin-bottom:5px;">🎖️ Mejores Victorias Individuales</h3>
                <div class="card" style="background:#222; border-left: 4px solid #3498db; text-align:left; margin-bottom:20px;">
                    <label style="color:#aaa; font-size:0.9em; margin-right:10px;">Elige a un jugador:</label>
                    ${playerSelectHtml}
                    ${playerVictoriesHtml}
                </div>

                <h3 style="color:#a55eea; margin-bottom:5px;">⚖️ Curiosidades Históricas</h3>
                <div style="display:grid; grid-template-columns: 1fr; gap:10px; text-align:left; margin-bottom:20px;">
                    <div class="card" style="background:#222; border-left: 4px solid #a55eea;">
                        <div style="font-size:0.9em; font-weight:bold; color:#a55eea; margin-bottom:10px;">🤝 Top 3 Parejas Históricas (Total Rondas)</div>
                        ${top3Pairs.map((p, i) => `
                            <div style="margin-bottom:5px; font-size:0.9em;">
                                <b>${i+1}. ${p[0]}</b> <span style="color:#aaa;">(${p[1]} rondas juntos)</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="card" style="background:#222; border-left: 4px solid #e056fd;">
                        <div style="font-size:0.8em; color:#aaa;">🎢 Jugador más irregular (Desv. Est.)</div>
                        <div style="font-size:1.2em; font-weight:bold; color:#fff;">${mostIrregularP.n}</div>
                        <div style="color:#e056fd; font-weight:900; font-size:0.9em;">${mostIrregularP.dev.toFixed(2)}</div>
                    </div>
                    <div class="card" style="background:#222; border-left: 4px solid #e056fd;">
                        <div style="font-size:0.8em; color:#aaa;">🎢 Pareja más irregular (Desv. Est.)</div>
                        <div style="font-size:1.2em; font-weight:bold; color:#fff;">${mostIrregularPair.n}</div>
                        <div style="color:#e056fd; font-weight:900; font-size:0.9em;">${mostIrregularPair.dev.toFixed(2)}</div>
                    </div>
                </div>
            `;
            container.innerHTML = rHTML;
        } catch(e) {
            console.error(e);
            container.innerHTML = `<div style="padding:20px; color:#ff4757; background:#222; border-radius:10px;">Hubo un error cargando las estadísticas: ${e.message}</div>`;
        }
    },

    updatePredictorOpponents: () => {
        const p1Str = document.getElementById('predPair1').value;
        const p2Select = document.getElementById('predPair2');
        if (!p2Select) return;

        const currentP2Str = p2Select.value;
        const matches = app.mus.getRoomMatches();
        const pairStats = {};
        
        matches.forEach(m => {
            const t1 = [m.p1, m.p2].sort().join(' y ');
            const t2 = [m.p3, m.p4].sort().join(' y ');
            pairStats[t1] = (pairStats[t1] || 0) + m.s1 + m.s2;
            pairStats[t2] = (pairStats[t2] || 0) + m.s1 + m.s2;
        });

        const validPairs = Object.keys(pairStats).filter(p => pairStats[p] >= 10).sort();
        const p1Players = p1Str ? p1Str.split(' y ') : [];

        let optionsHtml = `<option value="">-- Selecciona --</option>`;
        
        validPairs.forEach(pair => {
            if (p1Str && pair === p1Str) return; 
            const pairPlayers = pair.split(' y ');
            if (p1Players.some(player => pairPlayers.includes(player))) return;
            optionsHtml += `<option value="${pair}">${pair}</option>`;
        });

        p2Select.innerHTML = optionsHtml;

        if (Array.from(p2Select.options).some(o => o.value === currentP2Str)) {
            p2Select.value = currentP2Str;
        } else {
            p2Select.value = "";
        }
    },

    renderPredictor: (container) => {
        const matches = app.mus.getRoomMatches();
        const pairStats = {};
        matches.forEach(m => {
            const t1 = [m.p1, m.p2].sort().join(' y ');
            const t2 = [m.p3, m.p4].sort().join(' y ');
            pairStats[t1] = (pairStats[t1] || 0) + m.s1 + m.s2;
            pairStats[t2] = (pairStats[t2] || 0) + m.s1 + m.s2;
        });

        const validPairs = Object.keys(pairStats).filter(p => pairStats[p] >= 10).sort();
        const pairOpts = `<option value="">-- Selecciona --</option>` + validPairs.map(p => `<option value="${p}">${p}</option>`).join('');

        let html = `
            <h3 style="color:#a55eea;">🔮 Oráculo de Partidas</h3>
            <p style="color:#aaa; font-size:0.8em; margin-bottom:15px;">Simula un enfrentamiento basándose en el historial. <br><span style="font-size:0.8em;">(Solo parejas con >10 rondas registradas)</span></p>
            
            <div class="card" style="background:#2f3542; padding:15px; border-radius:10px;">
                <label style="color:#74b9ff; font-weight:bold;">Equipo Azul:</label>
                <select id="predPair1" onchange="app.mus.updatePredictorOpponents()" style="width:100%; margin-bottom:10px; background:#fff; color:#000;">${pairOpts}</select>
                
                <label style="color:#ff7675; font-weight:bold;">Equipo Rojo:</label>
                <select id="predPair2" style="width:100%; margin-bottom:10px; background:#fff; color:#000;">${pairOpts}</select>
                
                <label style="color:#f1c40f; font-weight:bold;">Rondas objetivo (ej. 40):</label>
                <input type="number" id="predTarget" value="40" min="1" max="100" style="width:100%; text-align:center; margin-bottom:15px; background:#fff; color:#000; padding:8px; border-radius:5px;">
                
                <button class="main-btn" style="background:#a55eea;" onclick="app.mus.calculatePrediction()">✨ PREDECIR RESULTADO ✨</button>
            </div>
            
            <div id="predResultArea" style="margin-top:20px;"></div>
        `;
        container.innerHTML = html;
        
        setTimeout(app.mus.updatePredictorOpponents, 50);
    },

    calculatePrediction: () => {
        const p1Str = document.getElementById('predPair1').value;
        const p2Str = document.getElementById('predPair2').value;
        const target = parseInt(document.getElementById('predTarget').value);
        const resArea = document.getElementById('predResultArea');

        if (!p1Str || !p2Str || p1Str === p2Str) {
            resArea.innerHTML = "<p style='color:#ff4757;'>Selecciona dos parejas distintas.</p>";
            return;
        }

        const matches = app.mus.getRoomMatches();
        
        const getPairStats = (pairStr) => {
            let won = 0, lost = 0, recentWon = 0, recentLost = 0;
            const limit14 = Date.now() - (14 * 24 * 3600 * 1000);
            
            matches.forEach(m => {
                const t1 = [m.p1, m.p2].sort().join(' y ');
                const t2 = [m.p3, m.p4].sort().join(' y ');
                const isRecent = new Date(m.date).getTime() > limit14;

                if (t1 === pairStr) {
                    won += m.s1; lost += m.s2;
                    if(isRecent) { recentWon += m.s1; recentLost += m.s2; }
                } else if (t2 === pairStr) {
                    won += m.s2; lost += m.s1;
                    if(isRecent) { recentWon += m.s2; recentLost += m.s1; }
                }
            });
            return { won, lost, total: won+lost, recentWon, recentLost, recentTotal: recentWon+recentLost };
        };

        const stats1 = getPairStats(p1Str);
        const stats2 = getPairStats(p2Str);

        const getForce = (s) => {
            const histWR = s.won / s.total;
            const recentWR = s.recentTotal > 0 ? (s.recentWon / s.recentTotal) : histWR;
            return (histWR * 0.4) + (recentWR * 0.6); 
        };

        let f1 = getForce(stats1);
        let f2 = getForce(stats2);

        let h2hW1 = 0, h2hW2 = 0;
        matches.forEach(m => {
            const t1 = [m.p1, m.p2].sort().join(' y ');
            const t2 = [m.p3, m.p4].sort().join(' y ');
            if (t1 === p1Str && t2 === p2Str) { h2hW1 += m.s1; h2hW2 += m.s2; }
            else if (t2 === p1Str && t1 === p2Str) { h2hW1 += m.s2; h2hW2 += m.s1; }
        });

        if ((h2hW1 + h2hW2) > 0) {
            const h2hRatio1 = h2hW1 / (h2hW1 + h2hW2);
            f1 = (f1 * 0.7) + (h2hRatio1 * 0.3); 
            f2 = (f2 * 0.7) + ((1 - h2hRatio1) * 0.3);
        }

        const prob1 = f1 / (f1 + f2);
        const prob2 = f2 / (f1 + f2);

        let predScore1, predScore2;
        if (prob1 > prob2) {
            predScore1 = target;
            predScore2 = Math.round(target * (prob2 / prob1));
        } else {
            predScore2 = target;
            predScore1 = Math.round(target * (prob1 / prob2));
        }

        const confidence = Math.min(100, Math.max(50, Math.round(Math.max(prob1, prob2) * 100)));
        const winnerColor = prob1 > prob2 ? '#74b9ff' : '#ff7675';
        const winnerName = prob1 > prob2 ? p1Str : p2Str;

        resArea.innerHTML = `
            <div style="background:#222; padding:20px; border-radius:10px; border:2px solid ${winnerColor};">
                <div style="font-size:0.9em; color:#aaa; margin-bottom:10px;">VENCEDOR ESTIMADO:</div>
                <div style="font-size:1.5em; font-weight:bold; color:${winnerColor}; margin-bottom:20px;">${winnerName}</div>
                
                <div style="display:flex; justify-content:space-around; align-items:center; margin-bottom:15px;">
                    <div style="text-align:center;">
                        <div style="font-size:3em; font-weight:900; color:#74b9ff;">${predScore1}</div>
                        <div style="font-size:0.7em; color:#aaa;">AZUL</div>
                    </div>
                    <div style="font-size:1.5em; color:#555; font-weight:bold;">-</div>
                    <div style="text-align:center;">
                        <div style="font-size:3em; font-weight:900; color:#ff7675;">${predScore2}</div>
                        <div style="font-size:0.7em; color:#aaa;">ROJO</div>
                    </div>
                </div>
                
                <div style="font-size:0.8em; color:#e1b12c; background:rgba(225,177,44,0.1); padding:5px; border-radius:5px;">
                    📈 Nivel de confianza: <b>${confidence}%</b>
                </div>
            </div>
        `;
    },

    renderDetailedAnalysis: (container, entity, type) => {
        const matches = app.mus.getFilteredMatches();
        const stats = {}; 
        
        const add = (k, myS, oppS) => {
            if(!stats[k]) stats[k] = {rWon:0, rLost:0, matches:0, pWon:0};
            stats[k].matches++;
            stats[k].rWon += myS;
            stats[k].rLost += oppS;
            if(myS > oppS) stats[k].pWon++;
        };

        if (type === 'best_partner') {
            matches.forEach(m => {
                let partner = null, myS = 0, oppS = 0;
                if (m.p1 === entity) { partner = m.p2; myS = m.s1; oppS = m.s2; }
                else if (m.p2 === entity) { partner = m.p1; myS = m.s1; oppS = m.s2; }
                else if (m.p3 === entity) { partner = m.p4; myS = m.s2; oppS = m.s1; }
                else if (m.p4 === entity) { partner = m.p3; myS = m.s2; oppS = m.s1; }
                if (partner) add(partner, myS, oppS);
            });
        } 
        else if (type === 'best_rival') {
            matches.forEach(m => {
                let rivals = [], myS = 0, oppS = 0;
                const t1Has = (m.p1 === entity || m.p2 === entity);
                const t2Has = (m.p3 === entity || m.p4 === entity);
                
                if (t1Has) { rivals = [m.p3, m.p4]; myS = m.s1; oppS = m.s2; }
                else if (t2Has) { rivals = [m.p1, m.p2]; myS = m.s2; oppS = m.s1; }
                
                rivals.forEach(r => add(r, myS, oppS));
            });
        }
        else if (type === 'vs_pair_performance') {
             const [pA, pB] = entity.split(' y ');
             matches.forEach(m => {
                 let oppPair = null, myS = 0, oppS = 0;
                 const t1 = (m.p1===pA && m.p2===pB) || (m.p1===pB && m.p2===pA);
                 const t2 = (m.p3===pA && m.p4===pB) || (m.p3===pB && m.p4===pA);
                 
                 if (t1) { oppPair = [m.p3, m.p4].sort().join(' y '); myS = m.s1; oppS = m.s2; }
                 else if (t2) { oppPair = [m.p1, m.p2].sort().join(' y '); myS = m.s2; oppS = m.s1; }
                 
                 if (oppPair) add(oppPair, myS, oppS);
             });
        }

        let rows = Object.keys(stats).map(k => {
            const s = stats[k];
            const totalR = s.rWon + s.rLost;
            return {
                name: k,
                rWon: s.rWon,
                rLost: s.rLost,
                matches: s.matches,
                pct: totalR > 0 ? ((s.rWon / totalR) * 100).toFixed(1) : 0
            };
        });

        rows.sort((a,b) => b.pct - a.pct);

        let html = `<div class="mus-table-wrapper"><table class="mus-table">
            <tr><th>Nombre</th><th>% Rondas</th><th>G</th><th>P</th><th>Partidas</th></tr>`;
            
        rows.forEach(r => {
            const color = r.pct >= 55 ? '#2ed573' : (r.pct < 45 ? '#ff4757' : '#ffa502');
            html += `<tr>
                <td style="text-align:left; font-weight:bold">${app.mus.getAvatar(r.name)} ${r.name}</td>
                <td style="color:${color}">${r.pct}%</td>
                <td>${r.rWon}</td>
                <td style="color:#aaa">${r.rLost}</td>
                <td>${r.matches}</td>
            </tr>`;
        });
        html += `</table></div>`;
        container.innerHTML = html;
    },

    renderChart: (entity, period) => {
        const ctx = document.getElementById('musChartCanvas').getContext('2d');
        if (app.mus.chartInstance) app.mus.chartInstance.destroy();
        
        const matches = app.mus.getFilteredMatches();
        const dataMap = {}; 
        
        matches.forEach(m => {
            let myScore = 0, oppScore = 0;
            let participated = false;

            if (entity.includes(' y ')) { 
                 const [pA, pB] = entity.split(' y ');
                 const t1 = (m.p1===pA && m.p2===pB) || (m.p1===pB && m.p2===pA);
                 const t2 = (m.p3===pA && m.p4===pB) || (m.p3===pB && m.p4===pA);
                 if (t1 || t2) {
                     participated = true;
                     myScore = t1 ? m.s1 : m.s2;
                     oppScore = t1 ? m.s2 : m.s1;
                 }
            } else { 
                 const team = (m.p1 === entity || m.p2 === entity) ? 1 : (m.p3 === entity || m.p4 === entity) ? 2 : 0;
                 if (team !== 0) {
                     participated = true;
                     myScore = (team === 1) ? m.s1 : m.s2;
                     oppScore = (team === 1) ? m.s2 : m.s1;
                 }
            }
            
            if (participated) {
                const d = new Date(m.date).toLocaleDateString('es-ES'); 
                if (!dataMap[d]) dataMap[d] = { won: 0, total: 0 };
                dataMap[d].won += myScore;
                dataMap[d].total += (myScore + oppScore);
            }
        });
        
        const labels = Object.keys(dataMap).sort((a,b) => {
             const [da, ma, ya] = a.split('/');
             const [db, mb, yb] = b.split('/');
             return new Date(`${ya}-${ma}-${da}`) - new Date(`${yb}-${mb}-${db}`);
        });
        
        const dataPoints = labels.map(l => {
            const d = dataMap[l];
            return ((d.won / d.total) * 100).toFixed(1);
        });

        app.mus.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '% Victorias (Rondas)',
                    data: dataPoints,
                    borderColor: '#e1b12c',
                    backgroundColor: 'rgba(225, 177, 44, 0.2)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#fff' } } },
                scales: {
                    x: { ticks: { color: '#ccc' }, grid: { color: '#444' } },
                    y: { ticks: { color: '#ccc' }, grid: { color: '#444' }, min: 0, max: 100 }
                }
            }
        });
    },

    renderPlayerSelects: () => {
        if (!app.mus.data) return;
        
        const matches = app.mus.getRoomMatches();
        const activePlayersSet = new Set();
        matches.forEach(m => {
            activePlayersSet.add(m.p1);
            activePlayersSet.add(m.p2);
            activePlayersSet.add(m.p3);
            activePlayersSet.add(m.p4);
        });
        const activePlayers = Array.from(activePlayersSet).sort();
        
        const activeOpts = activePlayers.map(p => `<option value="${p}">${p}</option>`).join('');
        
        // Llenar el de "Examinar Persona"
        const examP = document.getElementById('musExamPlayer');
        if(examP) examP.innerHTML = `<option value="all">-- Selecciona --</option>` + activeOpts;

        // Llenar el Jugador 1 de "Examinar Pareja"
        const examPair1 = document.getElementById('musExamPair1');
        const examPair2 = document.getElementById('musExamPair2');
        if(examPair1 && examPair2) {
            examPair1.innerHTML = `<option value="all">-- Jugador 1 --</option>` + activeOpts;
            examPair2.innerHTML = `<option value="all">-- Jugador 2 --</option>`;
        }
    },

    updateExamPairSelects: () => {
        const p1 = document.getElementById('musExamPair1').value;
        const p2Select = document.getElementById('musExamPair2');
        
        if (!p2Select) return;

        if (p1 === 'all' || !p1) {
            p2Select.innerHTML = `<option value="all">-- Jugador 2 --</option>`;
            app.mus.runAnalysis(); // Limpia la pantalla
            return;
        }

        const matches = app.mus.getRoomMatches();
        const partnersSet = new Set();

        matches.forEach(m => {
            if (m.p1 === p1) partnersSet.add(m.p2);
            if (m.p2 === p1) partnersSet.add(m.p1);
            if (m.p3 === p1) partnersSet.add(m.p4);
            if (m.p4 === p1) partnersSet.add(m.p3);
        });

        const partnerOpts = Array.from(partnersSet).sort().map(p => `<option value="${p}">${p}</option>`).join('');
        p2Select.innerHTML = `<option value="all">-- Jugador 2 --</option>` + partnerOpts;
        
        app.mus.runAnalysis(); 
    },

    getUniquePairs: () => {
        if(!app.mus.data) return [];
        const matches = app.mus.getRoomMatches();
        const stats = {};
        matches.forEach(m => {
            stats[[m.p1, m.p2].sort().join(' y ')] = 1;
            stats[[m.p3, m.p4].sort().join(' y ')] = 1;
        });
        return Object.keys(stats).sort();
    }
};

socket.on('mus_data', (d) => {
    app.mus.data = d;
    
    // Si el torneo actual fue eliminado, cambiar a ABSOLUTA
    if (app.mus.currentRoom !== 'ABSOLUTA' && !d.rooms.find(r => r.name === app.mus.currentRoom)) {
        app.mus.currentRoom = 'ABSOLUTA';
        // alert('El torneo ha sido eliminado correctamente.');
    }
    
    app.mus.renderRoomSelector();
    app.mus.changeView(); 
});
socket.on('mus_msg', (msg) => alert(msg));