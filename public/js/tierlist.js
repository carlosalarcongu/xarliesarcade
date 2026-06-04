window.app = window.app || {};

window.app.tierlist = {
    data: { quotes: [], votes: [] },
    viewMode: 'personal',

    listenerAttached: false,

    init: () => {
        const lowerName = (app.myPlayerName || "").toLowerCase();
        if (!app.musWhitelist || !app.musWhitelist.includes(lowerName)) {
            alert("No estás en la Whitelist para acceder a la Tier List.");
            app.goBackToHub(false);
            return;
        }

        // Aseguramos que el listener se ancle correctamente 1 única vez
        if (!app.tierlist.listenerAttached) {
            window.socket.on('tierlist_data', (data) => {
                app.tierlist.data = data;
                if (document.getElementById('tierlistScreen') && !document.getElementById('tierlistScreen').classList.contains('hidden')) {
                    app.tierlist.render();
                }
            });
            app.tierlist.listenerAttached = true;
        }

        window.socket.emit('tierlist_action', { type: 'getData', user: app.myPlayerName });
    },

    toggleView: () => {
        app.tierlist.viewMode = app.tierlist.viewMode === 'personal' ? 'general' : 'personal';
        document.getElementById('tierlistViewBtn').innerText = app.tierlist.viewMode === 'personal' ? 'All' : 'Me';
        app.tierlist.render();
    },

    getGeneralTier: (quoteId) => {
        // Filtramos para evitar que los votos eliminados (UNRATED) rompan la media
        const validVotes = app.tierlist.data.votes.filter(v => v.quote_id === quoteId && v.tier !== 'UNRATED');
        if (validVotes.length === 0) return 'UNRATED';

        const scores = { 'SG': 7, 'S': 6, 'A': 5, 'B': 4, 'C': 3, 'F': 2, 'SS': 1 };
        const reverseScores = { 7: 'SG', 6: 'S', 5: 'A', 4: 'B', 3: 'C', 2: 'F', 1: 'SS' };
        
        const total = validVotes.reduce((acc, v) => acc + (scores[v.tier] || 0), 0);
        const avg = Math.round(total / validVotes.length);
        
        return reverseScores[avg] || 'UNRATED';
    },

    render: () => {
        const tiers = { 'SG': [], 'S': [], 'A': [], 'B': [], 'C': [], 'F': [], 'SS': [], 'UNRATED': [] };
        const lowerName = app.myPlayerName.toLowerCase();
        const isAdmin = ['administrador m', 'xarlie', 'musero', 'japa', 'administrador g'].includes(lowerName);

        const adminControlsWrapper = document.getElementById('tierlistAdminControls');
        const deleteCheckbox = document.getElementById('tierlistEnableDelete');
        const editCheckbox = document.getElementById('tierlistEnableEdit');
        const isDeleteMode = deleteCheckbox && deleteCheckbox.checked;
        const isEditMode = editCheckbox && editCheckbox.checked;

        if (adminControlsWrapper) {
            if (isAdmin) {
                adminControlsWrapper.classList.remove('hidden');
            } else {
                adminControlsWrapper.classList.add('hidden');
            }
        }

        app.tierlist.data.quotes.forEach(q => {
            let targetTier = 'UNRATED';
            if (app.tierlist.viewMode === 'personal') {
                const myVote = app.tierlist.data.votes.find(v => v.quote_id === q.id && v.user === lowerName);
                if (myVote) targetTier = myVote.tier;
            } else {
                targetTier = app.tierlist.getGeneralTier(q.id);
            }
            tiers[targetTier].push(q);
        });

        ['SG', 'S', 'A', 'B', 'C', 'F', 'SS', 'UNRATED'].forEach(t => {
            const container = document.getElementById(`tier-${t}`);
            if (!container) return;
            container.innerHTML = '';
            
            tiers[t].forEach(q => {
                const div = document.createElement('div');
                div.className = 'tier-item';
                div.draggable = false;
                div.id = `quote-${q.id}`;
                div.dataset.id = q.id;

                div.onclick = () => {
                    if (app.tierlist.viewMode === 'personal') {
                        app.tierlist.selectedQuoteId = q.id;
                        document.getElementById('tierMoveModal').classList.remove('hidden');
                    } else {
                        alert("Cambia a 'Ver Mi Tierlist' para poder clasificar.");
                    }
                };

                const cleanMedia = q.media ? q.media.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\r\n\t]/g, '').trim() : null;
                let mediaHtml = '';
                
                if (cleanMedia) {
                    const ext = cleanMedia.split('.').pop().toLowerCase();
                    const safeUrl = `/tier_media/${encodeURIComponent(cleanMedia)}`;
                    
                    if (['mp4', 'webm', 'mov'].includes(ext)) {
                        mediaHtml = `<video src="${safeUrl}" controls style="width:100%; border-radius:5px; margin-bottom:5px; max-height: 120px; background: #000; pointer-events: auto;"></video>`;
                    } else if (['opus', 'ogg', 'mp3', 'wav', 'm4a'].includes(ext)) {
                        mediaHtml = `<audio src="${safeUrl}" controls style="width:100%; margin-bottom:5px; height: 35px; pointer-events: auto;"></audio>`;
                    } else {
                        mediaHtml = `<img src="${safeUrl}" alt="${cleanMedia}" style="width:100%; border-radius:5px; margin-bottom:5px; object-fit: cover; max-height: 120px; pointer-events: none;">`;
                    }
                }

                let adminHtml = '';
                if (isAdmin) {
                    let buttons = '';
                    if (isEditMode) {
                        const escapedQuote = q.quote.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        buttons += `<button onclick="event.stopPropagation(); app.tierlist.openEditQuote('${q.id}', '${escapedQuote}')" style="flex:1; background: var(--accent-blue); color: white; border: none; padding: 6px; border-radius: 4px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 0 #0984e3;">M</button>`;
                    }
                    if (isDeleteMode) {
                        buttons += `<button onclick="event.stopPropagation(); app.tierlist.deleteQuote('${q.id}')" style="flex:1; background: var(--accent-red); color: white; border: none; padding: 6px; border-radius: 4px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 0 #c0392b;">X</button>`;
                    }
                    if (buttons) {
                        adminHtml = `<div style="position: absolute; top: -10px; right: -10px; display: flex; gap: 5px; z-index: 10;">${buttons}</div>`;
                    }
                }

                div.innerHTML = `
                    ${adminHtml}
                    ${mediaHtml}
                    <div style="font-size:0.8em; line-height:1.2; margin-top:4px; white-space: pre-wrap;">${q.quote}</div>
                `;
                container.appendChild(div);
            });
        });
    },

    moveToTier: (tier) => {
        if (!app.tierlist.selectedQuoteId) return;
        socket.emit('tierlist_action', { type: 'vote', user: app.myPlayerName, quoteId: app.tierlist.selectedQuoteId, tier });
        document.getElementById('tierMoveModal').classList.add('hidden');
    },

    deleteQuote: (id) => {
        if(confirm("¿Borrar esta frase/imagen para todos?")) {
            socket.emit('tierlist_action', { type: 'deleteQuote', user: app.myPlayerName, quoteId: id });
        }
    },

    openEditQuote: (id, currentText) => {
        app.tierlist.editingQuoteId = id;
        document.getElementById('tierEditInput').value = currentText;
        document.getElementById('tierEditModal').classList.remove('hidden');
    },

    saveEditQuote: () => {
        const id = app.tierlist.editingQuoteId;
        const newText = document.getElementById('tierEditInput').value.trim();
        if (id && newText !== null) {
            socket.emit('tierlist_action', { type: 'editQuote', user: app.myPlayerName, quoteId: id, newText });
            document.getElementById('tierEditModal').classList.add('hidden');
        }
    }
};
