const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../arcade.db'));

// Asegurarnos de que la tabla existe en la base de datos
db.prepare(`
    CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY,
        author TEXT,
        type TEXT,
        category TEXT,
        word TEXT,
        hint TEXT,
        text TEXT,
        date TEXT
    )
`).run();

const database = require('./database'); // Tu base de datos de palabras del Impostor

module.exports = {
    init: (io) => {},
    handleSocket: (io, socket) => {
        
        // 1. Enviar las categorías al cliente para el desplegable
        socket.on('getCategories', () => {
            socket.emit('categoriesList', database);
        });

        // 2. Guardar un nuevo feedback en la BD
        socket.on('sendFeedback', (data) => {
            const id = String(Date.now());
            const date = new Date().toISOString();
            
            db.prepare(`
                INSERT INTO feedback (id, author, type, category, word, hint, text, date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                id, 
                data.author || 'Anónimo', 
                data.type, 
                data.content.category || '',
                data.content.word || '',
                data.content.hint || '',
                data.content.text || '',
                date
            );
            
            console.log(`[FEEDBACK] Nuevo aporte de ${data.author || 'Anónimo'}: ${data.type}`);
        });

        // 3. Leer historial (Solo lectura para admins en el Front)
        socket.on('getFeedback', () => {
            const history = db.prepare('SELECT * FROM feedback ORDER BY date DESC').all();
            socket.emit('feedbackHistory', history);
        });

        // 4. Eliminar Feedback (Solo Admins)
        socket.on('deleteFeedback', (data) => {
            const { id, user } = data;
            const reqUser = user ? user.toLowerCase() : "";
            const isAdmin = ["musero", "xarlie", "administrador m"].includes(reqUser);
            
            if (isAdmin) {
                db.prepare('DELETE FROM feedback WHERE id = ?').run(id);
                // Refrescar la lista a todos los conectados en la vista admin
                const history = db.prepare('SELECT * FROM feedback ORDER BY date DESC').all();
                io.emit('feedbackHistory', history);
            }
        });

        // 5. Editar Feedback (Solo Admins)
        socket.on('editFeedback', (data) => {
            const { id, user, content } = data;
            const reqUser = user ? user.toLowerCase() : "";
            const isAdmin = ["musero", "xarlie", "administrador m"].includes(reqUser);
            
            if (isAdmin) {
                db.prepare(`
                    UPDATE feedback 
                    SET category = ?, word = ?, hint = ?, text = ?
                    WHERE id = ?
                `).run(
                    content.category || '',
                    content.word || '',
                    content.hint || '',
                    content.text || '',
                    id
                );
                // Refrescar la lista
                const history = db.prepare('SELECT * FROM feedback ORDER BY date DESC').all();
                io.emit('feedbackHistory', history);
            }
        });
    }
};