const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../arcade.db'));

const getFullMusData = () => {
    return {
        rooms: db.prepare('SELECT name FROM mus_rooms').all().map(r => r.name),
        players: db.prepare('SELECT name FROM mus_players ORDER BY name').all().map(p => p.name),
        matches: db.prepare('SELECT * FROM mus_matches').all()
    };
};

module.exports = {
    init: (io) => {},
    handleSocket: (io, socket) => {
        socket.on('mus_action', (action) => {
            if (action.type === 'getData') {
                socket.emit('mus_data', getFullMusData());
            }

            if (action.type === 'addRoom') {
                if (action.user !== 'musero') return socket.emit('mus_msg', 'Solo "musero" tiene permisos.');
                const r = action.value.trim();
                if (r) {
                    db.prepare('INSERT OR IGNORE INTO mus_rooms (name) VALUES (?)').run(r);
                    io.emit('mus_data', getFullMusData());
                }
            }

            if (action.type === 'addPlayer') {
                const name = action.value.trim();
                if (name) {
                    db.prepare('INSERT OR IGNORE INTO mus_players (name) VALUES (?)').run(name);
                    io.emit('mus_data', getFullMusData());
                }
            }

            if (action.type === 'addMatch') {
                const m = action.value;
                const id = String(Date.now());
                db.prepare('INSERT INTO mus_matches (id, roomId, p1, p2, p3, p4, s1, s2, date, addedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                  .run(id, m.roomId, m.p1, m.p2, m.p3, m.p4, parseInt(m.s1), parseInt(m.s2), new Date().toISOString(), m.addedBy);
                io.emit('mus_data', getFullMusData());
            }

            if (action.type === 'deleteMatch') {
                const match = db.prepare('SELECT addedBy FROM mus_matches WHERE id = ?').get(String(action.id));
                if (match) {
                    const reqUser = action.user ? action.user.toLowerCase() : "";
                    const isAdmin = ["musero", "xarlie", "administrador de mus", "administrador m"].includes(reqUser);
                    if (isAdmin || reqUser === (match.addedBy || "").toLowerCase()) {
                        db.prepare('DELETE FROM mus_matches WHERE id = ?').run(String(action.id));
                        io.emit('mus_data', getFullMusData());
                    } else {
                        socket.emit('mus_msg', 'No tienes permisos.');
                    }
                }
            }

            if (action.type === 'adminEditPlayer') {
                if (!['administrador m', 'xarlie', 'musero'].includes((action.user || "").toLowerCase())) return;
                const { oldName, newName } = action.value;
                
                db.prepare('UPDATE OR IGNORE mus_players SET name = ? WHERE name = ?').run(newName, oldName);
                db.prepare('UPDATE mus_matches SET p1 = ? WHERE p1 = ?').run(newName, oldName);
                db.prepare('UPDATE mus_matches SET p2 = ? WHERE p2 = ?').run(newName, oldName);
                db.prepare('UPDATE mus_matches SET p3 = ? WHERE p3 = ?').run(newName, oldName);
                db.prepare('UPDATE mus_matches SET p4 = ? WHERE p4 = ?').run(newName, oldName);
                
                io.emit('mus_data', getFullMusData());
            }

            if (action.type === 'adminDeletePlayer') {
                if (!['administrador m', 'xarlie', 'musero'].includes((action.user || "").toLowerCase())) return;
                db.prepare('DELETE FROM mus_players WHERE name = ?').run(action.value);
                io.emit('mus_data', getFullMusData());
            }

            if (action.type === 'adminEditMatch') {
                if (!['administrador m', 'xarlie', 'musero'].includes((action.user || "").toLowerCase())) return;
                const v = action.value;
                db.prepare('UPDATE mus_matches SET p1=?, p2=?, p3=?, p4=?, s1=?, s2=? WHERE id=?')
                  .run(v.p1, v.p2, v.p3, v.p4, parseInt(v.s1), parseInt(v.s2), String(v.id));
                io.emit('mus_data', getFullMusData());
            }
        });
    },
    getRooms: () => []
};