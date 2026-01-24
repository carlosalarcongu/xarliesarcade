const fs = require('fs');
const path = require('path');
const database = require('./database'); // <--- IMPORTANTE: Importar la base de datos de palabras

const FEEDBACK_FILE = path.join(__dirname, '../feedback.json');

module.exports = (io, socket) => {
    
    // 1. ENVIAR LISTA DE CATEGORÍAS AL CLIENTE (NUEVO)
    socket.on('getCategories', () => {
        // Enviamos la base de datos de palabras para que el usuario elija categoría
        // database tiene la estructura: { "CAT_KEY": { label: "Nombre", words: [] } }
        socket.emit('categoriesList', database);
    });

    // 2. RECIBIR FEEDBACK
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

    // 3. LEER FEEDBACK (HISTORIAL)
    socket.on('getFeedback', () => {
        try {
            if (fs.existsSync(FEEDBACK_FILE)) {
                const raw = fs.readFileSync(FEEDBACK_FILE);
                const history = JSON.parse(raw);
                // Enviamos el historial al usuario que lo pidió
                socket.emit('feedbackHistory', history.reverse()); 
            } else {
                socket.emit('feedbackHistory', []);
            }
        } catch (e) {
            console.error("Error enviando feedback", e);
            socket.emit('feedbackHistory', []);
        }
    });
};