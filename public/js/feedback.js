app.feedback = {
    categoriesData: null,

    init: () => {
        // Pedir categorías al servidor al inicializar
        socket.emit('getCategories');
        app.feedback.renderForm();
    },

    populateCats: (dbObj) => {
        app.feedback.categoriesData = dbObj;
        const sel = document.getElementById('fbCategory'); // Asegúrate de tener un <select id="fbCategory"> en tu HTML
        if(sel && dbObj) {
            sel.innerHTML = '<option value="">-- Selecciona Categoría --</option>';
            Object.keys(dbObj).forEach(catKey => {
                const opt = document.createElement('option');
                opt.value = catKey;
                opt.textContent = dbObj[catKey].label || catKey;
                sel.appendChild(opt);
            });
        }
    },

    renderForm: () => {
        const typeSelect = document.getElementById('fbType');
        if(!typeSelect) return;
        const type = typeSelect.value;
        const wordForm = document.getElementById('fbWordForm');
        const stdForm = document.getElementById('fbStandardForm');

        if (type === 'newword') {
            if(wordForm) wordForm.classList.remove('hidden');
            if(stdForm) stdForm.classList.add('hidden');
        } else {
            if(wordForm) wordForm.classList.add('hidden');
            if(stdForm) stdForm.classList.remove('hidden');
        }
    },

    submit: () => {
        const type = document.getElementById('fbType').value;
        let content = {};

        if (type === 'newword') {
            const catSelect = document.getElementById('fbCategory') ? document.getElementById('fbCategory').value : '';
            const catNew = document.getElementById('fbNewCategory') ? document.getElementById('fbNewCategory').value.trim() : '';
            
            // Si el usuario ha escrito una categoría nueva, le damos prioridad. Si no, usamos la del desplegable.
            const cat = catNew !== "" ? catNew : catSelect;
            
            const w = document.getElementById('fbWord').value.trim();
            const h = document.getElementById('fbHint').value.trim();
            
            if (!cat) return alert("Por favor, selecciona una categoría o escribe una nueva.");
            if (!w) return alert("Escribe al menos la palabra.");
            
            content = { category: cat, word: w, hint: h };
        } else {
            const txt = document.getElementById('fbContent').value.trim();
            if (!txt) return alert("Escribe tu mensaje.");
            content = { text: txt };
        }

        // Enviamos al backend junto con el nombre del usuario
        socket.emit('sendFeedback', { 
            type: type, 
            content: content,
            author: app.myPlayerName || 'Anónimo'
        });
        
        // Limpiar inputs visuales
        if(document.getElementById('fbWord')) document.getElementById('fbWord').value = "";
        if(document.getElementById('fbHint')) document.getElementById('fbHint').value = "";
        if(document.getElementById('fbContent')) document.getElementById('fbContent').value = "";
        if(document.getElementById('fbNewCategory')) document.getElementById('fbNewCategory').value = "";
        if(document.getElementById('fbCategory')) document.getElementById('fbCategory').value = "";
        
        alert("¡Gracias por tu aporte! Lo revisaremos pronto. 🤠");
        app.goBackToHub(); // Cambia esto si tu función para volver al inicio se llama distinto
    },

    // --- FUNCIONES EXCLUSIVAS DE ADMINISTRADOR ---

    toggleReadMode: () => {
        const section = document.getElementById('feedbackReadSection');
        if (!section) return;

        const reqUser = app.myPlayerName ? app.myPlayerName.toLowerCase() : "";
        const isAdmin = ["musero", "xarlie", "administrador m"].includes(reqUser);
        
        if (!isAdmin) {
            return alert("Acceso denegado: Solo los administradores pueden ver el panel de Feedback.");
        }

        if (section.classList.contains('hidden')) {
            section.classList.remove('hidden');
            const list = document.getElementById('feedbackList');
            if(list) list.innerHTML = "<p style='color:#aaa; text-align:center;'>Cargando base de datos de feedback...</p>";
            // Pedimos los datos al backend
            socket.emit('getFeedback'); 
        } else {
            section.classList.add('hidden');
        }
    },

    renderAdminList: (history) => {
        const list = document.getElementById('feedbackList');
        if(!list) return;

        if (history.length === 0) {
            list.innerHTML = "<p style='text-align:center; color:#aaa;'>No hay feedback registrado en la base de datos.</p>";
            return;
        }

        let html = `<div style="display:flex; flex-direction:column; gap:10px; max-height: 60vh; overflow-y: auto;">`;
        
        history.forEach(item => {
            const d = new Date(item.date);
            const dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()<10?'0':''}${d.getMinutes()}`;
            
            let contentHtml = "";
            if (item.type === 'newword') {
                contentHtml = `
                    <div style="color:#74b9ff; font-size:0.8em; margin-bottom:5px;"><b>Categoría:</b> ${item.category || 'N/A'}</div>
                    <div style="color:#2ed573; font-size:1.3em; font-weight:bold;">${item.word}</div>
                    <div style="color:#aaa; font-style:italic; font-size:0.9em;">Pista: ${item.hint || 'Sin pista'}</div>
                `;
            } else {
                contentHtml = `
                    <div style="color:#eccc68; font-size:0.8em; margin-bottom:5px;"><b>Mensaje general</b></div>
                    <div style="color:#fff; background:#111; padding:10px; border-radius:5px; font-size:0.95em;">${item.text}</div>
                `;
            }

            html += `
            <div style="background:#2f3542; padding:15px; border-radius:8px; border-left:4px solid ${item.type === 'newword' ? '#2ed573' : '#eccc68'}; text-align:left;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #444; padding-bottom:5px;">
                    <span style="color:#f1c40f; font-weight:bold; font-size:1.1em;">👤 ${item.author}</span>
                    <span style="color:#888; font-size:0.75em;">${dateStr}</span>
                </div>
                ${contentHtml}
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px;">
                    <button onclick="app.feedback.editEntry('${item.id}', '${item.type}')" style="background:#3498db; padding:6px 12px; font-size:0.8em; border-radius:5px; border:none; color:white; cursor:pointer; font-weight:bold;">✏️ Editar</button>
                    <button onclick="app.feedback.deleteEntry('${item.id}')" style="background:#e74c3c; padding:6px 12px; font-size:0.8em; border-radius:5px; border:none; color:white; cursor:pointer; font-weight:bold;">🗑️ Borrar</button>
                </div>
            </div>`;
        });
        html += `</div>`;
        list.innerHTML = html;
    },

    deleteEntry: (id) => {
        if(confirm("¿Seguro que quieres borrar este feedback permanentemente de la base de datos?")) {
            socket.emit('deleteFeedback', { id, user: app.myPlayerName });
        }
    },

    editEntry: (id, type) => {
        let content = {};
        if (type === 'newword') {
            const cat = prompt("Editar Categoría (código ID):");
            if (cat === null) return;
            const word = prompt("Editar Palabra:");
            if (word === null) return;
            const hint = prompt("Editar Pista:");
            if (hint === null) return;
            content = { category: cat, word, hint };
        } else {
            const text = prompt("Editar el texto del mensaje:");
            if (text === null) return;
            content = { text };
        }

        socket.emit('editFeedback', { id, user: app.myPlayerName, content });
    }
};

// ==========================================
// RECEPTORES DE SOCKET.IO PARA FEEDBACK
// (Puedes poner estos dentro de la lógica principal de tu main.js donde tengas el resto de sockets)
// ==========================================

socket.on('categoriesList', (dbObj) => {
    app.feedback.populateCats(dbObj);
});

socket.on('feedbackHistory', (history) => {
    app.feedback.renderAdminList(history);
});