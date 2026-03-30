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

function recalculateBracketFromResults(bracket) {
    if (!bracket || !bracket.rounds) return;
    const allMatches = bracket.rounds.flatMap(r => r.matches || []);
    const matchById = new Map(allMatches.map(m => [m.id, m]));

    // Preparar la relación padres -> hijo
    const childFeeds = {};
    allMatches.forEach(match => {
        if (match.nextMatchId) {
            childFeeds[match.nextMatchId] = childFeeds[match.nextMatchId] || [];
            childFeeds[match.nextMatchId].push(match.id);
        }
    });

    // Ronda 1: recalculamos ganador según puntuaciones (quedan igual participantes)
    if (bracket.rounds[0] && bracket.rounds[0].matches) {
        bracket.rounds[0].matches.forEach(match => {
            if (match.p1 && match.p2 && match.p1 !== '???' && match.p2 !== '???' && Number.isFinite(match.s1) && Number.isFinite(match.s2) && match.s1 !== match.s2) {
                match.winner = match.s1 > match.s2 ? match.p1 : match.p2;
            } else {
                match.winner = null;
            }
        });
    }

    // Rondas siguientes: establecer participantes en función de ganadores previos
    for (let ri = 1; ri < bracket.rounds.length; ri++) {
        const round = bracket.rounds[ri];
        round.matches.forEach(match => {
            const parents = childFeeds[match.id] || [];
            const parent1 = matchById.get(parents[0]);
            const parent2 = matchById.get(parents[1]);

            const expectedP1 = parent1 && parent1.winner ? parent1.winner : '???';
            const expectedP2 = parent2 && parent2.winner ? parent2.winner : '???';

            const participantsChanged = match.p1 !== expectedP1 || match.p2 !== expectedP2;
            match.p1 = expectedP1;
            match.p2 = expectedP2;

            if (participantsChanged) {
                match.s1 = 0;
                match.s2 = 0;
                match.winner = null;
            }

            if (match.p1 !== '???' && match.p2 !== '???' && Number.isFinite(match.s1) && Number.isFinite(match.s2) && match.s1 !== match.s2) {
                match.winner = match.s1 > match.s2 ? match.p1 : match.p2;
            } else {
                match.winner = null;
            }
        });
    }

    const finalRound = bracket.rounds[bracket.rounds.length - 1];
    if (finalRound && finalRound.matches) {
        const finalMatch = finalRound.matches.find(m => m.winner);
        bracket.champion = finalMatch ? finalMatch.winner : null;
    } else {
        bracket.champion = null;
    }
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
                    
                    // Aplicar método de avance
                    const method = state.config.advanceMethod || 'ORDER';
                    if (method === 'RANDOM') {
                        advancingPairs.sort(() => Math.random() - 0.5);
                    } else if (method === 'ORDER') {
                        // Ya está ordenado por grupos, pero para 2 grupos: A1 vs B2, A2 vs B1
                        if (Object.keys(state.groups).length === 2) {
                            const groups = Object.values(state.groups);
                            const a = groups[0].standings.slice(0, 2).map(s => s.pair);
                            const b = groups[1].standings.slice(0, 2).map(s => s.pair);
                            advancingPairs = [a[0], b[1], a[1], b[0]];
                        }
                    } // MANUAL: dejar como está, admin puede modificar después
                    
                    state.phase = 'BRACKET';
                    state.bracket = generateBracket(advancingPairs, state.config.randomizeBracket);
                }
                else if (action.actionType === 'setDescription') {
                    state.description = action.value || '';
                }
                else if (action.actionType === 'updatePairs') {
                    state.pairs = action.pairs || [];
                    // re-generate groups
                    const matchesPerRival = state.config.matchesPerRival || 1;
                    state.groups = generateGroups(state.pairs, state.config.numGroups, matchesPerRival);
                    // reset subsequent
                    state.groupAssignments = {};
                    state.bracket = {};
                    state.phase = 'GROUPS';
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
                else if (action.actionType === 'updateGroupAssignments') {
                    state.groupAssignments = action.value || {};
                    // generate groups from assignment
                    let newPairsPerGroup = {};
                    Object.keys(state.groupAssignments).forEach(pair => {
                        const g = state.groupAssignments[pair];
                        if (!newPairsPerGroup[g]) newPairsPerGroup[g] = [];
                        newPairsPerGroup[g].push(pair);
                    });
                    state.groups = generateGroupsFromAssignment(newPairsPerGroup, state.config.matchesPerRival || 1);
                    state.phase = 'GROUPS';
                }
                else if (action.actionType === 'updateBracketMatchup') {
                    const { matchId, p1, p2 } = action.value || {};
                    if (state.bracket && state.bracket.rounds) {
                        let found = false;
                        state.bracket.rounds.forEach(r => {
                            r.matches.forEach(m => {
                                if (m.id === matchId) {
                                    found = true;
                                    m.p1 = p1 || m.p1;
                                    m.p2 = p2 || m.p2;
                                    m.s1 = 0;
                                    m.s2 = 0;
                                    m.winner = null;
                                }
                            });
                        });

                        if (found) {
                            // Si se actualiza un partido, invalidamos los descendientes
                            const clearDescendants = (id) => {
                                let changed = true;
                                while (changed) {
                                    changed = false;
                                    state.bracket.rounds.forEach(r => {
                                        r.matches.forEach(m => {
                                            if ((m.p1 === id || m.p2 === id) && m.id !== id) {
                                                m.p1 = m.p1 === id ? '???' : m.p1;
                                                m.p2 = m.p2 === id ? '???' : m.p2;
                                                m.s1 = 0; m.s2 = 0; m.winner = null;
                                                changed = true;
                                            }
                                        });
                                    });
                                }
                            };
                            clearDescendants(matchId);
                        }
                    }
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
                else if (action.actionType === 'updateMatchResult') {
                    console.log('[tourneyAction updateMatchResult]', action.room, action.value.matchId, action.value.s1, action.value.s2, 'phase', state.phase);
                    // update the match in db if exists, otherwise create quick entry for bracket/game state
                    const existing = db.prepare('SELECT id FROM mus_matches WHERE id = ?').get(action.value.matchId);
                    if (existing) {
                        db.prepare('UPDATE mus_matches SET s1 = ?, s2 = ? WHERE id = ?').run(action.value.s1, action.value.s2, action.value.matchId);
                    } else {
                        let mData = null;
                        if (state.phase === 'GROUPS' && state.groups) {
                            Object.values(state.groups).forEach(g => {
                                const mm = (g.matches || []).find(x => x.id === action.value.matchId);
                                if (mm) mData = mm;
                            });
                        } else if (state.phase === 'BRACKET' && state.bracket && state.bracket.rounds) {
                            state.bracket.rounds.forEach(r => {
                                const mm = (r.matches || []).find(x => x.id === action.value.matchId);
                                if (mm) mData = mm;
                            });
                        }
                        if (mData) {
                            db.prepare('INSERT OR REPLACE INTO mus_matches (id, roomId, p1, p2, p3, p4, s1, s2, date, addedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                                .run(mData.id, action.room, mData.p1 || '', mData.p2 || '', mData.p3 || '', mData.p4 || '', action.value.s1, action.value.s2, new Date().toISOString(), 'admin');
                        }
                    }

                    // update in state: siempre tratar grupos y bracket, cualquiera que exista, para evitar fase inconsistencias.
                    let groupUpdated = false;
                    Object.keys(state.groups || {}).forEach(gName => {
                        state.groups[gName].matches.forEach(m => {
                            if (m.id === action.value.matchId) {
                                m.s1 = parseInt(action.value.s1);
                                m.s2 = parseInt(action.value.s2);
                                m.winner = (m.s1 !== m.s2) ? (m.s1 > m.s2 ? m.p1 : m.p2) : null;
                                groupUpdated = true;
                            }
                        });

                        if (groupUpdated) {
                            let standings = state.groups[gName].standings;
                            standings.forEach(s => { s.pts = 0; s.w = 0; s.l = 0; s.diff = 0; });
                            state.groups[gName].matches.forEach(mt => {
                                if (mt.winner) {
                                    const winnerPair = mt.winner;
                                    const loserPair = mt.p1 === winnerPair ? mt.p2 : mt.p1;
                                    const winnerStanding = standings.find(s => s.pair === winnerPair);
                                    const loserStanding = standings.find(s => s.pair === loserPair);
                                    if (winnerStanding) { winnerStanding.pts += 3; winnerStanding.w += 1; winnerStanding.diff += (mt.s1 - mt.s2); }
                                    if (loserStanding) { loserStanding.l += 1; loserStanding.diff += (mt.s2 - mt.s1); }
                                }
                            });
                            standings.sort((a,b) => b.pts - a.pts || b.diff - a.diff);
                        }
                    });

                    let bracketUpdated = false;
                    if (state.bracket && state.bracket.rounds) {
                        state.bracket.rounds.forEach(r => {
                            r.matches.forEach(m => {
                                if (m.id === action.value.matchId) {
                                    m.s1 = parseInt(action.value.s1);
                                    m.s2 = parseInt(action.value.s2);
                                    m.winner = (m.s1 !== m.s2) ? (m.s1 > m.s2 ? m.p1 : m.p2) : null;
                                    bracketUpdated = true;
                                }
                            });
                        });
                    }

                    if (bracketUpdated) {
                        recalculateBracketFromResults(state.bracket);
                    }
                }

                db.prepare('UPDATE mus_rooms SET tournamentState = ? WHERE name = ?').run(JSON.stringify(state), action.room);
                io.emit('mus_data', getFullMusData());
            }

            // --- ACCIÓN: ELIMINAR TORNEO (SOLO BBDD) ---
            if (action.type === 'deleteTournament') {
                if (!isAdmin) return socket.emit('mus_msg', 'No tienes permisos para eliminar el torneo.');
                
                const roomName = action.room;
                if (!roomName) return;

                try {
                    // Eliminamos la sala de la tabla mus_rooms
                    // Nota: Esto NO borra los mus_matches históricos, solo la instancia del torneo
                    db.prepare('DELETE FROM mus_rooms WHERE name = ? AND isTournament = 1').run(roomName);
                    
                    // Notificamos a todos los clientes para que refresquen la lista de salas
                    io.emit('mus_data', getFullMusData());
                    
                    // Enviamos un mensaje de confirmación opcional al administrador
                    socket.emit('mus_msg', `Torneo "${roomName}" eliminado correctamente.`);
                } catch (error) {
                    console.error('Error al eliminar torneo:', error);
                    socket.emit('mus_msg', 'Error interno al eliminar el torneo.');
                }
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

            // --- NUEVA ACCIÓN: NORMALIZAR NOMBRES ---
            if (action.type === 'adminNormalizeNames') {
                if (!isAdmin) return;

                const normalize = (str) => {
                    if (!str) return str;
                    const clean = str.trim();
                    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
                };

                // 1. Obtener todos los jugadores
                const players = db.prepare('SELECT name FROM mus_players').all();

                for (let p of players) {
                    const oldName = p.name;
                    const newName = normalize(oldName);

                    if (oldName !== newName) {
                        // Actualizar tabla de jugadores
                        db.prepare('UPDATE OR IGNORE mus_players SET name = ? WHERE name = ?').run(newName, oldName);
                        // Actualizar todas las menciones en las partidas
                        db.prepare('UPDATE mus_matches SET p1 = ? WHERE p1 = ?').run(newName, oldName);
                        db.prepare('UPDATE mus_matches SET p2 = ? WHERE p2 = ?').run(newName, oldName);
                        db.prepare('UPDATE mus_matches SET p3 = ? WHERE p3 = ?').run(newName, oldName);
                        db.prepare('UPDATE mus_matches SET p4 = ? WHERE p4 = ?').run(newName, oldName);
                        db.prepare('UPDATE mus_matches SET addedBy = ? WHERE addedBy = ?').run(newName, oldName);
                    }
                }

                // 2. Limpiar duplicados que hayan podido quedar tras la normalización
                // (Por ejemplo, si existía "carlos" y "Carlos", ahora ambos son "Carlos")
                db.prepare(`
                    DELETE FROM mus_players 
                    WHERE rowid NOT IN (SELECT MIN(rowid) FROM mus_players GROUP BY name)
                `).run();

                io.emit('mus_data', getFullMusData());
                socket.emit('mus_msg', 'Nombres normalizados y duplicados eliminados.');
            }
        });

        // =========================================================================
        // ================== GENERADOR DE PDF Y CIERRE DE TORNEO ==================
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
            if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });

            const fileName = `torneo_${roomName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
            const filePath = path.join(downloadsDir, fileName);
            
            // Traer partidas para el PDF
            const dbMatches = db.prepare('SELECT * FROM mus_matches WHERE roomId = ?').all(roomName);
            
            try {
                const doc = new PDFDocument({ margin: 24, size: 'A4' });
                const writeStream = fs.createWriteStream(filePath);
                doc.pipe(writeStream);

                // Fondo transparente estilo mus (dos capas de color)
                doc.save();
                doc.opacity(0.08).rect(0, 0, doc.page.width, doc.page.height).fill('#0b7f38');
                doc.opacity(0.15).circle(doc.page.width * 0.25, doc.page.height * 0.25, 170).fill('#ffffff');
                doc.circle(doc.page.width * 0.75, doc.page.height * 0.35, 150).fill('#ffffff');
                doc.restore();

                // Cabecera verde tipo imagen
                doc.rect(0, 0, doc.page.width, 85).fill('#0b7f38');
                doc.fillColor('white').font('Helvetica-Bold').fontSize(32).text(roomName.toUpperCase(), 0, 20, { align: 'center' });
                const descriptionText = (state.description || '').toUpperCase();
                if (descriptionText) {
                    doc.font('Helvetica').fontSize(14).text(descriptionText, 0, 54, { align: 'center' });
                }

                doc.moveDown(5);
                doc.fillColor('#0c2d18').font('Helvetica-Bold').fontSize(20).text('FASE DE GRUPOS', { align: 'left' });
                doc.moveDown(0.5);

                // Grupos en 2 columnas estilo tabla
                const groups = state.groups || {};
                const groupKeys = Object.keys(groups);
                const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
                const colW = (pageW - 20) / 2;
                let xStart = doc.page.margins.left;
                let yStart = doc.y;
                let col = 0;

                groupKeys.forEach((gName, idx) => {
                    if (col === 2) {
                        col = 0;
                        xStart = doc.page.margins.left;
                        yStart += 170;
                        doc.y = yStart;
                    }

                    doc.save();
                    doc.translate(xStart, yStart);
                    doc.rect(0, 0, colW, 130).fill('#f0fff4');
                    doc.fillColor('#0b7f38').font('Helvetica-Bold').fontSize(14).text(`GRUPO ${gName}`, 8, 10);
                    doc.fillColor('#000').font('Helvetica-Bold').fontSize(10).text('Pareja', 8, 30);
                    doc.text('Pts', colW - 70, 30, { width: 40, align: 'right' });
                    doc.text('G', colW - 30, 30, { width: 20, align: 'right' });
                    doc.text('P', colW - 10, 30, { width: 20, align: 'right' });
                    doc.text('Dif', colW + 10, 30, { width: 30, align: 'right' });

                    let rowY = 45;
                    (groups[gName].standings || []).forEach(s => {
                        doc.font('Helvetica').fontSize(10).fillColor('#222').text(s.pair, 8, rowY, { width: colW - 80 });
                        doc.text(`${s.pts}`, colW - 70, rowY, { width: 40, align: 'right' });
                        doc.text(`${s.w}`, colW - 30, rowY, { width: 20, align: 'right' });
                        doc.text(`${s.l}`, colW - 10, rowY, { width: 20, align: 'right' });
                        doc.text(`${s.diff > 0 ? '+'+s.diff : s.diff}`, colW + 10, rowY, { width: 30, align: 'right' });
                        rowY += 14;
                    });

                    doc.restore();

                    col += 1;
                    xStart += colW + 20;
                });

                // Colocación manual para evitar mezcla de bloques
                let minBracketY = yStart + 170;
                if (minBracketY < 220) minBracketY = 220;
                doc.y = minBracketY;

                // Cuadro final (misma página)
                doc.fillColor('#0c2d18').font('Helvetica-Bold').fontSize(20).text('CUADRO FINAL', doc.page.margins.left, doc.y, { align: 'left' });
                doc.y += 22;

                const b = state.bracket || {};
                const rounds = b.rounds || [];
                rounds.forEach((round, i) => {
                    const roundName = i === 0 ? 'R1' : (i === rounds.length - 1 ? 'FINAL' : `Ronda ${i+1}`);
                    doc.fillColor('#1d3f1f').font('Helvetica-Bold').fontSize(16).text(roundName, { align: 'left' });
                    doc.y += 16;
                    round.matches.forEach(m => {
                        let score = '';
                        if (typeof m.s1 === 'number' && typeof m.s2 === 'number') score = ` ${m.s1} - ${m.s2}`;
                        const mark = m.winner ? '🏆' : '•';
                        doc.font('Helvetica').fontSize(12).fillColor('#000').text(`${mark} ${m.p1 || '???'} vs ${m.p2 || '???'}${score}`, doc.page.margins.left + 12, doc.y, { align: 'left' });
                        doc.y += 14;
                    });
                    doc.y += 8;
                });

                // Zona de campeón al final
                const championSectionY = Math.max(doc.y + 18, 460);
                doc.save();
                doc.rect(doc.page.margins.left, championSectionY, doc.page.width - doc.page.margins.left - doc.page.margins.right, 70).fill('#f1c40f');
                doc.fillColor('#16232e').font('Helvetica-Bold').fontSize(18).text('CAMPEÓN DEL TORNEO', doc.page.margins.left, championSectionY + 10, { align: 'center', width: doc.page.width - doc.page.margins.left - doc.page.margins.right });

                const champion = (b.champion || 'SIN DEFINIR').toUpperCase();
                doc.fillColor('#0a0a0a').font('Helvetica-Bold').fontSize(24).text(champion, doc.page.margins.left, championSectionY + 35, { align: 'center', width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
                doc.restore();

                doc.end();

                writeStream.on('finish', () => {
                    // Solo devolvemos el nombre del archivo para que el front lo descargue
                    callback({ success: true, fileName });
                });

            } catch (err) {
                console.error('Error generando PDF:', err);
                callback({ success: false, error: err.message });
            }
        });

        

    },
    
    
    getRooms: () => []
};