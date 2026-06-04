const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../arcade.db'));

const getTierlistData = () => {
    return {
        quotes: db.prepare('SELECT * FROM tierlist_quotes').all(),
        votes: db.prepare('SELECT * FROM tierlist_votes').all()
    };
};

module.exports = {
    init: (io) => {},
    handleSocket: (io, socket) => {
        socket.on('tierlist_action', (action) => {
            const reqUser = (action.user || "").toLowerCase();
            const isAdmin = ['administrador m', 'xarlie', 'musero', 'japa', 'administrador g'].includes(reqUser);

            if (action.type === 'getData') {
                socket.emit('tierlist_data', getTierlistData());
            }

            if (action.type === 'vote') {
                db.prepare('INSERT OR REPLACE INTO tierlist_votes (quote_id, user, tier) VALUES (?, ?, ?)')
                  .run(action.quoteId, reqUser, action.tier);
                io.emit('tierlist_data', getTierlistData());
            }

            if (action.type === 'deleteQuote' && isAdmin) {
                db.prepare('DELETE FROM tierlist_quotes WHERE id = ?').run(action.quoteId);
                db.prepare('DELETE FROM tierlist_votes WHERE quote_id = ?').run(action.quoteId);
                io.emit('tierlist_data', getTierlistData());
            }

            if (action.type === 'editQuote' && isAdmin) {
                db.prepare('UPDATE tierlist_quotes SET quote = ? WHERE id = ?').run(action.newText, action.quoteId);
                io.emit('tierlist_data', getTierlistData());
            }
        });
    },
    getRooms: () => []
};