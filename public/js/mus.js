app.mus = {
    data: null,
    chartInstance: null,
    
    // Estado de filtros
    filter: {
        player: 'all',
        pair: 'all',
        period: 'all', // all, 7days, 30days, year
        mode: 'ranking_pair' // Vista actual
    },

    init: () => {
        app.mus.refresh();
        // Inicializar fecha de hoy en el generador de gráficos si hace falta
    },

    refresh: () => {
        socket.emit('mus_action', { type: 'getData' });
    },

    // --- ACCIONES DE DATOS ---
    addPlayer: () => {
        const name = prompt("Nombre del nuevo jugador:");
        if (name) socket.emit('mus_action', { type: 'addPlayer', value: name });
    },

    showAddMatchModal: () => {
        if(!app.myPlayerName) return alert("Debes identificarte en el Hub para registrar partidas.");
        document.getElementById('musAddMatchModal').classList.remove('hidden');
        app.mus.renderPlayerSelects();
    },

    submitMatch: () => {
        const p1 = document.getElementById('musP1').value;
        const p2 = document.getElementById('musP2').value;
        const p3 = document.getElementById('musP3').value;
        const p4 = document.getElementById('musP4').value;
        const s1 = document.getElementById('musS1').value;
        const s2 = document.getElementById('musS2').value;

        if (p1===p2 || p3===p4 || p1===p3 || p1===p4) return alert("Jugadores duplicados.");
        if (s1 === "" || s2 === "") return alert("Falta el resultado (Rondas).");
        
        socket.emit('mus_action', { 
            type: 'addMatch', 
            value: { p1, p2, p3, p4, s1, s2, addedBy: app.myPlayerName } 
        });
        
        document.getElementById('musAddMatchModal').classList.add('hidden');
        document.getElementById('musS1').value = "";
        document.getElementById('musS2').value = "";
    },
    
    deleteMatch: (id) => {
        if(confirm("¿Borrar este registro? Irreversible.")) {
            // Enviamos isAdmin simple (en producción validar en server real)
            const isAdmin = app.myPlayerName && app.myPlayerName.toLowerCase().includes('admin');
            socket.emit('mus_action', { type: 'deleteMatch', id, user: app.myPlayerName, isAdmin });
        }
    },

    backup: () => {
        if(confirm("¿Guardar copia de seguridad en feedback log?")) {
            socket.emit('mus_action', { type: 'backup' });
        }
    },
    
    // --- GENERADOR DE PAREJAS ---
    showPairGenerator: () => {
        document.getElementById('musPairGenModal').classList.remove('hidden');
        const container = document.getElementById('genPlayerList');
        container.innerHTML = "";
        
        if(!app.mus.data) return;
        
        app.mus.data.players.forEach(p => {
            const div = document.createElement('div');
            div.className = "player-check-item";
            div.innerHTML = `<input type="checkbox" value="${p}" id="chk_${p}"> <label for="chk_${p}">${p}</label>`;
            container.appendChild(div);
        });
    },
    
    generatePairs: () => {
        const checkboxes = document.querySelectorAll('#genPlayerList input:checked');
        let selected = Array.from(checkboxes).map(c => c.value);
        
        if(selected.length < 2) return alert("Selecciona al menos 2 jugadores.");
        
        // Barajar
        selected = selected.sort(() => Math.random() - 0.5);
        
        let html = "<h3>Parejas Generadas</h3><ul style='list-style:none; padding:0'>";
        
        while(selected.length >= 2) {
            const p1 = selected.pop();
            const p2 = selected.pop();
            html += `<li style="background:#2f3542; margin:5px; padding:10px; border-radius:5px; border-left:4px solid #e1b12c">${p1} y ${p2}</li>`;
        }
        
        if(selected.length === 1) {
            html += `<li style="color:#aaa; font-style:italic; margin-top:10px">Sobró: ${selected[0]}</li>`;
        }
        
        html += "</ul>";
        document.getElementById('genResults').innerHTML = html;
    },

    // --- FILTRADO DE DATOS ---
    getFilteredMatches: () => {
        if (!app.mus.data) return [];
        const matches = app.mus.data.matches;
        const period = document.getElementById('musPeriodFilter').value;
        
        const now = new Date();
        let limitDate = null;
        
        if(period === '7days') limitDate = new Date(now.setDate(now.getDate() - 7));
        else if(period === '30days') limitDate = new Date(now.setDate(now.getDate() - 30));
        else if(period === 'year') limitDate = new Date(now.setFullYear(now.getFullYear() - 1));
        
        if (!limitDate) return matches;
        
        return matches.filter(m => new Date(m.date) >= limitDate);
    },

    // --- RENDERIZADO UI ---
    
    renderPlayerSelects: () => {
        if (!app.mus.data) return;
        const opts = app.mus.data.players.map(p => `<option value="${p}">${p}</option>`).join('');
        ['musP1', 'musP2', 'musP3', 'musP4'].forEach(id => document.getElementById(id).innerHTML = opts);
        
        const filterP = `<option value="all">-- Todos --</option>` + opts;
        document.getElementById('musFilterPlayer').innerHTML = filterP;
        document.getElementById('musExamPlayer').innerHTML = filterP;
        
        const pairs = app.mus.getUniquePairs();
        const pairOpts = `<option value="all">-- Todas --</option>` + pairs.map(p => `<option value="${p}">${p}</option>`).join('');
        document.getElementById('musFilterPair').innerHTML = pairOpts;
        document.getElementById('musExamPair').innerHTML = pairOpts;
    },

    changeView: () => {
        const mode = document.getElementById('musViewMode').value;
        app.mus.filter.mode = mode;
        
        const container = document.getElementById('musStatsContainer');
        const controls = document.getElementById('musFilterControls');
        const analysis = document.getElementById('musAnalysisContainer');
        const logContainer = document.getElementById('musLogContainer'); // Nuevo
        const chartContainer = document.getElementById('musChartSection'); // Nuevo
        
        // Reset visibilidad
        controls.classList.add('hidden');
        analysis.classList.add('hidden');
        logContainer.classList.add('hidden');
        chartContainer.classList.add('hidden');
        container.innerHTML = "";

        // Lógica de Vistas
        if (mode === 'ranking_pair' || mode === 'ranking_player') {
            app.mus.renderRanking(container, mode);
        } 
        else if (mode === 'examinar_persona' || mode === 'examinar_pareja') {
            analysis.classList.remove('hidden');
            chartContainer.classList.remove('hidden'); // Mostrar gráfico en examinar
            app.mus.runAnalysis();
        }
        else if (mode === 'recent_log') {
            logContainer.classList.remove('hidden');
            app.mus.renderLog(logContainer);
        }
        else if (mode === 'top_improvement') {
             app.mus.renderImprovement(container);
        }
        else {
            // Modos simples (vic_pareja, etc.)
            controls.classList.remove('hidden');
            document.getElementById('divFilterPair').classList.toggle('hidden', !mode.includes('pareja'));
            document.getElementById('divFilterPlayer').classList.toggle('hidden', !mode.includes('persona'));
            app.mus.renderFilteredStats();
        }
    },
    
    // --- NUEVO: RENDERIZAR MEJORA WINRATE ---
    renderImprovement: (container) => {
        // Comparamos WinRate de hace 14 días vs Actual
        const matches = app.mus.data.matches;
        const now = new Date();
        const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
        
        // Stats antiguas (antes de 2 semanas)
        const oldStats = {};
        // Stats recientes (últimas 2 semanas)
        const recentStats = {};
        
        matches.forEach(m => {
            const mDate = new Date(m.date);
            const isRecent = mDate >= twoWeeksAgo;
            
            // Procesar jugadores
            [m.p1, m.p2, m.p3, m.p4].forEach((p, idx) => {
                const target = isRecent ? recentStats : oldStats;
                if(!target[p]) target[p] = { rounds: 0, total: 0 };
                
                const pTeam = (idx < 2) ? 1 : 2;
                const myRounds = pTeam === 1 ? m.s1 : m.s2;
                const oppRounds = pTeam === 1 ? m.s2 : m.s1;
                
                target[p].rounds += myRounds;
                target[p].total += (myRounds + oppRounds);
            });
        });
        
        // Calcular diferencias
        let improvements = [];
        
        Object.keys(recentStats).forEach(p => {
            if(!oldStats[p]) return; // Necesita historial antiguo
            if(recentStats[p].total < 20) return; // Mínimo de juego reciente para ser significativo
            
            const oldWR = (oldStats[p].rounds / oldStats[p].total) * 100;
            const newWR = (recentStats[p].rounds / recentStats[p].total) * 100;
            const diff = newWR - oldWR;
            
            if (diff > 0) {
                improvements.push({ name: p, diff: diff.toFixed(1), old: oldWR.toFixed(1), cur: newWR.toFixed(1) });
            }
        });
        
        improvements.sort((a,b) => b.diff - a.diff);
        
        let html = `<h3>🚀 Mayor Mejora (últimas 2 semanas)</h3>
        <table class="mus-table"><tr><th>Jugador</th><th>Mejora</th><th>Antes</th><th>Ahora</th></tr>`;
        
        improvements.slice(0, 5).forEach(i => {
            html += `<tr>
                <td>${i.name}</td>
                <td style="color:#2ed573; font-weight:bold">+${i.diff}%</td>
                <td>${i.old}%</td>
                <td>${i.cur}%</td>
            </tr>`;
        });
        html += "</table>";
        
        if(improvements.length === 0) html += "<p>No hay suficientes datos recientes para calcular mejoras.</p>";
        
        container.innerHTML = html;
    },

    // --- NUEVO: RENDER LOG ---
    renderLog: (container) => {
        const matches = [...app.mus.data.matches].sort((a,b) => b.id - a.id).slice(0, 20); // Últimos 20
        
        let html = `<table class="mus-table" style="font-size:0.9em">
            <tr><th>Fecha</th><th>Resultado</th><th>Autor</th><th></th></tr>`;
            
        matches.forEach(m => {
            const d = new Date(m.date);
            const dateStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${d.getMinutes()<10?'0':''}${d.getMinutes()}`;
            const res = `<span style="color:#74b9ff">${m.p1}+${m.p2}</span> (${m.s1}) vs <span style="color:#ff7675">${m.p3}+${m.p4}</span> (${m.s2})`;
            
            // Botón borrar si soy admin o autor
            let delBtn = "";
            if (app.myPlayerName && (app.myPlayerName === m.addedBy || app.myPlayerName.toLowerCase().includes('admin'))) {
                delBtn = `<button onclick="app.mus.deleteMatch(${m.id})" style="padding:2px 5px; background:#e74c3c; font-size:0.8em">🗑️</button>`;
            }
            
            html += `<tr>
                <td>${dateStr}</td>
                <td>${res}</td>
                <td>${m.addedBy || '?'}</td>
                <td>${delBtn}</td>
            </tr>`;
        });
        html += `</table>`;
        container.innerHTML = html;
    },

    // --- RANKING ---
    renderRanking: (container, mode) => {
        const filteredMatches = app.mus.getFilteredMatches();
        // ... (Lógica de cálculo usando filteredMatches igual que antes) ...
        // Reutilizamos la lógica del paso anterior pero pasando los datos filtrados
        
        const stats = {}; 
        
        if (mode === 'ranking_pair') {
             filteredMatches.forEach(m => {
                const pair1 = [m.p1, m.p2].sort().join(' y ');
                const pair2 = [m.p3, m.p4].sort().join(' y ');
                if(!stats[pair1]) stats[pair1] = {rWon:0, rLost:0, total:0};
                if(!stats[pair2]) stats[pair2] = {rWon:0, rLost:0, total:0};
                stats[pair1].total++; stats[pair2].total++;
                stats[pair1].rWon += m.s1; stats[pair1].rLost += m.s2;
                stats[pair2].rWon += m.s2; stats[pair2].rLost += m.s1;
            });
        } else {
            filteredMatches.forEach(m => {
                [m.p1, m.p2, m.p3, m.p4].forEach((p, idx) => {
                    if(!stats[p]) stats[p] = {rWon:0, rLost:0, total:0};
                    stats[p].total++;
                    const pTeam = (idx < 2) ? 1 : 2;
                    if(pTeam === 1) { stats[p].rWon += m.s1; stats[p].rLost += m.s2; }
                    else { stats[p].rWon += m.s2; stats[p].rLost += m.s1; }
                });
            });
        }
        
        // Generar tabla
        let rows = Object.keys(stats).map(k => {
             const s = stats[k];
             const totalRounds = s.rWon + s.rLost;
             return {
                 name: k,
                 rWon: s.rWon,
                 diff: s.rWon - s.rLost,
                 total: s.total,
                 pct: totalRounds > 0 ? ((s.rWon / totalRounds) * 100).toFixed(1) : 0
             };
        });
        
        rows.sort((a,b) => b.pct - a.pct); // Ordenar por % Eficacia por defecto
        
        let html = `<div class="mus-table-wrapper"><table class="mus-table">
            <tr><th>Nombre</th><th>% Efic.</th><th>Dif</th><th>Partidas</th></tr>`;
        
        rows.forEach(r => {
            const color = r.pct >= 55 ? '#2ed573' : (r.pct < 45 ? '#ff4757' : '#ffa502');
            html += `<tr>
                <td style="font-weight:bold">${r.name}</td>
                <td style="color:${color}">${r.pct}%</td>
                <td>${r.diff > 0 ? '+' : ''}${r.diff}</td>
                <td>${r.total}</td>
            </tr>`;
        });
        html += `</table></div>`;
        container.innerHTML = html;
    },

    // --- ANÁLISIS + GRÁFICOS ---
    runAnalysis: () => {
        const mode = document.getElementById('musViewMode').value;
        const container = document.getElementById('musStatsContainer');
        const period = document.getElementById('musPeriodFilter').value;
        container.innerHTML = "";

        let entity, type;

        if (mode === 'examinar_persona') {
            entity = document.getElementById('musExamPlayer').value;
            type = document.getElementById('musExamTypeP').value;
            document.getElementById('divExamPlayer').classList.remove('hidden');
            document.getElementById('divExamPair').classList.add('hidden');
        } else {
            entity = document.getElementById('musExamPair').value;
            type = document.getElementById('musExamTypePair').value;
            document.getElementById('divExamPlayer').classList.add('hidden');
            document.getElementById('divExamPair').classList.remove('hidden');
        }
        
        if (entity !== 'all') {
            app.mus.renderChart(entity, period); // Generar Gráfico
            // Aquí iría el resto de la tabla de análisis detallado (reutilizar código anterior)
        }
    },

    renderChart: (entity, period) => {
        const ctx = document.getElementById('musChartCanvas').getContext('2d');
        if (app.mus.chartInstance) app.mus.chartInstance.destroy();
        
        const matches = app.mus.getFilteredMatches(); // Ya filtrado por periodo
        // Agrupar datos por día
        const dataMap = {}; 
        
        matches.forEach(m => {
            let myScore = 0, oppScore = 0;
            let participated = false;

            // Detectar si participó (persona o pareja)
            if (entity.includes(' y ')) { // Pareja
                 const [pA, pB] = entity.split(' y ');
                 const t1 = (m.p1===pA && m.p2===pB) || (m.p1===pB && m.p2===pA);
                 const t2 = (m.p3===pA && m.p4===pB) || (m.p3===pB && m.p4===pA);
                 if (t1 || t2) {
                     participated = true;
                     myScore = t1 ? m.s1 : m.s2;
                     oppScore = t1 ? m.s2 : m.s1;
                 }
            } else { // Persona
                 const team = (m.p1 === entity || m.p2 === entity) ? 1 : (m.p3 === entity || m.p4 === entity) ? 2 : 0;
                 if (team !== 0) {
                     participated = true;
                     myScore = (team === 1) ? m.s1 : m.s2;
                     oppScore = (team === 1) ? m.s2 : m.s1;
                 }
            }
            
            if (participated) {
                const d = new Date(m.date).toLocaleDateString('es-ES'); // DD/MM/YYYY
                if (!dataMap[d]) dataMap[d] = { won: 0, total: 0 };
                dataMap[d].won += myScore;
                dataMap[d].total += (myScore + oppScore);
            }
        });
        
        // Ordenar fechas
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

    getUniquePairs: () => {
        if(!app.mus.data) return [];
        const stats = {};
        app.mus.data.matches.forEach(m => {
            stats[[m.p1, m.p2].sort().join(' y ')] = 1;
            stats[[m.p3, m.p4].sort().join(' y ')] = 1;
        });
        return Object.keys(stats).sort();
    },
    
    // Fallback para stats simples
    renderFilteredStats: () => { /* ... código anterior adaptado ... */ },
    calcPairStats: () => { /* ... */ },
    calcPlayerStats: () => { /* ... */ }
};

// Listeners
socket.on('mus_data', (d) => {
    app.mus.data = d;
    app.mus.renderPlayerSelects();
    app.mus.changeView(); 
});
socket.on('mus_msg', (msg) => alert(msg));