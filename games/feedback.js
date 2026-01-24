const fs = require('fs');
const path = require('path');

const FEEDBACK_FILE = path.join(__dirname, '../feedback.json');

module.exports = (io, socket) => {
    
    // 1. RECIBIR FEEDBACK (Ya lo tenías)
    socket.on('sendFeedback', (data) => {
        const entry = {
            date: new Date().toISOString(),
            ...data
        };

        // Leer archivo existente
        let history = [];
        try {
            if (fs.existsSync(FEEDBACK_FILE)) {
                const raw = fs.readFileSync(FEEDBACK_FILE);
                history = JSON.parse(raw);
            }
        } catch (e) { console.error("Error leyendo feedback", e); }

        history.push(entry);

        // Guardar
        fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(history, null, 2));
        console.log(`[FEEDBACK] Nuevo mensaje: ${data.type}`);
    });

    // 2. LEER FEEDBACK (NUEVO)
    socket.on('getFeedback', () => {
        try {
            if (fs.existsSync(FEEDBACK_FILE)) {
                const raw = fs.readFileSync(FEEDBACK_FILE);
                const history = JSON.parse(raw);
                // Enviamos el historial al usuario que lo pidió
                socket.emit('feedbackHistory', history.reverse()); // .reverse() para ver lo más nuevo primero
            } else {
                socket.emit('feedbackHistory', []);
            }
        } catch (e) {
            console.error("Error enviando feedback", e);
            socket.emit('feedbackHistory', []);
        }
    });
};