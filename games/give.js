const { Rcon } = require('rcon-client');

const RCON_CONFIG = { host: 'localhost', port: 25575, password: '0907' };

// --- CATÁLOGO DE TIENDA POR XP ---
// Coste 1 XP para casi todo. Objetos "Premium" a 30 XP.
const SHOP_CATALOG = {
    // --- MATERIALES (Stacks generosos) ---
    'mat:oak_log': { id: 'minecraft:oak_log', count: 64, cost: 1 },
    'mat:spruce_log': { id: 'minecraft:spruce_log', count: 64, cost: 1 },
    'mat:birch_log': { id: 'minecraft:birch_log', count: 64, cost: 1 },
    'mat:cherry_log': { id: 'minecraft:cherry_log', count: 64, cost: 1 },
    'mat:stone': { id: 'minecraft:stone', count: 64, cost: 1 },
    'mat:cobblestone': { id: 'minecraft:cobblestone', count: 64, cost: 1 },
    'mat:glass': { id: 'minecraft:glass', count: 64, cost: 1 },
    'mat:white_wool': { id: 'minecraft:white_wool', count: 64, cost: 1 },
    'mat:white_concrete': { id: 'minecraft:white_concrete', count: 64, cost: 1 },
    'mat:black_concrete': { id: 'minecraft:black_concrete', count: 64, cost: 1 },
    'mat:sand': { id: 'minecraft:sand', count: 64, cost: 1 },
    'mat:gravel': { id: 'minecraft:gravel', count: 64, cost: 1 },
    'mat:torch': { id: 'minecraft:torch', count: 64, cost: 1 },
    'mat:lantern': { id: 'minecraft:lantern', count: 16, cost: 1 },
    'mat:sea_lantern': { id: 'minecraft:sea_lantern', count: 16, cost: 1 }, // NUEVO
    'mat:glowstone': { id: 'minecraft:glowstone', count: 16, cost: 1 }, // NUEVO
    'mat:bookshelf': { id: 'minecraft:bookshelf', count: 16, cost: 1 }, // NUEVO
    'mat:deepslate': { id: 'minecraft:deepslate', count: 64, cost: 1 }, // NUEVO
    'mat:mud_bricks': { id: 'minecraft:mud_bricks', count: 64, cost: 1 }, // NUEVO
    'mat:obsidian': { id: 'minecraft:obsidian', count: 16, cost: 1 }, // NUEVO
    'mat:scaffolding': { id: 'minecraft:scaffolding', count: 64, cost: 1 }, // NUEVO
    'mat:chain': { id: 'minecraft:chain', count: 16, cost: 1 }, // NUEVO
    'mat:bamboo': { id: 'minecraft:bamboo', count: 64, cost: 1 }, // NUEVO
    'mat:glow_frame': { id: 'minecraft:glow_item_frame', count: 8, cost: 1 },
    'mat:cw_lantern': { id: 'carved_wood:oak_lantern', count: 16, cost: 1 },
    'mat:cw_ladder': { id: 'carved_wood:spruce_ladder', count: 32, cost: 1 },
    'mat:elevator': { id: 'elevatorid:elevator_white', count: 2, cost: 1 },

    // --- UTILIDADES Y EQUIPO MINECRAFT ---
    'util:water_bucket': { id: 'minecraft:water_bucket', count: 1, cost: 1 },
    'util:lava_bucket': { id: 'minecraft:lava_bucket', count: 1, cost: 1 },
    'util:chest': { id: 'minecraft:chest', count: 16, cost: 1 },
    'util:hopper': { id: 'minecraft:hopper', count: 4, cost: 1 },
    'util:shulker': { id: 'minecraft:shulker_shell', count: 2, cost: 1 },
    'util:bonemeal': { id: 'minecraft:bone_meal', count: 64, cost: 1 },
    'util:diamond_sword': { id: 'minecraft:diamond_sword', count: 1, cost: 1 },
    'util:shield': { id: 'minecraft:shield', count: 1, cost: 1 },
    'util:horse_armor': { id: 'minecraft:diamond_horse_armor', count: 1, cost: 1 },
    'util:backpack': { id: 'sophisticatedbackpacks:netherite_backpack', count: 1, cost: 1 },
    'util:waystone': { id: 'waystones:waystone', count: 1, cost: 1 },
    'util:warp_plate': { id: 'waystones:warp_plate', count: 2, cost: 1 },
    'util:bottles': { id: 'minecraft:glass_bottle', count: 64, cost: 1 },
    'util:saddle': { id: 'minecraft:saddle', count: 1, cost: 1 }, // NUEVO
    'util:nametag': { id: 'minecraft:name_tag', count: 1, cost: 1 }, // NUEVO
    'util:lead': { id: 'minecraft:lead', count: 2, cost: 1 }, // NUEVO
    'util:ender_pearl': { id: 'minecraft:ender_pearl', count: 16, cost: 1 }, // NUEVO
    'util:slime_ball': { id: 'minecraft:slime_ball', count: 16, cost: 1 }, // NUEVO
    'util:anvil': { id: 'minecraft:anvil', count: 1, cost: 1 }, // NUEVO
    'util:enchanting': { id: 'minecraft:enchanting_table', count: 1, cost: 1 }, // NUEVO
    'util:spyglass': { id: 'minecraft:spyglass', count: 1, cost: 1 }, // NUEVO
    'util:clock': { id: 'minecraft:clock', count: 1, cost: 1 }, // NUEVO
    'util:compass': { id: 'minecraft:compass', count: 1, cost: 1 }, // NUEVO

    // --- MINERALES ---
    'min:coal': { id: 'minecraft:coal', count: 32, cost: 1 },
    'min:iron': { id: 'minecraft:iron_ingot', count: 16, cost: 1 },
    'min:gold': { id: 'minecraft:gold_ingot', count: 16, cost: 1 },
    'min:lapis': { id: 'minecraft:lapis_lazuli', count: 32, cost: 1 },
    'min:redstone': { id: 'minecraft:redstone', count: 64, cost: 1 },
    'min:diamond': { id: 'minecraft:diamond', count: 3, cost: 1 },
    'min:emerald': { id: 'minecraft:emerald', count: 16, cost: 1 },
    'min:quartz': { id: 'minecraft:quartz', count: 32, cost: 1 },
    'min:amethyst': { id: 'minecraft:amethyst_shard', count: 16, cost: 1 },
    'min:copper_block': { id: 'minecraft:copper_block', count: 16, cost: 1 }, // NUEVO
    'min:raw_iron_blk': { id: 'minecraft:raw_iron_block', count: 8, cost: 1 }, // NUEVO
    'min:raw_gold_blk': { id: 'minecraft:raw_gold_block', count: 8, cost: 1 }, // NUEVO
    'min:coal_block': { id: 'minecraft:coal_block', count: 16, cost: 1 }, // NUEVO
    'min:clay': { id: 'minecraft:clay_ball', count: 64, cost: 1 }, // NUEVO
    'min:nether_brick': { id: 'minecraft:nether_brick', count: 64, cost: 1 }, // NUEVO
    // CARO
    'min:netherite': { id: 'minecraft:netherite_ingot', count: 1, cost: 10 }, // 30 XP

    // --- CONSUMIBLES MINECRAFT ---
    'cons:steak': { id: 'minecraft:cooked_beef', count: 32, cost: 1 },
    'cons:gcarrot': { id: 'minecraft:golden_carrot', count: 16, cost: 1 },
    'cons:bread': { id: 'minecraft:bread', count: 64, cost: 1 },
    'cons:gapple': { id: 'minecraft:golden_apple', count: 2, cost: 1 },
    'cons:totem': { id: 'minecraft:totem_of_undying', count: 1, cost: 1 },
    'cons:rocket': { id: 'minecraft:firework_rocket', count: 64, cost: 1 },

    // --- POKEBALLS ---
    'ball:poke': { id: 'cobblemon:poke_ball', count: 16, cost: 1 },
    'ball:great': { id: 'cobblemon:great_ball', count: 10, cost: 1 },
    'ball:ultra': { id: 'cobblemon:ultra_ball', count: 5, cost: 1 },
    'ball:quick': { id: 'cobblemon:quick_ball', count: 5, cost: 1 },
    'ball:dusk': { id: 'cobblemon:dusk_ball', count: 5, cost: 1 },
    'ball:luxury': { id: 'cobblemon:luxury_ball', count: 5, cost: 1 },
    'ball:heal': { id: 'cobblemon:heal_ball', count: 5, cost: 1 },
    'ball:premier': { id: 'cobblemon:premier_ball', count: 10, cost: 1 },
    'ball:heavy': { id: 'cobblemon:heavy_ball', count: 5, cost: 1 }, // NUEVO
    'ball:level': { id: 'cobblemon:level_ball', count: 5, cost: 1 }, // NUEVO
    'ball:lure': { id: 'cobblemon:lure_ball', count: 5, cost: 1 }, // NUEVO
    'ball:moon': { id: 'cobblemon:moon_ball', count: 5, cost: 1 }, // NUEVO
    'ball:friend': { id: 'cobblemon:friend_ball', count: 5, cost: 1 }, // NUEVO
    'ball:love': { id: 'cobblemon:love_ball', count: 5, cost: 1 }, // NUEVO
    'ball:fast': { id: 'cobblemon:fast_ball', count: 5, cost: 1 }, // NUEVO
    'ball:repeat': { id: 'cobblemon:repeat_ball', count: 5, cost: 1 }, // NUEVO
    'ball:nest': { id: 'cobblemon:nest_ball', count: 5, cost: 1 }, // NUEVO
    'ball:timer': { id: 'cobblemon:timer_ball', count: 5, cost: 1 },
    'ball:net': { id: 'cobblemon:net_ball', count: 5, cost: 1 },
    'ball:dive': { id: 'cobblemon:dive_ball', count: 5, cost: 1 },
    // CARO
    'ball:master': { id: 'cobblemon:master_ball', count: 1, cost: 30 }, // 30 XP
    'ball:beast': { id: 'cobblemon:beast_ball', count: 1, cost: 10 }, // 30 XP

    // --- EVOLUTIVOS ---
    'evo:fire': { id: 'cobblemon:fire_stone', count: 1, cost: 1 },
    'evo:water': { id: 'cobblemon:water_stone', count: 1, cost: 1 },
    'evo:thunder': { id: 'cobblemon:thunder_stone', count: 1, cost: 1 },
    'evo:leaf': { id: 'cobblemon:leaf_stone', count: 1, cost: 1 },
    'evo:moon': { id: 'cobblemon:moon_stone', count: 1, cost: 1 },
    'evo:sun': { id: 'cobblemon:sun_stone', count: 1, cost: 1 },
    'evo:ice': { id: 'cobblemon:ice_stone', count: 1, cost: 1 },
    'evo:shiny': { id: 'cobblemon:shiny_stone', count: 1, cost: 1 },
    'evo:dusk': { id: 'cobblemon:dusk_stone', count: 1, cost: 1 },
    'evo:dawn': { id: 'cobblemon:dawn_stone', count: 1, cost: 1 },
    'evo:link': { id: 'cobblemon:link_cable', count: 1, cost: 1 },
    'evo:kings_rock': { id: 'cobblemon:kings_rock', count: 1, cost: 1 },
    'evo:metal_coat': { id: 'cobblemon:metal_coat', count: 1, cost: 1 },
    'evo:upgrade': { id: 'cobblemon:upgrade', count: 1, cost: 1 },
    'evo:dubious': { id: 'cobblemon:dubious_disc', count: 1, cost: 1 },
    'evo:protector': { id: 'cobblemon:protector', count: 1, cost: 1 },
    'evo:reaper': { id: 'cobblemon:reaper_cloth', count: 1, cost: 1 },
    'evo:razor_fang': { id: 'cobblemon:razor_fang', count: 1, cost: 1 },
    'evo:augurite': { id: 'cobblemon:black_augurite', count: 1, cost: 1 },
    'evo:sweet_apple': { id: 'cobblemon:sweet_apple', count: 1, cost: 1 },
    'evo:tart_apple': { id: 'cobblemon:tart_apple', count: 1, cost: 1 },
    'evo:sw_strawberry': { id: 'cobblemon:strawberry_sweet', count: 1, cost: 1 },
    'evo:sw_love': { id: 'cobblemon:love_sweet', count: 1, cost: 1 },
    'evo:sw_berry': { id: 'cobblemon:berry_sweet', count: 1, cost: 1 },
    'evo:sw_clover': { id: 'cobblemon:clover_sweet', count: 1, cost: 1 },
    'evo:sw_flower': { id: 'cobblemon:flower_sweet', count: 1, cost: 1 },
    'evo:sw_star': { id: 'cobblemon:star_sweet', count: 1, cost: 1 },
    'evo:sw_ribbon': { id: 'cobblemon:ribbon_sweet', count: 1, cost: 1 },
    'evo:dragon_scale': { id: 'cobblemon:dragon_scale', count: 1, cost: 1 }, // NUEVO
    'evo:electirizer': { id: 'cobblemon:electirizer', count: 1, cost: 1 }, // NUEVO
    'evo:magmarizer': { id: 'cobblemon:magmarizer', count: 1, cost: 1 }, // NUEVO
    'evo:prism_scale': { id: 'cobblemon:prism_scale', count: 1, cost: 1 }, // NUEVO
    'evo:oval_stone': { id: 'cobblemon:oval_stone', count: 1, cost: 1 }, // NUEVO
    'evo:whipped_dream': { id: 'cobblemon:whipped_dream', count: 1, cost: 1 }, // NUEVO
    'evo:sachet': { id: 'cobblemon:sachet', count: 1, cost: 1 }, // NUEVO
    'evo:galarica_cuff': { id: 'cobblemon:galarica_cuff', count: 1, cost: 1 }, // NUEVO
    'evo:galarica_wreath': { id: 'cobblemon:galarica_wreath', count: 1, cost: 1 }, // NUEVO
    'evo:auspicious': { id: 'cobblemon:auspicious_armor', count: 1, cost: 1 }, // NUEVO
    'evo:malicious': { id: 'cobblemon:malicious_armor', count: 1, cost: 1 }, // NUEVO

    // --- EQUIPO POKEMON Y GEMAS ---
    'eq:exp_share': { id: 'cobblemon:exp_share', count: 1, cost: 1 },
    'eq:lucky_egg': { id: 'cobblemon:lucky_egg', count: 1, cost: 1 },
    'eq:leftovers': { id: 'cobblemon:leftovers', count: 1, cost: 1 },
    'eq:choice_band': { id: 'cobblemon:choice_band', count: 1, cost: 1 },
    'eq:choice_specs': { id: 'cobblemon:choice_specs', count: 1, cost: 1 },
    'eq:choice_scarf': { id: 'cobblemon:choice_scarf', count: 1, cost: 1 },
    'eq:assault_vest': { id: 'cobblemon:assault_vest', count: 1, cost: 1 },
    'eq:rocky_helmet': { id: 'cobblemon:rocky_helmet', count: 1, cost: 1 },
    'eq:focus_sash': { id: 'cobblemon:focus_sash', count: 1, cost: 1 },
    'eq:shell_bell': { id: 'cobblemon:shell_bell', count: 1, cost: 1 },
    'eq:life_orb': { id: 'cobblemon:life_orb', count: 1, cost: 1 }, // NUEVO
    'eq:toxic_orb': { id: 'cobblemon:toxic_orb', count: 1, cost: 1 }, // NUEVO
    'eq:flame_orb': { id: 'cobblemon:flame_orb', count: 1, cost: 1 }, // NUEVO
    'eq:eviolite': { id: 'cobblemon:eviolite', count: 1, cost: 1 }, // NUEVO
    'eq:boots': { id: 'cobblemon:heavy_duty_boots', count: 1, cost: 1 }, // NUEVO
    'eq:weakness': { id: 'cobblemon:weakness_policy', count: 1, cost: 1 }, // NUEVO
    'eq:light_clay': { id: 'cobblemon:light_clay', count: 1, cost: 1 }, // NUEVO
    'eq:black_sludge': { id: 'cobblemon:black_sludge', count: 1, cost: 1 }, // NUEVO
    'eq:soothe_bell': { id: 'cobblemon:soothe_bell', count: 1, cost: 1 }, // NUEVO
    'eq:quick_claw': { id: 'cobblemon:quick_claw', count: 1, cost: 1 }, // NUEVO
    // Gemas
    'gem:fire': { id: 'cobblemon:fire_gem', count: 1, cost: 1 },
    'gem:water': { id: 'cobblemon:water_gem', count: 1, cost: 1 },
    'gem:grass': { id: 'cobblemon:grass_gem', count: 1, cost: 1 },
    'gem:electric': { id: 'cobblemon:electric_gem', count: 1, cost: 1 },
    'gem:psychic': { id: 'cobblemon:psychic_gem', count: 1, cost: 1 },
    'gem:ice': { id: 'cobblemon:ice_gem', count: 1, cost: 1 },
    'gem:dragon': { id: 'cobblemon:dragon_gem', count: 1, cost: 1 },
    'gem:fairy': { id: 'cobblemon:fairy_gem', count: 1, cost: 1 },
    'gem:fighting': { id: 'cobblemon:fighting_gem', count: 1, cost: 1 },
    'gem:flying': { id: 'cobblemon:flying_gem', count: 1, cost: 1 },
    'gem:ghost': { id: 'cobblemon:ghost_gem', count: 1, cost: 1 },
    'gem:ground': { id: 'cobblemon:ground_gem', count: 1, cost: 1 },
    'gem:steel': { id: 'cobblemon:steel_gem', count: 1, cost: 1 },
    'gem:normal': { id: 'cobblemon:normal_gem', count: 1, cost: 1 },

    // --- MÁQUINAS ---
    'mach:healer': { id: 'cobblemon:healing_machine', count: 1, cost: 1 },
    'mach:pc': { id: 'cobblemon:pc', count: 1, cost: 1 },
    'mach:fossil': { id: 'cobblemon:fossil_analyzer', count: 1, cost: 1 },
    'mach:monitor': { id: 'cobblemon:monitor', count: 1, cost: 1 },
    'mach:tank': { id: 'cobblemon:restoration_tank', count: 1, cost: 1 },
    'mach:campfire': { id: 'cobblemon:campfire_pot', count: 1, cost: 1 },
    'mach:pedestal': { id: 'mega_showdown:pedestal', count: 1, cost: 1 },
    'mach:brewing': { id: 'minecraft:brewing_stand', count: 1, cost: 1 }, // NUEVO
    'mach:cauldron': { id: 'minecraft:cauldron', count: 1, cost: 1 }, // NUEVO
    'mach:blast': { id: 'minecraft:blast_furnace', count: 1, cost: 1 }, // NUEVO
    'mach:smoker': { id: 'minecraft:smoker', count: 1, cost: 1 }, // NUEVO
    'mach:loom': { id: 'minecraft:loom', count: 1, cost: 1 }, // NUEVO
    'mach:carto': { id: 'minecraft:cartography_table', count: 1, cost: 1 }, // NUEVO
    'mach:smith': { id: 'minecraft:smithing_table', count: 1, cost: 1 }, // NUEVO
    'mach:grind': { id: 'minecraft:grindstone', count: 1, cost: 1 }, // NUEVO
    'mach:stonecut': { id: 'minecraft:stonecutter', count: 1, cost: 1 }, // NUEVO
    'mach:composter': { id: 'minecraft:composter', count: 1, cost: 1 }, // NUEVO
    'mach:furnace': { id: 'minecraft:furnace', count: 1, cost: 1 }, // NUEVO
    'mach:smoker': { id: 'minecraft:smoker', count: 1, cost: 1 }, // NUEVO
    'mach:blast': { id: 'minecraft:blast_furnace', count: 1, cost: 1 }, // NUEVO
    'mach:ender_chest': { id: 'minecraft:ender_chest', count: 1, cost: 1 }, // NUEVO
    'mach:end_portal': { id: 'minecraft:end_portal_frame', count: 12, cost: 1 }, // NUEVO


    // --- COBBLEMON CONSUMIBLES & TMS ---
    'cob:potion': { id: 'cobblemon:potion', count: 10, cost: 1 },
    'cob:super_potion': { id: 'cobblemon:super_potion', count: 5, cost: 1 },
    'cob:hyper_potion': { id: 'cobblemon:hyper_potion', count: 3, cost: 1 },
    'cob:max_potion': { id: 'cobblemon:max_potion', count: 2, cost: 1 },
    'cob:full_restore': { id: 'cobblemon:full_restore', count: 1, cost: 1 },
    'cob:revive': { id: 'cobblemon:revive', count: 3, cost: 1 },
    'cob:max_revive': { id: 'cobblemon:max_revive', count: 1, cost: 1 },
    'cob:ether': { id: 'cobblemon:ether', count: 2, cost: 1 },
    'cob:elixir': { id: 'cobblemon:elixir', count: 1, cost: 1 },
    'cob:rare_candy': { id: 'cobblemon:rare_candy', count: 1, cost: 1 },
    'cob:ability': { id: 'cobblemon:ability_capsule', count: 1, cost: 1 },
    'cob:rod': { id: 'cobblemon:super_rod', count: 1, cost: 1 },
    'cob:full_heal': { id: 'cobblemon:full_heal', count: 10, cost: 1 }, // NUEVO
    'cob:pp_max': { id: 'cobblemon:pp_max', count: 1, cost: 1 }, // NUEVO
    // MENTAS
    'mint:adamant': { id: 'cobblemon:adamant_mint', count: 1, cost: 1 }, // NUEVO
    'mint:modest': { id: 'cobblemon:modest_mint', count: 1, cost: 1 }, // NUEVO
    'mint:jolly': { id: 'cobblemon:jolly_mint', count: 1, cost: 1 }, // NUEVO
    'mint:timid': { id: 'cobblemon:timid_mint', count: 1, cost: 1 }, // NUEVO
    'mint:bold': { id: 'cobblemon:bold_mint', count: 1, cost: 1 }, // NUEVO
    // CAROS

    // TMs Famosas
    'tmcraft:earthquake': { id: 'tmcraft:tm_earthquake', count: 1, cost: 1 },
    'tmcraft:thunderbolt': { id: 'tmcraft:tm_thunderbolt', count: 1, cost: 1 },
    'tmcraft:ice_beam': { id: 'tmcraft:tm_ice_beam', count: 1, cost: 1 },
    'tmcraft:flamethrower': { id: 'tmcraft:tm_flamethrower', count: 1, cost: 1 },
    'tmcraft:psychic': { id: 'tmcraft:tm_psychic', count: 1, cost: 1 },
    'tmcraft:shadow_ball': { id: 'tmcraft:tm_shadow_ball', count: 1, cost: 1 },
    'tmcraft:protect': { id: 'tmcraft:tm_protect', count: 1, cost: 1 },
    'tmcraft:toxic': { id: 'tmcraft:tm_toxic', count: 1, cost: 1 },
    'tmcraft:sleep': { id: 'tmcraft:tm_sleep', count: 1, cost: 1 },
    'tmcraft:confuse': { id: 'tmcraft:tm_confuse', count: 1, cost: 1 },
    'tmcraft:curse': { id: 'tmcraft:tm_curse', count: 1, cost: 1 },
    'tmcraft:charm': { id: 'tmcraft:tm_charm', count: 1, cost: 1 },
    'tmcraft:substitute': { id: 'tmcraft:tm_substitute', count: 1, cost: 1 },


    // --- EXTRAS ---
    'extra:mending': { id: 'ENCHANT_MENDING', count: 1, cost: 1 },
    'extra:pokedex': { id: 'cobblemon:pokedex_red', count: 1, cost: 1 },
    'extra:adamant_orb': { id: 'mega_showdown:adamant_orb', count: 1, cost: 1 },
    'extra:lustrous_orb': { id: 'mega_showdown:lustrous_orb', count: 1, cost: 1 },
    'extra:adamant_crystal': { id: 'mega_showdown:adamant_crystal', count: 1, cost: 1 },
    'extra:lustrous_globe': { id: 'mega_showdown:lustrous_globe', count: 1, cost: 1 },
};

