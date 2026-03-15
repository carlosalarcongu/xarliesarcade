app.torneos = {
    data: [],
    currentTournament: null,
    isAdminGlobal: false,

    init: () => {},

    adjPt: (type, delta) => {
        const el = document.getElementById('pt' + type);
        let val = parseInt(el.innerText) + delta;
        if (val < -10) val = -10;
        el.innerText = val;
    },

    openCreateModal: () => {
        if (!app.myPlayerName) return alert("Debes iniciar sesión para crear torneos.");
        socket.emit('torneos_checkPremium', app.myPlayerName, (isPremium) => {
            if (!isPremium) return alert("🔒 Solo los usuarios registrados con contraseña (Premium) pueden crear torneos.");
            document.getElementById('torneosCreateModal').classList.remove('hidden');
            app.torneos.toggleWhitelists();
            app.torneos.toggleFormatOptions();
        });
    },

    toggleWhitelists: () => {
        const vis = document.getElementById('tcVis').value;
        const edit = document.getElementById('tcEdit').value;
        const area = document.getElementById('tcWhitelistsArea');
        
        area.classList.toggle('hidden', vis !== 'private' && edit !== 'restricted');
        document.getElementById('tcVisList').classList.toggle('hidden', vis !== 'private');
        document.getElementById('tcEditList').classList.toggle('hidden', edit !== 'restricted');
    },

    toggleFormatOptions: () => {
        const format = document.getElementById('tcFormat').value;
        document.getElementById('tcLeagueConfig').classList.toggle('hidden', format !== 'LEAGUE');
        document.getElementById('tcBracketConfig').classList.toggle('hidden', format !== 'BRACKET');
    },

    submitCreate: () => {
        const payload = {
            creator: app.myPlayerName,
            icon: document.getElementById('tcIcon').value,
            name: document.getElementById('tcName').value.trim(),
            description: document.getElementById('tcDesc').value.trim(),
            isPublicView: document.getElementById('tcVis').value === 'public',
            viewWhitelist: document.getElementById('tcVisList').value,
            isPublicEdit: document.getElementById('tcEdit').value === 'public',
            editWhitelist: document.getElementById('tcEditList').value,
            format: document.getElementById('tcFormat').value,
            ptsWin: document.getElementById('ptW').innerText,
            ptsDraw: document.getElementById('ptD').innerText,
            ptsLoss: document.getElementById('ptL').innerText,
            layout: document.getElementById('tcBracketLayout').value,
            thirdPlace: document.getElementById('tcThirdPlace').checked,
            participants: document.getElementById('tcParticipants').value
        };

        if (!payload.name) return alert("Ponle un nombre al torneo.");
        const parts = payload.participants.split(',').map(p => p.trim()).filter(Boolean);
        if (parts.length < 3) return alert("Introduce al menos 3 participantes separados por comas.");

        socket.emit('torneos_create', payload);
        document.getElementById('torneosCreateModal').classList.add('hidden');
    },

    backToLobby: () => {
        document.getElementById('torneosViewScreen').classList.add('hidden');
        app.torneos.currentTournament = null;
        app.showScreen('torneosLobby');
    },

    openTournament: (id) => {
        const t = app.torneos.data.find(x => x.id === id);
        if (!t) return;
        app.torneos.currentTournament = t;
        
        document.getElementById('torneosLobby').classList.add('hidden'); // Ocultar lista
        
        const settings = JSON.parse(t.settings || "{}");
        document.getElementById('tvIcon').innerText = settings.icon || "🏆";
        document.getElementById('tvName').innerText = t.name;
        document.getElementById('tvDesc').innerText = t.description || "Sin descripción.";
        document.getElementById('tvCreator').innerText = t.creator;
        document.getElementById('tvFormat').innerText = t.format === 'LEAGUE' ? 'Liguilla' : 'Eliminatorias';

        const safeUser = (app.myPlayerName || "").toLowerCase();
        app.torneos.isAdminGlobal = ['xarlie', 'administrador m', 'administrador g', 'musero'].includes(safeUser);
        const isCreator = safeUser === (t.creator || "").toLowerCase();
        
        let canEdit = t.isPublicEdit || isCreator || app.torneos.isAdminGlobal;
        if (!canEdit && t.editWhitelist) {
            const list = JSON.parse(t.editWhitelist).map(x => x.toLowerCase());
            if (list.includes(safeUser)) canEdit = true;
        }

        document.getElementById('tvEditControls').classList.toggle('hidden', !canEdit);
        document.getElementById('btnTorneoAdmin').classList.toggle('hidden', !(isCreator || app.torneos.isAdminGlobal));

        // Mostrar botones especiales si es bracket y no ha empezado
        const isBracket = t.format === 'BRACKET';
        let hasMatchesPlayed = false;
        if (isBracket && t.bracketData) {
            const b = JSON.parse(t.bracketData);
            hasMatchesPlayed = b.rounds.some(r => r.matches.some(m => m.winner));
        }
        
        document.getElementById('btnRandBracket').classList.toggle('hidden', !isBracket || hasMatchesPlayed);
        document.getElementById('btnManualBye').classList.toggle('hidden', !isBracket || hasMatchesPlayed);

        app.torneos.renderTournamentView(t);
        document.getElementById('torneosViewScreen').classList.remove('hidden');
    },

    renderTournamentView: (t) => {
        const container = document.getElementById('tvContentArea');
        if (t.format === 'LEAGUE') {
            const parts = JSON.parse(t.participants);
            const matches = JSON.parse(t.matches || "[]");
            const config = JSON.parse(t.pointsConfig || "{}");
            
            let stats = {};
            parts.forEach(p => stats[p] = { p: p, pts: 0, w: 0, d: 0, l: 0, pf: 0, pc: 0 });

            matches.forEach(m => {
                if(!stats[m.p1] || !stats[m.p2]) return;
                stats[m.p1].pf += m.s1; stats[m.p1].pc += m.s2;
                stats[m.p2].pf += m.s2; stats[m.p2].pc += m.s1;
                if (m.s1 > m.s2) { stats[m.p1].w++; stats[m.p2].l++; stats[m.p1].pts += config.win; stats[m.p2].pts += config.loss; }
                else if (m.s1 < m.s2) { stats[m.p2].w++; stats[m.p1].l++; stats[m.p2].pts += config.win; stats[m.p1].pts += config.loss; }
                else { stats[m.p1].d++; stats[m.p2].d++; stats[m.p1].pts += config.draw; stats[m.p2].pts += config.draw; }
            });

            const sorted = Object.values(stats).sort((a,b) => {
                if(b.pts !== a.pts) return b.pts - a.pts;
                return (b.pf - b.pc) - (a.pf - a.pc); 
            });

            let html = `<table class="mus-table" style="width:100%; min-width:400px;">
                <tr><th>#</th><th style="text-align:left;">Participante</th><th>PTS</th><th>G</th><th>E</th><th>P</th><th>Dif</th></tr>`;
            sorted.forEach((s, i) => {
                html += `<tr style="${i === 0 ? 'color:#f1c40f; font-weight:bold;' : ''}">
                    <td>${i+1}</td><td style="text-align:left;">${s.p}</td>
                    <td style="font-weight:bold;">${s.pts}</td>
                    <td style="color:#2ed573">${s.w}</td><td style="color:#ffa502">${s.d}</td>
                    <td style="color:#ff4757">${s.l}</td><td>${(s.pf-s.pc)>0?'+'+(s.pf-s.pc):(s.pf-s.pc)}</td>
                </tr>`;
            });
            html += `</table>`;
            container.innerHTML = html;

        } else {
            // BRACKETS (SINGLE O DOUBLE)
            const bracket = JSON.parse(t.bracketData || "{}");
            const settings = JSON.parse(t.settings || "{}");
            if (!bracket.rounds) return container.innerHTML = "Error cargando cuadro.";

            const isDouble = settings.layout === 'DOUBLE';
            
            const renderMatch = (m, label) => {
                const w1 = m.winner === m.p1; const w2 = m.winner === m.p2;
                const p1Color = w1 ? 'color:#2ed573; font-weight:bold;' : (m.winner ? 'color:#555; text-decoration:line-through;' : 'color:#fff;');
                const p2Color = w2 ? 'color:#2ed573; font-weight:bold;' : (m.winner ? 'color:#555; text-decoration:line-through;' : 'color:#fff;');
                const border = m.winner ? 'border-color:#555;' : (m.isFinal ? 'border-color:#f1c40f; box-shadow:0 0 10px #f1c40f;' : 'border-color:#3498db;');
                
                let labHTML = label ? `<div style="font-size:0.7em; color:#aaa; margin-bottom:5px; text-transform:uppercase;">${label}</div>` : '';
                return `<div class="card" style="padding:10px; background:#222; border:2px solid; ${border} margin:0; min-width:140px;">
                    ${labHTML}
                    <div style="${p1Color} border-bottom:1px solid #444; padding-bottom:5px; margin-bottom:5px;">${m.p1 || '???'}</div>
                    <div style="${p2Color}">${m.p2 || '???'}</div>
                </div>`;
            };

            let html = `<div style="display:flex; overflow-x:auto; gap:30px; padding:20px; justify-content:center; align-items:center; min-height:400px;">`;

            if (isDouble && bracket.rounds.length > 1) {
                // RENDER DOBLE (Mitad izquierda, Centro, Mitad Derecha)
                const totalRounds = bracket.rounds.length;
                let leftCols = [], rightCols = [];

                for (let i = 0; i < totalRounds - 1; i++) { // Todo menos la final
                    const matches = bracket.rounds[i].matches;
                    const half = Math.ceil(matches.length / 2);
                    leftCols.push(matches.slice(0, half));
                    rightCols.push(matches.slice(half));
                }

                // 1. Pintar Izquierda
                leftCols.forEach((matches, rIdx) => {
                    html += `<div style="display:flex; flex-direction:column; gap:20px; justify-content:space-around; height:100%;">`;
                    matches.forEach(m => html += renderMatch(m));
                    html += `</div>`;
                });

                // 2. Pintar Centro (Final y 3er Puesto)
                html += `<div style="display:flex; flex-direction:column; gap:30px; align-items:center; justify-content:center; height:100%; border:2px dashed #444; padding:20px; border-radius:15px; background:rgba(0,0,0,0.2);">`;
                html += `<div>${renderMatch(bracket.rounds[totalRounds-1].matches[0], "🏆 GRAN FINAL")}</div>`;
                if (bracket.champion) {
                    html += `<div style="font-size:2em; font-weight:900; color:#f1c40f; text-shadow:0 0 10px #f1c40f; text-align:center;">👑 ${bracket.champion}</div>`;
                }
                if (bracket.thirdPlaceMatch) {
                    html += `<div>${renderMatch(bracket.thirdPlaceMatch, "🥉 3er y 4to Puesto")}</div>`;
                }
                html += `</div>`;

                // 3. Pintar Derecha (inversa)
                rightCols.reverse().forEach((matches, rIdx) => {
                    html += `<div style="display:flex; flex-direction:column; gap:20px; justify-content:space-around; height:100%;">`;
                    matches.forEach(m => html += renderMatch(m));
                    html += `</div>`;
                });

            } else {
                // RENDER SIMPLE (De izquierda a derecha)
                bracket.rounds.forEach((round, rIndex) => {
                    html += `<div style="display:flex; flex-direction:column; justify-content:space-around; min-width:160px; gap:20px; height:100%;">`;
                    html += `<h4 style="text-align:center; color:#aaa; margin:0;">${round.matches[0].isFinal ? 'FINAL' : 'Ronda '+(rIndex+1)}</h4>`;
                    round.matches.forEach(m => html += renderMatch(m));
                    
                    if (rIndex === bracket.rounds.length - 1 && bracket.thirdPlaceMatch) {
                        html += renderMatch(bracket.thirdPlaceMatch, "🥉 3er Puesto");
                    }
                    html += `</div>`;
                });
                if (bracket.champion) {
                    html += `<div style="display:flex; flex-direction:column; justify-content:center; padding-left:20px;">
                        <h2 style="color:#f1c40f; margin:0;">🏆 CAMPEÓN</h2>
                        <h1 style="color:#fff; font-size:2.5em; margin:0;">${bracket.champion}</h1>
                    </div>`;
                }
            }

            html += `</div>`;
            container.innerHTML = html;
        }
    },

    randomizeBracket: () => {
        if(confirm("¿Volver a sortear los enfrentamientos al azar?")) {
            socket.emit('torneos_randomize', { id: app.torneos.currentTournament.id });
        }
    },

    openManualByeModal: () => {
        const t = app.torneos.currentTournament;
        const parts = JSON.parse(t.participants).sort();
        let nextPowerOf2 = 2;
        while (nextPowerOf2 < parts.length) nextPowerOf2 *= 2;
        const numByes = nextPowerOf2 - parts.length;

        if (numByes === 0) return alert("El número de jugadores es par perfecto, no hay repescas.");

        document.getElementById('torneosByeModal').classList.remove('hidden');
        document.getElementById('byeCountNum').innerText = numByes;
        document.getElementById('torneosByeModal').dataset.max = numByes;

        const box = document.getElementById('byeCheckboxes');
        box.innerHTML = parts.map(p => `
            <label style="display:block; padding:5px; border-bottom:1px solid #444; color:#fff;">
                <input type="checkbox" class="bye-chk" value="${p}"> ${p}
            </label>`).join('');
    },

    submitManualByes: () => {
        const max = parseInt(document.getElementById('torneosByeModal').dataset.max);
        const selected = Array.from(document.querySelectorAll('.bye-chk:checked')).map(c => c.value);
        if (selected.length !== max) return alert(`Debes seleccionar EXACTAMENTE ${max} jugadores.`);
        
        socket.emit('torneos_setByes', { id: app.torneos.currentTournament.id, byes: selected });
        document.getElementById('torneosByeModal').classList.add('hidden');
    },

    openAddResultModal: () => {
        const t = app.torneos.currentTournament;
        if (!t) return;
        document.getElementById('torneosResultModal').classList.remove('hidden');
        
        const leagueArea = document.getElementById('trLeagueInputs');
        const bracketArea = document.getElementById('trBracketInputs');

        if (t.format === 'LEAGUE') {
            leagueArea.classList.remove('hidden'); bracketArea.classList.add('hidden');
            const parts = JSON.parse(t.participants).sort();
            const opts = `<option value="">-- Elige --</option>` + parts.map(p => `<option value="${p}">${p}</option>`).join('');
            document.getElementById('trP1').innerHTML = opts; document.getElementById('trP2').innerHTML = opts;
        } else {
            leagueArea.classList.add('hidden'); bracketArea.classList.remove('hidden');
            
            const bracket = JSON.parse(t.bracketData);
            const mSelect = document.getElementById('trMatchSelect');
            const wSelect = document.getElementById('trWinnerSelect');
            
            let allMatches = [];
            bracket.rounds.forEach((r, rIdx) => {
                r.matches.forEach(m => {
                    if (m.p1 && m.p2 && m.p1 !== '???' && m.p2 !== '???') {
                        allMatches.push({ ...m, label: m.isFinal ? 'Final' : 'R'+(rIdx+1) });
                    }
                });
            });
            if(bracket.thirdPlaceMatch && bracket.thirdPlaceMatch.p1 !== '???') allMatches.push({ ...bracket.thirdPlaceMatch, label: '3er Puesto' });

            if (allMatches.length === 0) {
                mSelect.innerHTML = `<option value="">-- No hay partidos jugables --</option>`; wSelect.innerHTML = ``;
            } else {
                mSelect.innerHTML = `<option value="">-- Elige Partido --</option>` + 
                    allMatches.map(m => `<option value="${m.id}">${m.label}: ${m.p1} vs ${m.p2} ${m.winner?'(Ya jugado)':''}</option>`).join('');
                
                mSelect.onchange = () => {
                    const match = allMatches.find(m => String(m.id) === mSelect.value);
                    if (match) wSelect.innerHTML = `<option value="">-- ¿Quién ganó? --</option><option value="${match.p1}">${match.p1}</option><option value="${match.p2}">${match.p2}</option>`;
                };
            }
        }
    },

    submitResult: () => {
        const t = app.torneos.currentTournament;
        let payload = { tournamentId: t.id, format: t.format };

        if (t.format === 'LEAGUE') {
            payload.p1 = document.getElementById('trP1').value; payload.p2 = document.getElementById('trP2').value;
            payload.s1 = parseInt(document.getElementById('trS1').value); payload.s2 = parseInt(document.getElementById('trS2').value);
            if (!payload.p1 || !payload.p2 || isNaN(payload.s1) || isNaN(payload.s2)) return alert("Faltan campos.");
            if (payload.p1 === payload.p2) return alert("Equipos iguales.");
        } else {
            payload.matchId = document.getElementById('trMatchSelect').value;
            payload.winner = document.getElementById('trWinnerSelect').value;
            if (!payload.matchId || !payload.winner) return alert("Selecciona partido y ganador.");
        }

        socket.emit('torneos_addResult', payload);
        document.getElementById('torneosResultModal').classList.add('hidden');
    }
};

