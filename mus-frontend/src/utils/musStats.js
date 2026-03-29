// src/utils/musStats.js
export const calculateRanking = (matches, mode, useNormalization = false, minRounds = false) => {
    let i = [...matches].sort((a,b) => a.id - b.id);
    if (minRounds) i = i.filter(m => (m.s1 + m.s2) >= 3);
    let stats = {};

    const add = (k, myS, oppS) => {
        if(!stats[k]) stats[k] = {rWon:0, rLost:0, pPlayed:0};
        stats[k].pPlayed++;
        stats[k].rWon += myS;
        stats[k].rLost += oppS;
    };

    i.forEach(n => {
        if (mode === 'ranking_pair') {
            add([n.p1, n.p2].sort().join(' y '), n.s1, n.s2);
            add([n.p3, n.p4].sort().join(' y '), n.s2, n.s1);
        } else {
            [n.p1, n.p2, n.p3, n.p4].forEach((p, idx) => {
                add(p, idx < 2 ? n.s1 : n.s2, idx < 2 ? n.s2 : n.s1);
            });
        }
    });

    return Object.keys(stats).map(k => {
        const s = stats[k];
        const total = s.rWon + s.rLost;
        return { name: k, rWon: s.rWon, rLost: s.rLost, pPlayed: s.pPlayed, pct: total > 0 ? (s.rWon / total) * 100 : 0, dgp: s.rWon - s.rLost };
    }).sort((a,b) => b.pct - a.pct || b.dgp - a.dgp);
};

export const getStreaks = (matches) => {
    let streaks = {};
    let wins = []; let losses = [];
    [...matches].sort((a,b) => a.id - b.id).forEach(m => {
        const teams = [[m.p1, m.p2], [m.p3, m.p4]];
        const results = [m.s1 > m.s2, m.s2 > m.s1];
        teams.forEach((t, idx) => {
            t.forEach(p => {
                if(!streaks[p]) streaks[p] = { type: null, val: 0 };
                const won = results[idx];
                if((won && streaks[p].type === 'win') || (!won && streaks[p].type === 'loss')) streaks[p].val++;
                else {
                    if(streaks[p].type === 'win') wins.push({n: p, val: streaks[p].val});
                    else if(streaks[p].type === 'loss') losses.push({n: p, val: streaks[p].val});
                    streaks[p] = { type: won ? 'win' : 'loss', val: 1 };
                }
            });
        });
    });
    return { 
        topWins: wins.sort((a,b) => b.val - a.val).slice(0, 10), 
        topLosses: losses.sort((a,b) => b.val - a.val).slice(0, 10) 
    };
};