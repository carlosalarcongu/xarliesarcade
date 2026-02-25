// games/beber.js
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../beber_database.json');

let beberData = {
    whitelist: [],
    records: []
};

const loadData = () => {
    if (fs.existsSync(DB_FILE)) {
        try {
            const raw = fs.readFileSync(DB_FILE, 'utf8');
            if (raw) beberData = JSON.parse(raw);
            
            let changed = false;
            beberData.records.forEach(r => {
                if (!r.id) {
                    r.id = Date.now() + Math.floor(Math.random() * 100000);
                    changed = true;
                }
            });
            if (changed) saveData();
            
        } catch (e) {}
    } else {
        saveData();
    }
};

const saveData = () => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(beberData, null, 2));
    } catch (e) {}
};

loadData();

const isAdmin = (name) => {
    if (!name) return false;
    const lower = name.toLowerCase();
    return lower === 'administrador m' || lower === 'xarlie';
};

module.exports = {
    init: (io) => {},
    handleSocket: (io, socket) => {
        socket.on('beber_requestData', () => {
            socket.emit('beber_data', beberData);
        });

        socket.on('beber_addDrink', (data) => {
            beberData.records.push({
                id: Date.now() + Math.floor(Math.random() * 100000),
                user: data.user,
                drink: data.drink,
                date: new Date().toISOString()
            });
            saveData();
            io.emit('beber_data', beberData);
        });

        socket.on('beber_deleteDrink', (data) => {
            if (!isAdmin(data.admin)) return;
            beberData.records = beberData.records.filter(r => String(r.id) !== String(data.id));
            saveData();
            io.emit('beber_data', beberData);
        });

        socket.on('beber_addWhitelist', (data) => {
            if (!isAdmin(data.admin)) return;
            const name = data.name.trim();
            if (name && !beberData.whitelist.map(n=>n.toLowerCase()).includes(name.toLowerCase())) {
                beberData.whitelist.push(name);
                saveData();
                io.emit('beber_data', beberData);
            }
        });

        socket.on('beber_removeWhitelist', (data) => {
            if (!isAdmin(data.admin)) return;
            beberData.whitelist = beberData.whitelist.filter(n => n.toLowerCase() !== data.name.toLowerCase());
            saveData();
            io.emit('beber_data', beberData);
        });
    },
    getRooms: () => [] 
};