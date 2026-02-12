app.consejo = {
    names: [],

    init: () => {
        // Nada especial al iniciar, se gestiona con sockets
    },

    addName: () => {
        const inp = document.getElementById('consejoNameInput');
        const val = inp.value.trim();
        if (val) {
            socket.emit('consejo_action', { type: 'addName', value: val });
            inp.value = "";
            inp.focus();
        }
    },

    removeName: (name) => {
        socket.emit('consejo_action', { type: 'removeName', value: name });
    },

    spinQuestion: () => {
        const cat = document.getElementById('consejoTopicSelect').value;
        socket.emit('consejo_action', { type: 'spinQuestion', category: cat });
        
        // Animación visual
        const qCard = document.getElementById('consejoQuestionCard');
        const qText = document.getElementById('consejoQuestionText');
        document.getElementById('consejoResultArea').classList.remove('hidden');
        qCard.classList.remove('hidden');
        qText.style.opacity = 0;
        setTimeout(() => qText.style.opacity = 1, 200);
    },

    spinPlayer: () => {
        socket.emit('consejo_action', { type: 'spinPlayer' });
        
        // Animación visual
        const pCard = document.getElementById('consejoPlayerCard');
        document.getElementById('consejoResultArea').classList.remove('hidden');
        pCard.classList.remove('hidden');
    }
};

// --- LISTENERS ---

socket.on('consejoTopics', (list) => {
    const sel = document.getElementById('consejoTopicSelect');
    if (sel) {
        sel.innerHTML = list.map(t => `<option value="${t.id}">${t.label}</option>`).join('');
    }
});

socket.on('consejoUpdateNames', (list) => {
    const container = document.getElementById('consejoNamesList');
    if (container) {
        container.innerHTML = list.map(n => `
            <div style="background:#444; padding:5px 10px; border-radius:15px; font-size:0.9em; display:flex; align-items:center; gap:5px;">
                ${n} <span onclick="app.consejo.removeName('${n}')" style="cursor:pointer; color:#ff4757; font-weight:bold;">×</span>
            </div>
        `).join('');
    }
});

socket.on('consejoResult', (data) => {
    if (data.type === 'question') {
        const qText = document.getElementById('consejoQuestionText');
        qText.innerText = data.value;
        // Animación simple
        qText.style.transform = "scale(1.1)";
        setTimeout(() => qText.style.transform = "scale(1)", 200);
    }
    
    if (data.type === 'player') {
        const pText = document.getElementById('consejoPlayerText');
        
        // Efecto ruleta simple
        let i = 0;
        const interval = setInterval(() => {
            pText.style.opacity = 0.5;
            pText.innerText = ["🤔", "🎲", "🔥"][i % 3];
            i++;
        }, 100);

        setTimeout(() => {
            clearInterval(interval);
            pText.style.opacity = 1;
            pText.innerText = data.value;
            if(navigator.vibrate) navigator.vibrate(200);
        }, 600);
    }
});

// Listener para enter en el input de nombre
document.getElementById('consejoNameInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') app.consejo.addName();
});