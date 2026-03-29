// src/utils/musLogic.js

export const emojis = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷','🕸','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🐓','🦃','🦚','🦜','🦢','🦩','🕊','🐇','🦝','🦨','🦡','🦦','🦫','🐁','🐀','🐿','🦔','🐉','🐲'];

export const getAvatar = (name) => {
    if (!name) return '👤';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % emojis.length;
    return emojis[index];
};

export const getColor = (pct) => {
    const colors = ['#ff4757', '#ff6b81', '#ff7f50', '#ffa502', '#eccc68', '#f1c40f', '#7bed9f', '#2ed573', '#26de81', '#009432'];
    const index = Math.min(Math.floor(pct / 10), 9);
    return colors[index];
};

export const filterMatchesByPeriod = (matches, period) => {
    if (period === 'all') return matches;
    const now = new Date();
    let limitDate = null;
    
    if (period === '7days') limitDate = new Date(now.setDate(now.getDate() - 7));
    else if (period === '30days') limitDate = new Date(now.setDate(now.getDate() - 30));
    else if (period === 'year') limitDate = new Date(now.setFullYear(now.getFullYear() - 1));
    
    if (!limitDate) return matches;
    return matches.filter(m => new Date(m.date) >= limitDate);
};