window.app = window.app || {};

const DRINK_SCORES = {
    copa: 1,
    cerveza: 1,
    calimocho: 1,
    vino: 1,
    chupito: 1,
    jarra: 1
};

const DRINK_EMOJIS = {
    copa: '🍹', cerveza: '🍺', calimocho: '🍷', vino: '🍷', chupito: '🥃', jarra: '🍻'
};

window.app.beber = {
    data: { whitelist: [], records: [] },
    activeFilters: { copa: true, cerveza: true, calimocho: true, vino: true, chupito: true, jarra: true },

    init: () => {
        socket.emit('beber_requestData');
        const sel = document.getElementById('beberViewMode');
        if (sel && app.myPlayerName && app.myPlayerName.toLowerCase() === 'administrador m') {
            if (!sel.querySelector('option[value="registry"]')) {
                const opt = document.createElement('option');
                opt.value = 'registry';
                opt.innerHTML = '📋 Registro de Bebidas (Admin)';
                sel.appendChild(opt);
            }
        }
    },

    isAllowed: () => {
        if (!app.myPlayerName) return false;
        if (app.myPlayerName.toLowerCase() === 'administrador m') return true;
        return app.beber.data.whitelist.some(n => n.toLowerCase() === app.myPlayerName.toLowerCase());
    },

    addDrink: (drinkType) => {
        if (!app.beber.isAllowed()) {
            alert("⚠️ Tu usuario no está contemplado para el conteo de alcohol.");
            app.goBackToHub(false);
            return;
        }

        socket.emit('beber_addDrink', { user: app.myPlayerName, drink: drinkType });
        alert(`✅ ¡Anotado correctamente! (+1 ${drinkType.toUpperCase()})`);
        app.goBackToHub(false);
    },

    openStats: () => {
        if (!app.beber.isAllowed()) {
            alert("⚠️ No tienes permisos para ver la clasificación.");
            app.goBackToHub(false);
            return;
        }
        app.showScreen('beberStatsScreen');
        app.beber.changeStatsView();
    },

    changeStatsView: () => {
        const mode = document.getElementById('beberViewMode').value;
        const container = document.getElementById('beberStatsContainer');
        const filters = document.getElementById('beberDynamicFilters');

        container.innerHTML = "";
        if(filters) filters.classList.add('hidden');

        if (mode === 'ranking') {
            if(filters) filters.classList.remove('hidden');
            app.beber.renderRanking(container);
        } else if (mode === 'table') {
            app.beber.renderTable(container);
        } else if (mode === 'podium') {
            app.beber.renderMonthlyPodium(container);
        } else if (mode === 'admin') {
            app.beber.renderAdmin(container);
        } else if (mode === 'registry') {
            app.beber.renderRegistry(container);
        }
    },

    toggleFilter: (drink) => {
        app.beber.activeFilters[drink] = !app.beber.activeFilters[drink];
        const btn = document.getElementById(`filter_${drink}`);
        if(btn) {
            btn.style.opacity = app.beber.activeFilters[drink] ? '1' : '0.4';
            btn.style.border = app.beber.activeFilters[drink] ? '2px solid #2ed573' : '2px solid #555';
        }
        app.beber.renderRanking(document.getElementById('beberStatsContainer'));
    },

    renderRanking: (container) => {
        const scores = {};

        app.beber.data.records.forEach(r => {
            const isWhiteListed = app.beber.data.whitelist.some(n => n.toLowerCase() === r.user.toLowerCase()) || r.user.toLowerCase() === 'administrador m';
            if (!isWhiteListed) return;

            const realNameObj = app.beber.data.whitelist.find(n => n.toLowerCase() === r.user.toLowerCase());
            const displayName = realNameObj ? realNameObj : (r.user.toLowerCase() === 'administrador m' ? 'Admin' : r.user);

            if (app.beber.activeFilters[r.drink]) {
                if (!scores[displayName]) scores[displayName] = 0;
                scores[displayName] += DRINK_SCORES[r.drink];
            }
        });

        app.beber.data.whitelist.forEach(n => {
            if (scores[n] === undefined) scores[n] = 0;
        });

        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

        let html = `<div class="mus-table-wrapper"><table class="mus-table">
            <tr><th style="width:10%">#</th><th style="text-align:left;">Bebedor</th><th>Puntuación</th></tr>`;
        
        sorted.forEach((p, i) => {
            const color = i === 0 ? '#f1c40f' : (i === 1 ? '#bdc3c7' : (i === 2 ? '#cd7f32' : '#fff'));
            const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : `${i+1}º`));
            
            html += `<tr>
                <td style="color:${color}; font-weight:bold;">${medal}</td>
                <td style="text-align:left; font-weight:bold; color:${color};">${p[0]}</td>
                <td style="font-weight:900; color:#2ed573;">${p[1]} pts</td>
            </tr>`;
        });
        html += `</table></div>`;
        container.innerHTML = html;
    },

    renderTable: (container) => {
        const stats = {};
        const drinksList = Object.keys(DRINK_SCORES);

        app.beber.data.whitelist.forEach(w => {
            stats[w] = { copa:0, cerveza:0, calimocho:0, vino:0, chupito:0, jarra:0 };
        });

        app.beber.data.records.forEach(r => {
            const realName = app.beber.data.whitelist.find(n => n.toLowerCase() === r.user.toLowerCase());
            if (realName && stats[realName]) {
                if (stats[realName][r.drink] !== undefined) stats[realName][r.drink]++;
            }
        });

        let html = `<div class="mus-table-wrapper" style="overflow-x:auto;">
            <table class="mus-table" style="font-size:0.8em; white-space:nowrap;">
            <tr>
                <th style="text-align:left;">Persona</th>
                ${drinksList.map(d => `<th>${DRINK_EMOJIS[d]}</th>`).join('')}
            </tr>`;
        
        Object.keys(stats).sort().forEach(user => {
            html += `<tr><td style="text-align:left; font-weight:bold; color:#74b9ff;">${user}</td>`;
            drinksList.forEach(d => {
                const count = stats[user][d];
                html += `<td style="color:${count > 0 ? '#fff' : '#444'}">${count}</td>`;
            });
            html += `</tr>`;
        });
        html += `</table></div>`;
        container.innerHTML = html;
    },

    renderMonthlyPodium: (container) => {
        const monthsData = {};
        
        app.beber.data.records.forEach(r => {
            const realName = app.beber.data.whitelist.find(n => n.toLowerCase() === r.user.toLowerCase());
            if (!realName) return;

            const date = new Date(r.date);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            
            if(!monthsData[monthKey]) monthsData[monthKey] = {};
            if(!monthsData[monthKey][realName]) monthsData[monthKey][realName] = 0;
            
            monthsData[monthKey][realName] += DRINK_SCORES[r.drink];
        });

        const sortedMonths = Object.keys(monthsData).sort((a,b) => b.localeCompare(a));

        if (sortedMonths.length === 0) {
            container.innerHTML = "<p style='color:#aaa'>Aún no hay datos mensuales registrados.</p>";
            return;
        }

        let html = `<div style="display:flex; flex-direction:column; gap:20px;">`;
        
        sortedMonths.forEach(mKey => {
            const [y, m] = mKey.split('-');
            const monthName = new Date(y, m-1).toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
            
            const scores = Object.entries(monthsData[mKey]).sort((a,b) => b[1] - a[1]);
            const top3 = scores.slice(0, 3);

            html += `<div class="card" style="background:#2f3542; border:2px solid #9b59b6; padding:15px; text-align:left;">
                <h3 style="margin-top:0; color:#9b59b6; border-bottom:1px solid #444; padding-bottom:5px;">📅 ${monthName}</h3>
                <div class="podium-container" style="justify-content:center; transform:scale(0.8); margin-top:-10px;">`;
                
            if (top3[1]) html += `<div class="podium-bar p-silver" style="min-height:80px"><span class="p-name">${top3[1][0]}<br><small>${top3[1][1]}pts</small></span>🥈</div>`;
            if (top3[0]) html += `<div class="podium-bar p-gold" style="min-height:120px"><span class="p-name">${top3[0][0]}<br><small>${top3[0][1]}pts</small></span>🥇</div>`;
            if (top3[2]) html += `<div class="podium-bar p-bronze" style="min-height:60px"><span class="p-name">${top3[2][0]}<br><small>${top3[2][1]}pts</small></span>🥉</div>`;

            html += `</div></div>`;
        });
        html += `</div>`;
        container.innerHTML = html;
    },

    renderAdmin: (container) => {
        if (app.myPlayerName.toLowerCase() !== 'administrador m') {
            container.innerHTML = "<p style='color:#ff4757'>No tienes permisos de administrador.</p>";
            return;
        }

        let html = `
            <div class="card" style="background:#222; border:1px solid #444; padding:15px; text-align:left;">
                <h3 style="color:#f1c40f; margin-top:0;">Gestión de Whitelist</h3>
                
                <div style="display:flex; gap:5px; margin-bottom:15px;">
                    <input type="text" id="newWhitelistName" placeholder="Nombre exacto..." style="flex:1; padding:10px; border-radius:5px;">
                    <button class="main-btn" onclick="app.beber.addToWhitelist()" style="width:auto; padding:0 20px; background:#2ed573;">Añadir</button>
                </div>

                <ul style="list-style:none; padding:0; margin:0;">
                    ${app.beber.data.whitelist.map(w => `
                        <li style="display:flex; justify-content:space-between; align-items:center; background:#2f3542; padding:8px 10px; margin-bottom:5px; border-radius:5px;">
                            <span style="color:white; font-weight:bold;">${w}</span>
                            <button onclick="app.beber.removeFromWhitelist('${w}')" style="background:#ff4757; color:white; border:none; border-radius:5px; padding:5px 10px;">X</button>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
        container.innerHTML = html;
    },

    renderRegistry: (container) => {
        if (app.myPlayerName.toLowerCase() !== 'administrador m') {
            container.innerHTML = "<p style='color:#ff4757'>No tienes permisos de administrador.</p>";
            return;
        }

        const records = [...app.beber.data.records].sort((a,b) => new Date(b.date) - new Date(a.date));
        
        let html = `<div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:5px; width:100%;">`;
        
        records.forEach(r => {
            const d = new Date(r.date);
            const dStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${(d.getMinutes()<10?'0':'')+d.getMinutes()}`;
            html += `
            <div class="card" style="background:#222; border:1px solid #444; padding:5px; position:relative; text-align:center; min-width:0;">
                <button onclick="app.beber.deleteDrink(${r.id})" style="position:absolute; top:2px; right:2px; background:transparent; color:#ff4757; border:none; font-weight:bold; cursor:pointer; padding:0; font-size:1.2em; line-height:1;">✖</button>
                <div style="font-size:2em;">${DRINK_EMOJIS[r.drink] || '🍹'}</div>
                <div style="font-weight:bold; font-size:0.8em; color:#74b9ff; margin-top:5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.user}</div>
                <div style="font-size:0.6em; color:#aaa;">${dStr}</div>
            </div>`;
        });
        
        html += `</div>`;
        container.innerHTML = html;
    },

    addToWhitelist: () => {
        const input = document.getElementById('newWhitelistName');
        const name = input.value;
        if(name) {
            socket.emit('beber_addWhitelist', { admin: app.myPlayerName, name });
            input.value = "";
        }
    },

    removeFromWhitelist: (name) => {
        if(confirm(`¿Quitar a ${name} de la lista de conteo?`)) {
            socket.emit('beber_removeWhitelist', { admin: app.myPlayerName, name });
        }
    },

    deleteDrink: (id) => {
        if(confirm("¿Eliminar este registro de bebida?")) {
            socket.emit('beber_deleteDrink', { admin: app.myPlayerName, id });
        }
    }
};

socket.on('beber_data', (data) => {
    app.beber.data = data;
    if (!document.getElementById('beberStatsScreen').classList.contains('hidden')) {
        app.beber.changeStatsView();
    }
});