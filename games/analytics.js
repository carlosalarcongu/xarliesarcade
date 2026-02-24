// games/analytics.js
const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, '../analytics_database.json');

let analyticsData = {};

const loadData = () => {
    if (fs.existsSync(DB_FILE)) {
        try {
            analyticsData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        } catch (e) {}
    } else {
        saveData();
    }
};

const saveData = () => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(analyticsData, null, 2));
    } catch (e) {}
};

loadData();

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

module.exports = {
    init: (io) => {},
    handleSocket: (io, socket) => {
        socket.on('registerVisit', (name) => {
            const week = getWeekNumber(new Date());
            if(!analyticsData[week]) analyticsData[week] = [];
            
            const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
            const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';
            const socketId = socket.id;
            const connectionTime = new Date().toISOString();

            const record = analyticsData[week].find(r => r.name === name);
            if (record) {
                record.visits++;
                record.lastVisit = connectionTime;
                record.lastIp = ip;
                record.lastSocketId = socketId;
                record.userAgent = userAgent;
            } else {
                analyticsData[week].push({
                    name: name,
                    visits: 1,
                    firstVisit: connectionTime,
                    lastVisit: connectionTime,
                    lastIp: ip,
                    lastSocketId: socketId,
                    userAgent: userAgent
                });
            }
            saveData();
        });
    },
    getRooms: () => []
};