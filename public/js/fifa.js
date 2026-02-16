app.fifa = {
    data: null,
    currentRoom: "Copa Ourense", 
    emojis: ['⚽','🥅','🧤','🏃','🏟️','👟','🏆','🥇','🥈','🥉','🎽','📢','📣','🔴','🔵'],

    init: () => {
        app.showScreen('fifaScreen');
        app.fifa.refresh();
    },

    resetUI: () => {
        document.getElementById('fifaScreen').classList.add('hidden');
    },

    refresh: () => {
        socket.emit('fifa_action', { type: 'getData' });
    },

    // --- UTILS ---
    getAvatar: (name) => {
        if (!name || name === '-') return '';
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return app.fifa.emojis[Math.abs(hash) % app.fifa.emojis.length];
    },

    // --- SALAS ---
    renderRoomSelector: () => {
        const sel = document.getElementById('fifaRoomSelect');
        if(!sel || !app.fifa.data) return;
        const current = app.fifa.currentRoom;
        
        let html = `<option value="ABSOLUTA">⭐ GLOBAL</option>`;
        app.fifa.data.rooms.forEach(r => html += `<option value="${r}">${r}</option>`);
        sel.innerHTML = html;
        sel.value = (app.fifa.data.rooms.includes(current) || current === 'ABSOLUTA') ? current : app.fifa.data.rooms[0];
        app.fifa.currentRoom = sel.value;
    },

    changeRoom: () => {
        app.fifa.currentRoom = document.getElementById('fifaRoomSelect').value;
        app.fifa.changeView(); 
    },

    toggleControls: () => {
        document.getElementById('fifaControlsArea').classList.toggle('hidden');
    },

    createRoom: () => {
        const name = prompt("Nueva Competición:");
        if(name) socket.emit('fifa_action', { type: 'addRoom', value: name });
    },

    // --- GESTIÓN DE DATOS ---
    getRoomMatches: () => {
        if (!app.fifa.data) return [];
        if (app.fifa.currentRoom === 'ABSOLUTA') return app.fifa.data.matches;
        return app.fifa.data.matches.filter(m => m.roomId === app.fifa.currentRoom);
    },

    getFilteredMatches: () => {
        const roomMatches = app.fifa.getRoomMatches();
        const period = document.getElementById('fifaPeriodFilter').value;
        const now = new Date();
        let limitDate = null;
        
        if(period === '7days') limitDate = new Date(now.setDate(now.getDate() - 7));
        else if(period === '30days') limitDate = new Date(now.setDate(now.getDate() - 30));
        else if(period === 'year') limitDate = new Date(now.setFullYear(now.getFullYear() - 1));
        
        if (!limitDate) return roomMatches;
        return roomMatches.filter(m => new Date(m.date) >= limitDate);
    },

    // --- ACCIONES ---
    addPlayer: () => {
        const name = prompt("Nuevo club (jugador):");
        if (name) socket.emit('fifa_action', { type: 'addPlayer', value: name });
    },

    showAddMatchModal: () => {
        if(!app.myPlayerName) return alert("Identifícate primero.");
        document.getElementById('fifaAddMatchModal').classList.remove('hidden');
        app.fifa.renderPlayerSelects();
    },

    submitMatch: () => {
        const p1 = document.getElementById('fifaP1').value;
        const p2 = document.getElementById('fifaP2').value;
        const p3 = document.getElementById('fifaP3').value;
        const p4 = document.getElementById('fifaP4').value;
        const s1 = document.getElementById('fifaS1').value;
        const s2 = document.getElementById('fifaS2').value;

        // 1. Validar campos obligatorios
        if (!p1 || !p3 || s1 === "" || s2 === "") return alert("Faltan datos obligatorios (P1, P3, Goles).");

        // 2. VALIDACIÓN DE DUPLICADOS
        // Recopilamos todos los jugadores seleccionados que no sean cadenas vacías
        const activePlayers = [p1, p2, p3, p4].filter(p => p && p !== "");
        
        // Creamos un Set (colección de valores únicos) con ellos
        const uniquePlayers = new Set(activePlayers);

        // Si la cantidad de jugadores únicos es menor que los seleccionados, hay repetidos
        if (activePlayers.length !== uniquePlayers.size) {
            return alert("¡Error! Hay jugadores/equipos duplicados.");
        }

        socket.emit('fifa_action', { 
            type: 'addMatch', 
            value: { 
                roomId: app.fifa.currentRoom,
                p1, p2: p2 || '-', p3, p4: p4 || '-', 
                s1: parseInt(s1), s2: parseInt(s2), 
                addedBy: app.myPlayerName 
            } 
        });
        document.getElementById('fifaAddMatchModal').classList.add('hidden');
    },

    deleteMatch: (id) => {
        if(confirm("¿Borrar partido?")) socket.emit('fifa_action', { type: 'deleteMatch', id, user: app.myPlayerName });
    },

    backup: () => {
        if(confirm("¿Guardar Backup?")) socket.emit('fifa_action', { type: 'backup' });
    },

    // --- CONTROL DE VISTAS ---
    changeView: () => {
        const mode = document.getElementById('fifaViewMode').value;
        const container = document.getElementById('fifaStatsContainer');
        const div1vs1 = document.getElementById('fifaDiv1vs1');

        // Limpiar
        container.innerHTML = "";
        div1vs1.classList.add('hidden');

        if (mode === 'ranking_player' || mode === 'ranking_pair') {
            app.fifa.renderRanking(container, mode);
        }
        else if (mode === '1vs1') {
            div1vs1.classList.remove('hidden');
            app.fifa.renderPlayerSelects(); // Llenar selects de 1vs1
            app.fifa.runHeadToHead();
        }
        else if (mode === 'top_improvement') {
            app.fifa.renderImprovement(container);
        }
        else if (mode === 'recent_log') {
            app.fifa.renderLog(container);
        }
    },

    // --- LÓGICA DE RANKING ---
    renderRanking: (container, mode) => {
        const matches = app.fifa.getFilteredMatches();
        const stats = {};
        
        const add = (k, myS, oppS) => {
            if(k.includes('-') && !k.includes(' & ')) return; // Ignorar jugadores vacíos
            if(!stats[k]) stats[k] = { w:0, l:0, d:0, gf:0, ga:0, pts:0, pj:0 };
            stats[k].pj++;
            stats[k].gf += myS; 
            stats[k].ga += oppS;
            if(myS > oppS) { stats[k].w++; stats[k].pts+=3; }
            else if(myS < oppS) { stats[k].l++; }
            else { stats[k].d++; stats[k].pts+=1; }
        };

        if (mode === 'ranking_pair') {
            matches.forEach(m => {
                // Solo cuenta si ambos jugadores existen (no es 1vs1)
                if (m.p2 !== '-' && m.p4 !== '-') {
                    add([m.p1, m.p2].sort().join(' & '), m.s1, m.s2);
                    add([m.p3, m.p4].sort().join(' & '), m.s2, m.s1);
                }
            });
        } else {
            matches.forEach(m => {
                [m.p1, m.p2].forEach(p => add(p, m.s1, m.s2));
                [m.p3, m.p4].forEach(p => add(p, m.s2, m.s1));
            });
        }

        let rows = Object.keys(stats).map(k => ({name:k, ...stats[k]}));
        
        // Ordenar: Puntos > Dif. Goles > Goles Favor
        rows.sort((a,b) => b.pts - a.pts || (b.gf-b.ga) - (a.gf-a.ga) || b.gf - a.gf);
        
        let html = `<div class="mus-table-wrapper"><table class="fifa-table">
            <thead>
                <tr>
                    <th>CLUB</th>
                    <th>PTS</th>
                    <th>PJ</th>
                    <th>V/E/D</th>
                    <th>DG</th>
                </tr>
            </thead>
            <tbody>`;
        
        rows.forEach(r => {
            const avatar = mode === 'ranking_pair' ? '👥' : app.fifa.getAvatar(r.name);
            html += `<tr>
                <td style="display:flex; align-items:center; gap:5px;">
                    <span style="font-size:1.2em">${avatar}</span>
                    <span>${r.name}</span>
                </td>
                <td class="fifa-pts">${r.pts}</td>
                <td>${r.pj}</td>
                <td style="font-size:0.8em; color:#aaa">${r.w}/${r.d}/${r.l}</td>
                <td style="color:${(r.gf-r.ga)>=0?'#2ed573':'#ff4757'}">${r.gf - r.ga}</td>
            </tr>`;
        });
        html += `</tbody></table></div>`;
        container.innerHTML = html;
    },

    // --- LOGICA 1 VS 1 ---
    runHeadToHead: () => {
        const p1 = document.getElementById('fifaP1vs').value;
        const p2 = document.getElementById('fifaP2vs').value;
        const container = document.getElementById('fifaStatsContainer');
        
        if(!p1 || !p2 || p1 === p2) { 
            container.innerHTML = "<p style='color:#aaa; text-align:center; margin-top:20px;'>Selecciona dos rivales distintos.</p>"; 
            return; 
        }

        const matches = app.fifa.getFilteredMatches();
        let p1Wins = 0, p2Wins = 0, draws = 0, total = 0;
        let p1Goals = 0, p2Goals = 0;
        const history = [];

        matches.forEach(m => {
            // Normalizar equipos (puede ser 1v1 o 2v2 donde participen)
            const team1 = [m.p1, m.p2];
            const team2 = [m.p3, m.p4];
            
            let p1InT1 = team1.includes(p1), p1InT2 = team2.includes(p1);
            let p2InT1 = team1.includes(p2), p2InT2 = team2.includes(p2);

            // Solo contamos si se enfrentan en equipos opuestos
            if ( (p1InT1 && p2InT2) || (p1InT2 && p2InT1) ) {
                total++;
                const score1 = p1InT1 ? m.s1 : m.s2;
                const score2 = p1InT1 ? m.s2 : m.s1;

                p1Goals += score1;
                p2Goals += score2;

                if (score1 > score2) p1Wins++;
                else if (score2 > score1) p2Wins++;
                else draws++;

                history.push(m);
            }
        });

        container.innerHTML = `
            <div class="fifa-panel" style="text-align:center; margin-bottom:20px;">
                <div style="font-size:3em; font-weight:bold; color:#fff; text-shadow:0 0 10px #00d2d3;">
                    ${p1Wins} - ${draws} - ${p2Wins}
                </div>
                <div style="font-size:0.8em; color:#00d2d3; letter-spacing:2px;">VICTORIAS - EMPATES - VICTORIAS</div>
                <hr style="border-color:#ffffff22; margin:10px 0;">
                <div style="display:flex; justify-content:space-around;">
                    <div>GOLES: <span style="color:#ff005c">${p1Goals}</span></div>
                    <div>GOLES: <span style="color:#ff005c">${p2Goals}</span></div>
                </div>
            </div>
            ${app.fifa.renderMatchListHTML(history.slice(0,5))}
        `;
    },

    // --- MEJORA (FORMA ÚLTIMOS 14 DÍAS) ---
    renderImprovement: (container) => {
        const matches = app.fifa.getRoomMatches(); // Todos para calcular tendencias
        const now = new Date();
        const cutoff = new Date(now.setDate(now.getDate() - 14));

        const oldStats = {};
        const newStats = {};

        // Helper para sumar puntos
        const process = (target, p, pts) => {
            if(p==='-') return;
            if(!target[p]) target[p] = { pts: 0, games: 0 };
            target[p].pts += pts;
            target[p].games++;
        };

        matches.forEach(m => {
            const date = new Date(m.date);
            const target = date >= cutoff ? newStats : oldStats;
            
            const pts1 = m.s1 > m.s2 ? 3 : (m.s1 == m.s2 ? 1 : 0);
            const pts2 = m.s2 > m.s1 ? 3 : (m.s1 == m.s2 ? 1 : 0);

            [m.p1, m.p2].forEach(p => process(target, p, pts1));
            [m.p3, m.p4].forEach(p => process(target, p, pts2));
        });

        let improvements = [];
        Object.keys(newStats).forEach(p => {
            if (!oldStats[p] || newStats[p].games < 3) return; // Mínimo partidos para ser relevante
            
            const avgOld = oldStats[p].pts / oldStats[p].games;
            const avgNew = newStats[p].pts / newStats[p].games;
            const diff = avgNew - avgOld;

            if(diff > 0) improvements.push({ name: p, diff: diff.toFixed(2), old: avgOld.toFixed(2), cur: avgNew.toFixed(2) });
        });

        improvements.sort((a,b) => b.diff - a.diff);

        let html = `<h4 style="color:#2ed573">🔥 ESTADO DE FORMA (PTS/PARTIDO)</h4>
        <table class="fifa-table"><thead><tr><th>JUGADOR</th><th>MEJORA</th><th>ANTES</th><th>AHORA</th></tr></thead><tbody>`;
        
        improvements.slice(0, 5).forEach(i => {
            html += `<tr>
                <td style="text-align:left;">${i.name}</td>
                <td style="color:#2ed573; font-weight:bold;">+${i.diff}</td>
                <td style="color:#aaa">${i.old}</td>
                <td>${i.cur}</td>
            </tr>`;
        });
        
        if(improvements.length === 0) html += `<tr><td colspan="4" style="color:#aaa">Faltan datos recientes.</td></tr>`;
        
        container.innerHTML = html + "</tbody></table>";
    },

    // --- LOG HISTÓRICO ---
    renderLog: (container) => {
        const matches = [...app.fifa.getFilteredMatches()].sort((a,b) => b.id - a.id).slice(0, 20);
        container.innerHTML = app.fifa.renderMatchListHTML(matches, true);
    },

    // Helper para generar lista de partidos
    renderMatchListHTML: (matches, showDelete = false) => {
        if(matches.length === 0) return "<p style='text-align:center; color:#aaa'>No hay partidos.</p>";
        
        let html = `<div class="fifa-log-list">`;
        matches.forEach(m => {
            const date = new Date(m.date);
            const dateStr = `${date.getDate()}/${date.getMonth()+1}`;
            
            let delBtn = "";
            if (showDelete && (app.myPlayerName === "admin" || app.myPlayerName === "xarlie")) {
                delBtn = `<button onclick="app.fifa.deleteMatch(${m.id})" style="background:transparent; border:none; font-size:0.8em;">🗑️</button>`;
            }

            html += `<div class="fifa-match-card">
                <div style="font-size:0.7em; color:#aaa; width:40px;">${dateStr}</div>
                <div class="f-team">${m.p1}${m.p2!=='-'?' & '+m.p2:''}</div>
                <div class="f-score">${m.s1} - ${m.s2}</div>
                <div class="f-team">${m.p3}${m.p4!=='-'?' & '+m.p4:''}</div>
                ${delBtn}
            </div>`;
        });
        return html + "</div>";
    },

    // --- SELECTORES ---
    renderPlayerSelects: () => {
        if (!app.fifa.data) return;
        const players = app.fifa.data.players;
        const opts = `<option value="">-</option>` + players.map(p => `<option value="${p}">${p}</option>`).join('');
        
        // Modal de añadir
        ['fifaP1', 'fifaP2', 'fifaP3', 'fifaP4'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = opts;
        });

        // Selector 1vs1
        const vsOpts = `<option value="">Selecciona...</option>` + players.map(p => `<option value="${p}">${p}</option>`).join('');
        ['fifaP1vs', 'fifaP2vs'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = vsOpts;
        });
    }
};

socket.on('fifa_data', (d) => {
    app.fifa.data = d;
    app.fifa.renderRoomSelector();
    app.fifa.changeView();
});
socket.on('fifa_msg', (msg) => alert(msg));