const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../arcade.db'));

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

const getFullAnalytics = () => {
    const rows = db.prepare('SELECT * FROM analytics').all();
    const result = {};
    rows.forEach(r => {
        if (!result[r.week]) result[r.week] = [];
        result[r.week].push({
            name: r.name,
            visits: r.visits,
            firstVisit: r.firstVisit,
            lastVisit: r.lastVisit,
            ips: JSON.parse(r.ips),
            userAgent: r.userAgent,
            recentRooms: JSON.parse(r.recentRooms)
        });
    });
    return result;
};

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
            const ip = getIp();
            const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';
            const now = new Date().toISOString();

            const record = db.prepare('SELECT * FROM analytics WHERE week = ? AND name = ?').get(week, name);

            if (record) {
                const ips = JSON.parse(record.ips);
                if (!ips.includes(ip)) ips.push(ip);
                
                db.prepare('UPDATE analytics SET visits = visits + 1, lastVisit = ?, ips = ?, userAgent = ? WHERE week = ? AND name = ?')
                  .run(now, JSON.stringify(ips), userAgent, week, name);
            } else {
                db.prepare('INSERT INTO analytics (week, name, visits, firstVisit, lastVisit, ips, userAgent, recentRooms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                  .run(week, name, 1, now, now, JSON.stringify([ip]), userAgent, JSON.stringify([]));
            }
        });

        const registerRoom = (name, room) => {
            if (!name || !room) return;
            const week = getWeekNumber(new Date());
            const record = db.prepare('SELECT recentRooms FROM analytics WHERE week = ? AND name = ?').get(week, name);
            
            if (record) {
                let rooms = JSON.parse(record.recentRooms);
                if (rooms[0] !== room) {
                    rooms.unshift(room);
                    if (rooms.length > 10) rooms = rooms.slice(0, 10);
                    db.prepare('UPDATE analytics SET recentRooms = ? WHERE week = ? AND name = ?').run(JSON.stringify(rooms), week, name);
                }
            }
        };

        socket.on('joinRoom', ({ name, room }) => registerRoom(name, room));
        socket.on('registerRoomVisit', ({ name, room }) => registerRoom(name, room));

        socket.on('analytics_requestData', (data) => {
            if (!data || !data.admin) return;
            const adminLower = data.admin.toLowerCase();
            if (adminLower === 'administrador m' || adminLower === 'xarlie') {
                socket.emit('analytics_data', getFullAnalytics());
            }
        });

        // --- BORRAR REGISTROS DE ANALYTICS ---
        socket.on('analytics_deleteRecord', (data) => {
            if (!data || !data.admin) return;
            const adminLower = data.admin.toLowerCase();
            
            if (['administrador m', 'xarlie'].includes(adminLower)) {
                if (data.type === 'last') {
                    // Borra solo el registro más reciente de ese usuario específico
                    db.prepare('DELETE FROM analytics WHERE name = ? AND week = (SELECT MAX(week) FROM analytics WHERE name = ?)').run(data.name, data.name);
                } else if (data.type === 'all') {
                    // Borra absolutamente todo el historial de ese usuario
                    db.prepare('DELETE FROM analytics WHERE name = ?').run(data.name);
                }
                
                socket.emit('analytics_data', getFullAnalytics());
            }
        });
    },
    getRooms: () => []
};