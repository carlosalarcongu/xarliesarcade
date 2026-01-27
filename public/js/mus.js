app.mus = {
    data: null,
    chartInstance: null,
    sortState: { col: 'rWon', asc: false }, 

    init: () => {
        app.mus.refresh();
    },

    refresh: () => {
        socket.emit('mus_action', { type: 'getData' });
    },

    // --- ACCIONES ---
    addPlayer: () => {
        const name = prompt("Nombre del nuevo jugador:");
        if (name) socket.emit('mus_action', { type: 'addPlayer', value: name });
    },

    showAddMatchModal: () => {
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
        
        socket.emit('mus_action', { type: 'addMatch', value: { p1, p2, p3, p4, s1, s2 } });
        document.getElementById('musAddMatchModal').classList.add('hidden');
        
        document.getElementById('musS1').value = "";
        document.getElementById('musS2').value = "";
    },

    backup: () => {
        if(confirm("¿Guardar copia de seguridad en feedback log?")) {
            socket.emit('mus_action', { type: 'backup' });
        }
    },

    // --- ORDENACIÓN ---
    toggleSort: (col) => {
        if (app.mus.sortState.col === col) {
            app.mus.sortState.asc = !app.mus.sortState.asc; 
        } else {
            app.mus.sortState.col = col;
            app.mus.sortState.asc = false; 
        }
        app.mus.changeView(); 
    },

    getSortIcon: (col) => {
        if (app.mus.sortState.col !== col) return '⬍';
        return app.mus.sortState.asc ? '🔼' : '🔽';
    },

    // --- RENDER UI ---
    renderPlayerSelects: () => {
        if (!app.mus.data) return;
        const opts = app.mus.data.players.map(p => `<option value="${p}">${p}</option>`).join('');
        ['musP1', 'musP2', 'musP3', 'musP4'].forEach(id => document.getElementById(id).innerHTML = opts);
        
        const filterP = `<option value="all">-- Seleccionar --</option>` + opts;
        document.getElementById('musFilterPlayer').innerHTML = filterP;
        document.getElementById('musExamPlayer').innerHTML = filterP;
        
        const pairs = app.mus.getUniquePairs();
        const pairOpts = `<option value="all">-- Seleccionar --</option>` + pairs.map(p => `<option value="${p}">${p}</option>`).join('');
        document.getElementById('musFilterPair').innerHTML = pairOpts;
        document.getElementById('musExamPair').innerHTML = pairOpts;
    },

    changeView: () => {
        const mode = document.getElementById('musViewMode').value;
        const container = document.getElementById('musStatsContainer');
        const controls = document.getElementById('musFilterControls');
        const analysis = document.getElementById('musAnalysisContainer');
        
        controls.classList.add('hidden');
        analysis.classList.add('hidden');
        container.innerHTML = "";

        if (mode === 'ranking_pair' || mode === 'ranking_player') {
            app.mus.renderRanking(container, mode);
        } 
        else if (mode === 'examinar_persona' || mode === 'examinar_pareja') {
            analysis.classList.remove('hidden');
            app.mus.runAnalysis();
        }
        else {
            controls.classList.remove('hidden');
            document.getElementById('divFilterPair').classList.toggle('hidden', !mode.includes('pareja'));
            document.getElementById('divFilterPlayer').classList.toggle('hidden', !mode.includes('persona'));
            app.mus.renderFilteredStats();
        }
    },

    // --- RANKING ---
    renderRanking: (container, mode) => {
        const stats = (mode === 'ranking_pair') ? app.mus.calcPairStats() : app.mus.calcPlayerStats();
        const label = (mode === 'ranking_pair') ? 'Pareja' : 'Jugador';

        let rows = Object.keys(stats).map(key => {
            const s = stats[key];
            return {
                name: key,
                rWon: s.rWon,
                rLost: s.rLost,
                diff: s.rWon - s.rLost,
                total: s.total,
                pct: s.pct
            };
        });

        const { col, asc } = app.mus.sortState;
        rows.sort((a, b) => {
            let valA = a[col];
            let valB = b[col];
            if (typeof valA === 'string') return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return asc ? valA - valB : valB - valA;
        });

        // WRAPPER RESPONSIVE PARA MÓVIL
        let html = `<div class="mus-table-wrapper"><table class="mus-table">
            <tr>
                <th onclick="app.mus.toggleSort('name')" style="cursor:pointer">${label} ${app.mus.getSortIcon('name')}</th>
                <th onclick="app.mus.toggleSort('rWon')" style="cursor:pointer">Ganadas ${app.mus.getSortIcon('rWon')}</th>
                <th onclick="app.mus.toggleSort('rLost')" style="cursor:pointer">Perdidas ${app.mus.getSortIcon('rLost')}</th>
                <th onclick="app.mus.toggleSort('diff')" style="cursor:pointer">Dif ${app.mus.getSortIcon('diff')}</th>
                <th onclick="app.mus.toggleSort('pct')" style="cursor:pointer">% Efec. ${app.mus.getSortIcon('pct')}</th>
                <th onclick="app.mus.toggleSort('total')" style="cursor:pointer">Jugadas ${app.mus.getSortIcon('total')}</th>
            </tr>`;
            
        rows.forEach(r => {
            const diffColor = r.diff > 0 ? '#2ed573' : (r.diff < 0 ? '#ff4757' : '#aaa');
            const pctColor = r.pct >= 55 ? '#2ed573' : (r.pct < 45 ? '#ff4757' : '#ffa502');

            html += `<tr>
                <td style="white-space:nowrap; font-weight:bold;">${r.name}</td>
                <td class="win-col">${r.rWon}</td>
                <td style="color:#aaa">${r.rLost}</td>
                <td style="color:${diffColor}; font-weight:bold">${r.diff > 0 ? '+' : ''}${r.diff}</td>
                <td style="color:${pctColor}">${r.pct}%</td>
                <td>${r.total}</td>
            </tr>`;
        });
        html += `</table></div>`;
        container.innerHTML = html;
    },

    // --- ESTADÍSTICAS SIMPLES ---
    renderFilteredStats: () => {
        const mode = document.getElementById('musViewMode').value;
        const container = document.getElementById('musStatsContainer');
        const filterPlayer = document.getElementById('musFilterPlayer').value;
        const filterPair = document.getElementById('musFilterPair').value;

        let s = { rWon: 0, total: 0, pct: 0 };

        if (mode.includes('pareja')) {
            if (filterPair === 'all') {
                container.innerHTML = "<p style='color:#aaa; margin-top:20px'>Selecciona una pareja arriba</p>";
                return;
            }
            s = app.mus.calcPairStats()[filterPair] || s;
        } 
        else if (mode.includes('persona')) {
            if (filterPlayer === 'all') {
                container.innerHTML = "<p style='color:#aaa; margin-top:20px'>Selecciona un jugador arriba</p>";
                return;
            }
            s = app.mus.calcPlayerStats()[filterPlayer] || s;
        }

        let mainVal = 0, label = "", subVal = "";

        if (mode.startsWith('vic_')) {
            mainVal = s.rWon;
            label = "Rondas Totales";
            subVal = `Efectividad: <span style="color:#e1b12c">${s.pct}%</span>`;
        }
        else if (mode.startsWith('porc_')) {
            mainVal = (s.total > 0 ? s.rWon / s.total : 0).toFixed(2);
            label = "Promedio Rondas / Partida";
            subVal = `Total Rondas: ${s.rWon}`;
        }

        container.innerHTML = `
            <div class="stat-big-box">
                <div style="font-size:4em; color:#e1b12c; line-height:1;">${mainVal}</div>
                <div style="text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">${label}</div>
                <div style="width:50%; height:1px; background:#555; margin:10px auto;"></div>
                <div style="color:#dfe4ea; font-size:1.1em;">Partidas: <strong>${s.total}</strong></div>
                <div style="color:#74b9ff; font-size:1.1em;">${subVal}</div>
            </div>`;
    },

    // --- ANÁLISIS ---
    runAnalysis: () => {
        const mode = document.getElementById('musViewMode').value;
        const container = document.getElementById('musStatsContainer');
        const interval = document.getElementById('musChartInterval').value;
        container.innerHTML = "";

        let entity, type;

        if (mode === 'examinar_persona') {
            entity = document.getElementById('musExamPlayer').value;
            type = document.getElementById('musExamTypeP').value;
            document.getElementById('divExamPlayer').classList.remove('hidden');
            document.getElementById('divExamPair').classList.add('hidden');
            
            if (entity !== 'all') {
                const res = app.mus.analyzePerson(entity, type);
                app.mus.renderAnalysisTable(container, res, type);
                app.mus.renderChart(entity, interval, 'persona');
            }
        } else {
            entity = document.getElementById('musExamPair').value;
            type = document.getElementById('musExamTypePair').value;
            document.getElementById('divExamPlayer').classList.add('hidden');
            document.getElementById('divExamPair').classList.remove('hidden');

            if (entity !== 'all') {
                const res = app.mus.analyzePair(entity, type);
                app.mus.renderAnalysisTable(container, res, type);
                app.mus.renderChart(entity, interval, 'pareja');
            }
        }
    },

    renderChart: (entity, groupBy, mode) => {
        const ctx = document.getElementById('musChartCanvas').getContext('2d');
        if (app.mus.chartInstance) app.mus.chartInstance.destroy();

        // USAMOS TODOS LOS DATOS (Sin filtro fecha)
        const matches = app.mus.data.matches;
        const dataMap = {}; 

        matches.forEach(m => {
            let myScore = 0, oppScore = 0;
            let participated = false;

            if (mode === 'persona') {
                const team = (m.p1 === entity || m.p2 === entity) ? 1 : (m.p3 === entity || m.p4 === entity) ? 2 : 0;
                if (team !== 0) {
                    participated = true;
                    myScore = (team === 1) ? m.s1 : m.s2;
                    oppScore = (team === 1) ? m.s2 : m.s1;
                }
            } else { 
                const [pA, pB] = entity.split(' y ');
                const t1 = (m.p1===pA && m.p2===pB) || (m.p1===pB && m.p2===pA);
                const t2 = (m.p3===pA && m.p4===pB) || (m.p3===pB && m.p4===pA);
                if (t1 || t2) {
                    participated = true;
                    myScore = t1 ? m.s1 : m.s2;
                    oppScore = t1 ? m.s2 : m.s1;
                }
            }

            if (participated) {
                const d = new Date(m.date);
                let key = "";
                if (groupBy === 'day') key = d.toLocaleDateString('es-ES'); 
                if (groupBy === 'month') key = `${d.getMonth()+1}/${d.getFullYear()}`;
                if (groupBy === 'year') key = `${d.getFullYear()}`;

                if (!dataMap[key]) dataMap[key] = { won: 0, lost: 0 };
                dataMap[key].won += myScore;
                dataMap[key].lost += oppScore;
            }
        });

        const labels = Object.keys(dataMap).sort((a,b) => {
            const partsA = a.split('/');
            const partsB = b.split('/');
            return new Date(partsA.reverse().join('-')) - new Date(partsB.reverse().join('-'));
        });

        const dataWon = labels.map(l => dataMap[l].won);
        const dataLost = labels.map(l => dataMap[l].lost);

        app.mus.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Rondas Ganadas', data: dataWon, borderColor: '#2ed573', backgroundColor: 'rgba(46,213,115,0.1)', tension:0.3, fill:true },
                    { label: 'Rondas Perdidas', data: dataLost, borderColor: '#ff4757', backgroundColor: 'rgba(255,71,87,0.1)', tension:0.3, fill:true }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#fff', font: { family: 'Times New Roman' } } } },
                scales: {
                    x: { ticks: { color: '#ccc' }, grid: { color: '#444' } },
                    y: { ticks: { color: '#ccc' }, grid: { color: '#444' } }
                }
            }
        });
    },

    analyzePerson: (player, type) => {
        const results = {}; 
        app.mus.data.matches.forEach(m => {
            const myTeam = (m.p1 === player || m.p2 === player) ? 1 : (m.p3 === player || m.p4 === player) ? 2 : 0;
            if (myTeam === 0) return; 

            const myScore = (myTeam === 1) ? m.s1 : m.s2;
            const oppScore = (myTeam === 1) ? m.s2 : m.s1;
            
            const add = (key, myR, oppR) => {
                if(!results[key]) results[key] = {count:0, roundsFor:0, roundsAgainst:0};
                results[key].count++;
                results[key].roundsFor += myR;
                results[key].roundsAgainst += oppR;
            };

            if (type === 'with_partner') {
                const partner = (m.p1 === player) ? m.p2 : (m.p2 === player) ? m.p1 : (m.p3 === player) ? m.p4 : m.p3;
                add(partner, myScore, oppScore);
            } else {
                const opp1 = (myTeam === 1) ? m.p3 : m.p1;
                const opp2 = (myTeam === 1) ? m.p4 : m.p2;
                add(opp1, myScore, oppScore);
                add(opp2, myScore, oppScore);
            }
        });
        return results;
    },

    analyzePair: (pairStr, type) => {
        const [pA, pB] = pairStr.split(' y ');
        const results = {};
        app.mus.data.matches.forEach(m => {
            const t1Ok = (m.p1 === pA && m.p2 === pB) || (m.p1 === pB && m.p2 === pA);
            const t2Ok = (m.p3 === pA && m.p4 === pB) || (m.p3 === pB && m.p4 === pA);
            if (!t1Ok && !t2Ok) return;

            const myTeam = t1Ok ? 1 : 2;
            const myScore = (myTeam === 1) ? m.s1 : m.s2;
            const oppScore = (myTeam === 1) ? m.s2 : m.s1;

            const oppA = (myTeam === 1) ? m.p3 : m.p1;
            const oppB = (myTeam === 1) ? m.p4 : m.p2;
            const oppPairName = [oppA, oppB].sort().join(' y ');

            if(!results[oppPairName]) results[oppPairName] = {count:0, roundsFor:0, roundsAgainst:0};
            results[oppPairName].count++;
            results[oppPairName].roundsFor += myScore;
            results[oppPairName].roundsAgainst += oppScore;
        });
        return results;
    },

    renderAnalysisTable: (container, results, type) => {
        let rows = Object.keys(results).map(k => {
            const r = results[k];
            const focusRounds = type.includes('loss') ? r.roundsAgainst : r.roundsFor;
            const totalRounds = r.roundsFor + r.roundsAgainst;
            const pct = totalRounds > 0 ? ((focusRounds / totalRounds) * 100).toFixed(1) : 0;
            
            return {
                name: k,
                focusRounds: focusRounds,
                totalRounds: totalRounds,
                pct: parseFloat(pct),
                count: r.count
            };
        });

        const { col, asc } = app.mus.sortState;
        const sortKey = ['name', 'focusRounds', 'pct', 'count'].includes(col) ? col : 'pct';
        
        rows.sort((a,b) => {
            let valA = a[sortKey];
            let valB = b[sortKey];
            if (typeof valA === 'string') return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return asc ? valA - valB : valB - valA;
        });

        let col2 = type.includes('loss') ? 'Rondas Encajadas' : 'Rondas Ganadas';
        
        // WRAPPER RESPONSIVE
        let html = `<div class="mus-table-wrapper"><table class="mus-table">
            <tr>
                <th onclick="app.mus.toggleSort('name')" style="cursor:pointer">Nombre ${app.mus.getSortIcon('name')}</th>
                <th onclick="app.mus.toggleSort('focusRounds')" style="cursor:pointer">${col2} ${app.mus.getSortIcon('focusRounds')}</th>
                <th onclick="app.mus.toggleSort('pct')" style="cursor:pointer">% Efec. ${app.mus.getSortIcon('pct')}</th>
                <th onclick="app.mus.toggleSort('count')" style="cursor:pointer">Partidas ${app.mus.getSortIcon('count')}</th>
            </tr>`;
        
        rows.forEach(r => {
            const color = r.pct >= 55 ? '#2ed573' : (r.pct < 45 ? '#ff4757' : '#ffa502');
            html += `<tr>
                <td style="white-space:nowrap; font-weight:bold;">${r.name}</td>
                <td>${r.focusRounds}</td>
                <td style="color:${color}; font-weight:bold">${r.pct}%</td>
                <td>${r.count}</td>
            </tr>`;
        });
        html += `</table></div>`;
        container.innerHTML = html;
    },

    calcPairStats: () => {
        const stats = {}; 
        app.mus.data.matches.forEach(m => {
            const pair1 = [m.p1, m.p2].sort().join(' y ');
            const pair2 = [m.p3, m.p4].sort().join(' y ');
            
            if(!stats[pair1]) stats[pair1] = {total:0, rWon:0, rLost:0};
            if(!stats[pair2]) stats[pair2] = {total:0, rWon:0, rLost:0};
            
            stats[pair1].total++;
            stats[pair2].total++;
            stats[pair1].rWon += m.s1;
            stats[pair1].rLost += m.s2;
            stats[pair2].rWon += m.s2;
            stats[pair2].rLost += m.s1;
        });
        
        Object.keys(stats).forEach(k => {
            const s = stats[k];
            const total = s.rWon + s.rLost;
            s.pct = total > 0 ? parseFloat(((s.rWon / total) * 100).toFixed(1)) : 0;
        });
        return stats;
    },

    calcPlayerStats: () => {
        const stats = {};
        app.mus.data.matches.forEach(m => {
            [m.p1, m.p2, m.p3, m.p4].forEach((p, idx) => {
                if(!stats[p]) stats[p] = {total:0, rWon:0, rLost:0};
                stats[p].total++;
                const pTeam = (idx < 2) ? 1 : 2;
                if(pTeam === 1) {
                    stats[p].rWon += m.s1;
                    stats[p].rLost += m.s2;
                } else {
                    stats[p].rWon += m.s2;
                    stats[p].rLost += m.s1;
                }
            });
        });

        Object.keys(stats).forEach(k => {
            const s = stats[k];
            const total = s.rWon + s.rLost;
            s.pct = total > 0 ? parseFloat(((s.rWon / total) * 100).toFixed(1)) : 0;
        });
        return stats;
    },

    getUniquePairs: () => {
        if(!app.mus.data) return [];
        const stats = {};
        app.mus.data.matches.forEach(m => {
            stats[[m.p1, m.p2].sort().join(' y ')] = 1;
            stats[[m.p3, m.p4].sort().join(' y ')] = 1;
        });
        return Object.keys(stats).sort();
    }
};

// Listeners
socket.on('mus_data', (d) => {
    app.mus.data = d;
    app.mus.renderPlayerSelects();
    app.mus.changeView(); 
});

socket.on('mus_msg', (msg) => alert(msg));