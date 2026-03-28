const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../arcade.db'));

// Asegurar que la tabla tiene las columnas de torneo
try {
    const cols = db.prepare(`PRAGMA table_info(mus_rooms)`).all();
    if (!cols.find(c => c.name === 'isTournament')) db.prepare(`ALTER TABLE mus_rooms ADD COLUMN isTournament INTEGER DEFAULT 0`).run();
    if (!cols.find(c => c.name === 'tournamentState')) db.prepare(`ALTER TABLE mus_rooms ADD COLUMN tournamentState TEXT`).run();
} catch (e) {}

const getFullMusData = () => {
    return {
        rooms: db.prepare('SELECT name, isTournament, tournamentState FROM mus_rooms').all(),
        players: db.prepare('SELECT name FROM mus_players ORDER BY name').all().map(p => p.name),
        matches: db.prepare('SELECT * FROM mus_matches').all()
    };
};

// Generador de Grupos (Algoritmo Round Robin)
function generateGroups(pairs, numGroups, matchesPerRival) {
    let groups = {};
    for(let i=0; i<numGroups; i++) groups[`${i+1}`] = { pairs: [], matches: [], standings: [] };
    
    // Repartir parejas
    pairs.forEach((p, i) => {
        const gName = `${(i % numGroups) + 1}`;
        groups[gName].pairs.push(p);
        groups[gName].standings.push({ pair: p, pts: 0, w: 0, l: 0, diff: 0 });
    });

    let currentMatchId = 1;
    Object.keys(groups).forEach(gName => {
        const gPairs = groups[gName].pairs;
        // Si es impar, añadimos BYE para facilitar el round robin
        const workPairs = gPairs.length % 2 !== 0 ? [...gPairs, 'BYE'] : [...gPairs];
        const n = workPairs.length;
        
        for (let round = 0; round < (n - 1); round++) {
            for (let i = 0; i < n / 2; i++) {
                const p1 = workPairs[i];
                const p2 = workPairs[n - 1 - i];
                if (p1 !== 'BYE' && p2 !== 'BYE') {
                    for(let k=0; k<matchesPerRival; k++) {
                        groups[gName].matches.push({ id: `G${gName}_${currentMatchId++}`, round: round+1, p1, p2, s1: 0, s2: 0, winner: null });
                    }
                }
            }
            workPairs.splice(1, 0, workPairs.pop()); // Rotación Round Robin
        }
    });
    return groups;
}

// Generador de Grupos desde Asignación Manual
function generateGroupsFromAssignment(pairsPerGroup, matchesPerRival) {
    let groups = {};
    Object.keys(pairsPerGroup).forEach(gName => {
        const pairs = pairsPerGroup[gName];
        groups[gName] = { pairs: [], matches: [], standings: [] };
        
        pairs.forEach(p => {
            groups[gName].pairs.push(p);
            groups[gName].standings.push({ pair: p, pts: 0, w: 0, l: 0, diff: 0 });
        });
    });

    let currentMatchId = 1;
    Object.keys(groups).forEach(gName => {
        const gPairs = groups[gName].pairs;
        const workPairs = gPairs.length % 2 !== 0 ? [...gPairs, 'BYE'] : [...gPairs];
        const n = workPairs.length;
        
        for (let round = 0; round < (n - 1); round++) {
            for (let i = 0; i < n / 2; i++) {
                const p1 = workPairs[i];
                const p2 = workPairs[n - 1 - i];
                if (p1 !== 'BYE' && p2 !== 'BYE') {
                    for(let k=0; k<matchesPerRival; k++) {
                        groups[gName].matches.push({ id: `G${gName}_${currentMatchId++}`, round: round+1, p1, p2, s1: 0, s2: 0, winner: null });
                    }
                }
            }
            workPairs.splice(1, 0, workPairs.pop());
        }
    });
    return groups;
}

