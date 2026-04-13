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
            const setts = JSON.stringify({ icon: p.icon, layout: p.layout, thirdPlace: p.thirdPlace, numGroups: p.numGroups, advanceMethod: p.advanceMethod, playersPerGroup: p.playersPerGroup });
            
            let bData = "{}";
            if (p.format === 'BRACKET') bData = JSON.stringify(generateBracket(parts, p.thirdPlace));
            if (p.format === 'GROUPS_BRACKET') {
                // For groups, create groups data
                const numGroups = parseInt(p.numGroups) || 2;
                const playersPerGroup = parseInt(p.playersPerGroup) || 4;
                const groups = [];
                const shuffled = [...parts].sort(() => Math.random() - 0.5);
                for (let i = 0; i < numGroups; i++) {
                    const groupPlayers = shuffled.slice(i * playersPerGroup, (i + 1) * playersPerGroup);
                    // Generate round-robin matches
                    const matches = [];
                    for (let j = 0; j < groupPlayers.length; j++) {
                        for (let k = j + 1; k < groupPlayers.length; k++) {
                            matches.push({ p1: groupPlayers[j], p2: groupPlayers[k], s1: 0, s2: 0 });
                        }
                    }
                    groups.push({ id: `Group ${String.fromCharCode(65 + i)}`, players: groupPlayers, matches: matches });
                }
                bData = JSON.stringify({ phase: 'GROUPS', groups: groups, bracket: null });
            }

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

        socket.on('torneos_advanceToBracket', (data) => {
            const t = db.prepare('SELECT * FROM torneos WHERE id = ?').get(data.id);
            if(t && t.format === 'GROUPS_BRACKET') {
                const bData = JSON.parse(t.bracketData);
                if (bData.phase !== 'GROUPS') return;
                
                const settings = JSON.parse(t.settings);
                const advanceMethod = settings.advanceMethod;
                
                // Calculate standings for each group
                const groups = bData.groups;
                const advancingPlayers = [];
                
                groups.forEach(group => {
                    const players = group.players;
                    const matches = group.matches || [];
                    const standings = players.map(p => ({ name: p, pts: 0, w: 0, d: 0, l: 0, pf: 0, pc: 0 }));
                    
                    matches.forEach(m => {
                        const p1 = standings.find(s => s.name === m.p1);
                        const p2 = standings.find(s => s.name === m.p2);
                        if (p1 && p2) {
                            p1.pf += m.s1; p1.pc += m.s2;
                            p2.pf += m.s2; p2.pc += m.s1;
                            if (m.s1 > m.s2) { p1.w++; p1.pts += 3; p2.l++; }
                            else if (m.s1 < m.s2) { p2.w++; p2.pts += 3; p1.l++; }
                            else { p1.d++; p2.d++; p1.pts += 1; p2.pts += 1; }
                        }
                    });
                    
                    standings.sort((a, b) => b.pts - a.pts || (b.pf - b.pc) - (a.pf - a.pc));
                    advancingPlayers.push(...standings.slice(0, 2).map(s => s.name)); // Top 2
                });
                
                // Now, based on advanceMethod, order them
                let bracketPlayers = [];
                if (advanceMethod === 'ORDER') {
                    // For 2 groups: A1 vs B2, A2 vs B1
                    const a = advancingPlayers.slice(0, 2);
                    const b = advancingPlayers.slice(2, 4);
                    bracketPlayers = [a[0], b[1], a[1], b[0]];
                } else if (advanceMethod === 'RANDOM') {
                    bracketPlayers = advancingPlayers.sort(() => Math.random() - 0.5);
                } else {
                    // MANUAL: for now, assume order
                    bracketPlayers = advancingPlayers;
                }
                
                const bracket = generateBracket(bracketPlayers, settings.thirdPlace);
                bData.phase = 'BRACKET';
                bData.bracket = bracket;
                db.prepare('UPDATE torneos SET bracketData = ? WHERE id = ?').run(JSON.stringify(bData), t.id);
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
            } else if (t.format === 'GROUPS_BRACKET') {
                let bData = JSON.parse(t.bracketData);
                if (bData.phase === 'GROUPS') {
                    // Find the group and match
                    for (let group of bData.groups) {
                        const match = group.matches.find(m => m.p1 === p.p1 && m.p2 === p.p2);
                        if (match) {
                            match.s1 = p.s1;
                            match.s2 = p.s2;
                            break;
                        }
                    }
                } else {
                    // Bracket phase, similar to BRACKET
                    let bracket = bData.bracket;
                    let targetMatch = null;
                    
                    bracket.rounds.forEach(r => { const m = r.matches.find(x => String(x.id) === String(p.matchId)); if(m) targetMatch = m; });
                    if (bracket.thirdPlaceMatch && String(bracket.thirdPlaceMatch.id) === String(p.matchId)) targetMatch = bracket.thirdPlaceMatch;

                    if (targetMatch) {
                        if (targetMatch.winner) cascadeClear(bracket, targetMatch.id);
                        
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
                    }
                }
                db.prepare('UPDATE torneos SET bracketData = ? WHERE id = ?').run(JSON.stringify(bData), t.id);
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