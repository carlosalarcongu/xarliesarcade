const crypto = require('crypto');

// Lista compartida de emojis
const EMOJIS = ["😈","👽","🐸","🦊","🐵","🐼","🐯","🦄","🔥","⚡","🚀","🍕","🎲","🏆","🍷","🎩","👀","🧠"];

// Lógica CENTRALIZADA de Administrador
function checkIsAdmin(name) {
    const lower = name.toLowerCase();
    return lower.endsWith(" admin") || ["xarliebarber", "admin", "dios", "carlos"].includes(lower);
}

module.exports = {
    // Función fábrica de jugadores
    createPlayer: (socketId, nameInput) => {
        const cleanName = nameInput.trim();
        const isAdmin = checkIsAdmin(cleanName);
        const stableId = crypto.randomUUID();
        
        return {
            id: stableId,
            socketId: socketId,
            name: cleanName,
            rawName: cleanName,
            isAdmin: isAdmin,
            connected: true,
            isDead: false,
            score: 0
        };
    },

    // --- FUNCIÓN DE DESCONEXIÓN CENTRALIZADA ---
    // Devuelve true si hubo cambios en la lista
    handleDisconnect: (socketId, players, onReset) => {
        const index = players.findIndex(p => p.socketId === socketId);
        
        if (index !== -1) {
            const wasAdmin = players[index].isAdmin;
            players.splice(index, 1); // Borramos al jugador

            // CASO 1: Sala vacía -> RESET TOTAL
            if (players.length === 0) {
                console.log(`[Utils] Sala vacía. Ejecutando reset...`);
                if (onReset) onReset(); // Limpiamos variables del juego
                return true; 
            }

            // CASO 2: Se fue el admin -> Heredar corona
            if (wasAdmin && players.length > 0) {
                players[0].isAdmin = true;
            }
            return true; // Hubo cambios
        }
        return false; // No estaba en la lista
    }
};