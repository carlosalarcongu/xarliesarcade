const capitals = [
    "MADRID", "PARIS", "LONDRES", "ROMA", "BERLIN", "LISBOA", "ATENAS", "DUBLIN", "BRUSELAS", "AMSTERDAM",
    "VIENA", "OSLO", "ESTOCOLMO", "COPENHAGUE", "HELSINKI", "VARSOVIA", "PRAGA", "BUDAPEST", "BUCAREST",
    "SOFIA", "TOKIO", "PEKIN", "SEUL", "BANGKOK", "HANOI", "YAKARTA", "SINGAPUR", "MANILA", "CANBERRA",
    "OTTAWA", "WELLINGTON", "WASHINGTON", "BRASILIA", "MEXICO", "BUENOS AIRES", "BOGOTA", "LIMA", "SANTIAGO",
    "QUITO", "CARACAS", "LA HABANA", "EL CAIRO", "RABAT", "NAIROBI", "LUANDA", "PRETORIA", "MOSCU"
];

module.exports = {
    createPlayer: (socketId, name) => {
        return {
            id: socketId + '_' + Date.now(), // ID único persistente
            socketId: socketId,              // ID del socket actual
            name: name,
            rawName: name, 
            isAdmin: false,
            connected: true,
            timeout: null
        };
    },

    getRandomCapital: (existingRoomsKeys) => {
        // Filtramos las capitales que ya se están usando como ID de sala
        // existingRoomsKeys debe ser un array de strings (las claves del objeto rooms)
        const keys = existingRoomsKeys || [];
        let available = capitals.filter(c => !keys.includes(c));
        
        // Si se acaban las capitales (raro), generamos un ID numérico
        if (available.length === 0) return "MUNDO-" + Math.floor(Math.random() * 1000);
        
        return available[Math.floor(Math.random() * available.length)];
    },

    // Gestión de desconexión genérica
    handleDisconnect: (socketId, players, onEmptyCallback) => {
        const p = players.find(x => x.socketId === socketId);
        if (p) {
            p.connected = false;
            // Timeout de seguridad de 20 mins para borrar al usuario si no vuelve
            if(p.timeout) clearTimeout(p.timeout);
            
            p.timeout = setTimeout(() => {
                const idx = players.findIndex(pl => pl.id === p.id);
                if(idx !== -1) {
                    players.splice(idx, 1);
                    // Si al borrar el jugador la sala se queda vacía, ejecutamos el callback
                    if (players.length === 0 && onEmptyCallback) onEmptyCallback();
                }
            }, 60 * 1000); 
            return true; // Hubo cambios (alguien se desconectó)
        }
        return false;
    }
};