module.exports = (io, socket) => {
    socket.on('requestItem', async (data) => {
        const { item, playerName } = data;
        if (!playerName) return;
        
        const cleanName = playerName.replace(/👑|👤/g, '').trim().split(' ')[0];
        const product = SHOP_CATALOG[item];
        if (!product) return socket.emit('giveError', 'Objeto no encontrado.');

        try {
            const rcon = await Rcon.connect(RCON_CONFIG);

            // 1. Check XP
            const xpResponse = await rcon.send(`experience query ${cleanName} levels`);
            const match = xpResponse.match(/(\d+)/); 
            
            if (!match) {
                await rcon.end();
                return socket.emit('giveError', 'Debes estar conectado al servidor.');
            }

            const currentLevels = parseInt(match[0]);

            if (currentLevels < product.cost) {
                await rcon.end();
                return socket.emit('giveError', `Necesitas ${product.cost} Niveles (Tienes ${currentLevels}).`);
            }

            // 2. Pay XP
            await rcon.send(`experience add ${cleanName} -${product.cost} levels`);

            // 3. Give Item
            if (product.id === 'ENCHANT_MENDING') {
                await rcon.send(`enchant ${cleanName} minecraft:mending`);
            } else {
                await rcon.send(`give ${cleanName} ${product.id} ${product.count}`);
            }

            await rcon.end();
            socket.emit('giveSuccess', { 
                item: product.id, 
                cost: product.cost,
                balance: currentLevels - product.cost 
            });

        } catch (error) {
            console.error("[RCON Error]", error);
            socket.emit('giveError', 'Error de conexión con el servidor Minecraft.');
        }
    });
};