const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../fifa_database.json');
const FEEDBACK_FILE = path.join(__dirname, '../feedback_log.txt');

let fifaData = {
    rooms: ["Copa Ourense", "Amistosos"],
    players: [],
    matches: []
};

const loadData = () => {
    if (fs.existsSync(DB_FILE)) {
        try {
            const raw = fs.readFileSync(DB_FILE, 'utf8');
            if (raw) fifaData = JSON.parse(raw);
        } catch (e) { console.error("[FIFA] Error DB:", e); }
    } else {
        saveData();
    }
};

const saveData = () => {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(fifaData, null, 2)); } catch (e) { console.error(e); }
};

loadData();

module.exports = (io, socket) => {
    socket.on('fifa_action', (action) => {
        
        if (action.type === 'getData') {
            socket.emit('fifa_data', fifaData);
        }

        if (action.type === 'addRoom') {
            const r = action.value.trim();
            if (r && !fifaData.rooms.includes(r)) {
                fifaData.rooms.push(r);
                saveData();
                io.emit('fifa_data', fifaData);
            }
        }

        if (action.type === 'addPlayer') {
            const name = action.value.trim();
            if (!fifaData.players.includes(name)) {
                fifaData.players.push(name);
                fifaData.players.sort();
                saveData();
                io.emit('fifa_data', fifaData);
            }
        }

        if (action.type === 'addMatch') {
            const m = action.value;
            if (!fifaData.rooms.includes(m.roomId)) return;

            fifaData.matches.push({
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
            io.emit('fifa_data', fifaData);
        }

        if (action.type === 'deleteMatch') {
             const idx = fifaData.matches.findIndex(m => m.id === action.id);
             if(idx !== -1) {
                 if (action.user === "fifero" || action.user === "xarlie") { // Personaliza tus admins aquí
                     fifaData.matches.splice(idx, 1);
                     saveData();
                     io.emit('fifa_data', fifaData);
                 }
             }
        }

        if (action.type === 'backup') {
            const line = `\n--- BACKUP FIFA ${new Date().toISOString()} ---\n${JSON.stringify(fifaData)}\n`;
            fs.appendFileSync(FEEDBACK_FILE, line);
            socket.emit('fifa_msg', 'Backup FIFA OK');
        }
    });
};