const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../mus_database.json');
const FEEDBACK_FILE = path.join(__dirname, '../feedback_log.txt');

// Estructura por defecto
let musData = {
    rooms: ["Entre Nosotros (Las monjas)"],
    players: [],
    matches: [] // Ahora cada match tendrá una propiedad "roomId"
};

const loadData = () => {
    if (fs.existsSync(DB_FILE)) {
        try {
            const raw = fs.readFileSync(DB_FILE, 'utf8');
            if (raw) {
                const parsed = JSON.parse(raw);
                
                // --- MIGRACIÓN DE DATOS ANTIGUOS ---
                // Si no hay array de rooms, es la versión vieja.
                if (!parsed.rooms) {
                    console.log("[MUS] Migrando base de datos a sistema de salas...");
                    parsed.rooms = ["Entre Nosotros (Las monjas)"];
                    // Asignar sala por defecto a todas las partidas antiguas
                    if (parsed.matches) {
                        parsed.matches.forEach(m => {
                            if (!m.roomId) m.roomId = "Entre Nosotros (Las monjas)";
                        });
                    }
                    musData = parsed;
                    saveData(); // Guardar estructura nueva
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
    } catch (e) { console.error(e); }
};

// Carga inicial
loadData();

// Watcher
let fsWait = false;
fs.watch(DB_FILE, (event, filename) => {
    if (filename && !fsWait) {
        fsWait = setTimeout(() => { fsWait = false; }, 100);
        console.log(`[MUS] DB cambiada externamente.`);
        loadData();
        // Nota: io se pasa en el export, aquí no lo tenemos accesible globalmente
        // pero como module.exports es una función, el socket lo maneja abajo.
    }
});

module.exports = (io, socket) => {
    
    // Al conectar o cambiar algo fuera, emitimos a todos (si se llamara desde watcher)
    // Para simplificar, el watcher recarga RAM. El cliente pide datos al entrar.

    socket.on('mus_action', (action) => {
        
        if (action.type === 'getData') {
            socket.emit('mus_data', musData);
        }

        if (action.type === 'addRoom') {
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
            // Validar que la sala exista o sea la default
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
                 if (action.user === "musero" || action.user === "Xarlie") {
                     musData.matches.splice(idx, 1);
                     saveData();
                     io.emit('mus_data', musData);
                 }
             }
        }

        if (action.type === 'backup') {
            const line = `\n--- BACKUP MUS ${new Date().toISOString()} ---\n${JSON.stringify(musData)}\n`;
            fs.appendFileSync(FEEDBACK_FILE, line);
            socket.emit('mus_msg', 'Backup OK');
        }
    });
};