socket.on('torneos_data', (data) => {
    app.torneos.data = data;
    const listArea = document.getElementById('torneosListArea');
    if (listArea && !document.getElementById('torneosLobby').classList.contains('hidden')) {
        if (data.length === 0) listArea.innerHTML = `<p style="color:#aaa; text-align:center;">No hay torneos activos ahora mismo.</p>`;
        else {
            listArea.innerHTML = data.map(t => {
                const s = JSON.parse(t.settings || "{}");
                return `<div class="card" style="background:#222; border-left:4px solid #f1c40f; padding:15px; cursor:pointer; display:flex; gap:15px; align-items:center;" onclick="app.torneos.openTournament('${t.id}')">
                    <div style="font-size:2em;">${s.icon || '🏆'}</div>
                    <div style="flex:1; text-align:left;">
                        <h3 style="margin:0; color:#fff;">${t.name}</h3>
                        <p style="margin:2px 0 0 0; color:#aaa; font-size:0.85em;">${t.format === 'LEAGUE'?'Liguilla':'Eliminatorias'} | <span style="color:#f1c40f;">${t.creator}</span></p>
                    </div>
                    <div style="font-size:1.5em; color:#555;">➡</div>
                </div>`;
            }).join('');
        }
    }
    if (app.torneos.currentTournament && !document.getElementById('torneosViewScreen').classList.contains('hidden')) {
        const updated = data.find(x => x.id === app.torneos.currentTournament.id);
        if (updated) {
            app.torneos.currentTournament = updated;
            app.torneos.renderTournamentView(updated);
        } else {
            alert("Este torneo ha sido eliminado.");
            app.torneos.backToLobby();
        }
    }
});

// Hook visual global
document.addEventListener('DOMContentLoaded', () => {
    const oldSelectRoom = app.selectRoom;
    app.selectRoom = (room) => {
        if (room === 'torneos') {
            document.getElementById('hubScreen').classList.add('hidden');
            socket.emit('torneos_requestData', app.myPlayerName);
            document.getElementById('torneosLobby').classList.remove('hidden');
        } else { oldSelectRoom(room); }
    };
});