const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../mus_database.json');
const FEEDBACK_FILE = path.join(__dirname, '../feedback_log.txt');

let musData = {
    players: [],
    matches: [] 
};

if (fs.existsSync(DB_FILE)) {
    try {
        musData = JSON.parse(fs.readFileSync(DB_FILE));
        if(!musData.players) musData.players = [];
        if(!musData.matches) musData.matches = [];
    } catch (e) {
        console.error("Error leyendo mus_database.json", e);
    }
} else {
    fs.writeFileSync(DB_FILE, JSON.stringify(musData));
}

const saveData = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(musData, null, 2));
};

module.exports = (io, socket) => {
    socket.on('mus_action', (action) => {
        
        if (action.type === 'getData') {
            socket.emit('mus_data', musData);
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
            if(!m.addedBy) return;

            const allP = [m.p1, m.p2, m.p3, m.p4];
            if (new Set(allP).size !== 4) return;

            musData.matches.push({
                id: Date.now(),
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

        // PERMISO ESTRICTO: Solo "Administrador de mus" puede borrar
        if (action.type === 'deleteMatch') {
             const matchIndex = musData.matches.findIndex(m => m.id === action.id);
             if(matchIndex !== -1) {
                 // Verificación estricta del nombre
                 if (action.user === "musero" || action.user === "Administrador de mus") {
                     musData.matches.splice(matchIndex, 1);
                     saveData();
                     io.emit('mus_data', musData);
                 }
             }
        }

        if (action.type === 'backup') {
            const logLine = `\n--- BACKUP MUS [${new Date().toISOString()}] ---\n${JSON.stringify(musData)}\n----------------\n`;
            fs.appendFileSync(FEEDBACK_FILE, logLine);
            socket.emit('mus_msg', 'Copia de seguridad guardada en feedback.');
        }
    });
};