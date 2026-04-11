window.app = window.app || {};

window.app.analytics = {
    data: {},
    currentWeek: 'ALL', // Por defecto muestra el Global
    
    // Estado de filtros y columnas
    filters: { name: '', ip: '', room: '' },
    columns: { name: true, date: true, ip: true, rooms: true },

    isAdmin: () => {
        if (!app.myPlayerName) return false;
        const lower = app.myPlayerName.toLowerCase();
        return lower === 'administrador m' || lower === 'xarlie' || lower === 'musero';
    },

    init: () => {
        if (!app.analytics.isAdmin()) {
            alert("Acceso denegado. Solo administradores.");
            app.goBackToHub(false);
            return;
        }
        socket.emit('analytics_requestData', { admin: app.myPlayerName });
    },

    changeWeek: () => {
        const sel = document.getElementById('analyticsWeekSelect');
        if (sel) {
            app.analytics.currentWeek = sel.value;
            app.analytics.renderControls(); 
        }
    },

    updateFilter: (field, value) => {
        app.analytics.filters[field] = value.toLowerCase();
        app.analytics.renderResults(); // Solo actualiza las tarjetas para no perder el foco
    },

    toggleColumn: (col) => {
        app.analytics.columns[col] = !app.analytics.columns[col];
        app.analytics.renderResults();
    },

    // Agrupa los datos si estamos en modo "ALL" (Global), o devuelve los de la semana
    getAggregatedData: () => {
        if (app.analytics.currentWeek === 'ALL') {
            const userMap = {};
            Object.values(app.analytics.data).forEach(weekData => {
                weekData.forEach(u => {
                    if (!userMap[u.name]) {
                        userMap[u.name] = { 
                            name: u.name, visits: u.visits, 
                            lastVisit: u.lastVisit, ips: [...(u.ips||[])], 
                            recentRooms: [...(u.recentRooms||[])], userAgent: u.userAgent 
                        };
                    } else {
                        userMap[u.name].visits += u.visits;
                        userMap[u.name].ips = [...new Set([...userMap[u.name].ips, ...(u.ips||[])])];
                        userMap[u.name].recentRooms = [...(u.recentRooms||[]), ...userMap[u.name].recentRooms];
                        if (new Date(u.lastVisit) > new Date(userMap[u.name].lastVisit)) {
                            userMap[u.name].lastVisit = u.lastVisit;
                            userMap[u.name].userAgent = u.userAgent;
                        }
                    }
                });
            });
            return Object.values(userMap);
        }
        return app.analytics.data[app.analytics.currentWeek] || [];
    },

    renderControls: () => {
        const container = document.getElementById('analyticsDataContainer');
        if (!container) return;

        // Extraer nombres y salas únicas para el autocompletado
        const allNames = new Set();
        const allRooms = new Set();
        Object.values(app.analytics.data).forEach(wd => {
            wd.forEach(u => {
                allNames.add(u.name);
                if(u.recentRooms) u.recentRooms.forEach(r => allRooms.add(r));
            });
        });

        let html = `
        <datalist id="dlAnalyticsNames">
            ${[...allNames].sort().map(n => `<option value="${n}">`).join('')}
        </datalist>
        <datalist id="dlAnalyticsRooms">
            ${[...allRooms].sort().map(r => `<option value="${r}">`).join('')}
        </datalist>

        <div class="card" style="background:#1e272e; padding:15px; margin-bottom:20px; text-align:left; border:2px solid var(--border-input);">
            <h4 style="color:var(--accent-gold); margin-top:0; margin-bottom:10px;">🔍 Filtros (Tiempo Real)</h4>
            <div style="display:flex; gap:10px; margin-bottom:15px; flex-wrap:wrap;">
                <input type="text" list="dlAnalyticsNames" placeholder="Nick..." value="${app.analytics.filters.name}" oninput="app.analytics.updateFilter('name', this.value)" style="flex:1; min-width:100px; padding:8px; border-radius:5px; background:#fff; color:#000; border:none; outline:none;">
                <input type="text" placeholder="IP..." value="${app.analytics.filters.ip}" oninput="app.analytics.updateFilter('ip', this.value)" style="flex:1; min-width:100px; padding:8px; border-radius:5px; background:#fff; color:#000; border:none; outline:none;">
                <input type="text" list="dlAnalyticsRooms" placeholder="Sala..." value="${app.analytics.filters.room}" oninput="app.analytics.updateFilter('room', this.value)" style="flex:1; min-width:100px; padding:8px; border-radius:5px; background:#fff; color:#000; border:none; outline:none;">
            </div>
            
            <h4 style="color:var(--accent-gold); margin-top:0; margin-bottom:10px;">👁️ Visibilidad de Columnas</h4>
            <div style="display:flex; gap:15px; flex-wrap:wrap; font-size:0.9em; color:#fff;">
                <label style="cursor:pointer; display:flex; align-items:center; gap:5px;">
                    <input type="checkbox" ${app.analytics.columns.name ? 'checked' : ''} onchange="app.analytics.toggleColumn('name')"> Nombres
                </label>
                <label style="cursor:pointer; display:flex; align-items:center; gap:5px;">
                    <input type="checkbox" ${app.analytics.columns.date ? 'checked' : ''} onchange="app.analytics.toggleColumn('date')"> Fechas
                </label>
                <label style="cursor:pointer; display:flex; align-items:center; gap:5px;">
                    <input type="checkbox" ${app.analytics.columns.ip ? 'checked' : ''} onchange="app.analytics.toggleColumn('ip')"> IPs
                </label>
                <label style="cursor:pointer; display:flex; align-items:center; gap:5px;">
                    <input type="checkbox" ${app.analytics.columns.rooms ? 'checked' : ''} onchange="app.analytics.toggleColumn('rooms')"> Salas
                </label>
            </div>
        </div>
        <div id="analyticsResultsArea"></div>
        `;
        
        container.innerHTML = html;
        app.analytics.renderResults();
    },

    renderResults: () => {
        const resultsArea = document.getElementById('analyticsResultsArea');
        if (!resultsArea) return;

        let usersData = app.analytics.getAggregatedData();

        // Aplicar filtros
        usersData = usersData.filter(user => {
            const matchName = user.name.toLowerCase().includes(app.analytics.filters.name);
            const ipsString = (user.ips ? user.ips.join(' ') : '').toLowerCase();
            const matchIp = ipsString.includes(app.analytics.filters.ip);
            const roomsString = (user.recentRooms ? user.recentRooms.join(' ') : '').toLowerCase();
            const matchRoom = app.analytics.filters.room === '' || roomsString.includes(app.analytics.filters.room);
            
            return matchName && matchIp && matchRoom;
        });

        usersData.sort((a, b) => b.visits - a.visits);

        let html = `<div style="display:flex; flex-direction:column; gap:10px;">`;
        
        if (usersData.length === 0) {
            html += `<p style='color:var(--text-muted)'>Ningún usuario coincide con la búsqueda.</p>`;
        } else {
            usersData.forEach(user => {
                const d = new Date(user.lastVisit);
                const dStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${(d.getMinutes()<10?'0':'')+d.getMinutes()}`;
                
                const ipsArr = user.ips || [];
                const ipsList = ipsArr.length > 0 ? ipsArr.join('<br>') : 'Desconocida';
                const mainIp = ipsArr.length > 0 ? ipsArr[0] : 'IP Oculta';

                // Lógica de Nombre vs IP Principal
                let nameDisplay = app.analytics.columns.name ? user.name : `<i>${mainIp}</i>`;

                // Lógica de Salas y Transiciones
                let roomsHtml = '';
                if (app.analytics.columns.rooms) {
                    if (app.analytics.filters.room !== '') {
                        const searchRoom = app.analytics.filters.room.toLowerCase();
                        let count = 0;
                        let transitions = {};
                        const rRooms = user.recentRooms || [];
                        
                        // recentRooms guarda [nueva, vieja, masVieja]
                        for (let i = 0; i < rRooms.length; i++) {
                            if (rRooms[i].toLowerCase().includes(searchRoom)) {
                                count++;
                                if (i > 0) { // Si hay una sala posterior (en el índice anterior)
                                    const nextRoom = rRooms[i-1];
                                    transitions[nextRoom] = (transitions[nextRoom] || 0) + 1;
                                }
                            }
                        }
                        
                        let transHtml = Object.entries(transitions).map(([r, c]) => `${r} (${c}x)`).join(', ');
                        if (!transHtml) transHtml = "Ninguna";

                        roomsHtml = `<div><span style="color:var(--text-muted); font-weight:bold;">Accesos a sala filtrada:</span> <span style="color:var(--accent-gold);">${count}</span></div>
                                     <div><span style="color:var(--text-muted); font-weight:bold;">Luego navegó hacia:</span> <span style="color:var(--accent-blue);">${transHtml}</span></div>`;
                    } else {
                        const rList = user.recentRooms && user.recentRooms.length > 0 ? user.recentRooms.join(' ➔ ') : 'Ninguna';
                        roomsHtml = `<div><span style="color:var(--text-muted); font-weight:bold;">Salas recientes:</span><br><span style="color:var(--accent-gold); font-weight:bold;">${rList}</span></div>`;
                    }
                }

                // Ensamblar bloque de información
                let infoHtml = '';
                if (app.analytics.columns.date) infoHtml += `<div><span style="color:var(--text-muted); font-weight:bold;">Última vez:</span> ${dStr}</div>`;
                if (app.analytics.columns.ip) infoHtml += `<div><span style="color:var(--text-muted); font-weight:bold;">IPs:</span><br>${ipsList}</div>`;
                if (roomsHtml) infoHtml += roomsHtml;

                if (infoHtml === '') infoHtml = `<div style="color:var(--text-muted); font-style:italic;">Información oculta.</div>`;

                html += `
                <div class="card" style="background:var(--bg-card); border:2px solid var(--accent-blue); padding:15px; text-align:left; box-shadow:var(--card-shadow-3d);">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-input); padding-bottom:5px; margin-bottom:10px;">
                        <strong style="color:var(--accent-blue); font-size:1.2em; font-weight:var(--font-bold);">${nameDisplay}</strong>
                        <span style="background:var(--accent-blue); color:#fff; padding:4px 10px; border-radius:12px; font-size:0.8em; font-weight:bold;">${user.visits} visitas</span>
                    </div>
                    
                    <div style="font-size:0.85em; color:var(--text-main); display:grid; grid-template-columns: 1fr; gap:8px;">
                        ${infoHtml}
                        <div style="font-size:0.75em; color:var(--text-muted); margin-top:5px; word-break: break-all; opacity:0.7;">${user.userAgent || ''}</div>
                    </div>
                    
                    <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid var(--border-input); display: flex; gap: 10px;">
                        <button onclick="app.deleteAnalyticsRecord('${user.name}', 'last')" style="flex: 1; background:var(--accent-gold); color:#fff; border:none; padding:10px; border-radius:var(--btn-radius); cursor:pointer; font-size:0.85em; font-weight:bold;">
                            🗑️ Borrar último
                        </button>
                        <button onclick="app.deleteAnalyticsRecord('${user.name}', 'all')" style="flex: 1; background:var(--accent-red); color:#fff; border:none; padding:10px; border-radius:var(--btn-radius); cursor:pointer; font-size:0.85em; font-weight:bold;">
                            🚨 Borrar todos
                        </button>
                    </div>
                </div>`;
            });
        }

        html += `</div>`;
        resultsArea.innerHTML = html;
    }
};

socket.on('analytics_data', (data) => {
    app.analytics.data = data;
    
    const sel = document.getElementById('analyticsWeekSelect');
    if (sel) {
        sel.innerHTML = "<option value='ALL'>🌍 Global (Todas las semanas)</option>";
        const weeks = Object.keys(data).sort((a,b) => b.localeCompare(a));
        
        weeks.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w;
            opt.innerHTML = `📅 Semana ${w}`;
            sel.appendChild(opt);
        });
        
        sel.value = app.analytics.currentWeek;
    }
    
    // Iniciar renderizado estructurado
    app.analytics.renderControls();
});