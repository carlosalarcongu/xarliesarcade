const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../arcade.db'));

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

function getCategoriesFromDB() {
    const rows = db.prepare(`SELECT DISTINCT categoria, aux1 FROM impostor_data`).all();
    let categories = { "MIX": { label: "🎲 Aleatorio (Mix)" } };
    rows.forEach(r => {
        categories[r.categoria] = { label: r.aux1 || r.categoria };
    });
    return categories;
}

module.exports = {
    init: (io) => {},
    handleSocket: (io, socket) => {
        
        socket.on('getCategories', () => {
            socket.emit('categoriesList', getCategoriesFromDB());
        });

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
        });

        socket.on('getFeedback', () => {
            const history = db.prepare('SELECT * FROM feedback ORDER BY date DESC').all();
            socket.emit('feedbackHistory', history);
        });

        socket.on('deleteFeedback', (data) => {
            const { id, user } = data;
            const reqUser = user ? user.toLowerCase() : "";
            const isAdmin = ["musero", "xarlie", "administrador m"].includes(reqUser);
            
            if (isAdmin) {
                db.prepare('DELETE FROM feedback WHERE id = ?').run(id);
                const history = db.prepare('SELECT * FROM feedback ORDER BY date DESC').all();
                io.emit('feedbackHistory', history);
            }
        });

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
                const history = db.prepare('SELECT * FROM feedback ORDER BY date DESC').all();
                io.emit('feedbackHistory', history);
            }
        });
    }
};