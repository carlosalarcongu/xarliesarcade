// public/js/analytics.js
window.app = window.app || {};

window.app.analytics = {
    data: {},
    currentWeek: null,

    isAdmin: () => {
        if (!app.myPlayerName) return false;
        const lower = app.myPlayerName.toLowerCase();
        return lower === 'administrador m' || lower === 'xarlie';
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
            app.analytics.renderData();
        }
    },

    renderData: () => {
        const container = document.getElementById('analyticsDataContainer');
        if (!container) return;

        if (!app.analytics.currentWeek || !app.analytics.data[app.analytics.currentWeek]) {
            container.innerHTML = "<p style='color:#aaa'>No hay datos para esta semana.</p>";
            return;
        }

        const weekData = app.analytics.data[app.analytics.currentWeek];
        weekData.sort((a, b) => b.visits - a.visits);

        let html = `<div style="display:flex; flex-direction:column; gap:10px;">`;
        
        weekData.forEach(user => {
            const d = new Date(user.lastVisit);
            const dStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${(d.getMinutes()<10?'0':'')+d.getMinutes()}`;
            
            const ips = user.ips ? user.ips.join('<br>') : (user.lastIp || 'Desconocida');
            const rooms = user.recentRooms && user.recentRooms.length > 0 
                ? user.recentRooms.join(' ➔ ') 
                : 'Ninguna';

            html += `
            <div class="card" style="background:#222; border:1px solid #3498db; padding:15px; text-align:left;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #444; padding-bottom:5px; margin-bottom:10px;">
                    <strong style="color:#3498db; font-size:1.2em;">${user.name}</strong>
                    <span style="background:#3498db; color:#fff; padding:2px 8px; border-radius:10px; font-size:0.8em; font-weight:bold;">${user.visits} visitas</span>
                </div>
                <div style="font-size:0.85em; color:#ccc; display:grid; grid-template-columns: 1fr; gap:8px;">
                    <div><span style="color:#aaa;">Última vez:</span> ${dStr}</div>
                    <div><span style="color:#aaa;">IPs:</span><br>${ips}</div>
                    <div><span style="color:#aaa;">Salas recientes:</span><br><span style="color:#f1c40f">${rooms}</span></div>
                    <div style="font-size:0.7em; color:#777; margin-top:5px; word-break: break-all;">${user.userAgent || ''}</div>
                </div>
                
                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #444; display: flex; gap: 10px;">
                    <button onclick="app.deleteAnalyticsRecord('${user.name}', 'last')" style="flex: 1; background:#e1b12c; color:#fff; border:none; padding:8px; border-radius:5px; cursor:pointer; font-size:0.85em; font-weight:bold;">
                        🗑️ Borrar último
                    </button>
                    <button onclick="app.deleteAnalyticsRecord('${user.name}', 'all')" style="flex: 1; background:#e84118; color:#fff; border:none; padding:8px; border-radius:5px; cursor:pointer; font-size:0.85em; font-weight:bold;">
                        🚨 Borrar todos
                    </button>
                </div>
            </div>`;
        });

        html += `</div>`;
        container.innerHTML = html;
    }
};

socket.on('analytics_data', (data) => {
    app.analytics.data = data;
    
    const sel = document.getElementById('analyticsWeekSelect');
    if (sel) {
        sel.innerHTML = "";
        const weeks = Object.keys(data).sort((a,b) => b.localeCompare(a));
        
        if (weeks.length === 0) {
            sel.innerHTML = "<option value=''>Sin datos</option>";
            app.analytics.currentWeek = null;
        } else {
            weeks.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w;
                opt.innerHTML = `Semana ${w}`;
                sel.appendChild(opt);
            });
            
            if (!app.analytics.currentWeek || !weeks.includes(app.analytics.currentWeek)) {
                app.analytics.currentWeek = weeks[0];
            }
            sel.value = app.analytics.currentWeek;
        }
        
        app.analytics.renderData();
    }
});