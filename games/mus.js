const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../mus_database.json');
const FEEDBACK_FILE = path.join(__dirname, '../feedback_log.txt');

let musData = {
    rooms: ["Entre Nosotros (Las monjas)"],
    players: [],
    matches: []
};

const loadData = () => {
    if (fs.existsSync(DB_FILE)) {
        try {
            const raw = fs.readFileSync(DB_FILE, 'utf8');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (!parsed.rooms) {
                    parsed.rooms = ["Entre Nosotros (Las monjas)"];
                    if (parsed.matches) {
                        parsed.matches.forEach(m => {
                            if (!m.roomId) m.roomId = "Entre Nosotros (Las monjas)";
                        });
                    }
                    musData = parsed;
                    saveData();
                } else {
                    musData = parsed;
                }
            }
        } catch (e) {
            console.error("[MUS] Error DB:", e);
        }
    } else {
        saveData();
    }
};

const saveData = () => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(musData, null, 2));
    } catch (e) {}
};

loadData();

let fsWait = false;
fs.watch(DB_FILE, (event, filename) => {
    if (filename && !fsWait) {
        fsWait = setTimeout(() => { fsWait = false; }, 100);
        loadData();
    }
});

module.exports = {
    init: (io) => {},
    handleSocket: (io, socket) => {
        socket.on('mus_action', (action) => {
            if (action.type === 'getData') {
                socket.emit('mus_data', musData);
            }

            if (action.type === 'addRoom') {
                if (action.user !== 'musero') {
                    socket.emit('mus_msg', 'Solo "musero" tiene permisos para crear salas nuevas.');
                    return;
                }
                const r = action.value.trim();
                if (r && !musData.rooms.includes(r)) {
                    musData.rooms.push(r);
                    saveData();
                    io.emit('mus_data', musData);
                }
            }

            if (action.type === 'addPlayer') {
                const name = action.value.trim();
                if (!musData.players.includes(name)) {
                    musData.players.push(name);
                    musData.players.sort();
                    saveData();
                    io.emit('mus_data', musData);
                }
            }

            if (action.type === 'addMatch') {
                const m = action.value;
                if (!musData.rooms.includes(m.roomId)) return;

                musData.matches.push({
                    id: Date.now(),
                    roomId: m.roomId,
                    p1: m.p1, p2: m.p2, 
                    p3: m.p3, p4: m.p4, 
                    s1: parseInt(m.s1), 
                    s2: parseInt(m.s2), 
                    date: new Date().toISOString(),
                    addedBy: m.addedBy 
                });
                saveData();
                io.emit('mus_data', musData);
            }

            if (action.type === 'deleteMatch') {
                const idx = musData.matches.findIndex(m => m.id === action.id);
                if(idx !== -1) {
                    const match = musData.matches[idx];
                    const reqUser = action.user ? action.user.toLowerCase() : "";
                    const addedByUser = match.addedBy ? match.addedBy.toLowerCase() : "";
                    
                    const isAdmin = reqUser === "musero" || reqUser === "xarlie" || reqUser === "administrador de mus" || reqUser === "administrador m";
                    const isOwner = reqUser !== "" && reqUser === addedByUser;

                    if (isAdmin || isOwner) {
                        musData.matches.splice(idx, 1);
                        saveData();
                        io.emit('mus_data', musData);
                    } else {
                        socket.emit('mus_msg', 'No tienes permisos para borrar esta partida.');
                    }
                }
            }

            if (action.type === 'adminEditPlayer') {
                const reqUser = action.user ? action.user.toLowerCase() : "";
                if (reqUser !== 'administrador m') return;
                const { oldName, newName } = action.value;
                
                const idx = musData.players.indexOf(oldName);
                if (idx !== -1) {
                    musData.players[idx] = newName;
                } else if (!musData.players.includes(newName)) {
                    musData.players.push(newName);
                }
                
                musData.matches.forEach(m => {
                    if (m.p1 === oldName) m.p1 = newName;
                    if (m.p2 === oldName) m.p2 = newName;
                    if (m.p3 === oldName) m.p3 = newName;
                    if (m.p4 === oldName) m.p4 = newName;
                });
                
                musData.players.sort();
                saveData(); 
                io.emit('mus_data', musData);
            }

            if (action.type === 'adminDeletePlayer') {
                const reqUser = action.user ? action.user.toLowerCase() : "";
                if (reqUser !== 'administrador m') return;
                const name = action.value;
                musData.players = musData.players.filter(p => p !== name);
                saveData(); 
                io.emit('mus_data', musData);
            }

            if (action.type === 'adminEditMatch') {
                const reqUser = action.user ? action.user.toLowerCase() : "";
                if (reqUser !== 'administrador m') return;
                const m = musData.matches.find(x => x.id === action.value.id);
                if (m) {
                    m.p1 = action.value.p1; m.p2 = action.value.p2;
                    m.p3 = action.value.p3; m.p4 = action.value.p4;
                    m.s1 = parseInt(action.value.s1); 
                    m.s2 = parseInt(action.value.s2);
                    saveData(); 
                    io.emit('mus_data', musData);
                }
            }

            if (action.type === 'backup') {
                const line = `\n--- BACKUP MUS ${new Date().toISOString()} ---\n${JSON.stringify(musData)}\n`;
                fs.appendFileSync(FEEDBACK_FILE, line);
                socket.emit('mus_msg', 'Backup OK guardado en logs.');
            }
        });
    },
    getRooms: () => []
};