const fs = require('fs');
const path = require('path');
const database = require('./database'); // <--- IMPORTAMOS LA BASE DE DATOS

const FEEDBACK_FILE = path.join(__dirname, '../feedback.json');
const WORDS_FILE = path.join(__dirname, '../suggested_words.json');

module.exports = {
    init: (io, socket) => {
        // 1. NUEVO: Petición de categorías
        socket.on('getCategories', () => {
            socket.emit('categoriesList', database);
        });

        // 2. Guardar Feedback (Igual que antes)
        socket.on('sendFeedback', (data) => {
            const newEntry = { date: new Date().toISOString(), ...data };
            const targetFile = (data.type === 'newword') ? WORDS_FILE : FEEDBACK_FILE;

            fs.readFile(targetFile, (err, fileData) => {
                let json = [];
                if (!err && fileData.length > 0) try { json = JSON.parse(fileData); } catch(e) {}
                json.push(newEntry);
                fs.writeFile(targetFile, JSON.stringify(json, null, 2), (err) => {});
            });
        });
    }
};