// Generador de Eliminatorias con Repesca Automática (Potencia de 2)
function generateBracket(pairs, randomize) {
    let players = [...pairs];
    if (randomize) players.sort(() => Math.random() - 0.5); 
    
    let nextP2 = 2; while (nextP2 < players.length) nextP2 *= 2;
    const numByes = nextP2 - players.length;

    let byes = [];
    for(let i=0; i<numByes; i++) byes.push(players.pop());

    let rounds = []; let matchId = 1;
    let round1 = { matches: [] };
    
    for (let i = 0; i < players.length; i+=2) {
        round1.matches.push({ id: `B_${matchId++}`, p1: players[i], p2: players[i+1], winner: null, nextMatchId: null });
    }
    rounds.push(round1);

    let allPending = [...round1.matches.map(m => m.id), ...byes.map(b => `BYE_${b}`)];
    
    while (allPending.length > 1) {
        let newRound = { matches: [] };
        let nextFeeders = [];
        const isFinal = allPending.length === 2;
        const isSemi = allPending.length === 4;
        
        for (let i = 0; i < allPending.length; i += 2) {
            const f1 = allPending[i]; const f2 = allPending[i+1];
            const match = {
                id: `B_${matchId++}`, isFinal, isSemi,
                p1: typeof f1 === 'string' && f1.startsWith('BYE_') ? f1.split('_')[1] : '???',
                p2: typeof f2 === 'string' && f2.startsWith('BYE_') ? f2.split('_')[1] : '???',
                winner: null, nextMatchId: null
            };

            if (typeof f1 === 'string' && !f1.startsWith('BYE_')) { const prev = rounds.flatMap(r=>r.matches).find(m=>m.id===f1); if(prev) prev.nextMatchId = match.id; }
            if (typeof f2 === 'string' && !f2.startsWith('BYE_')) { const prev = rounds.flatMap(r=>r.matches).find(m=>m.id===f2); if(prev) prev.nextMatchId = match.id; }

            newRound.matches.push(match);
            nextFeeders.push(match.id);
        }
        rounds.push(newRound);
        allPending = nextFeeders;
    }
    return { rounds, champion: null };
}

