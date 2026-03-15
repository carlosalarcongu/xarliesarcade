const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../arcade.db'));

function ensureColumn(tableName, columnName, type = 'TEXT') {
    try {
        const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
        if (!cols.find(c => c.name === columnName)) {
            db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${type}`).run();
        }
    } catch(e){}
}

db.prepare(`
    CREATE TABLE IF NOT EXISTS torneos (
        id TEXT PRIMARY KEY,
        creator TEXT, name TEXT, description TEXT,
        isPublicView INTEGER, viewWhitelist TEXT,
        isPublicEdit INTEGER, editWhitelist TEXT,
        format TEXT, pointsConfig TEXT, settings TEXT,
        participants TEXT, bracketData TEXT, matches TEXT
    )
`).run();
ensureColumn('torneos', 'settings', 'TEXT');

// MOTOR DE ELIMINATORIAS (Permite Byes Forzados)
function generateBracket(playersArray, hasThirdPlace, forcedByes = []) {
    let players = [...playersArray];
    if (forcedByes.length === 0) players.sort(() => Math.random() - 0.5); 
    
    let nextPowerOf2 = 2;
    while (nextPowerOf2 < players.length) nextPowerOf2 *= 2;
    const numByes = nextPowerOf2 - players.length;

    let byes = [];
    let round1Players = [];

    if (forcedByes.length > 0) {
        byes = [...forcedByes];
        round1Players = players.filter(p => !byes.includes(p));
        round1Players.sort(() => Math.random() - 0.5);
    } else {
        for(let i=0; i<numByes; i++) byes.push(players.pop());
        round1Players = players;
    }

    let rounds = [];
    let currentMatchId = 1;
    let round1 = { matches: [] };
    
    for (let i = 0; i < round1Players.length; i+=2) {
        round1.matches.push({ id: currentMatchId++, p1: round1Players[i], p2: round1Players[i+1], winner: null, nextMatchId: null });
    }
    rounds.push(round1);

    let previousRoundMatches = [...round1.matches];
    let allPendingFeeders = [...previousRoundMatches.map(m => m.id), ...byes.map(b => `BYE_${b}`)];
    
    while (allPendingFeeders.length > 1) {
        let newRound = { matches: [] };
        let nextFeeders = [];
        const isFinal = allPendingFeeders.length === 2;
        
        for (let i = 0; i < allPendingFeeders.length; i += 2) {
            const f1 = allPendingFeeders[i]; const f2 = allPendingFeeders[i+1];
            const match = {
                id: currentMatchId++, isFinal, isSemi: allPendingFeeders.length === 4,
                p1: typeof f1 === 'string' && f1.startsWith('BYE_') ? f1.split('_')[1] : '???',
                p2: typeof f2 === 'string' && f2.startsWith('BYE_') ? f2.split('_')[1] : '???',
                winner: null, nextMatchId: null
            };

            if (typeof f1 === 'number') { const prev = rounds.flatMap(r=>r.matches).find(m=>m.id===f1); if(prev) prev.nextMatchId = match.id; }
            if (typeof f2 === 'number') { const prev = rounds.flatMap(r=>r.matches).find(m=>m.id===f2); if(prev) prev.nextMatchId = match.id; }

            newRound.matches.push(match);
            nextFeeders.push(match.id);
        }
        rounds.push(newRound);
        allPendingFeeders = nextFeeders;
    }

    let thirdPlaceMatch = null;
    if (hasThirdPlace && rounds.length > 1) {
        thirdPlaceMatch = { id: currentMatchId++, isThirdPlace: true, p1: '???', p2: '???', winner: null };
    }

    return { rounds, champion: null, thirdPlaceMatch };
}

// LÓGICA DE REESCRITURA EN CASCADA SI SE MODIFICA UN PARTIDO PASADO
function cascadeClear(bracket, startMatchId) {
    const allMatches = [...bracket.rounds.flatMap(r=>r.matches)];
    if(bracket.thirdPlaceMatch) allMatches.push(bracket.thirdPlaceMatch);

    let toClear = [startMatchId];
    while(toClear.length > 0) {
        const currId = toClear.shift();
        const m = allMatches.find(x => x.id === currId);
        if (m) {
            if (m.nextMatchId) {
                const nextM = allMatches.find(x => x.id === m.nextMatchId);
                if(nextM) {
                    if (nextM.p1 === m.winner) nextM.p1 = '???';
                    if (nextM.p2 === m.winner) nextM.p2 = '???';
                    if (nextM.winner) { nextM.winner = null; toClear.push(nextM.id); }
                }
            }
            if (m.isSemi && bracket.thirdPlaceMatch) {
                const loser = m.winner === m.p1 ? m.p2 : m.p1;
                if (bracket.thirdPlaceMatch.p1 === loser) bracket.thirdPlaceMatch.p1 = '???';
                if (bracket.thirdPlaceMatch.p2 === loser) bracket.thirdPlaceMatch.p2 = '???';
                if (bracket.thirdPlaceMatch.winner) { bracket.thirdPlaceMatch.winner = null; }
            }
            if (m.isFinal) bracket.champion = null;
        }
    }
}

module.exports = {
    init: (io) => {},
    handleSocket: (io, socket) => {
        
        socket.on('torneos_checkPremium', (username, callback) => {
            const lowerName = (username || "").toLowerCase();
            if (['xarlie', 'administrador m', 'musero'].includes(lowerName)) return callback(true);
            const user = db.prepare('SELECT * FROM users WHERE username = ?').get(lowerName);
            callback(!!user);
        });

        socket.on('torneos_requestData', (username) => {
            const all = db.prepare('SELECT * FROM torneos').all();
            socket.emit('torneos_data', all); // Client filters view
        });

        socket.on('torneos_create', (p) => {
            const id = 'T_' + Date.now();
            const parts = p.participants.split(',').map(x=>x.trim()).filter(Boolean);
            const setts = JSON.stringify({ icon: p.icon, layout: p.layout, thirdPlace: p.thirdPlace });
            
            let bData = "{}";
            if (p.format === 'BRACKET') bData = JSON.stringify(generateBracket(parts, p.thirdPlace));

            const pts = JSON.stringify({ win: parseInt(p.ptsWin)||3, draw: parseInt(p.ptsDraw)||1, loss: parseInt(p.ptsLoss)||0 });

            db.prepare(`INSERT INTO torneos (id, creator, name, description, isPublicView, viewWhitelist, isPublicEdit, editWhitelist, format, pointsConfig, settings, participants, bracketData, matches)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, p.creator, p.name, p.description, p.isPublicView?1:0, JSON.stringify(p.viewWhitelist.split(',')), p.isPublicEdit?1:0, JSON.stringify(p.editWhitelist.split(',')), p.format, pts, setts, JSON.stringify(parts), bData, "[]");

            io.emit('torneos_forceRefresh');
        });

        socket.on('torneos_delete', (data) => {
            db.prepare('DELETE FROM torneos WHERE id = ?').run(data.id);
            io.emit('torneos_forceRefresh');
        });

        socket.on('torneos_randomize', (data) => {
            const t = db.prepare('SELECT * FROM torneos WHERE id = ?').get(data.id);
            if(t && t.format === 'BRACKET') {
                const setts = JSON.parse(t.settings);
                const bData = JSON.stringify(generateBracket(JSON.parse(t.participants), setts.thirdPlace));
                db.prepare('UPDATE torneos SET bracketData = ? WHERE id = ?').run(bData, t.id);
                io.emit('torneos_forceRefresh');
            }
        });

        socket.on('torneos_setByes', (data) => {
            const t = db.prepare('SELECT * FROM torneos WHERE id = ?').get(data.id);
            if(t && t.format === 'BRACKET') {
                const setts = JSON.parse(t.settings);
                const bData = JSON.stringify(generateBracket(JSON.parse(t.participants), setts.thirdPlace, data.byes));
                db.prepare('UPDATE torneos SET bracketData = ? WHERE id = ?').run(bData, t.id);
                io.emit('torneos_forceRefresh');
            }
        });

        socket.on('torneos_addResult', (p) => {
            const t = db.prepare('SELECT * FROM torneos WHERE id = ?').get(p.tournamentId);
            if (!t) return;

            if (t.format === 'LEAGUE') {
                let matches = JSON.parse(t.matches || "[]");
                matches.push({ p1: p.p1, p2: p.p2, s1: p.s1, s2: p.s2 });
                db.prepare('UPDATE torneos SET matches = ? WHERE id = ?').run(JSON.stringify(matches), t.id);
            } else {
                let bracket = JSON.parse(t.bracketData);
                let targetMatch = null;
                
                bracket.rounds.forEach(r => { const m = r.matches.find(x => String(x.id) === String(p.matchId)); if(m) targetMatch = m; });
                if (bracket.thirdPlaceMatch && String(bracket.thirdPlaceMatch.id) === String(p.matchId)) targetMatch = bracket.thirdPlaceMatch;

                if (targetMatch) {
                    if (targetMatch.winner) cascadeClear(bracket, targetMatch.id); // Si edita un pasado, limpiar adelante
                    
                    targetMatch.winner = p.winner;
                    const loser = targetMatch.p1 === p.winner ? targetMatch.p2 : targetMatch.p1;
                    
                    if (targetMatch.nextMatchId) {
                        bracket.rounds.forEach(r => {
                            const nextM = r.matches.find(x => x.id === targetMatch.nextMatchId);
                            if (nextM) { if (nextM.p1 === '???') nextM.p1 = p.winner; else nextM.p2 = p.winner; }
                        });
                    } else if (targetMatch.isFinal) bracket.champion = p.winner;
                    
                    if (targetMatch.isSemi && bracket.thirdPlaceMatch) {
                        if (bracket.thirdPlaceMatch.p1 === '???') bracket.thirdPlaceMatch.p1 = loser;
                        else bracket.thirdPlaceMatch.p2 = loser;
                    }
                    db.prepare('UPDATE torneos SET bracketData = ? WHERE id = ?').run(JSON.stringify(bracket), t.id);
                }
            }
            io.emit('torneos_forceRefresh');
        });
    }
};