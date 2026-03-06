app.mus = {
    data: null,
    chartInstance: null,
    currentRoom: "Entre Nosotros (Las monjas)", 
    
    // Estados nuevos para el modo Día a Día y la selección de jugador
    dayByDayActive: false,
    dayByDayLimit: 0,
    rachasPlayerSelected: "",
    
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷','🕸','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🐓','🦃','🦚','🦜','🦢','🦩','🕊','🐇','🦝','🦨','🦡','🦦','🦫','🐁','🐀','🐿','🦔','🐉','🐲'],

    init: () => {
        const vm = document.getElementById('musViewMode');
        
        if (vm && !vm.querySelector('option[value="rachas"]')) {
            const opt = document.createElement('option');
            opt.value = 'rachas';
            opt.innerHTML = '🔥 Rachas y Curiosidades';
            vm.appendChild(opt);
        }

        if (vm && !vm.querySelector('option[value="predictor"]')) {
            const optP = document.createElement('option');
            optP.value = 'predictor';
            optP.innerHTML = '🔮 Predictor de Partidas';
            vm.appendChild(optP);
        }

        if (app.myPlayerName && app.myPlayerName.toLowerCase() === 'administrador m') {
            if (vm && !vm.querySelector('option[value="administracion"]')) {
                const optAdmin = document.createElement('option');
                optAdmin.value = 'administracion';
                optAdmin.innerHTML = '⚙️ Administración';
                vm.appendChild(optAdmin);
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

    renderRoomSelector: () => {
        const sel = document.getElementById('musRoomSelect');
        if(!sel || !app.mus.data) return;
        const current = app.mus.currentRoom;
        
        let html = `<option value="ABSOLUTA">⭐ ABSOLUTA (Todas)</option>`;
        app.mus.data.rooms.forEach(r => {
            html += `<option value="${r}">${r}</option>`;
        });
        sel.innerHTML = html;
        
        if (app.mus.data.rooms.includes(current) || current === 'ABSOLUTA') {
            sel.value = current;
        } else {
            sel.value = app.mus.data.rooms[0];
            app.mus.currentRoom = app.mus.data.rooms[0];
        }
    },

    changeRoom: () => {
        const sel = document.getElementById('musRoomSelect');
        app.mus.currentRoom = sel.value;
        app.mus.dayByDayActive = false; // Resetear el día a día al cambiar de sala
        app.mus.changeView(); 
    },

    toggleControls: () => {
        const area = document.getElementById('musControlsArea');
        if (area) area.classList.toggle('hidden');
    },

    createRoom: () => {
        if (app.myPlayerName !== "musero") return alert("Solo el usuario 'musero' puede crear salas nuevas.");
        const name = prompt("Nombre de la nueva sala:");
        if(name) socket.emit('mus_action', { type: 'addRoom', value: name, user: app.myPlayerName });
    },

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

    addPlayer: () => {
        const name = prompt("Nombre:");
        if (name) socket.emit('mus_action', { type: 'addPlayer', value: name });
    },

    showAddMatchModal: () => {
        if(!app.myPlayerName) return alert("Identifícate primero.");
        if(app.mus.currentRoom === 'ABSOLUTA') return alert("Selecciona una sala específica.");
        document.getElementById('musAddMatchModal').classList.remove('hidden');
        document.getElementById('matchRoomIndicator').innerText = "Sala: " + app.mus.currentRoom;
        
        // Resetear puntuaciones a 0
        document.getElementById('musS1').innerText = "0";
        document.getElementById('musS2').innerText = "0";

        app.mus.renderMatchPlayerSelects(); // Nueva función de filtrado
    },

    submitMatch: () => {
        const p1 = document.getElementById('musP1').value;
        const p2 = document.getElementById('musP2').value;
        const p3 = document.getElementById('musP3').value;
        const p4 = document.getElementById('musP4').value;
        const s1 = document.getElementById('musS1').innerText; // Extrae el texto del span
        const s2 = document.getElementById('musS2').innerText; // Extrae el texto del span

        if (!p1 || !p2 || !p3 || !p4 || s1==="" || s2==="") return alert("Datos incompletos.");
        if (new Set([p1,p2,p3,p4]).size !== 4) return alert("Jugadores duplicados.");

        socket.emit('mus_action', { 
            type: 'addMatch', 
            value: { 
                roomId: app.mus.currentRoom,
                p1, p2, p3, p4, 
                s1: parseInt(s1), s2: parseInt(s2), 
                addedBy: app.myPlayerName 
            } 
        });
        document.getElementById('musAddMatchModal').classList.add('hidden');
    },

    changeScore: (team, delta) => {
        const el = document.getElementById('musS' + team);
        let val = parseInt(el.innerText) + delta;
        if (val < 0) val = 0;
        el.innerText = val;
    },

    currentMatchPlayers: [], // Variable temporal para guardar la lista permitida

    renderMatchPlayerSelects: () => {
        if (!app.mus.data) return;
        
        // 1. Obtener quién ha jugado EN ESTA SALA
        const roomMatches = app.mus.getRoomMatches();
        let roomPlayers = new Set();
        roomMatches.forEach(m => {
            roomPlayers.add(m.p1); roomPlayers.add(m.p2);
            roomPlayers.add(m.p3); roomPlayers.add(m.p4);
        });

        // 2. Obtener jugadores globales que NO han jugado nunca ninguna partida (recién creados)
        const allMatches = app.mus.data.matches;
        let playersWithMatches = new Set();
        allMatches.forEach(m => {
            playersWithMatches.add(m.p1); playersWithMatches.add(m.p2);
            playersWithMatches.add(m.p3); playersWithMatches.add(m.p4);
        });

        // 3. La lista será: Los que ya jugaron aquí + Los que acaban de ser registrados y están a 0 partidas
        let playersToList = app.mus.data.players.filter(p => roomPlayers.has(p) || !playersWithMatches.has(p));

        // Fallback: Si la sala es totalmente nueva (0 partidas), mostramos a todo el mundo
        if (roomMatches.length === 0) playersToList = [...app.mus.data.players];
        
        playersToList.sort();
        app.mus.currentMatchPlayers = playersToList; 

        ['musP1', 'musP2', 'musP3', 'musP4'].forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.innerHTML = `<option value="">-- Elige --</option>` + 
                               playersToList.map(p => `<option value="${p}">${p}</option>`).join('');
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
                // Solo muestra al jugador si NO está seleccionado en otra casilla, o si es el de esta misma casilla
                if (!selectedValues.includes(p) || p === currentVal) {
                    html += `<option value="${p}" ${p === currentVal ? 'selected' : ''}>${p}</option>`;
                }
            });
            el.innerHTML = html;
        });
    },

    deleteMatch: (id) => {
        if(confirm("¿Borrar partida?")) socket.emit('mus_action', { type: 'deleteMatch', id, user: app.myPlayerName });
    },

    backup: () => {
        if(confirm("¿Forzar Backup en servidor?")) socket.emit('mus_action', { type: 'backup' });
    },

    adminRenamePlayer: (oldName) => {
        const newName = prompt(`Modificar nombre de "${oldName}":`, oldName);
        if(newName && newName.trim() !== "" && newName !== oldName) {
            socket.emit('mus_action', { 
                type: 'adminEditPlayer', 
                user: app.myPlayerName, 
                value: { oldName, newName: newName.trim() } 
            });
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
            socket.emit('mus_action', { 
                type: 'adminEditMatch', 
                user: app.myPlayerName, 
                value: { id, p1, p2, p3, p4, s1: m.s1, s2: m.s2 } 
            });
        }
    },
    
    adminEditMatchScore: (id) => {
        const m = app.mus.data.matches.find(x => x.id === id);
        if(!m) return;
        const s1 = prompt(`Puntuación Equipo Azul (${m.p1} y ${m.p2}):`, m.s1);
        const s2 = prompt(`Puntuación Equipo Rojo (${m.p3} y ${m.p4}):`, m.s2);
        
        if(s1 !== null && s2 !== null) {
            socket.emit('mus_action', { 
                type: 'adminEditMatch', 
                user: app.myPlayerName, 
                value: { id, p1: m.p1, p2: m.p2, p3: m.p3, p4: m.p4, s1: parseInt(s1), s2: parseInt(s2) } 
            });
        }
    },

    changeView: () => {
        const mode = document.getElementById('musViewMode').value;
        const container = document.getElementById('musStatsContainer');
        
        const divExamPlayer = document.getElementById('divExamPlayer');
        const divExamPair = document.getElementById('divExamPair');
        const chart = document.getElementById('musChartSection');

        container.innerHTML = "";
        if(divExamPlayer) divExamPlayer.classList.add('hidden');
        if(divExamPair) divExamPair.classList.add('hidden');
        if(chart) chart.classList.add('hidden');

        if (mode === 'ranking_pair' || mode === 'ranking_player') {
            app.mus.renderRanking(container, mode);
        } 
        else if (mode === 'top_improvement') {
            app.mus.renderImprovement(container);
        }
        else if (mode === 'recent_log') {
            app.mus.renderLog(container, 'ALL');
        }
        else if (mode === 'examinar_persona') {
            if(divExamPlayer) divExamPlayer.classList.remove('hidden');
            app.mus.renderPlayerSelects();
            app.mus.runAnalysis();
        }
        else if (mode === 'examinar_pareja') {
            if(divExamPair) divExamPair.classList.remove('hidden');
            app.mus.renderPlayerSelects();
            app.mus.runAnalysis();
        }
        else if (mode === 'rachas') {
            app.mus.renderRachas(container);
        }
        else if (mode === 'predictor') {
            app.mus.renderPredictor(container);
        }
        else if (mode === 'administracion') {
            app.mus.renderAdminPanel(container);
        }
    },

    // Controles para el modo Día a Día
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

    // FUNCIÓN RENDERLOG QUE FALTABA
    renderLog: (container, filterAuthor = 'ALL') => {
        const allMatches = app.mus.getRoomMatches();
        if(allMatches.length === 0) { container.innerHTML = "<p>Sin partidas registradas.</p>"; return; }

        const authors = [...new Set(allMatches.map(m => m.addedBy).filter(Boolean))].sort();
        
        let matches = [...allMatches].sort((a,b) => b.id - a.id);
        if (filterAuthor !== 'ALL') {
            matches = matches.filter(m => m.addedBy === filterAuthor);
        }
        
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
            
            const isAdmin = reqUser === "administrador de mus" || reqUser === "musero" || reqUser === "xarlie" || reqUser === "administrador m";
            const isOwner = reqUser !== "" && reqUser === addedByUser;

            if (isAdmin || isOwner) {
                delBtn = `<button onclick="app.mus.deleteMatch(${m.id})" style="padding:4px 8px; background:#e74c3c; font-size:0.8em; cursor:pointer;">🗑️</button>`;
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

    renderAdminPanel: (container) => {
        if (app.myPlayerName.toLowerCase() !== 'administrador m') return;
        
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

    renderRanking: (container, mode) => {
        const matches = app.mus.getFilteredMatches();
        let matchesToProcess = [...matches].sort((a,b) => a.id - b.id);
        const totalMatches = matchesToProcess.length;
        
        // Recorte de array si el modo Día a Día está activo
        if (app.mus.dayByDayActive) {
            matchesToProcess = matchesToProcess.slice(0, app.mus.dayByDayLimit);
        }

        const stats = {}; 
        
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

        // 1. DIBUJAR TABLA PRINCIPAL
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
            const dgpStr = r.dgp > 0 ? `+${r.dgp}` : r.dgp;
            
            html += `<tr>
                <td style="font-weight:bold; color:#fff" title="${r.name}">${nameHtml}</td>
                <td style="color:${winRateColor}; font-weight:900">${r.pct.toFixed(1)}%</td>
                <td style="color:${dgpColor}; font-weight:bold;">${dgpStr}</td>
                <td style="color:#2ed573">${r.rWon}</td>
                <td style="color:#ff4757">${r.rLost}</td>
            </tr>`;
        });
        html += `</table></div>`;

        // 2. BOTÓN DISCRETO DE DÍA A DÍA JUSTO DEBAJO DE LA TABLA A LA DERECHA
        html += `
        <div style="text-align: right; margin-top: 5px; margin-bottom: 20px;">
            <label style="color:#666; font-size: 0.75em; cursor:pointer;">
                <input type="checkbox" ${app.mus.dayByDayActive ? 'checked' : ''} onchange="app.mus.toggleDayByDay(this.checked, ${totalMatches})" style="vertical-align: middle; margin-right: 3px; opacity: 0.5;">
                Día a Día
            </label>
            ${app.mus.dayByDayActive ? `
            <div style="display:flex; justify-content:flex-end; align-items:center; gap:10px; margin-top: 5px;">
                <button onclick="app.mus.changeDayByDay(-2)" style="background:transparent; border:none; color:#e74c3c; cursor:pointer; font-size:1.2em; padding:0;">⬅️</button>
                <span style="color:#888; font-size:0.8em; font-family:monospace;">Partidas: ${app.mus.dayByDayLimit} / ${totalMatches}</span>
                <button onclick="app.mus.changeDayByDay(2)" style="background:transparent; border:none; color:#2ed573; cursor:pointer; font-size:1.2em; padding:0;">➡️</button>
            </div>
            ` : ''}
        </div>`;

        // 3. CÁLCULO DE LAS 15 RACHAS ESPECÍFICAS
        let streaks = {}; 
        let allWinStreaks = [];
        let allLossStreaks = [];

        matchesToProcess.forEach(m => {
            let t1Won = null;
            if (m.s1 > m.s2) t1Won = true;
            else if (m.s1 < m.s2) t1Won = false;

            const processEntity = (entity, won, myScore, oppScore, oppNames) => {
                if (won === null) return; 
                if (!streaks[entity]) streaks[entity] = { type: null, val: 0 };
                
                if (won) {
                    if (streaks[entity].type === 'loss') {
                        allLossStreaks.push({ n: entity, val: streaks[entity].val, endedBy: oppNames });
                        streaks[entity] = { type: 'win', val: myScore };
                    } else {
                        streaks[entity].type = 'win';
                        streaks[entity].val += myScore;
                    }
                } else {
                    if (streaks[entity].type === 'win') {
                        allWinStreaks.push({ n: entity, val: streaks[entity].val, endedBy: oppNames });
                        streaks[entity] = { type: 'loss', val: oppScore };
                    } else {
                        streaks[entity].type = 'loss';
                        streaks[entity].val += oppScore;
                    }
                }
            };

            const t1Names = `${m.p1} & ${m.p2}`;
            const t2Names = `${m.p3} & ${m.p4}`;

            if (mode === 'ranking_pair') {
                const t1 = [m.p1, m.p2].sort().join(' y ');
                const t2 = [m.p3, m.p4].sort().join(' y ');
                processEntity(t1, t1Won, m.s1, m.s2, t2Names);
                processEntity(t2, t1Won === null ? null : !t1Won, m.s2, m.s1, t1Names);
            } else {
                [m.p1, m.p2].forEach(p => processEntity(p, t1Won, m.s1, m.s2, t2Names));
                [m.p3, m.p4].forEach(p => processEntity(p, t1Won === null ? null : !t1Won, m.s2, m.s1, t1Names));
            }
        });

        // Añadir las rachas que siguen activas
        Object.entries(streaks).forEach(([n, data]) => {
            if (data.type === 'win') allWinStreaks.push({ n, val: data.val, endedBy: '-' });
            if (data.type === 'loss') allLossStreaks.push({ n, val: data.val, endedBy: '-' });
        });

        allWinStreaks.sort((a,b) => b.val - a.val);
        allLossStreaks.sort((a,b) => b.val - a.val);

        const titleText = mode === 'ranking_pair' ? 'Parejas' : 'Individual';

        // 4. PINTAR LAS RACHAS AL FINAL DE LA VISTA
        html += `
            <h3 style="color:#e1b12c; margin-top:20px; margin-bottom:5px;">🔥 Top 15 Rachas (${titleText})</h3>
            <div style="display:grid; grid-template-columns: 1fr; gap:10px; text-align:left; margin-bottom:20px;">
                <div class="card" style="background:#222; border-left: 4px solid #2ed573; max-height:250px; overflow-y:auto;">
                    <div style="font-size:1em; font-weight:bold; color:#2ed573; margin-bottom:10px;">🏆 Victoria</div>
                    ${allWinStreaks.slice(0,15).map((s, i) => `
                        <div style="margin-bottom:8px; font-size:0.9em; border-bottom:1px solid #333; padding-bottom:5px;">
                            <div style="display:flex; justify-content:space-between;">
                                <span><b>${i+1}.</b> ${s.n}</span>
                                <span style="color:#2ed573; font-weight:bold;">+${s.val}</span>
                            </div>
                            <div style="font-size:0.8em; color:#aaa;">${s.endedBy === '-' ? '<span style="color:#2ed573">🟢 ACTIVA</span>' : `Cortada por <span style="color:#ff7675">${s.endedBy}</span>`}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="card" style="background:#222; border-left: 4px solid #ff4757; max-height:250px; overflow-y:auto;">
                    <div style="font-size:1em; font-weight:bold; color:#ff4757; margin-bottom:10px;">💀 Derrota</div>
                    ${allLossStreaks.slice(0,15).map((s, i) => `
                        <div style="margin-bottom:8px; font-size:0.9em; border-bottom:1px solid #333; padding-bottom:5px;">
                            <div style="display:flex; justify-content:space-between;">
                                <span><b>${i+1}.</b> ${s.n}</span>
                                <span style="color:#ff4757; font-weight:bold;">-${s.val}</span>
                            </div>
                            <div style="font-size:0.8em; color:#aaa;">${s.endedBy === '-' ? '<span style="color:#ff4757">🔴 ACTIVA</span>' : `Salvados vs <span style="color:#74b9ff">${s.endedBy}</span>`}</div>
                        </div>
                    `).join('')}
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
        const matches = app.mus.getFilteredMatches();
        const ascMatches = [...matches].sort((a,b) => a.id - b.id);
        
        let pStreaks = {}; 
        let pairStreaks = {};
        let allWinStreaks = [];
        let allLossStreaks = [];
        let pDiffHistory = {}; 
        let pairDiffHistory = {};

        ascMatches.forEach(m => {
            const t1 = [m.p1, m.p2].sort().join(' y ');
            const t2 = [m.p3, m.p4].sort().join(' y ');
            
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
                        allLossStreaks.push({ n: entity, val: dict[entity].val, end: dateStr, endedBy: oppNames });
                        dict[entity] = { type: 'win', val: myScore, start: dateStr };
                    } else {
                        if (dict[entity].type !== 'win') dict[entity].start = dateStr;
                        dict[entity].type = 'win';
                        dict[entity].val += myScore;
                    }
                } else {
                    if (dict[entity].type === 'win') {
                        allWinStreaks.push({ n: entity, val: dict[entity].val, end: dateStr, endedBy: oppNames });
                        dict[entity] = { type: 'loss', val: oppScore, start: dateStr };
                    } else {
                        if (dict[entity].type !== 'loss') dict[entity].start = dateStr;
                        dict[entity].type = 'loss';
                        dict[entity].val += oppScore;
                    }
                }
            };

            const t1Names = `${m.p1} & ${m.p2}`;
            const t2Names = `${m.p3} & ${m.p4}`;

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
            if(arr.length < 5) return 0;
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

        // Viciados (últimos 7 días)
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
                ${medals[i]} ${v.n} <span style="color:#74b9ff; font-weight:900; font-size:0.9em;">(${v.c} Rondas)</span>
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
        const top3Pairs = Object.entries(histPairRounds)
                                .sort((a,b) => b[1] - a[1])
                                .slice(0, 3);

        // Stompeadas (Top 15)
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

        // 10 Mejores victorias de jugador elegido
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
                                ${s.end === 'AÚN ACTIVA' ? '<span style="color:#2ed573">🟢 AÚN ACTIVA</span>' : `Cortada el ${s.end} por <b style="color:#ff7675">${s.endedBy}</b>`}
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
                                ${s.end === 'AÚN ACTIVA' ? '<span style="color:#ff4757">🔴 AÚN ACTIVA</span>' : `Salvados el ${s.end} contra <b style="color:#74b9ff">${s.endedBy}</b>`}
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

    renderTopMatchesTable: (matchesList) => {
        matchesList.sort((a,b) => {
            const totalA = a.s1 + a.s2;
            const totalB = b.s1 + b.s2;
            if (totalB !== totalA) return totalB - totalA;
            return new Date(b.date) - new Date(a.date);
        });

        const top5 = matchesList.slice(0, 5);
        if (top5.length === 0) return '';

        let html = `<h4 style="margin-top:25px; color:#aaa; font-size:0.8em; text-transform:uppercase; border-top:1px solid #444; padding-top:10px;">🔥 Top 5: Partidas más largas</h4>
        <div class="mus-table-wrapper"><table class="mus-table">
            <tr><th style="width:25%">Fecha</th><th>Resultado</th><th style="width:15%">Total</th></tr>`;

        top5.forEach(m => {
            const d = new Date(m.date);
            const dateStr = `${d.getDate()}/${d.getMonth()+1}`;
            const res = `<span style="color:#74b9ff">${m.s1}</span> - <span style="color:#ff7675">${m.s2}</span>`;
            
            html += `<tr>
                <td style="font-size:0.8em; color:#aaa">${dateStr}</td>
                <td style="font-weight:bold">${res}</td>
                <td style="color:#e1b12c; font-weight:900">${m.s1 + m.s2}</td>
            </tr>`;
        });

        return html + '</table></div>';
    },

    runAnalysis: () => {
        const mode = document.getElementById('musViewMode').value;
        const container = document.getElementById('musStatsContainer');
        const chartContainer = document.getElementById('musChartSection');
        const period = document.getElementById('musPeriodFilter').value;
        
        container.innerHTML = "";
        let entity, type;

        if (mode === 'examinar_persona') {
            entity = document.getElementById('musExamPlayer').value;
            type = document.getElementById('musExamTypeP').value;
        } else {
            entity = document.getElementById('musExamPair').value;
            type = document.getElementById('musExamTypePair').value;
        }
        
        if (entity === 'all') return;

        if (['best_partner', 'best_rival', 'vs_pair_performance'].includes(type)) {
            chartContainer.classList.add('hidden');
            app.mus.renderDetailedAnalysis(container, entity, type);
        } else {
            chartContainer.classList.remove('hidden');
            app.mus.renderChart(entity, period);
        }
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
        const filterP = `<option value="all">-- Selecciona --</option>` + activeOpts;
        const examP = document.getElementById('musExamPlayer');
        if(examP) examP.innerHTML = filterP;

        const pairs = app.mus.getUniquePairs();
        const pairOpts = `<option value="all">-- Selecciona --</option>` + pairs.map(p => `<option value="${p}">${p}</option>`).join('');
        
        const examPair = document.getElementById('musExamPair');
        if(examPair) examPair.innerHTML = pairOpts;
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
    },
    
    showPairGenerator: () => {
        document.getElementById('musPairGenModal').classList.remove('hidden');
        const container = document.getElementById('genPlayerList');
        container.innerHTML = "";
        if(!app.mus.data) return;
        app.mus.data.players.forEach(p => {
            const div = document.createElement('div');
            div.className = "player-check-item";
            div.innerHTML = `<input type="checkbox" value="${p}" id="chk_${p}"> <label for="chk_${p}" style="color:#fff">${p}</label>`;
            container.appendChild(div);
        });
    },
    
    generatePairs: () => {
        const checkboxes = document.querySelectorAll('#genPlayerList input:checked');
        let selected = Array.from(checkboxes).map(c => c.value);
        if(selected.length < 2) return alert("Selecciona al menos 2 jugadores.");
        selected = selected.sort(() => Math.random() - 0.5);
        let html = "<ul style='list-style:none; padding:0'>";
        while(selected.length >= 2) {
            const p1 = selected.pop();
            const p2 = selected.pop();
            html += `<li style="background:#2f3542; margin:5px; padding:10px; border-radius:5px; border-left:4px solid #e1b12c">${p1} y ${p2}</li>`;
        }
        if(selected.length === 1) html += `<li style="color:#aaa; font-style:italic; margin-top:10px">Sobró: ${selected[0]}</li>`;
        html += "</ul>";
        document.getElementById('genResults').innerHTML = html;
    }
};

socket.on('mus_data', (d) => {
    app.mus.data = d;
    app.mus.renderRoomSelector();
    app.mus.changeView(); 
});
socket.on('mus_msg', (msg) => alert(msg));