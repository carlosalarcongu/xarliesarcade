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
        const getIp = () => {
            const forwarded = socket.handshake.headers['x-forwarded-for'];
            return forwarded ? forwarded.split(',')[0].trim() : socket.handshake.address;
        };

        socket.on('registerVisit', (name) => {
            if (!name) return;
            const week = getWeekNumber(new Date());
            if(!analyticsData[week]) analyticsData[week] = [];
            
            const ip = getIp();
            const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';
            const connectionTime = new Date().toISOString();

            let record = analyticsData[week].find(r => r.name === name);
            if (record) {
                record.visits++;
                record.lastVisit = connectionTime;
                record.userAgent = userAgent;
                
                if (!record.ips) {
                    record.ips = record.lastIp ? [record.lastIp] : [];
                }
                if (!record.ips.includes(ip)) {
                    record.ips.push(ip);
                }
                
                if (!record.recentRooms) record.recentRooms = [];

            } else {
                analyticsData[week].push({
                    name: name,
                    visits: 1,
                    firstVisit: connectionTime,
                    lastVisit: connectionTime,
                    ips: [ip],
                    userAgent: userAgent,
                    recentRooms: []
                });
            }
            saveData();
        });

        const registerRoom = (name, room) => {
            if (!name || !room) return;
            const week = getWeekNumber(new Date());
            if(!analyticsData[week]) return;

            let record = analyticsData[week].find(r => r.name === name);
            if (record) {
                if (!record.recentRooms) record.recentRooms = [];
                
                if (record.recentRooms[0] !== room) {
                    record.recentRooms.unshift(room);
                    if (record.recentRooms.length > 10) {
                        record.recentRooms = record.recentRooms.slice(0, 10);
                    }
                    saveData();
                }
            }
        };

        socket.on('joinRoom', ({ name, room }) => registerRoom(name, room));
        socket.on('registerRoomVisit', ({ name, room }) => registerRoom(name, room));
    },
    getRooms: () => []
};