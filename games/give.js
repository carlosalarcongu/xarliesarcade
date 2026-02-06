const { Rcon } = require('rcon-client');

const RCON_CONFIG = { host: 'localhost', port: 25575, password: '0907' };

// --- MAPA DE LOCALIZACIONES (Coste 1 XP) ---
const LOCATION_TRADES = {
    //Legenday monuments
    'loc:distortion_portal': 'legendarymonuments:distortion_portal',
    'loc:dragonspiraltower': 'legendarymonuments:dragonspiraltower',
    'loc:dyna_tree': 'legendarymonuments:dyna_tree',
    'loc:eternatus_cocoon': 'legendarymonuments:eternatus_cocoon',
    'loc:final_island': 'legendarymonuments:final_island',
    'loc:firescourge_shrine': 'legendarymonuments:firescourge_shrine',
    'loc:giratina_island': 'legendarymonuments:giratina_island',
    'loc:grasswither_shrine': 'legendarymonuments:grasswither_shrine',
    'loc:groundblight_shrine': 'legendarymonuments:groundblight_shrine',
    'loc:hall_of_origin': 'legendarymonuments:hall_of_origin',
    'loc:heatran_cave': 'legendarymonuments:heatran_cave',
    'loc:hoopa_pyramid': 'legendarymonuments:hoopa_pyramid',
    'loc:icerend_shrine': 'legendarymonuments:icerend_shrine',
    'loc:kyuremcave': 'legendarymonuments:kyuremcave',
    'loc:lake_acuity': 'legendarymonuments:lake_acuity',
    'loc:lake_valor': 'legendarymonuments:lake_valor',
    'loc:lake_verity': 'legendarymonuments:lake_verity',
    'loc:liberty_island': 'legendarymonuments:liberty_island',
    'loc:lugia_temple': 'legendarymonuments:lugia_temple',
    'loc:outskirt_stand': 'legendarymonuments:outskirt_stand',
    'loc:shield': 'legendarymonuments:shield',
    'loc:snowpoint_temple': 'legendarymonuments:snowpoint_temple',
    'loc:southrn_island': 'legendarymonuments:southern_island',
    'loc:spear_pillar': 'legendarymonuments:spear_pillar',
    'loc:sword': 'legendarymonuments:sword',
    'loc:traditional_village/ecruteak': 'legendarymonuments:traditional_village/ecruteak',
    'loc:traditional_village/nonlegendary': 'legendarymonuments:traditional_village/nonlegendary',
    'loc:turnback_cave': 'legendarymonuments:turnback_cave',
    //Legends untold
    'loc:mew_ruins': 'legends_untold:mew_ruins',
    'loc:psychic_den': 'legends_untold:psychic_den',
    'loc:sky_pillar': 'legends_untold:sky_pillar',
    'loc:water_den': 'legends_untold:water_den',
    'loc:xerneas_tree': 'legends_untold:xerneas_tree',
    //Cobbleverse legendaries
    'loc:articuno': 'cobbleverse:legendary/articuno',
    'loc:groudon': 'cobbleverse:legendary/groudon',
    'loc:moltres': 'cobbleverse:legendary/moltres',
    'loc:kyogre': 'cobbleverse:legendary/kyogre',
    'loc:regice': 'cobbleverse:legendary/regice',
    'loc:regirock': 'cobbleverse:legendary/regirock',
    'loc:registeel': 'cobbleverse:legendary/registeel',
    'loc:zapdos': 'cobbleverse:legendary/zapdos',
    //Cobbleverse mythicals:
    'loc:deoxys': 'cobbleverse:mythical/deoxys',
    'loc:jirachi': 'cobbleverse:mythical/jirachi',
    'loc:mew': 'cobbleverse:mythical/mew',
    //Kanto gyms:
    'loc:brock': 'cobbleverse:brock',
    'loc:misty': 'cobbleverse:misty',
    'loc:ltsurge': 'cobbleverse:ltsurge',
    'loc:erika': 'cobbleverse:erika',
    'loc:koga': 'cobbleverse:koga',
    'loc:sabrina': 'cobbleverse:sabrina',
    'loc:blaine': 'cobbleverse:blaine',
    'loc:giovanni': 'cobbleverse:giovanni',
    'loc:kanto_league': 'cobbleverse:kanto_league',
    //Añade los de Hoenn Johto y Sinnoh








    

};

