const { Rcon } = require('rcon-client');
const fs = require('fs');
const path = require('path');

const RCON_CONFIG = { host: 'localhost', port: 25575, password: '0907' };

// Items gratis (con cooldown de 15s)
const ALLOWED_ITEMS = {
    'minecraft:torch': 10, 'minecraft:bread': 10, 'cobblemon:poke_ball': 5,
    'cobblemon:great_ball': 1, 'cobblemon:potion': 2, 'minecraft:iron_ingot': 1,
    'minecraft:diamond': 1, 'minecraft:water_bucket': 1, 'cobblemon:pokedex_red': 1,
    'minecraft:oak_planks': 64, 'minecraft:stone_bricks': 64, 'minecraft:glass': 25, 'minecraft:dirt': 1
};

// Mapeo de "ID web" -> "ID Minecraft" (Todos cuestan 1 Diamante)
const DIAMOND_TRADES = {
    'special:trade': 'cobblemon:rare_candy',
    // Piedras
    'stone:fire_stone': 'cobblemon:fire_stone',
    'stone:water_stone': 'cobblemon:water_stone',
    'stone:thunder_stone': 'cobblemon:thunder_stone',
    'stone:leaf_stone': 'cobblemon:leaf_stone',
    'stone:moon_stone': 'cobblemon:moon_stone',
    'stone:sun_stone': 'cobblemon:sun_stone',
    'stone:ice_stone': 'cobblemon:ice_stone',
    'stone:shiny_stone': 'cobblemon:shiny_stone',
    'stone:dusk_stone': 'cobblemon:dusk_stone',
    'stone:dawn_stone': 'cobblemon:dawn_stone',
    'stone:link_cable': 'cobblemon:link_cable',
    // Stats
    'stat:hp_up': 'cobblemon:hp_up',
    'stat:protein': 'cobblemon:protein',
    'stat:iron': 'cobblemon:iron',
    'stat:calcium': 'cobblemon:calcium',
    'stat:zinc': 'cobblemon:zinc',
    'stat:carbos': 'cobblemon:carbos',
    'stat:pp_up': 'cobblemon:pp_up'
};

const userCooldowns = new Map();
const COOLDOWN_TIME = 15000;

module.exports = (io, socket) => {
    socket.on('requestItem', async (data) => {
        const { item, playerName } = data;
        if (!playerName) return;
        const cleanName = playerName.replace(/👑|👤/g, '').trim().split(' ')[0];

        // 1. Identificar tipo de transacción
        const isDiamondTrade = DIAMOND_TRADES.hasOwnProperty(item);
        const isSpecial = ['special:mending', 'special:madrid', 'special:sacrifice'].includes(item);
        const isNormal = ALLOWED_ITEMS.hasOwnProperty(item);

        if (!isDiamondTrade && !isSpecial && !isNormal) return socket.emit('giveError', 'ID no válido.');

        // 2. Cooldown General
        const now = Date.now();
        const timeLeft = (COOLDOWN_TIME - (now - (userCooldowns.get(cleanName) || 0))) / 1000;
        if (timeLeft > 0) return socket.emit('giveError', `Espera ${Math.ceil(timeLeft)}s.`);

        try {
            const rcon = await Rcon.connect(RCON_CONFIG);
            
            if (isDiamondTrade) {
                // LÓGICA DE COBRO: 1 Diamante
                const clearResp = await rcon.send(`clear ${cleanName} minecraft:diamond 1`);
                const success = !clearResp.includes("No items") && !clearResp.includes("No se han encontrado") && /\d/.test(clearResp);

                if (success) {
                    const mcItem = DIAMOND_TRADES[item];
                    await rcon.send(`give ${cleanName} ${mcItem} 1`);
                    socket.emit('giveSuccess', { item: mcItem, quantity: 1 });
                } else {
                    await rcon.end();
                    return socket.emit('giveError', 'Necesitas 1 Diamante en el inventario.');
                }
            } 
            else if (isNormal) {
                const qty = ALLOWED_ITEMS[item];
                await rcon.send(`give ${cleanName} ${item} ${qty}`);
                socket.emit('giveSuccess', { item: item, quantity: qty });
            }
            else if (item === 'special:mending') {
                const resp = await rcon.send(`enchant ${cleanName} minecraft:mending`);
                if (resp.includes("Failed")) { await rcon.end(); return socket.emit('giveError', 'Sostén un objeto válido.'); }
                socket.emit('giveSuccess', { item: 'Mending', quantity: null });
            }
            else if (item === 'special:madrid') {
                await rcon.send(`enchant ${cleanName} minecraft:efficiency 5`);
                await rcon.send(`enchant ${cleanName} minecraft:fortune 3`);
                socket.emit('giveSuccess', { item: 'Hala Madrid', quantity: null });
            }
            else if (item === 'special:sacrifice') {
                await rcon.send(`effect give ${cleanName} minecraft:slowness 150 255`);
                await rcon.send(`give ${cleanName} cobblemon:quick_ball 1`);
                socket.emit('giveSuccess', { item: 'Sacrificio', quantity: 1 });
            }

            userCooldowns.set(cleanName, now);
            await rcon.end();
        } catch (error) {
            console.error(error);
            socket.emit('giveError', 'Error de conexión RCON.');
        }
    });
};