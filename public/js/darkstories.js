window.app = window.app || {};

window.app.darkstories = {
    fullCatalog: [],
    filteredCatalog: [],
    currentCard: null,
    currentDifficulty: 'ALL',
    currentCategory: null,
    progress: { acertadas: [], aburridas: [] },
    isFlipped: false,

    init: () => {
        app.darkstories.loadProgress();
        socket.emit('darkstories_requestCatalog');
    },

    loadProgress: () => {
        const saved = localStorage.getItem(`ds_prog_${app.myPlayerName}`);
        if (saved) {
            try {
                app.darkstories.progress = JSON.parse(saved);
            } catch (e) {
                app.darkstories.progress = { acertadas: [], aburridas: [] };
            }
        } else {
            app.darkstories.progress = { acertadas: [], aburridas: [] };
        }
    },

    saveProgress: () => {
        localStorage.setItem(`ds_prog_${app.myPlayerName}`, JSON.stringify(app.darkstories.progress));
        app.darkstories.updateTogglesUI();
    },

    setDifficulty: (diff) => {
        app.darkstories.currentDifficulty = diff;
        
        ['all', 'easy', 'medium', 'hard'].forEach(d => {
            const btn = document.getElementById(`dsDiff_${d}`);
            if(btn) {
                if(d.toUpperCase() === diff) btn.style.border = "3px solid #fff";
                else btn.style.border = "none";
            }
        });

        if (diff === 'ALL') {
            app.darkstories.filteredCatalog = [...app.darkstories.fullCatalog];
        } else {
            app.darkstories.filteredCatalog = app.darkstories.fullCatalog.filter(c => c.dificultad === diff);
        }
        app.darkstories.renderCategoryGrid();
    },

    renderCategoryGrid: () => {
        const grid = document.getElementById('dsCategoryGrid');
        if (!grid) return;

        // Agrupar catálogo filtrado por categoría
        const categories = {};
        app.darkstories.filteredCatalog.forEach(c => {
            if(!categories[c.categoria]) categories[c.categoria] = [];
            categories[c.categoria].push(c);
        });

        if (Object.keys(categories).length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; color:#aaa; font-style:italic;">No hay historias en esta dificultad.</div>`;
            return;
        }

        let html = '';
        Object.keys(categories).sort().forEach(cat => {
            const total = categories[cat].length;
            const completed = categories[cat].filter(c => 
                app.darkstories.progress.acertadas.includes(c.id_unitario) || 
                app.darkstories.progress.aburridas.includes(c.id_unitario)
            ).length;

            const isDone = completed >= total;
            const border = isDone ? 'border-color:#2ed573' : 'border-color:#8c7ae6';

            html += `
                <div class="card" style="padding:15px; margin-bottom:0; ${border}; cursor:pointer; background:#2f3542;" onclick="app.darkstories.drawCard('${cat}')">
                    <h4 style="margin:0 0 5px 0; color:#fff; font-size:1.1em;">${cat}</h4>
                    <p style="margin:0; font-size:0.8em; color:#aaa;">${completed} / ${total} completadas</p>
                    ${isDone ? `<div style="margin-top:5px; font-size:0.8em; color:#2ed573; font-weight:bold;">¡Completado!</div>` : ''}
                </div>
            `;
        });
        grid.innerHTML = html;
    },

    drawCard: (category) => {
        app.darkstories.currentCategory = category;
        const pool = app.darkstories.filteredCatalog.filter(c => c.categoria === category);
        
        let available = pool.filter(c => 
            !app.darkstories.progress.acertadas.includes(c.id_unitario) && 
            !app.darkstories.progress.aburridas.includes(c.id_unitario)
        );

        if (available.length === 0) {
            available = pool;
            alert("¡Has visto todas las historias de esta categoría en esta dificultad! Se mostrarán repetidas.");
        }

        app.darkstories.currentCard = available[Math.floor(Math.random() * available.length)];
        app.darkstories.isFlipped = false;
        
        app.darkstories.showGameView();
        app.darkstories.renderCard();
    },

    drawRandomCard: () => {
        app.darkstories.currentCategory = 'Aleatorio';
        const pool = app.darkstories.filteredCatalog;
        
        let available = pool.filter(c => 
            !app.darkstories.progress.acertadas.includes(c.id_unitario) && 
            !app.darkstories.progress.aburridas.includes(c.id_unitario)
        );

        if (available.length === 0) {
            available = pool;
            alert("¡Has visto todas las historias en esta dificultad! Se mostrarán repetidas.");
        }

        app.darkstories.currentCard = available[Math.floor(Math.random() * available.length)];
        app.darkstories.isFlipped = false;
        
        app.darkstories.showGameView();
        app.darkstories.renderCard();
    },

    drawNextCard: () => {
        if (app.darkstories.currentCategory === 'Aleatorio') {
            app.darkstories.drawRandomCard();
        } else {
            app.darkstories.drawCard(app.darkstories.currentCategory);
        }
    },

    renderCard: () => {
        if (!app.darkstories.currentCard) return;

        const content = document.getElementById('dsCardContent');
        const controls = document.getElementById('dsCardControls');
        const c = app.darkstories.currentCard;

        document.getElementById('dsCurrentCategoryTitle').innerText = `${c.categoria} - ${c.nombre}`;
        if(controls) controls.classList.remove('hidden');

        let html = `
            <div style="font-size:1.2em; font-weight:bold; color:#74b9ff; margin-bottom:15px;">
                🕵️ Enunciado:
            </div>
            <div style="font-size:1.3em; color:#fff; line-height:1.5; margin-bottom:20px;">
                "${c.enunciado}"
            </div>
        `;

        if (app.darkstories.isFlipped) {
            html += `
                <div style="font-size:1.2em; font-weight:bold; color:#ff7675; margin-bottom:10px; border-top:1px solid #444; padding-top:15px;">
                    👁️ Respuesta:
                </div>
                <div style="font-size:1.2em; color:#ddd; line-height:1.4;">
                    ${c.texto}
                </div>
            `;
            document.getElementById('dsBtnFlip').innerText = "Ocultar Respuesta";
        } else {
            document.getElementById('dsBtnFlip').innerText = "👁️ Revelar Solución";
        }

        if(content) content.innerHTML = html;
        app.darkstories.updateTogglesUI();
    },

    toggleFlip: () => {
        app.darkstories.isFlipped = !app.darkstories.isFlipped;
        app.darkstories.renderCard();
    },

    toggleProgress: (type) => {
        if(!app.darkstories.currentCard) return;
        const id = app.darkstories.currentCard.id_unitario;
        const otherType = type === 'acertadas' ? 'aburridas' : 'acertadas';

        const idx = app.darkstories.progress[type].indexOf(id);
        if (idx === -1) {
            app.darkstories.progress[type].push(id);
            const otherIdx = app.darkstories.progress[otherType].indexOf(id);
            if (otherIdx !== -1) app.darkstories.progress[otherType].splice(otherIdx, 1);
        } else {
            app.darkstories.progress[type].splice(idx, 1);
        }
        
        app.darkstories.saveProgress();
    },

    updateTogglesUI: () => {
        if(!app.darkstories.currentCard) return;
        const id = app.darkstories.currentCard.id_unitario;
        const btnAcertada = document.getElementById('dsBtnAcertada');
        const btnAburrida = document.getElementById('dsBtnAburrida');

        if(btnAcertada) {
            if (app.darkstories.progress.acertadas.includes(id)) {
                btnAcertada.style.background = "#2ed573";
                btnAcertada.style.color = "#000";
            } else {
                btnAcertada.style.background = "#2f3542";
                btnAcertada.style.color = "#fff";
            }
        }

        if(btnAburrida) {
            if (app.darkstories.progress.aburridas.includes(id)) {
                btnAburrida.style.background = "#ff4757";
                btnAburrida.style.color = "#fff";
            } else {
                btnAburrida.style.background = "#2f3542";
                btnAburrida.style.color = "#fff";
            }
        }
    },

    // --- VISTAS SECUNDARIAS ---
    showLobbyView: () => {
        document.getElementById('dsLobbyView').classList.remove('hidden');
        document.getElementById('dsGameView').classList.add('hidden');
        document.getElementById('dsCompletedView').classList.add('hidden');
        app.darkstories.renderCategoryGrid();
    },

    showGameView: () => {
        document.getElementById('dsLobbyView').classList.add('hidden');
        document.getElementById('dsGameView').classList.remove('hidden');
        document.getElementById('dsCompletedView').classList.add('hidden');
    },

    showCompletedView: () => {
        document.getElementById('dsLobbyView').classList.add('hidden');
        document.getElementById('dsGameView').classList.add('hidden');
        document.getElementById('dsCompletedView').classList.remove('hidden');
        app.darkstories.renderCompletedList();
    },

    renderCompletedList: () => {
        const list = document.getElementById('dsCompletedList');
        const allCompletedIds = [...app.darkstories.progress.acertadas, ...app.darkstories.progress.aburridas];
        
        if (allCompletedIds.length === 0) {
            list.innerHTML = "<p style='color:#aaa;'>No has completado ninguna historia aún.</p>";
            return;
        }

        let html = '';
        allCompletedIds.forEach(id => {
            const story = app.darkstories.fullCatalog.find(c => c.id_unitario === id);
            if (!story) return;

            const isAcertada = app.darkstories.progress.acertadas.includes(id);
            const statusIcon = isAcertada ? '✅' : '🥱';
            const color = isAcertada ? '#2ed573' : '#ff4757';

            html += `
                <div style="background:#222; padding:10px 15px; border-radius:8px; border-left:4px solid ${color}; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:bold; color:#fff;">${statusIcon} ${story.nombre}</div>
                        <div style="font-size:0.8em; color:#aaa;">${story.categoria}</div>
                    </div>
                    <button onclick="app.darkstories.unmarkStory('${id}')" style="background:transparent; border:none; color:#ff4757; font-size:1.2em; cursor:pointer;">✖</button>
                </div>
            `;
        });
        list.innerHTML = html;
    },

    unmarkStory: (id) => {
        app.darkstories.progress.acertadas = app.darkstories.progress.acertadas.filter(x => x !== id);
        app.darkstories.progress.aburridas = app.darkstories.progress.aburridas.filter(x => x !== id);
        app.darkstories.saveProgress();
        app.darkstories.renderCompletedList();
    },

    clearAllCompleted: () => {
        if(confirm("¿Estás seguro de que quieres borrar tu progreso en todas las historias?")) {
            app.darkstories.progress = { acertadas: [], aburridas: [] };
            app.darkstories.saveProgress();
            app.darkstories.renderCompletedList();
        }
    }
};

socket.on('darkstories_catalog', (data) => {
    app.darkstories.fullCatalog = data;
    app.darkstories.setDifficulty('ALL'); 
});