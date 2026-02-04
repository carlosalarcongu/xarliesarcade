app.mus = {
    data: null,
    chartInstance: null,
    currentRoom: "Entre Nosotros (Las monjas)", 
    
    // Lista de emojis
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷','🕸','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🐓','🦃','🦚','🦜','🦢','🦩','🕊','🐇','🦝','🦨','🦡','🦦','🦫','🐁','🐀','🐿','🦔','🐉','🐲'],

    init: () => {
        app.mus.refresh();
    },

    resetUI: () => {
        document.getElementById('musScreen').classList.add('hidden');
    },

    refresh: () => {
        socket.emit('mus_action', { type: 'getData' });
    },

    // --- HELPERS ---
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
        const colors = [
            '#ff4757', '#ff6b81', '#ff7f50', '#ffa502', '#eccc68', 
            '#f1c40f', '#7bed9f', '#2ed573', '#26de81', '#009432'
        ];
        const index = Math.min(Math.floor(pct / 10), 9);
        return colors[index];
    },

    // --- SALAS ---
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
        app.mus.changeView(); 
    },

    createRoom: () => {
        const name = prompt("Nombre de la nueva sala:");
        if(name) socket.emit('mus_action', { type: 'addRoom', value: name });
    },

    // --- DATOS ---
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

    // --- ACCIONES ---
    addPlayer: () => {
        const name = prompt("Nombre:");
        if (name) socket.emit('mus_action', { type: 'addPlayer', value: name });
    },

    showAddMatchModal: () => {
        if(!app.myPlayerName) return alert("Identifícate primero.");
        if(app.mus.currentRoom === 'ABSOLUTA') return alert("Selecciona una sala específica.");
        document.getElementById('musAddMatchModal').classList.remove('hidden');
        document.getElementById('matchRoomIndicator').innerText = "Sala: " + app.mus.currentRoom;
        app.mus.renderPlayerSelects();
    },

    submitMatch: () => {
        const p1 = document.getElementById('musP1').value;
        const p2 = document.getElementById('musP2').value;
        const p3 = document.getElementById('musP3').value;
        const p4 = document.getElementById('musP4').value;
        const s1 = document.getElementById('musS1').value;
        const s2 = document.getElementById('musS2').value;

        if (!p1 || !p2 || !p3 || !p4 || !s1 || !s2) return alert("Datos incompletos.");
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

    deleteMatch: (id) => {
        if(confirm("¿Borrar?")) socket.emit('mus_action', { type: 'deleteMatch', id, user: app.myPlayerName });
    },

    backup: () => {
        if(confirm("¿Backup?")) socket.emit('mus_action', { type: 'backup' });
    },

    // --- VISTAS ---
    changeView: () => {
        const mode = document.getElementById('musViewMode').value;
        const container = document.getElementById('musStatsContainer');
        
        const div1vs1 = document.getElementById('div1vs1');
        const div2vs2 = document.getElementById('div2vs2');
        const divExamPlayer = document.getElementById('divExamPlayer');
        const divExamPair = document.getElementById('divExamPair');
        const chart = document.getElementById('musChartSection');

        container.innerHTML = "";
        div1vs1.classList.add('hidden');
        div2vs2.classList.add('hidden');
        divExamPlayer.classList.add('hidden');
        divExamPair.classList.add('hidden');
        chart.classList.add('hidden');

        if (mode === 'ranking_pair' || mode === 'ranking_player') {
            app.mus.renderRanking(container, mode);
        } 
        else if (mode === 'top_improvement') {
            app.mus.renderImprovement(container);
        }
        else if (mode === 'recent_log') {
            app.mus.renderLog(container);
        }
        else if (mode === '1vs1') {
            div1vs1.classList.remove('hidden');
            app.mus.renderPlayerSelects(); 
            app.mus.runHeadToHead();
        }
        else if (mode === '2vs2') {
            div2vs2.classList.remove('hidden');
            app.mus.renderPlayerSelects();
            // IMPORTANTE: Al entrar, actualizamos los rivales disponibles para la pareja seleccionada por defecto
            app.mus.updateRivalSelector(); 
        }
        else if (mode === 'examinar_persona') {
            divExamPlayer.classList.remove('hidden');
            app.mus.renderPlayerSelects();
            app.mus.runAnalysis();
        }
        else if (mode === 'examinar_pareja') {
            divExamPair.classList.remove('hidden');
            app.mus.renderPlayerSelects();
            app.mus.runAnalysis();
        }
    },

    // --- RANKING ---
    renderRanking: (container, mode) => {
        const matches = app.mus.getFilteredMatches();
        const stats = {}; 
        
        const add = (k, myS, oppS) => {
            if(!stats[k]) stats[k] = {rWon:0, rLost:0, pPlayed:0};
            stats[k].pPlayed++;
            stats[k].rWon += myS;
            stats[k].rLost += oppS;
        };

        if (mode === 'ranking_pair') {
             matches.forEach(m => {
                add([m.p1, m.p2].sort().join(' y '), m.s1, m.s2);
                add([m.p3, m.p4].sort().join(' y '), m.s2, m.s1);
            });
        } else {
            matches.forEach(m => {
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
                 pct: totalR > 0 ? (s.rWon / totalR) * 100 : 0
             };
        });
        
        rows.sort((a,b) => b.pct - a.pct); 
        
        let html = `<div class="mus-table-wrapper"><table class="mus-table">
            <tr>
                <th>Pareja / Jugador</th>
                <th>% WR</th>
                <th>R.J.</th>
                <th>R.G.</th>
                <th>R.P.</th>
                <th>P.J.</th>
            </tr>`;
        
        rows.forEach(r => {
            let nameHtml = "";
            if (mode === 'ranking_pair') {
                const [n1, n2] = r.name.split(' y ');
                nameHtml = `<span class="player-avatar">${app.mus.getAvatar(n1)}</span>${n1} & <span class="player-avatar">${app.mus.getAvatar(n2)}</span>${n2}`;
            } else {
                nameHtml = `<span class="player-avatar">${app.mus.getAvatar(r.name)}</span>${r.name}`;
            }

            const winRateColor = app.mus.getColor(r.pct);
            
            html += `<tr>
                <td style="font-weight:bold; color:#fff" title="${r.name}">${nameHtml}</td>
                <td style="color:${winRateColor}; font-weight:900">${r.pct.toFixed(1)}%</td>
                <td>${r.rWon + r.rLost}</td>
                <td style="color:#2ed573">${r.rWon}</td>
                <td style="color:#ff4757">${r.rLost}</td>
                <td>${r.pPlayed}</td>
            </tr>`;
        });
        html += `</table></div>`;
        container.innerHTML = html;
    },

    renderLog: (container) => {
        const matches = [...app.mus.getRoomMatches()].sort((a,b) => b.id - a.id).slice(0, 20); 
        if(matches.length === 0) { container.innerHTML = "<p>Sin partidas.</p>"; return; }

        let html = `<div class="mus-table-wrapper"><table class="mus-table">
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
            if (app.myPlayerName === "Administrador de mus" || app.myPlayerName === "musero" ) {
                delBtn = `<button onclick="app.mus.deleteMatch(${m.id})" style="padding:4px 8px; background:#e74c3c; font-size:0.8em">🗑️</button>`;
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

    renderImprovement: (container) => {
        const matches = app.mus.getRoomMatches();
        const now = new Date();
        const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
        
        const oldStats = {};
        const recentStats = {};
        
        matches.forEach(m => {
            const mDate = new Date(m.date);
            const isRecent = mDate >= twoWeeksAgo;
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
        
        let improvements = [];
        Object.keys(recentStats).forEach(p => {
            if(!oldStats[p]) return; 
            if(recentStats[p].total < 10) return; 
            const oldWR = (oldStats[p].rounds / oldStats[p].total) * 100;
            const newWR = (recentStats[p].rounds / recentStats[p].total) * 100;
            const diff = newWR - oldWR;
            if (diff > 0) improvements.push({ name: p, diff: diff.toFixed(1), old: oldWR.toFixed(1), cur: newWR.toFixed(1) });
        });
        
        improvements.sort((a,b) => b.diff - a.diff);
        
        let html = `<h3>🚀 Mejora (últimos 14 días)</h3>
        <div class="mus-table-wrapper"><table class="mus-table"><tr><th>Jugador</th><th>Mejora</th><th>Antes</th><th>Ahora</th></tr>`;
        improvements.slice(0, 5).forEach(i => {
            html += `<tr>
                <td style="text-align:left">${app.mus.getAvatar(i.name)} ${i.name}</td>
                <td style="color:#2ed573; font-weight:bold">+${i.diff}%</td>
                <td>${i.old}%</td>
                <td>${i.cur}%</td>
            </tr>`;
        });
        html += "</table></div>";
        if(improvements.length === 0) html += "<p style='color:#aaa; margin-top:10px;'>Faltan datos para calcular mejoras.</p>";
        container.innerHTML = html;
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

    // --- VS MODES ---
    runHeadToHead: () => {
        const p1 = document.getElementById('p1vs').value;
        const p2 = document.getElementById('p2vs').value;
        const container = document.getElementById('musStatsContainer');
        
        if(p1 === p2) { container.innerHTML = "<p>Elige jugadores distintos.</p>"; return; }

        const matches = app.mus.getFilteredMatches();
        let p1WinsMatch = 0, p2WinsMatch = 0, totalMatches = 0;
        let p1Rounds = 0, p2Rounds = 0;
        const headToHeadMatches = [];

        matches.forEach(m => {
            const t1 = [m.p1, m.p2];
            const t2 = [m.p3, m.p4];
            let p1InT1 = t1.includes(p1), p1InT2 = t2.includes(p1);
            let p2InT1 = t1.includes(p2), p2InT2 = t2.includes(p2);

            if ( (p1InT1 && p2InT2) || (p1InT2 && p2InT1) ) {
                totalMatches++;
                const scoreP1 = p1InT1 ? m.s1 : m.s2;
                const scoreP2 = p1InT1 ? m.s2 : m.s1;
                
                p1Rounds += scoreP1; 
                p2Rounds += scoreP2;
                
                if (scoreP1 > scoreP2) p1WinsMatch++;
                if (scoreP2 > scoreP1) p2WinsMatch++;

                headToHeadMatches.push(m);
            }
        });

        const topTableHtml = app.mus.renderTopMatchesTable(headToHeadMatches);

        container.innerHTML = `
            <div class="vs-container">
                <div style="font-size:0.9em; color:#aaa">RONDAS GANADAS</div>
                <div class="vs-score">
                    <span style="color:#74b9ff">${p1Rounds}</span> - <span style="color:#ff7675">${p2Rounds}</span>
                </div>
                <div style="font-size:0.9em; color:#aaa">${totalMatches} Partidas jugadas</div>
                <div class="vs-detail">
                    <span>${p1WinsMatch} Victorias</span>
                    <span>${p2WinsMatch} Victorias</span>
                </div>
            </div>
            ${topTableHtml}
        `;
    },

    // --- NUEVA LÓGICA 2VS2 CON FILTRADO DE RIVALES ---
    updateRivalSelector: () => {
        const selectedPairStr = document.getElementById('pair1vs').value;
        const select2 = document.getElementById('pair2vs');
        const matches = app.mus.getRoomMatches(); // Buscamos en todo el historial de la sala (sin filtro de fecha)

        const rivals = new Set();

        matches.forEach(m => {
            const t1 = [m.p1, m.p2].sort().join(' y ');
            const t2 = [m.p3, m.p4].sort().join(' y ');

            if (t1 === selectedPairStr) rivals.add(t2);
            else if (t2 === selectedPairStr) rivals.add(t1);
        });

        const sortedRivals = Array.from(rivals).sort();

        if (sortedRivals.length === 0) {
             select2.innerHTML = '<option value="">Sin enfrentamientos</option>';
        } else {
             select2.innerHTML = sortedRivals.map(r => `<option value="${r}">${r}</option>`).join('');
        }
        
        // Ejecutar cálculo automáticamente con el primer rival
        app.mus.runPairToPair();
    },

    runPairToPair: () => {
        const pair1Str = document.getElementById('pair1vs').value;
        const pair2Str = document.getElementById('pair2vs').value;
        const container = document.getElementById('musStatsContainer');

        if(!pair2Str || pair1Str === pair2Str) { 
            container.innerHTML = "<p>Selecciona una pareja rival válida.</p>"; 
            return; 
        }

        const matches = app.mus.getFilteredMatches();
        let w1 = 0, w2 = 0, total = 0, r1 = 0, r2 = 0;
        const pairMatches = [];

        matches.forEach(m => {
            const t1 = [m.p1, m.p2].sort().join(' y ');
            const t2 = [m.p3, m.p4].sort().join(' y ');

            if ( (t1 === pair1Str && t2 === pair2Str) ) {
                total++; 
                w1 += (m.s1 > m.s2 ? 1 : 0); 
                w2 += (m.s2 > m.s1 ? 1 : 0);
                r1 += m.s1; r2 += m.s2;
                pairMatches.push(m);
            } 
            else if ( (t1 === pair2Str && t2 === pair1Str) ) {
                total++; 
                w2 += (m.s1 > m.s2 ? 1 : 0); 
                w1 += (m.s2 > m.s1 ? 1 : 0);
                r2 += m.s1; r1 += m.s2;
                pairMatches.push(m);
            }
        });

        const topTableHtml = app.mus.renderTopMatchesTable(pairMatches);

        container.innerHTML = `
            <div class="vs-container">
                <div style="font-size:0.9em; color:#aaa">RONDAS GANADAS</div>
                <div class="vs-score">
                    <span style="color:#74b9ff">${r1}</span> - <span style="color:#ff7675">${r2}</span>
                </div>
                <div style="font-size:0.9em; color:#aaa">${total} Partidas jugadas</div>
                <div class="vs-detail">
                    <span>${w1} Victorias</span>
                    <span>${w2} Victorias</span>
                </div>
            </div>
            ${topTableHtml}
        `;
    },

    // --- ANÁLISIS EXAMINAR ---
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
        const players = app.mus.data.players;
        const opts = players.map(p => `<option value="${p}">${p}</option>`).join('');
        
        ['musP1', 'musP2', 'musP3', 'musP4', 'p1vs', 'p2vs'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = opts;
        });
        
        const filterP = `<option value="all">-- Selecciona --</option>` + opts;
        document.getElementById('musExamPlayer').innerHTML = filterP;

        const pairs = app.mus.getUniquePairs();
        const pairOpts = `<option value="all">-- Selecciona --</option>` + pairs.map(p => `<option value="${p}">${p}</option>`).join('');
        ['pair1vs'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = pairOpts;
        });
        // pair2vs se llena dinámicamente, no aquí
        document.getElementById('musExamPair').innerHTML = pairOpts;
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

// Listeners
socket.on('mus_data', (d) => {
    app.mus.data = d;
    app.mus.renderRoomSelector();
    app.mus.changeView(); 
});
socket.on('mus_msg', (msg) => alert(msg));