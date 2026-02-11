app.contexto = {
    currentGameId: null,
    guesses: [],

    init: () => {
        // CÁLCULO PRECISO DEL JUEGO (Referencia: 11/02/2026 = 992)
        const now = new Date();
        const refDate = new Date('2026-02-11T00:00:00'); // Fecha de referencia
        const refId = 992; // ID de referencia
        
        // Diferencia en milisegundos
        const diffTime = now - refDate;
        // Convertir a días (redondeando hacia abajo para evitar saltos a mitad de día)
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // ID Actual
        const todayId = refId + diffDays;
        
        app.contexto.currentGameId = todayId;
        
        // Renderizar
        document.getElementById('ctxGameId').value = todayId;
        app.contexto.guesses = [];
        document.getElementById('contextoList').innerHTML = "";
        document.getElementById('contextoWinner').classList.add('hidden');
        
        console.log(`Contexto iniciado. Fecha: ${now.toLocaleDateString()} -> Juego ID: ${todayId}`);
    },

    changeGameId: () => {
        const val = document.getElementById('ctxGameId').value;
        if (val && val > 0) {
            app.contexto.currentGameId = parseInt(val);
            app.contexto.guesses = []; 
            document.getElementById('contextoList').innerHTML = "";
            document.getElementById('contextoWinner').classList.add('hidden');
            // alert(`Juego cambiado al #${val}`); // Opcional: Quitar para que sea más fluido
        }
    },

    submit: () => {
        const inp = document.getElementById('contextoInput');
        const word = inp.value.trim();
        
        if(!word) return;
        if(!app.contexto.currentGameId) return alert("Error: No hay ID de juego definido.");

        // Feedback visual (Loading)
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

    // Evitar duplicados visuales
    if (app.contexto.guesses.find(g => g.word === data.word)) return;

    app.contexto.guesses.push(data);
    app.contexto.guesses.sort((a, b) => a.distance - b.distance);

    const list = document.getElementById('contextoList');
    list.innerHTML = "";

    app.contexto.guesses.forEach(g => {
        const div = document.createElement('div');
        
        let colorClass = 'ctx-red';
        if (g.distance === 0) colorClass = 'ctx-win';
        else if (g.distance <= 300) colorClass = 'ctx-green';
        else if (g.distance <= 3000) colorClass = 'ctx-orange';

        div.className = `contexto-item ${colorClass}`;
        const ptsDisplay = (g.points > 0) ? `<span style="font-size:0.7em; color:#fff; margin-left:5px;">+${g.points}pts</span>` : '';

        div.innerHTML = `
            <div style="text-align:left;">
                <span class="ctx-word">${g.word}</span>
                ${ptsDisplay}
            </div>
            <span class="ctx-dist">#${g.distance}</span>
        `;
        list.appendChild(div);
    });

    if (data.win) {
        const winDiv = document.getElementById('contextoWinner');
        winDiv.classList.remove('hidden');
        winDiv.innerText = `¡ENCONTRADO! (+${data.points} pts)`;
        document.getElementById('revealSound').play().catch(()=>{});
    }
});

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