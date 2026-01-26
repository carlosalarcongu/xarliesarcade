app.feedback = {
    init: () => {
        // Inicialización si fuera necesaria
        app.feedback.renderForm();
    },

    // Esta es la función que main.js intentaba llamar
    populateCats: () => {
        // Reseteamos el formulario al estado inicial
        const sel = document.getElementById('fbType');
        if(sel) sel.value = 'newword';
        app.feedback.renderForm();
    },

    renderForm: () => {
        const type = document.getElementById('fbType').value;
        const wordForm = document.getElementById('fbWordForm');
        const stdForm = document.getElementById('fbStandardForm');

        if (type === 'newword') {
            wordForm.classList.remove('hidden');
            stdForm.classList.add('hidden');
        } else {
            wordForm.classList.add('hidden');
            stdForm.classList.remove('hidden');
        }
    },

    submit: () => {
        const type = document.getElementById('fbType').value;
        let content = {};

        if (type === 'newword') {
            const w = document.getElementById('fbWord').value.trim();
            const h = document.getElementById('fbHint').value.trim();
            if (!w) return alert("Escribe al menos la palabra.");
            content = { word: w, hint: h };
        } else {
            const txt = document.getElementById('fbContent').value.trim();
            if (!txt) return alert("Escribe tu mensaje.");
            content = { text: txt };
        }

        // Enviamos al servidor (si tienes configurado un evento 'feedback' en server)
        // O simplemente un alert de gracias si es solo visual por ahora
        socket.emit('sendFeedback', { type, content });
        
        alert("¡Gracias por tu feedback! 🤠");
        
        // Limpiar inputs
        document.getElementById('fbWord').value = "";
        document.getElementById('fbHint').value = "";
        document.getElementById('fbContent').value = "";
        
        app.goBackToHub();
    },

    toggleReadMode: () => {
        const section = document.getElementById('feedbackReadSection');
        if (section.classList.contains('hidden')) {
            section.classList.remove('hidden');
            // Aquí podrías pedir al servidor la lista de feedback:
            // socket.emit('getFeedback'); 
            // Por ahora mostramos placeholder:
            const list = document.getElementById('feedbackList');
            list.innerHTML = "<li style='color:#aaa'>Cargando feedback... (Función servidor pendiente)</li>";
        } else {
            section.classList.add('hidden');
        }
    }
};