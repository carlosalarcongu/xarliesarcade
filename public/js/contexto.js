app.contexto = {
    currentGameId: null,
    guesses: [],

    // Generador de HTML para reutilizar el diseño de las tarjetas
    generateContextoHTML: (g) => {
        let colorClass = 'ctx-red';
        if (g.distance === 0) colorClass = 'ctx-win';
        else if (g.distance <= 300) colorClass = 'ctx-green';
        else if (g.distance <= 3000) colorClass = 'ctx-orange';

        const ptsDisplay = (g.points > 0) ? `<span style="font-size:0.7em; color:#fff; margin-left:5px;">+${g.points}pts</span>` : '';

        return `
            <div class="contexto-item ${colorClass}" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                <div style="text-align:left;">
                    <span class="ctx-word">${g.word}</span>
                    ${ptsDisplay}
                </div>
                <span class="ctx-dist">#${g.distance}</span>
            </div>
        `;
    },

    init: () => {
        const now = new Date();
        const refDate = new Date('2026-02-11T00:00:00');
        const refId = 992;
        
        const diffTime = now - refDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const todayId = refId + diffDays;
        
        app.contexto.currentGameId = todayId;
        
        document.getElementById('ctxGameId').value = todayId;
        app.contexto.guesses = [];
        document.getElementById('contextoList').innerHTML = "";
        const latestDiv = document.getElementById('contextoLatestGuess');
        if (latestDiv) latestDiv.innerHTML = "";
        document.getElementById('contextoWinner').classList.add('hidden');
    },

    changeGameId: () => {
        const val = document.getElementById('ctxGameId').value;
        if (val && val > 0) {
            app.contexto.currentGameId = parseInt(val);
            app.contexto.guesses = []; 
            document.getElementById('contextoList').innerHTML = "";
            const latestDiv = document.getElementById('contextoLatestGuess');
            if (latestDiv) latestDiv.innerHTML = "";
            document.getElementById('contextoWinner').classList.add('hidden');
        }
    },

    submit: () => {
        const inp = document.getElementById('contextoInput');
        const word = inp.value.trim();
        
        if(!word) return;
        if(!app.contexto.currentGameId) return alert("Error: No hay ID de juego definido.");

        inp.value = "Pensando...";
        inp.disabled = true;

        socket.emit('contexto_action', {
            type: 'guess',
            word: word,
            gameId: app.contexto.currentGameId,
            playerName: app.myPlayerName || "Anónimo"
        });
    },

    showRanking: () => {
        socket.emit('contexto_action', { type: 'getRanking' });
        document.getElementById('contextoRankingModal').classList.remove('hidden');
    },

    closeRanking: () => {
        document.getElementById('contextoRankingModal').classList.add('hidden');
    },
    
    resetRanking: () => {
        if(confirm("¿Borrar ranking semanal?")) socket.emit('contexto_action', { type: 'resetRanking' });
    }
};

// RESPUESTA DEL SERVIDOR
socket.on('contexto_result', (data) => {
    const inp = document.getElementById('contextoInput');
    inp.value = "";
    inp.disabled = false;
    inp.focus();

    // Evitar duplicados
    if (app.contexto.guesses.find(g => g.word === data.word)) return;

    // 1. Guardamos la palabra en el historial global
    app.contexto.guesses.push(data);

    // 2. Renderizamos la palabra MÁS RECIENTE dentro de la cajita especial de arriba
    const latestContainer = document.getElementById('contextoLatestGuess');
    if (latestContainer) {
        latestContainer.innerHTML = app.contexto.generateContextoHTML(data);
    }

    // 3. Renderizamos el RESTO de palabras ordenadas por distancia (1, 2, 3...)
    const list = document.getElementById('contextoList');
    // Filtramos para quitar la última que hemos metido arriba
    const previousGuesses = app.contexto.guesses.filter(g => g.word !== data.word);
    
    // Ordenamos ascendentemente (la más cercana arriba)
    previousGuesses.sort((a, b) => a.distance - b.distance);

    // Pintamos toda la lista
    list.innerHTML = previousGuesses.map(g => app.contexto.generateContextoHTML(g)).join('');

    if (data.win) {
        const winDiv = document.getElementById('contextoWinner');
        winDiv.classList.remove('hidden');
        winDiv.innerText = `¡ENCONTRADO! (+${data.points} pts)`;
        document.getElementById('revealSound').play().catch(()=>{});
    }
});

// ... resto de sockets de errorMsg y ranking (no cambian)

socket.on('errorMsg', (msg) => {
    alert(msg);
    const inp = document.getElementById('contextoInput');
    inp.value = "";
    inp.disabled = false;
    inp.focus();
});

socket.on('contextoRankingData', (list) => {
    const container = document.getElementById('contextoRankingList');
    container.innerHTML = list.map((p, i) => `
        <div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #444; ${i===0?'color:#f1c40f; font-weight:bold;':''}">
            <span>${i+1}. ${p.name}</span>
            <span>${p.pts} pts</span>
        </div>
    `).join('');
    
    if (app.myPlayerName && app.myPlayerName.toLowerCase().includes('admin')) {
        document.getElementById('btnWipeRanking').classList.remove('hidden');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !document.getElementById('contextoScreen').classList.contains('hidden')) {
        app.contexto.submit();
    }
});