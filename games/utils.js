const crypto = require('crypto');

// Lista compartida de emojis
const EMOJIS = ["😈","👽","🐸","🦊","🐵","🐼","🐯","🦄","🔥","⚡","🚀","🍕","🎲","🏆","🍷","🎩","👀","🧠"];

// Lógica CENTRALIZADA de Administrador
function checkIsAdmin(name) {
    const lower = name.toLowerCase();
    // Aquí defines quién es admin para TODOS los juegos
    return lower.endsWith(" admin") || ["xarliebarber", "admin", "dios"].includes(lower);
}

module.exports = {
    // Función fábrica de jugadores
    createPlayer: (socketId, nameInput) => {
        const cleanName = nameInput.trim();
        const isAdmin = checkIsAdmin(cleanName);
        const stableId = crypto.randomUUID();
        const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

        // Devolvemos el objeto base que todos los juegos comparten
        return {
            id: stableId,
            socketId: socketId,
            // name: cleanName + " " + emoji, // Nombre final con emoji
            name: cleanName, // Nombre final con emoji
            rawName: cleanName,            // Nombre limpio por si acaso
            isAdmin: isAdmin,
            connected: true,
            isDead: false,
            score: 0
        };
    }
};