// --- CATÁLOGO DE TIENDA POR XP ---
const SHOP_CATALOG = {
    // --- MATERIALES ---
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
    'mat:sea_lantern': { id: 'minecraft:sea_lantern', count: 16, cost: 1 },
    'mat:glowstone': { id: 'minecraft:glowstone', count: 16, cost: 1 },
    'mat:bookshelf': { id: 'minecraft:bookshelf', count: 16, cost: 1 },
    'mat:deepslate': { id: 'minecraft:deepslate', count: 64, cost: 1 },
    'mat:mud_bricks': { id: 'minecraft:mud_bricks', count: 64, cost: 1 },
    'mat:obsidian': { id: 'minecraft:obsidian', count: 16, cost: 1 },
    'mat:scaffolding': { id: 'minecraft:scaffolding', count: 64, cost: 1 },
    'mat:chain': { id: 'minecraft:chain', count: 16, cost: 1 },
    'mat:bamboo': { id: 'minecraft:bamboo', count: 64, cost: 1 },
    'mat:glow_frame': { id: 'minecraft:glow_item_frame', count: 8, cost: 1 },
    'mat:cw_lantern': { id: 'carved_wood:oak_lantern', count: 16, cost: 1 },
    'mat:cw_ladder': { id: 'carved_wood:spruce_ladder', count: 32, cost: 1 },
    'mat:elevator': { id: 'elevatorid:elevator_white', count: 2, cost: 1 },

    // --- UTILIDADES ---
    'util:water_bucket': { id: 'minecraft:water_bucket', count: 1, cost: 1 },
    'util:arc_phone': { id: 'legendarymonuments:arc_phone', count: 1, cost: 1 },
    'util:lava_bucket': { id: 'minecraft:lava_bucket', count: 1, cost: 1 },
    'util:chest': { id: 'minecraft:chest', count: 16, cost: 1 },
    'util:hopper': { id: 'minecraft:hopper', count: 4, cost: 1 },
    'util:shulker': { id: 'minecraft:shulker_shell', count: 2, cost: 1 },
    'util:bonemeal': { id: 'minecraft:bone_meal', count: 64, cost: 1 },
    'util:diamond_sword': { id: 'minecraft:diamond_sword', count: 1, cost: 1 },
    'util:diamond_pickaxe': { id: 'minecraft:diamond_pickaxe', count: 1, cost: 1 },
    'util:shield': { id: 'minecraft:shield', count: 1, cost: 1 },
    'util:horse_armor': { id: 'minecraft:diamond_horse_armor', count: 1, cost: 1 },
    'util:backpack': { id: 'sophisticatedbackpacks:netherite_backpack', count: 1, cost: 1 },
    'util:mejora_recogida': { id: 'sophisticatedbackpacks:advanced_pickup_upgrade', count: 1, cost: 1 },
    'util:mejora_filtrado': { id: 'sophisticatedbackpacks:advanced_filter_upgrade', count: 1, cost: 1 },
    'util:mejora_imán': { id: 'sophisticatedbackpacks:advanced_magnet_upgrade', count: 1, cost: 1 },
    'util:mejora_compactado': { id: 'sophisticatedbackpacks:advanced_compacting_upgrade', count: 1, cost: 1 },
    'util:mejora_reabastecimiento': { id: 'sophisticatedbackpacks:advanced_restock_upgrade', count: 1, cost: 1 },
    'util:mejora_deposito': { id: 'sophisticatedbackpacks:advanced_deposit_upgrade', count: 1, cost: 1 },
    'util:mejora_autofundido': { id: 'sophisticatedbackpacks:auto_smelting_upgrade', count: 1, cost: 1 },
    'util:mejora_autosmoking': { id: 'sophisticatedbackpacks:auto_smoking_upgrade', count: 1, cost: 1 },
    'util:mejora_autofusion': { id: 'sophisticatedbackpacks:auto_blasting_upgrade', count: 1, cost: 1 },
    'util:mejora_fabricación': { id: 'sophisticatedbackpacks:crafting_upgrade', count: 1, cost: 1 },
    'util:mejora_stackeo4': { id: 'sophisticatedbackpacks:stack_upgrade_tier_4', count: 1, cost: 1 },
    'util:mejora_anvil': { id: 'sophisticatedbackpacks:anvil_upgrade', count: 1, cost: 1 },
    'util:mejora_autofusion': { id: 'sophisticatedbackpacks:auto_blasting_upgrade', count: 1, cost: 1 },
    'util:mejora_autofusion': { id: 'sophisticatedbackpacks:auto_blasting_upgrade', count: 1, cost: 1 },
    'util:mejora_autofusion': { id: 'sophisticatedbackpacks:auto_blasting_upgrade', count: 1, cost: 1 },
    'util:waystone': { id: 'waystones:waystone', count: 1, cost: 1 },
    'util:warp_plate': { id: 'waystones:warp_plate', count: 2, cost: 1 },
    'util:bottles': { id: 'minecraft:glass_bottle', count: 64, cost: 1 },
    'util:saddle': { id: 'minecraft:saddle', count: 1, cost: 1 },
    'util:nametag': { id: 'minecraft:name_tag', count: 1, cost: 1 },
    'util:lead': { id: 'minecraft:lead', count: 2, cost: 1 },
    'util:ender_pearl': { id: 'minecraft:ender_pearl', count: 16, cost: 1 },
    'util:slime_ball': { id: 'minecraft:slime_ball', count: 16, cost: 1 },
    'util:anvil': { id: 'minecraft:anvil', count: 1, cost: 1 },
    'util:enchanting': { id: 'minecraft:enchanting_table', count: 1, cost: 1 },
    'util:spyglass': { id: 'minecraft:spyglass', count: 1, cost: 1 },
    'util:clock': { id: 'minecraft:clock', count: 1, cost: 1 },
    'util:compass': { id: 'minecraft:compass', count: 1, cost: 1 },

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
    'min:copper_block': { id: 'minecraft:copper_block', count: 16, cost: 1 },
    'min:raw_iron_blk': { id: 'minecraft:raw_iron_block', count: 8, cost: 1 },
    'min:raw_gold_blk': { id: 'minecraft:raw_gold_block', count: 8, cost: 1 },
    'min:coal_block': { id: 'minecraft:coal_block', count: 16, cost: 1 },
    'min:clay': { id: 'minecraft:clay_ball', count: 64, cost: 1 },
    'min:nether_brick': { id: 'minecraft:nether_brick', count: 64, cost: 1 },
    'min:netherite': { id: 'minecraft:netherite_ingot', count: 1, cost: 10 },

    // --- CONSUMIBLES ---
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
    'ball:heavy': { id: 'cobblemon:heavy_ball', count: 5, cost: 1 },
    'ball:level': { id: 'cobblemon:level_ball', count: 5, cost: 1 },
    'ball:lure': { id: 'cobblemon:lure_ball', count: 5, cost: 1 },
    'ball:moon': { id: 'cobblemon:moon_ball', count: 5, cost: 1 },
    'ball:friend': { id: 'cobblemon:friend_ball', count: 5, cost: 1 },
    'ball:love': { id: 'cobblemon:love_ball', count: 5, cost: 1 },
    'ball:fast': { id: 'cobblemon:fast_ball', count: 5, cost: 1 },
    'ball:repeat': { id: 'cobblemon:repeat_ball', count: 5, cost: 1 },
    'ball:nest': { id: 'cobblemon:nest_ball', count: 5, cost: 1 },
    'ball:timer': { id: 'cobblemon:timer_ball', count: 5, cost: 1 },
    'ball:net': { id: 'cobblemon:net_ball', count: 5, cost: 1 },
    'ball:dive': { id: 'cobblemon:dive_ball', count: 5, cost: 1 },
    'ball:master': { id: 'cobblemon:master_ball', count: 1, cost: 30 },
    'ball:beast': { id: 'cobblemon:beast_ball', count: 1, cost: 10 },

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
    'evo:dragon_scale': { id: 'cobblemon:dragon_scale', count: 1, cost: 1 },
    'evo:electirizer': { id: 'cobblemon:electirizer', count: 1, cost: 1 },
    'evo:magmarizer': { id: 'cobblemon:magmarizer', count: 1, cost: 1 },
    'evo:prism_scale': { id: 'cobblemon:prism_scale', count: 1, cost: 1 },
    'evo:oval_stone': { id: 'cobblemon:oval_stone', count: 1, cost: 1 },
    'evo:whipped_dream': { id: 'cobblemon:whipped_dream', count: 1, cost: 1 },
    'evo:sachet': { id: 'cobblemon:sachet', count: 1, cost: 1 },
    'evo:galarica_cuff': { id: 'cobblemon:galarica_cuff', count: 1, cost: 1 },
    'evo:galarica_wreath': { id: 'cobblemon:galarica_wreath', count: 1, cost: 1 },
    'evo:auspicious': { id: 'cobblemon:auspicious_armor', count: 1, cost: 1 },
    'evo:malicious': { id: 'cobblemon:malicious_armor', count: 1, cost: 1 },

    // --- EQUIPO ---
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
    'eq:life_orb': { id: 'cobblemon:life_orb', count: 1, cost: 1 },
    'eq:toxic_orb': { id: 'cobblemon:toxic_orb', count: 1, cost: 1 },
    'eq:flame_orb': { id: 'cobblemon:flame_orb', count: 1, cost: 1 },
    'eq:eviolite': { id: 'cobblemon:eviolite', count: 1, cost: 1 },
    'eq:boots': { id: 'cobblemon:heavy_duty_boots', count: 1, cost: 1 },
    'eq:weakness': { id: 'cobblemon:weakness_policy', count: 1, cost: 1 },
    'eq:light_clay': { id: 'cobblemon:light_clay', count: 1, cost: 1 },
    'eq:black_sludge': { id: 'cobblemon:black_sludge', count: 1, cost: 1 },
    'eq:soothe_bell': { id: 'cobblemon:soothe_bell', count: 1, cost: 1 },
    'eq:quick_claw': { id: 'cobblemon:quick_claw', count: 1, cost: 1 },
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
    'mach:brewing': { id: 'minecraft:brewing_stand', count: 1, cost: 1 },
    'mach:cauldron': { id: 'minecraft:cauldron', count: 1, cost: 1 },
    'mach:blast': { id: 'minecraft:blast_furnace', count: 1, cost: 1 },
    'mach:smoker': { id: 'minecraft:smoker', count: 1, cost: 1 },
    'mach:loom': { id: 'minecraft:loom', count: 1, cost: 1 },
    'mach:carto': { id: 'minecraft:cartography_table', count: 1, cost: 1 },
    'mach:smith': { id: 'minecraft:smithing_table', count: 1, cost: 1 },
    'mach:grind': { id: 'minecraft:grindstone', count: 1, cost: 1 },
    'mach:stonecut': { id: 'minecraft:stonecutter', count: 1, cost: 1 },
    'mach:composter': { id: 'minecraft:composter', count: 1, cost: 1 },
    'mach:furnace': { id: 'minecraft:furnace', count: 1, cost: 1 },
    'mach:ender_chest': { id: 'minecraft:ender_chest', count: 1, cost: 1 },
    'mach:end_portal': { id: 'minecraft:end_portal_frame', count: 12, cost: 1 },

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
    'cob:full_heal': { id: 'cobblemon:full_heal', count: 10, cost: 1 },
    'cob:pp_max': { id: 'cobblemon:pp_max', count: 1, cost: 1 },
    'mint:adamant': { id: 'cobblemon:adamant_mint', count: 1, cost: 1 },
    'mint:modest': { id: 'cobblemon:modest_mint', count: 1, cost: 1 },
    'mint:jolly': { id: 'cobblemon:jolly_mint', count: 1, cost: 1 },
    'mint:timid': { id: 'cobblemon:timid_mint', count: 1, cost: 1 },
    'mint:bold': { id: 'cobblemon:bold_mint', count: 1, cost: 1 },
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
        
        // Verificamos si es una Localización O un objeto de tienda
        const isLocation = LOCATION_TRADES[item];
        const product = SHOP_CATALOG[item];

        if (!product && !isLocation) return socket.emit('giveError', 'Objeto no encontrado.');

        const cost = isLocation ? 1 : product.cost;

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

            if (currentLevels < cost) {
                await rcon.end();
                return socket.emit('giveError', `Necesitas ${cost} Niveles (Tienes ${currentLevels}).`);
            }

            // 2. Cobrar XP (Se resta primero)
            await rcon.send(`experience add ${cleanName} -${cost} levels`);

            // 3. Ejecutar Lógica
            if (isLocation) {
                const structureId = LOCATION_TRADES[item];

                // PASO CLAVE: Ejecutamos 'locate' en el servidor y capturamos la RESPUESTA
                const locateResult = await rcon.send(`locate structure ${structureId}`);

                // Verificamos si falló (no existe)
                if (!locateResult || locateResult.includes("Could not find") || locateResult.includes("No se ha encontrado")) {
                    // DEVOLUCIÓN AUTOMÁTICA
                    await rcon.send(`experience add ${cleanName} ${cost} levels`);
                    
                    // Avisar al jugador
                    await rcon.send(`tellraw ${cleanName} {"text":"❌ Estructura no encontrada en este mundo. Se te ha devuelto 1 Nivel.","color":"red"}`);
                    
                    await rcon.end();
                    return socket.emit('giveError', 'Estructura no encontrada. XP Devuelta.');
                }

                // SI SE ENCUENTRA: Enviar la respuesta capturada al chat del jugador
                // Limpiamos comillas para evitar romper el JSON
                const cleanMsg = locateResult.replace(/"/g, "'").trim();
                
                await rcon.send(`tellraw ${cleanName} [{"text":"📍 [Localizador] ","color":"gold"},{"text":"${cleanMsg}","color":"green"}]`);

            } else {
                // Es un objeto normal
                if (product.id === 'ENCHANT_MENDING') {
                    await rcon.send(`enchant ${cleanName} minecraft:mending`);
                } else {
                    await rcon.send(`give ${cleanName} ${product.id} ${product.count}`);
                }
            }

            await rcon.end();
            
            socket.emit('giveSuccess', { 
                item: isLocation ? "Coordenadas (Mira el chat)" : product.id, 
                cost: cost,
                balance: currentLevels - cost 
            });

        } catch (error) {
            console.error("[RCON Error]", error);
            socket.emit('giveError', 'Error de conexión con el servidor Minecraft.');
        }
    });
};