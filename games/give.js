const { Rcon } = require('rcon-client');
const fs = require('fs');
const path = require('path');

// Configuración RCON
const RCON_CONFIG = {
    host: 'localhost',
    port: 25575,
    password: '0907' // ¡Asegúrate que sea la misma que server.properties!
};

// Configuración de Objetos y Cantidades
// Aquí defines qué se puede pedir y cuánto se da
const ALLOWED_ITEMS = {
    // Básicos (Anteriores)
    'minecraft:torch': 10,
    'minecraft:bread': 10,
    'cobblemon:poke_ball': 5,
    'cobblemon:great_ball': 1,
    'cobblemon:ultra_ball': 1,
    
    // Nuevos solicitados
    'cobblemon:potion': 2,
    'minecraft:oak_log': 5,
    'minecraft:water_bucket': 1,
    'minecraft:iron_sword': 1,
    'minecraft:chainmail_chestplate': 1,
    'minecraft:leather_boots': 1,
    'cobblemon:pokedex_red': 1,
    'minecraft:scaffolding': 16,
    'minecraft:iron_ingot': 1,
    'minecraft:diamond': 1,
    'minecraft:gold_ingot': 1,
    'minecraft:emerald': 1,
    'minecraft:oak_planks': 64,
    'minecraft:stone_bricks': 64,
    'minecraft:glass': 25,
    'minecraft:dirt': 1
    

};

// Ruta del archivo de registro
const LOG_FILE = path.join(__dirname, 'give_history.json');

// Memoria para el Cooldown (Usuario -> Timestamp)
const userCooldowns = new Map();
const COOLDOWN_TIME = 15000; // 15 segundos en milisegundos

// Función auxiliar para guardar logs
function saveLog(playerName, item, quantity) {
    let history = [];
    try {
        if (fs.existsSync(LOG_FILE)) {
            const data = fs.readFileSync(LOG_FILE, 'utf8');
            history = JSON.parse(data);
        }
    } catch (e) { console.error("Error leyendo log:", e); }

    const newEntry = {
        date: new Date().toISOString(),
        player: playerName,
        item: item,
        quantity: quantity
    };

    history.push(newEntry);

    // Opcional: Guardar solo los últimos 1000 registros para no llenar el disco
    if (history.length > 1000) history = history.slice(-1000);

    fs.writeFileSync(LOG_FILE, JSON.stringify(history, null, 2));
    
    // Conteo total por usuario (para mostrar en consola o futuro uso)
    const userTotal = history.filter(h => h.player === playerName && h.item === item).length * quantity;
    // console.log(`[LOG] ${playerName} ha recibido un total de ${userTotal} ${item}`);
}

module.exports = (io, socket) => {
    
    socket.on('requestItem', async (data) => {
        const { item, playerName } = data;

        // 1. Limpieza de nombre
        if (!playerName) return;
        const cleanName = playerName.replace(/👑|👤/g, '').trim().split(' ')[0];

        // 2. Validación de Objeto
        if (!ALLOWED_ITEMS.hasOwnProperty(item)) {
            return socket.emit('giveError', 'Objeto no válido o no permitido.');
        }
        const quantity = ALLOWED_ITEMS[item];

        // 3. Verificación de Cooldown (15s)
        const lastTime = userCooldowns.get(cleanName) || 0;
        const now = Date.now();
        const timeLeft = (COOLDOWN_TIME - (now - lastTime)) / 1000;

        if (timeLeft > 0) {
            return socket.emit('giveError', `Espera ${Math.ceil(timeLeft)}s para pedir más cosas.`);
        }

        console.log(`[GIVE] Enviando ${quantity}x ${item} a ${cleanName}`);

        try {
            // 4. Conexión RCON
            const rcon = await Rcon.connect(RCON_CONFIG);
            
            // Comando: /give <jugador> <item> <cantidad>
            const response = await rcon.send(`give ${cleanName} ${item} ${quantity}`);
            console.log(`[RCON] Respuesta: ${response}`);
            
            await rcon.end();

            // 5. Éxito: Actualizar Cooldown y Guardar Log
            userCooldowns.set(cleanName, now);
            saveLog(cleanName, item, quantity);

            // Confirmar al cliente
            socket.emit('giveSuccess', { item: item, quantity: quantity });

        } catch (error) {
            console.error('[RCON ERROR]', error);
            // Si falla la conexión (ej. server apagado), no activamos el cooldown para que pueda reintentar
            socket.emit('giveError', 'Error de conexión con Minecraft (¿Servidor apagado?).');
        }
    });
};