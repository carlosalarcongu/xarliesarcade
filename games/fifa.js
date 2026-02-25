const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '../arcade.db'));
const FEEDBACK_FILE = path.join(__dirname, '../feedback_log.txt');

// 1. Crear las tablas si no existen
db.exec(`
    CREATE TABLE IF NOT EXISTS fifa_rooms (name TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS fifa_players (name TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS fifa_matches (
        id TEXT PRIMARY KEY, 
        roomId TEXT, 
        p1 TEXT, 
        p2 TEXT, 
        p3 TEXT, 
        p4 TEXT, 
        s1 INTEGER, 
        s2 INTEGER, 
        date TEXT, 
        addedBy TEXT
    );
`);

// 2. Insertar las salas por defecto si la base de datos es nueva
const insertRoom = db.prepare('INSERT OR IGNORE INTO fifa_rooms (name) VALUES (?)');
insertRoom.run("Copa Ourense");
insertRoom.run("Amistosos");

// 3. Función auxiliar para leer los datos y empaquetarlos como esperaba tu Frontend
const getFullFifaData = () => {
    return {
        rooms: db.prepare('SELECT name FROM fifa_rooms').all().map(r => r.name),
        players: db.prepare('SELECT name FROM fifa_players ORDER BY name').all().map(p => p.name),
        matches: db.prepare('SELECT * FROM fifa_matches').all()
    };
};

module.exports = (io, socket) => {
    socket.on('fifa_action', (action) => {
        
        if (action.type === 'getData') {
            socket.emit('fifa_data', getFullFifaData());
        }

        if (action.type === 'addRoom') {
            const r = action.value.trim();
            if (r) {
                db.prepare('INSERT OR IGNORE INTO fifa_rooms (name) VALUES (?)').run(r);
                io.emit('fifa_data', getFullFifaData());
            }
        }

        if (action.type === 'addPlayer') {
            const name = action.value.trim();
            if (name) {
                db.prepare('INSERT OR IGNORE INTO fifa_players (name) VALUES (?)').run(name);
                io.emit('fifa_data', getFullFifaData());
            }
        }

        if (action.type === 'addMatch') {
            const m = action.value;
            const id = String(Date.now());
            
            // Verificamos que la sala exista antes de insertar
            const roomExists = db.prepare('SELECT name FROM fifa_rooms WHERE name = ?').get(m.roomId);
            if (!roomExists) return;

            db.prepare('INSERT INTO fifa_matches (id, roomId, p1, p2, p3, p4, s1, s2, date, addedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .run(id, m.roomId, m.p1, m.p2 || '', m.p3, m.p4 || '', parseInt(m.s1), parseInt(m.s2), new Date().toISOString(), m.addedBy);
            
            io.emit('fifa_data', getFullFifaData());
        }

        if (action.type === 'deleteMatch') {
             if (action.user === "fifero" || action.user === "xarlie" || action.user === "administrador m") {
                 db.prepare('DELETE FROM fifa_matches WHERE id = ?').run(String(action.id));
                 io.emit('fifa_data', getFullFifaData());
             } else {
                 socket.emit('fifa_msg', 'No tienes permisos para borrar partidas.');
             }
        }

        if (action.type === 'backup') {
            const currentData = getFullFifaData();
            const line = `\n--- BACKUP FIFA ${new Date().toISOString()} ---\n${JSON.stringify(currentData)}\n`;
            try {
                fs.appendFileSync(FEEDBACK_FILE, line);
                socket.emit('fifa_msg', 'Backup FIFA OK guardado en logs.');
            } catch (e) {
                console.error("Error escribiendo backup:", e);
            }
        }
    });
};