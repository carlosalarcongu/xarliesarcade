// public/js/darkstories.js

window.app = window.app || {};

window.app.darkstories = {
    catalog: { facil: [], medio: [], dificil: [] },
    currentCard: null,
    currentCategory: 'medio',
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
        app.darkstories.updateStatsUI();
    },

    setCategory: (cat) => {
        app.darkstories.currentCategory = cat;
        
        ['facil', 'medio', 'dificil'].forEach(c => {
            const btn = document.getElementById(`dsBtn_${c}`);
            if(btn) {
                if(c === cat) btn.style.border = "2px solid #fff";
                else btn.style.border = "none";
            }
        });
        app.darkstories.drawCard();
    },

    drawCard: () => {
        const pool = app.darkstories.catalog[app.darkstories.currentCategory] || [];
        
        if (pool.length === 0) {
            return app.darkstories.showEmpty("Aún no hay historias en esta categoría.");
        }

        let available = pool.filter(c => 
            !app.darkstories.progress.acertadas.includes(c.id) && 
            !app.darkstories.progress.aburridas.includes(c.id)
        );

        if (available.length === 0) {
            available = pool;
            alert("¡Ya has visto todas las historias de esta dificultad! Te las mostraremos repetidas.");
        }

        app.darkstories.currentCard = available[Math.floor(Math.random() * available.length)];
        app.darkstories.isFlipped = false;
        app.darkstories.renderCard();
        app.darkstories.updateStatsUI();
    },

    showEmpty: (msg) => {
        const content = document.getElementById('dsCardContent');
        const controls = document.getElementById('dsCardControls');
        if(content) content.innerHTML = `<p style="color:#aaa; text-align:center;">${msg}</p>`;
        if(controls) controls.classList.add('hidden');
    },

    renderCard: () => {
        if (!app.darkstories.currentCard) return;

        const content = document.getElementById('dsCardContent');
        const controls = document.getElementById('dsCardControls');
        const c = app.darkstories.currentCard;

        if(controls) controls.classList.remove('hidden');

        let html = `
            <div style="font-size:1.2em; font-weight:bold; color:#74b9ff; margin-bottom:15px;">
                🕵️ Enunciado:
            </div>
            <div style="font-size:1.5em; color:#fff; line-height:1.4; margin-bottom:20px;">
                "${c.enunciado}"
            </div>
        `;

        if (app.darkstories.isFlipped) {
            html += `
                <div style="font-size:1.2em; font-weight:bold; color:#ff7675; margin-bottom:10px; border-top:1px solid #444; padding-top:15px;">
                    👁️ Respuesta:
                </div>
                <div style="font-size:1.2em; color:#ddd; line-height:1.4;">
                    ${c.respuesta}
                </div>
            `;
            const flipBtn = document.getElementById('dsBtnFlip');
            if(flipBtn) flipBtn.innerText = "Ocultar Respuesta";
        } else {
            const flipBtn = document.getElementById('dsBtnFlip');
            if(flipBtn) flipBtn.innerText = "👁️ Revelar Solución";
        }

        if(content) content.innerHTML = html;
        app.darkstories.updateTogglesUI();
    },

    toggleFlip: () => {
        app.darkstories.isFlipped = !app.darkstories.isFlipped;
        app.darkstories.renderCard();
    },

    toggleAcertada: () => {
        if(!app.darkstories.currentCard) return;
        const id = app.darkstories.currentCard.id;
        const idx = app.darkstories.progress.acertadas.indexOf(id);
        
        if (idx === -1) {
            app.darkstories.progress.acertadas.push(id);
            const abIdx = app.darkstories.progress.aburridas.indexOf(id);
            if (abIdx !== -1) app.darkstories.progress.aburridas.splice(abIdx, 1);
        } else {
            app.darkstories.progress.acertadas.splice(idx, 1);
        }
        
        app.darkstories.saveProgress();
        app.darkstories.updateTogglesUI();
    },

    toggleAburrida: () => {
        if(!app.darkstories.currentCard) return;
        const id = app.darkstories.currentCard.id;
        const idx = app.darkstories.progress.aburridas.indexOf(id);
        
        if (idx === -1) {
            app.darkstories.progress.aburridas.push(id);
            const acIdx = app.darkstories.progress.acertadas.indexOf(id);
            if (acIdx !== -1) app.darkstories.progress.acertadas.splice(acIdx, 1);
        } else {
            app.darkstories.progress.aburridas.splice(idx, 1);
        }
        
        app.darkstories.saveProgress();
        app.darkstories.updateTogglesUI();
    },

    updateTogglesUI: () => {
        if(!app.darkstories.currentCard) return;
        const id = app.darkstories.currentCard.id;
        const btnAcertada = document.getElementById('dsBtnAcertada');
        const btnAburrida = document.getElementById('dsBtnAburrida');

        if(btnAcertada) {
            if (app.darkstories.progress.acertadas.includes(id)) {
                btnAcertada.style.background = "#2ed573";
                btnAcertada.style.color = "#000";
                btnAcertada.innerText = "✅ Acertada";
            } else {
                btnAcertada.style.background = "#2f3542";
                btnAcertada.style.color = "#fff";
                btnAcertada.innerText = "✔️ Marcar Acertada";
            }
        }

        if(btnAburrida) {
            if (app.darkstories.progress.aburridas.includes(id)) {
                btnAburrida.style.background = "#ff4757";
                btnAburrida.style.color = "#fff";
                btnAburrida.innerText = "🥱 Aburrida";
            } else {
                btnAburrida.style.background = "#2f3542";
                btnAburrida.style.color = "#fff";
                btnAburrida.innerText = "🥱 Marcar Aburrida";
            }
        }
    },

    updateStatsUI: () => {
        const pool = app.darkstories.catalog[app.darkstories.currentCategory] || [];
        const seenInThisCat = pool.filter(c => 
            app.darkstories.progress.acertadas.includes(c.id) || 
            app.darkstories.progress.aburridas.includes(c.id)
        ).length;
        
        const statsEl = document.getElementById('dsStats');
        if(statsEl) {
            statsEl.innerText = `Has descubierto ${seenInThisCat} de ${pool.length} historias (${app.darkstories.currentCategory}).`;
        }
    }
};

// Listener del servidor
socket.on('darkstories_catalog', (data) => {
    app.darkstories.catalog = data;
    app.darkstories.setCategory('medio'); 
});