module.exports = {
    init: (io) => {},
    handleSocket: (io, socket) => {
        socket.on('mus_action', (action) => {
            const reqUser = (action.user || "").toLowerCase();
            const isAdmin = ['administrador m', 'xarlie', 'musero', 'japa', 'administrador g'].includes(reqUser);

            if (action.type === 'getData') {
                socket.emit('mus_data', getFullMusData());
            }

            if (action.type === 'addRoom') {
                if (!isAdmin) return socket.emit('mus_msg', 'No tienes permisos.');
                const r = action.value.trim();
                if (r) {
                    const isT = action.isTournament ? 1 : 0;
                    const state = isT ? JSON.stringify({
                        config: action.config,
                        description: action.description || '',
                        players: [], pairs: [],
                        phase: 'REGISTRATION',
                        groups: {}, bracket: {},
                        groupAssignments: {}
                    }) : null;

                    db.prepare('INSERT OR IGNORE INTO mus_rooms (name, isTournament, tournamentState) VALUES (?, ?, ?)').run(r, isT, state);
                    io.emit('mus_data', getFullMusData());
                }
            }

            // ACCIONES ESPECÍFICAS DEL TORNEO
            if (action.type === 'tourneyAction') {
                if (!isAdmin) return socket.emit('mus_msg', `${reqUser}  Solo un administrador puede controlar el torneo.`);
                const roomData = db.prepare('SELECT tournamentState FROM mus_rooms WHERE name = ? AND isTournament = 1').get(action.room);
                if (!roomData) return;
                
                let state = JSON.parse(roomData.tournamentState);

                if (action.actionType === 'addPlayer') {
                    if (action.value && !state.players.includes(action.value)) state.players.push(action.value);
                } 
                else if (action.actionType === 'addPlayers') {
                    if (Array.isArray(action.value)) {
                        action.value.forEach(p => {
                            if (p && !state.players.includes(p)) {
                                state.players.push(p);
                            }
                        });
                    }
                }
                else if (action.actionType === 'removePlayer') {
                    state.players = state.players.filter(p => p !== action.value);
                }
                else if (action.actionType === 'start') {
                    if (state.players.length < 4) return socket.emit('mus_msg', 'Se necesitan al menos 4 jugadores (2 parejas).');

                    // Emparejamiento
                    let players = [...state.players];
                    if (state.config.randomizePairs) players.sort(() => Math.random() - 0.5);

                    state.pairs = [];
                    for(let i=0; i<players.length; i+=2) {
                        if(players[i+1]) state.pairs.push([players[i], players[i+1]].sort().join(' y '));
                    }

                    if (state.config.randomizePairs) {
                        // No se pueden editar parejas cuando son aleatorias
                        if (state.config.format === 'GROUPS') {
                        if (state.config.randomizeBracket) {
                            // Grupos automáticos aleatorios (reparto mitad/mitad si hay numGroups)
                            const numGroups = Math.max(2, parseInt(state.config.numGroups) || 2);
                            const shuffledPairs = [...state.pairs].sort(() => Math.random() - 0.5);
                            const groupsSetup = {};
                            for (let i = 0; i < numGroups; i++) groupsSetup[String(i + 1)] = [];
                            shuffledPairs.forEach((pair, idx) => {
                                const g = String((idx % numGroups) + 1);
                                groupsSetup[g].push(pair);
                            });
                            state.groups = generateGroupsFromAssignment(groupsSetup, state.config.matchesPerRival || 1);
                            state.phase = 'GROUPS';
                        } else {
                            state.phase = 'GROUP_ASSIGNMENT';
                            state.groupAssignments = {};
                            state.pairs.forEach(p => { state.groupAssignments[p] = null; });
                        }
                    } else {
                        // Eliminatorias directas
                        state.bracket = generateBracket(state.pairs, state.config.randomizeBracket);
                        state.phase = 'BRACKET';
                    }
                    } else {
                        // Manual: se ajustan las parejas en PAIR_ASSIGNMENT
                        state.phase = 'PAIR_ASSIGNMENT';
                    }
                }
                else if (action.actionType === 'advanceToBracket') {
                    // Coger a los 2 mejores de cada grupo para hacer el Bracket Final
                    let advancingPairs = [];
                    Object.values(state.groups).forEach(g => {
                        const sorted = [...g.standings].sort((a,b) => b.pts !== a.pts ? b.pts - a.pts : b.diff - a.diff);
                        if(sorted[0]) advancingPairs.push(sorted[0].pair);
                        if(sorted[1]) advancingPairs.push(sorted[1].pair);
                    });
                    state.phase = 'BRACKET';
                    state.bracket = generateBracket(advancingPairs, state.config.randomizeBracket);
                }
                else if (action.actionType === 'setDescription') {
                    state.description = action.value || '';
                }
                else if (action.actionType === 'updatePairs') {
                    state.pairs = action.pairs || [];
                }
                else if (action.actionType === 'proceedToGroupAssignment') {
                    if (state.config.format === 'GROUPS') {
                        if (state.config.randomizeBracket) {
                            const numGroups = Math.max(2, parseInt(state.config.numGroups) || 2);
                            const shuffledPairs = [...state.pairs].sort(() => Math.random() - 0.5);
                            const groupsSetup = {};
                            for (let i = 0; i < numGroups; i++) groupsSetup[String(i + 1)] = [];
                            shuffledPairs.forEach((pair, idx) => {
                                const g = String((idx % numGroups) + 1);
                                groupsSetup[g].push(pair);
                            });
                            state.groups = generateGroupsFromAssignment(groupsSetup, state.config.matchesPerRival || 1);
                            state.phase = 'GROUPS';
                        } else {
                            state.phase = 'GROUP_ASSIGNMENT';
                            state.groupAssignments = {};
                            state.pairs.forEach(p => { state.groupAssignments[p] = null; });
                        }
                    } else {
                        state.phase = 'BRACKET';
                        state.bracket = generateBracket(state.pairs, state.config.randomizeBracket);
                    }
                }
                else if (action.actionType === 'assignPairToGroup') {
                    state.groupAssignments[action.pair] = action.group;
                }
                else if (action.actionType === 'finalizeGroupAssignment') {
                    if (state.config.format === 'GROUPS') {
                        let newPairsPerGroup = {};
                        Object.keys(state.groupAssignments).forEach(pair => {
                            const g = state.groupAssignments[pair];
                            if (!newPairsPerGroup[g]) newPairsPerGroup[g] = [];
                            newPairsPerGroup[g].push(pair);
                        });
                        state.phase = 'GROUPS';
                        state.groups = generateGroupsFromAssignment(newPairsPerGroup, state.config.matchesPerRival);
                    } else {
                        state.phase = 'BRACKET';
                    }
                }

                db.prepare('UPDATE mus_rooms SET tournamentState = ? WHERE name = ?').run(JSON.stringify(state), action.room);
                io.emit('mus_data', getFullMusData());
            }

            if (action.type === 'addMatch') {
                const m = action.value;
                const id = String(Date.now());
                const winnerPair = m.s1 > m.s2 ? [m.p1, m.p2].sort().join(' y ') : [m.p3, m.p4].sort().join(' y ');

                // 1. Inserción normal en la base de datos de absolutas (Estadísticas Históricas)
                db.prepare('INSERT INTO mus_matches (id, roomId, p1, p2, p3, p4, s1, s2, date, addedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                  .run(id, m.roomId, m.p1, m.p2, m.p3, m.p4, parseInt(m.s1), parseInt(m.s2), new Date().toISOString(), m.addedBy);
                
                // 2. Si venía de un Torneo, actualizar el Cuadro / Liguilla internamente
                if (m.tourneyMatchId) {
                    const rData = db.prepare('SELECT tournamentState FROM mus_rooms WHERE name = ? AND isTournament = 1').get(m.roomId);
                    if (rData) {
                        let state = JSON.parse(rData.tournamentState);
                        let updated = false;

                        if (state.phase === 'GROUPS') {
                            Object.values(state.groups).forEach(g => {
                                const tMatch = g.matches.find(x => x.id === m.tourneyMatchId);
                                if (tMatch && !tMatch.winner) {
                                    tMatch.s1 = m.s1; tMatch.s2 = m.s2; tMatch.winner = winnerPair;
                                    // Update standings
                                    const stW = g.standings.find(x => x.pair === winnerPair);
                                    const stL = g.standings.find(x => x.pair === (winnerPair === tMatch.p1 ? tMatch.p2 : tMatch.p1));
                                    if(stW) { stW.pts += 3; stW.w++; stW.diff += Math.abs(m.s1 - m.s2); }
                                    if(stL) { stL.l++; stL.diff -= Math.abs(m.s1 - m.s2); }
                                    updated = true;
                                }
                            });
                        } else if (state.phase === 'BRACKET') {
                            state.bracket.rounds.forEach(r => {
                                const tMatch = r.matches.find(x => x.id === m.tourneyMatchId);
                                if (tMatch && !tMatch.winner) {
                                    tMatch.winner = winnerPair;
                                    // AÑADIDO: Guardar s1 y s2 para que el PDF sepa el resultado exacto
                                    tMatch.s1 = m.s1; 
                                    tMatch.s2 = m.s2;
                                    
                                    // Forward to next round
                                    if (tMatch.nextMatchId) {
                                        state.bracket.rounds.forEach(r2 => {
                                            const nextM = r2.matches.find(x => x.id === tMatch.nextMatchId);
                                            if (nextM) { if (nextM.p1 === '???') nextM.p1 = winnerPair; else nextM.p2 = winnerPair; }
                                        });
                                    } else if (tMatch.isFinal) {
                                        state.bracket.champion = winnerPair;
                                    }
                                    updated = true;
                                }
                            });
                        }

                        if (updated) db.prepare('UPDATE mus_rooms SET tournamentState = ? WHERE name = ?').run(JSON.stringify(state), m.roomId);
                    }
                }

                // Guardar a los jugadores en la lista global
                [m.p1, m.p2, m.p3, m.p4].forEach(p => db.prepare('INSERT OR IGNORE INTO mus_players (name) VALUES (?)').run(p));

                io.emit('mus_data', getFullMusData());
            }

            if (action.type === 'deleteMatch') {
                const match = db.prepare('SELECT addedBy FROM mus_matches WHERE id = ?').get(String(action.id));
                if (match) {
                    if (isAdmin || reqUser === (match.addedBy || "").toLowerCase()) {
                        db.prepare('DELETE FROM mus_matches WHERE id = ?').run(String(action.id));
                        io.emit('mus_data', getFullMusData());
                    } else {
                        socket.emit('mus_msg', 'No tienes permisos.');
                    }
                }
            }

            if (action.type === 'adminEditPlayer') {
                if (!isAdmin) return;
                const { oldName, newName } = action.value;
                
                db.prepare('UPDATE OR IGNORE mus_players SET name = ? WHERE name = ?').run(newName, oldName);
                db.prepare('UPDATE mus_matches SET p1 = ? WHERE p1 = ?').run(newName, oldName);
                db.prepare('UPDATE mus_matches SET p2 = ? WHERE p2 = ?').run(newName, oldName);
                db.prepare('UPDATE mus_matches SET p3 = ? WHERE p3 = ?').run(newName, oldName);
                db.prepare('UPDATE mus_matches SET p4 = ? WHERE p4 = ?').run(newName, oldName);
                
                io.emit('mus_data', getFullMusData());
            }

            if (action.type === 'adminDeletePlayer') {
                if (!isAdmin) return;
                db.prepare('DELETE FROM mus_players WHERE name = ?').run(action.value);
                io.emit('mus_data', getFullMusData());
            }

            if (action.type === 'adminEditMatch') {
                if (!isAdmin) return;
                const v = action.value;
                db.prepare('UPDATE mus_matches SET p1=?, p2=?, p3=?, p4=?, s1=?, s2=? WHERE id=?')
                  .run(v.p1, v.p2, v.p3, v.p4, parseInt(v.s1), parseInt(v.s2), String(v.id));
                io.emit('mus_data', getFullMusData());
            }
        });

        // =========================================================================
        // ================== GENERADOR DE PDF EXTREMO COMPACTO ====================
        // =========================================================================
        // =========================================================================
        // ================== GENERADOR DE PDF EXTREMO COMPACTO ====================
        // =========================================================================
        socket.on('mus_deleteTournamentPDF', (data, callback) => {
            const reqUser = (data.user || "").toLowerCase();
            const isAdmin = ['administrador m', 'xarlie', 'musero', 'japa', 'administrador g'].includes(reqUser);
            if (!isAdmin) return callback({ success: false, error: 'No tienes permisos' });

            const roomName = data.room;
            const roomData = db.prepare('SELECT tournamentState FROM mus_rooms WHERE name = ? AND isTournament = 1').get(roomName);
            if (!roomData) return callback({ success: false, error: 'Torneo no encontrado' });

            const state = JSON.parse(roomData.tournamentState);
            const PDFDocument = require('pdfkit');
            const fs = require('fs');
            
            const downloadsDir = path.join(__dirname, '../public/downloads');
            const fontRegular = path.join(__dirname, '../public/fonts/Poppins-Regular.ttf');
            const fontBold = path.join(__dirname, '../public/fonts/Poppins-Bold.ttf');
            
            if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });

            const fileName = `torneo_${roomName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
            const filePath = path.join(downloadsDir, fileName);
            
            // Necesitamos los scores reales para dibujarlos en el bracket
            const dbMatches = db.prepare('SELECT * FROM mus_matches WHERE roomId = ?').all(roomName);
            
            const generatePDF = () => {
                return new Promise((resolve, reject) => {
                    const doc = new PDFDocument({ margin: 40, size: 'A4' });
                    const writeStream = fs.createWriteStream(filePath);
                    const imagePath = path.join(__dirname, '../public/css/image.png');
                    
                    // REGISTRAR LA FUENTE POPPINS SI EXISTE (Si no, fallback a Helvetica)
                    if (fs.existsSync(fontRegular) && fs.existsSync(fontBold)) {
                        doc.registerFont('MainFont', fontRegular);
                        doc.registerFont('MainFont-Bold', fontBold);
                    } else {
                        doc.registerFont('MainFont', 'Helvetica');
                        doc.registerFont('MainFont-Bold', 'Helvetica-Bold');
                    }

                    doc.pipe(writeStream);

                    // Función para pintar el fondo (Imagen blur + Capa verde-blanca)
                    const drawBackground = () => {
                        try {
                            if (fs.existsSync(imagePath)) {
                                doc.image(imagePath, 0, 0, { width: 595, height: 842, opacity: 0.2 });
                            }
                        } catch (e) {}
                        
                        doc.rect(0, 0, 595, 842).fillColor('#e8f5e9').fillOpacity(0.88).fill();
                        doc.fillOpacity(1).fillColor('#000000');
                    };

                    doc.on('pageAdded', drawBackground);
                    // FORZAR UNA SÓLO PÁGINA: evitar que locatePage agregue páginas automáticas
                    const originalAddPage = doc.addPage.bind(doc);
                    doc.addPage = (...args) => {
                        // no-op para bloquear páginas extra
                        return doc;
                    };
                    drawBackground();

                    // === CABECERA ===
                    doc.font('MainFont-Bold').fontSize(26).fillColor('#1b5e20').text(roomName.toUpperCase(), { align: 'center' });
                    if (state.description) {
                        doc.font('MainFont').fontSize(12).fillColor('#424242').text(state.description, { align: 'center' });
                    }
                    doc.moveDown(2);

                    // === FASE DE GRUPOS ===
                    if (state.groups && Object.keys(state.groups).length > 0) {

                        const groupNames = Object.keys(state.groups).sort().slice(0, 2);
                        const colWidth = 250;
                        const startX = 40;
                        const groupBaseY = doc.y;
                        let maxY = groupBaseY;

                        groupNames.forEach((gName, idx) => {
                            const g = state.groups[gName];
                            const x = startX + idx * (colWidth + 20);
                            let y = groupBaseY;

                            doc.font('MainFont-Bold').fontSize(13).fillColor('#2e7d32').text(`Grupo ${gName}`, x, y, {width: colWidth});
                            y += 18;

                            doc.font('MainFont-Bold').fontSize(9).fillColor('#000');
                            doc.text('Pareja', x, y, {width: 150});
                            doc.text('Pts', x + 155, y, {width: 45, align:'center'});
                            doc.text('Dif', x + 205, y, {width: 45, align:'center'});
                            y += 13;

                            g.standings.forEach((s, sIdx) => {
                                if (y > 740) return;
                                if (sIdx % 2 === 0) {
                                    doc.rect(x, y - 2, colWidth, 14).fill('#f1f8e9').fillOpacity(1);
                                }

                                doc.font('MainFont').fontSize(9).fillColor('#000');
                                doc.text(s.pair, x, y, {width: 150, ellipsis: true});
                                doc.text(String(s.pts), x + 155, y, {width: 45, align:'center'});
                                const diff = s.diff > 0 ? `+${s.diff}` : `${s.diff}`;
                                doc.text(diff, x + 205, y, {width: 45, align:'center'});
                                y += 14;
                            });

                            if (g.matches && g.matches.length > 0) {
                                y += 8;
                                doc.font('MainFont-Bold').fontSize(10).fillColor('#1b5e20').text('Resultados', x, y, {width: colWidth});
                                y += 12;

                                g.matches.forEach(m => {
                                    if (y > 760) return;
                                    let score = 'vs';
                                    let dbM = dbMatches.find(x => x.tourneyMatchId === m.id);
                                    if (dbM) score = `${dbM.s1} - ${dbM.s2}`;
                                    else if (m.s1 != null && m.s2 != null) score = `${m.s1} - ${m.s2}`;
                                    let text = `${m.p1} ${score} ${m.p2}`;
                                    if ((m.p1 || '').includes('BYE') || (m.p2 || '').includes('BYE')) {
                                        const byeName = (m.p1 || '').includes('BYE') ? m.p2 : m.p1;
                                        text = `${byeName} pasa de ronda (BYE)`;
                                    }
                                    doc.font('MainFont').fontSize(8).fillColor('#000').text(text, x, y, {width: colWidth, ellipsis: true});
                                    y += 11;
                                });
                            }

                            maxY = Math.max(maxY, y);
                        });

                        doc.y = Math.min(maxY + 16, 760);
                    }

                    // === ELIMINATORIAS (BRACKETS) ===
                    if (state.bracket && state.bracket.rounds && state.bracket.rounds.length > 0) {

                        const rounds = state.bracket.rounds;
                        const colWidth = 130;  
                        const boxW = 110;      
                        const boxH = 35;       
                        const spacing = 25;    
                        let baseY = doc.y;

                        let feeders = {};
                        rounds.forEach(r => r.matches.forEach(m => {
                            if (m.nextMatchId) {
                                if (!feeders[m.nextMatchId]) feeders[m.nextMatchId] = [];
                                feeders[m.nextMatchId].push(m);
                            }
                        }));

                        let coords = {};

                        const maxMatchesInRound = Math.max(...rounds.map(r => r.matches.length));
                        // Mantener en una sola página (no agregar páginas nuevas)

                        rounds.forEach((r, rIdx) => {
                            doc.font('MainFont-Bold').fontSize(10).fillColor('#2e7d32').text(`Ronda ${rIdx+1}`, 40 + rIdx * colWidth, baseY - 15);

                            r.matches.forEach((m, mIdx) => {
                                let x = 40 + rIdx * colWidth;
                                let y;
                                
                                if (rIdx === 0) {
                                    y = baseY + mIdx * (boxH + spacing); 
                                } else {
                                    let myFeeders = feeders[m.id];
                                    if (myFeeders && myFeeders.length === 2 && coords[myFeeders[0].id] && coords[myFeeders[1].id]) {
                                        y = (coords[myFeeders[0].id].y + coords[myFeeders[1].id].y) / 2;
                                    } else if (myFeeders && myFeeders.length === 1 && coords[myFeeders[0].id]) {
                                        y = coords[myFeeders[0].id].y;
                                    } else {
                                        y = baseY + mIdx * (boxH + spacing);
                                    }
                                }
                                coords[m.id] = {x, y};

                                const isFinalMatch = m.isFinal || (rIdx === rounds.length - 1 && mIdx === 0);
                                if (isFinalMatch && m.winner) {
                                    doc.font('MainFont-Bold').fontSize(14).fillColor('#f9a825').text('👑', x + boxW / 2 - 8, y - 14);
                                }

                                doc.lineWidth(1.5).strokeColor('#4caf50').rect(x, y, boxW, boxH).fillAndStroke('#ffffff', '#4caf50');

                                doc.fillColor('#000').font(m.winner === m.p1 ? 'MainFont-Bold' : 'MainFont').fontSize(8);
                                const p1Display = isFinalMatch && m.winner === m.p1 ? `👑 ${m.p1}` : m.p1;
                                doc.text(p1Display.substring(0, 20), x + 5, y + 6, {width: boxW - 10, ellipsis: true});

                                doc.moveTo(x, y + 17).lineTo(x + boxW, y + 17).lineWidth(0.5).strokeColor('#e0e0e0').stroke();

                                doc.font(m.winner === m.p2 ? 'MainFont-Bold' : 'MainFont');
                                const p2Display = isFinalMatch && m.winner === m.p2 ? `👑 ${m.p2}` : m.p2;
                                doc.text(p2Display.substring(0, 20), x + 5, y + 21, {width: boxW - 10, ellipsis: true});

                                let dbM = dbMatches.find(x => x.tourneyMatchId === m.id);
                                let scoreT = '-';
                                if (dbM) scoreT = `${dbM.s1} - ${dbM.s2}`;
                                else if (m.s1 != null && m.s2 != null) scoreT = `${m.s1} - ${m.s2}`;
                                doc.fillColor('#d32f2f').font('MainFont-Bold').fontSize(7);
                                doc.text(scoreT, x, y + boxH + 2, {width: boxW, align: 'center'});
                            });
                        });

                        rounds.forEach((r, rIdx) => {
                            if (rIdx === 0) return; 
                            r.matches.forEach(m => {
                                let myFeeders = feeders[m.id];
                                if (myFeeders) {
                                    let myC = coords[m.id];
                                    myFeeders.forEach(feeder => {
                                        let fC = coords[feeder.id];
                                        if (myC && fC) {
                                            doc.lineWidth(1.5).strokeColor('#2e7d32');
                                            doc.moveTo(fC.x + boxW, fC.y + boxH/2)
                                               .lineTo(fC.x + boxW + 10, fC.y + boxH/2)
                                               .lineTo(fC.x + boxW + 10, myC.y + boxH/2)
                                               .lineTo(myC.x, myC.y + boxH/2)
                                               .stroke();
                                        }
                                    });
                                }
                            });
                        });
                        
                        if (state.bracket.champion) {
                            doc.moveDown(2);
                            doc.font('MainFont-Bold').fontSize(24).fillColor('#f57f17').text('🏆 CAMPEÓN 🏆', { align: 'center', width: 215 });
                            doc.moveDown(0.5);
                            doc.font('MainFont-Bold').fontSize(20).fillColor('#1b5e20').text(state.bracket.champion.toUpperCase(), { align: 'center', width: 215 });
                        }
                    }

                    // === PIE DE PÁGINA ===
                    doc.fontSize(7).font('MainFont').fillColor('#777777').text(`Generado: ${new Date().toLocaleDateString('es-ES')} - Xarlie's Arcade`, 20, 810, { align: 'center', width: 555 });

                    doc.end();
                    
                    writeStream.on('finish', () => {
                        resolve(fileName);
                    });
                    
                    writeStream.on('error', reject);
                    doc.on('error', reject);
                });
            };

            generatePDF()
                .then(fileName => {
                    db.prepare('DELETE FROM mus_rooms WHERE name = ? AND isTournament = 1').run(roomName);
                    io.emit('mus_data', getFullMusData());
                    socket.emit('tournament_deleted', { room: roomName });
                    callback({ success: true, fileName });
                })
                .catch(err => {
                    console.error('Error generando PDF:', err);
                    callback({ success: false, error: err.message });
                });
        });

    },
    
    
    getRooms: () => []
};