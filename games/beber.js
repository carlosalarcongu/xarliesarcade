const path = require('path');
const Database = require('better-sqlite3');

// Conectamos con la nueva base de datos
const db = new Database(path.join(__dirname, '../arcade.db'));

// Por seguridad, aseguramos que las tablas existan
db.exec(`
  CREATE TABLE IF NOT EXISTS beber_whitelist (name TEXT PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS beber_records (id TEXT PRIMARY KEY, user TEXT, drink TEXT, date TEXT);
`);

const isAdmin = (name) => {
    if (!name) return false;
    const lower = name.toLowerCase();
    return lower === 'administrador m' || lower === 'xarlie';
};

// Función auxiliar: lee la base de datos SQL y la empaqueta como la esperaba tu frontend
const getFullData = () => {
    const whitelist = db.prepare('SELECT name FROM beber_whitelist').all().map(row => row.name);
    const records = db.prepare('SELECT * FROM beber_records').all();
    return { whitelist, records };
};

module.exports = {
    init: (io) => {},
    handleSocket: (io, socket) => {
        
        socket.on('beber_requestData', () => {
            socket.emit('beber_data', getFullData());
        });

        socket.on('beber_addDrink', (data) => {
            const id = String(Date.now() + Math.floor(Math.random() * 100000));
            const date = new Date().toISOString();
            
            // Inserción profesional SQL
            const stmt = db.prepare('INSERT INTO beber_records (id, user, drink, date) VALUES (?, ?, ?, ?)');
            stmt.run(id, data.user, data.drink, date);
            
            io.emit('beber_data', getFullData());
        });

        socket.on('beber_deleteDrink', (data) => {
            if (!isAdmin(data.admin)) return;
            
            const stmt = db.prepare('DELETE FROM beber_records WHERE id = ?');
            stmt.run(String(data.id));
            
            io.emit('beber_data', getFullData());
        });

        socket.on('beber_addWhitelist', (data) => {
            if (!isAdmin(data.admin)) return;
            const name = data.name.trim();
            if (name) {
                const stmt = db.prepare('INSERT OR IGNORE INTO beber_whitelist (name) VALUES (?)');
                stmt.run(name);
                io.emit('beber_data', getFullData());
            }
        });

        socket.on('beber_removeWhitelist', (data) => {
            if (!isAdmin(data.admin)) return;
            
            const stmt = db.prepare('DELETE FROM beber_whitelist WHERE LOWER(name) = LOWER(?)');
            stmt.run(data.name);
            
            io.emit('beber_data', getFullData());
        });
    },
    getRooms: () => [] 
};