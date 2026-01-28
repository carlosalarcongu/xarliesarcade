const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../mus_database.json');
const FEEDBACK_FILE = path.join(__dirname, '../feedback_log.txt');

// Estructura inicial
let musData = {
    players: [],
    matches: [] 
    // match structure: { id, p1, p2, p3, p4, s1, s2, date, addedBy } 
};

// Cargar datos al iniciar
if (fs.existsSync(DB_FILE)) {
    try {
        musData = JSON.parse(fs.readFileSync(DB_FILE));
        // Migración simple si faltan campos
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
        
        // 1. Obtener datos
        if (action.type === 'getData') {
            socket.emit('mus_data', musData);
        }

        // 2. Añadir Jugador
        if (action.type === 'addPlayer') {
            const name = action.value.trim();
            if (!musData.players.includes(name)) {
                musData.players.push(name);
                musData.players.sort(); // Orden alfabético
                saveData();
                io.emit('mus_data', musData); // Actualizar a todos
            }
        }

        // 3. Añadir Partida (CON LOGIN)
        if (action.type === 'addMatch') {
            const m = action.value;
            
            // Validación de autor
            if(!m.addedBy) return;

            // Validar que no se repitan jugadores
            const allP = [m.p1, m.p2, m.p3, m.p4];
            if (new Set(allP).size !== 4) return; // Duplicados

            musData.matches.push({
                id: Date.now(),
                p1: m.p1, p2: m.p2, // Pareja 1
                p3: m.p3, p4: m.p4, // Pareja 2
                s1: parseInt(m.s1), // Score 1
                s2: parseInt(m.s2), // Score 2
                date: new Date().toISOString(),
                addedBy: m.addedBy // Autor del registro
            });
            saveData();
            io.emit('mus_data', musData);
        }

        // 4. Borrar Partida (Solo Admin o Autor)
        if (action.type === 'deleteMatch') {
             const matchIndex = musData.matches.findIndex(m => m.id === action.id);
             if(matchIndex !== -1) {
                 const match = musData.matches[matchIndex];
                 // Permitir si es admin (action.isAdmin) o si es el autor
                 if (action.isAdmin || match.addedBy === action.user) {
                     musData.matches.splice(matchIndex, 1);
                     saveData();
                     io.emit('mus_data', musData);
                 }
             }
        }

        // 5. Backup
        if (action.type === 'backup') {
            const logLine = `\n--- BACKUP MUS [${new Date().toISOString()}] ---\n${JSON.stringify(musData)}\n----------------\n`;
            fs.appendFileSync(FEEDBACK_FILE, logLine);
            socket.emit('mus_msg', 'Copia de seguridad guardada en feedback.');
        }
    });
};