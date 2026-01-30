const { Rcon } = require('rcon-client');
const fs = require('fs');
const path = require('path');

// Configuración RCON
const RCON_CONFIG = {
    host: 'localhost',
    port: 25575,
    password: '0907' 
};

// --- CONFIGURACIÓN DE OBJETOS ESTÁNDAR ---
const ALLOWED_ITEMS = {
    // Básicos
    'minecraft:torch': 10,
    'minecraft:bread': 10,
    'cobblemon:poke_ball': 5,
    'cobblemon:great_ball': 1,
    'cobblemon:ultra_ball': 1,
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
    'minecraft:dirt': 1,
    'cobblemon:rare_candy': 1,
};

// --- CONFIGURACIÓN DE ACCIONES ESPECIALES ---
const SPECIAL_ACTIONS = ['special:mending', 'special:madrid', 'special:sacrifice', 'special:trade'];

// Rutas y Constantes
const LOG_FILE = path.join(__dirname, 'give_history.json');
const COOLDOWN_TIME = 15000; // 15 segundos estándar
const TRADE_COOLDOWN_TIME = 300000; // 5 minutos (300,000 ms) para el intercambio

// Memoria
const userCooldowns = new Map(); // Cooldown general
const tradeCooldowns = new Map(); // Cooldown específico para el intercambio

// Guardar logs
function saveLog(playerName, item, quantity) {
    let history = [];
    try {
        if (fs.existsSync(LOG_FILE)) {
            const data = fs.readFileSync(LOG_FILE, 'utf8');
            history = JSON.parse(data);
        }
    } catch (e) { console.error("Error leyendo log:", e); }

    history.push({
        date: new Date().toISOString(),
        player: playerName,
        item: item,
        quantity: quantity
    });

    if (history.length > 1000) history = history.slice(-1000);
    fs.writeFileSync(LOG_FILE, JSON.stringify(history, null, 2));
}

module.exports = (io, socket) => {
    
    socket.on('requestItem', async (data) => {
        const { item, playerName } = data;

        // 1. Limpieza de nombre
        if (!playerName) return;
        const cleanName = playerName.replace(/👑|👤/g, '').trim().split(' ')[0];

        // 2. Comprobación de Tipo (Item Normal vs Especial)
        const isSpecial = SPECIAL_ACTIONS.includes(item);
        const isNormal = ALLOWED_ITEMS.hasOwnProperty(item);

        if (!isSpecial && !isNormal) {
            return socket.emit('giveError', 'Objeto o acción no válida.');
        }

        // 3. Verificación de Cooldowns
        const now = Date.now();

        // 3a. Cooldown de Intercambio (5 min) - Solo si pide "Intercambio"
        if (item === 'special:trade') {
            const lastTrade = tradeCooldowns.get(cleanName) || 0;
            const tradeTimeLeft = (TRADE_COOLDOWN_TIME - (now - lastTrade)) / 1000;
            if (tradeTimeLeft > 0) {
                const mins = Math.floor(tradeTimeLeft / 60);
                const secs = Math.ceil(tradeTimeLeft % 60);
                return socket.emit('giveError', `Stock agotado. Vuelve en ${mins}m ${secs}s.`);
            }
        }

        // 3b. Cooldown General (15s) - Aplica a TODO
        const lastTime = userCooldowns.get(cleanName) || 0;
        const timeLeft = (COOLDOWN_TIME - (now - lastTime)) / 1000;
        
        if (timeLeft > 0) {
            return socket.emit('giveError', `Espera ${Math.ceil(timeLeft)}s para pedir más cosas.`);
        }

        console.log(`[GIVE] Solicitud: ${item} para ${cleanName}`);

        try {
            const rcon = await Rcon.connect(RCON_CONFIG);
            let response = "";
            let quantityRecorded = 1; // Por defecto para logs

            // --- LÓGICA DE ACCIONES ---
            
            if (isNormal) {
                // CASO NORMAL: /give simple
                const qty = ALLOWED_ITEMS[item];
                quantityRecorded = qty;
                response = await rcon.send(`give ${cleanName} ${item} ${qty}`);
            
            } else if (item === 'special:mending') {
                // SORPRESA: Mending al item en mano
                // Nota: Si no tiene item en mano, el comando fallará silenciosamente o dará error en consola MC
                response = await rcon.send(`enchant ${cleanName} minecraft:mending`);
                if (response.includes("Failed") || response.includes("cannot")) {
                    await rcon.end();
                    return socket.emit('giveError', '¡Debes sostener un objeto encantable en la mano!');
                }

            } else if (item === 'special:madrid') {
                // HALA MADRID: Eficiencia 5 + Fortuna 3
                await rcon.send(`enchant ${cleanName} minecraft:efficiency 5`);
                response = await rcon.send(`enchant ${cleanName} minecraft:fortune 3`);
                 if (response.includes("Failed")) {
                    await rcon.end();
                    return socket.emit('giveError', '¡Sostén una herramienta válida!');
                }

            } else if (item === 'special:sacrifice') {
                // SACRIFICIO: Lentitud VI (255) x 150s + Veloz Ball
                await rcon.send(`effect give ${cleanName} minecraft:slowness 150 255`);
                response = await rcon.send(`give ${cleanName} cobblemon:quick_ball 1`);

            } else if (item === 'special:trade') {
                // INTERCAMBIO: Quitar 1 Diamante -> Dar 1 Rare Candy
                // Primero intentamos borrar el diamante
                const clearResp = await rcon.send(`clear ${cleanName} minecraft:diamond 1`);
                
                // Analizamos respuesta del clear. 
                // Éxito típico: "Removed 1 item..." o "Se ha eliminado..."
                // Fallo típico: "No items were found..." o "No se han encontrado..."
                
                // Verificamos si NO falló y si borró ALGO (la respuesta suele contener el número '1')
                const successClear = !clearResp.includes("No items") && !clearResp.includes("No se han encontrado") && /\d/.test(clearResp);

                if (successClear) {
                    response = await rcon.send(`give ${cleanName} cobblemon:rare_candy 1`);
                    // Solo si hubo éxito actualizamos el cooldown largo
                    tradeCooldowns.set(cleanName, now);
                } else {
                    await rcon.end();
                    return socket.emit('giveError', '¡No tienes un Diamante en el inventario para pagar!');
                }
            }

            await rcon.end();

            // 5. Finalización
            userCooldowns.set(cleanName, now); // Actualizar cooldown general
            saveLog(cleanName, item, quantityRecorded);

            // Confirmar al cliente (sin cantidad si es especial)
            socket.emit('giveSuccess', { item: item, quantity: isNormal ? quantityRecorded : null });

        } catch (error) {
            console.error('[RCON ERROR]', error);
            socket.emit('giveError', 'Error de conexión con Minecraft.');
        }
    });
};