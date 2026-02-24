// games/beber.js
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../beber_database.json');

let beberData = {
    whitelist: [], // Lista de nombres contemplados
    records: []    // Historial de bebidas: { user, drink, date }
};

const loadData = () => {
    if (fs.existsSync(DB_FILE)) {
        try {
            const raw = fs.readFileSync(DB_FILE, 'utf8');
            if (raw) beberData = JSON.parse(raw);
        } catch (e) {
            console.error("[BEBER] Error DB:", e);
        }
    } else {
        saveData();
    }
};

const saveData = () => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(beberData, null, 2));
    } catch (e) { console.error(e); }
};

loadData();

module.exports = {
    init: (io) => {},
    handleSocket: (io, socket) => {
        socket.on('beber_requestData', () => {
            socket.emit('beber_data', beberData);
        });

        socket.on('beber_addDrink', (data) => {
            // data = { user, drink }
            beberData.records.push({
                user: data.user,
                drink: data.drink,
                date: new Date().toISOString()
            });
            saveData();
            io.emit('beber_data', beberData); // Actualiza a todos
        });

        socket.on('beber_addWhitelist', (data) => {
            if (data.admin.toLowerCase() !== 'administrador m') return;
            const name = data.name.trim();
            if (name && !beberData.whitelist.map(n=>n.toLowerCase()).includes(name.toLowerCase())) {
                beberData.whitelist.push(name);
                saveData();
                io.emit('beber_data', beberData);
            }
        });

        socket.on('beber_removeWhitelist', (data) => {
            if (data.admin.toLowerCase() !== 'administrador m') return;
            beberData.whitelist = beberData.whitelist.filter(n => n.toLowerCase() !== data.name.toLowerCase());
            saveData();
            io.emit('beber_data', beberData);
        });
    },
    getRooms: () => [] 
};