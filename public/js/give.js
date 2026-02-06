window.app = window.app || {};

app.give = {
    // Definimos secciones visuales
    sections: {
        materiales: {
            title: "🧱 Construcción y Decoración",
            color: "#e67e22",
            items: [
                { id: "mat:white_wool", name: "Lana Blanca (64)", icon: "🐑" },
                { id: "mat:oak_log", name: "Roble (64)", icon: "🪵" },
                { id: "mat:spruce_log", name: "Abeto (64)", icon: "🌲" },
                { id: "mat:birch_log", name: "Abedul (64)", icon: "🌳" },
                { id: "mat:cherry_log", name: "Cerezo (64)", icon: "🌸" },
                { id: "mat:stone", name: "Piedra (64)", icon: "🪨" },
                { id: "mat:cobblestone", name: "Roca (64)", icon: "🌑" },
                { id: "mat:glass", name: "Cristal (64)", icon: "🪟" },
                { id: "mat:white_concrete", name: "Hormigón B. (64)", icon: "⬜" },
                { id: "mat:black_concrete", name: "Hormigón N. (64)", icon: "⬛" },
                { id: "mat:sand", name: "Arena (64)", icon: "🏜️" },
                { id: "mat:gravel", name: "Grava (64)", icon: "🗿" },
                { id: "mat:deepslate", name: "Pizarra (64)", icon: "🌚" },
                { id: "mat:mud_bricks", name: "Barro (64)", icon: "🧱" },
                { id: "mat:obsidian", name: "Obsidiana (16)", icon: "🔮" },
                { id: "mat:bamboo", name: "Bambú (64)", icon: "🎍" },
                { id: "mat:glow_frame", name: "Marco Luz (8)", icon: "🖼️" },
                { id: "mat:lantern", name: "Farolillo (16)", icon: "🏮" },
                { id: "mat:sea_lantern", name: "L. Marina (16)", icon: "💠" },
                { id: "mat:glowstone", name: "P. Luminosa (16)", icon: "💡" },
                { id: "mat:cw_lantern", name: "Farol Madera (16)", icon: "🕯️" },
                { id: "mat:cw_ladder", name: "Escalera M. (32)", icon: "🪜" },
                { id: "mat:elevator", name: "Elevador (2)", icon: "🛗" },
                { id: "mat:bookshelf", name: "Librería (16)", icon: "📚" },
                { id: "mat:scaffolding", name: "Andamio (64)", icon: "🏗️" },
                { id: "mat:chain", name: "Cadena (16)", icon: "🔗" }
            ]
        },
        utilidades: {
            title: "🛠️ Utilidades y Equipo",
            color: "#7f8c8d",
            items: [
                { id: "util:backpack", name: "Mochila Netherite", icon: "🎒" },
                { id: "util:waystone", name: "Waystone", icon: "🗿" },
                { id: "util:warp_plate", name: "Warp Plates (2)", icon: "🌀" },
                { id: "util:diamond_sword", name: "Espada Diamante", icon: "⚔️" },
                { id: "util:shield", name: "Escudo", icon: "🛡️" },
                { id: "util:horse_armor", name: "Armadura Caballo", icon: "🐎" },
                { id: "util:shulker", name: "Caja Shulker (2)", icon: "📦" },
                { id: "util:bonemeal", name: "Polvo Hueso (64)", icon: "🦴" },
                { id: "util:bottles", name: "Frascos (64)", icon: "🧪" },
                { id: "util:water_bucket", name: "Agua (1)", icon: "💧" },
                { id: "util:lava_bucket", name: "Lava (1)", icon: "🌋" },
                { id: "util:chest", name: "Cofre (16)", icon: "📦" },
                { id: "util:hopper", name: "Tolva (4)", icon: "🔽" },
                { id: "util:saddle", name: "Montura", icon: "🏇" },
                { id: "util:nametag", name: "Etiqueta", icon: "🏷️" },
                { id: "util:lead", name: "Rienda (2)", icon: "➰" },
                { id: "util:ender_pearl", name: "Ender Pearl (16)", icon: "🟣" },
                { id: "util:slime_ball", name: "Bola Slime (16)", icon: "🟢" },
                { id: "util:anvil", name: "Yunque", icon: "🔨" },
                { id: "util:enchanting", name: "Mesa Encant.", icon: "📖" },
                { id: "util:spyglass", name: "Catalejo", icon: "🔭" },
                { id: "util:clock", name: "Reloj", icon: "🕒" },
                { id: "util:compass", name: "Brújula", icon: "🧭" }
            ]
        },
        minerales: {
            title: "💎 Minerales",
            color: "#3498db",
            items: [
                { id: "min:coal", name: "Carbón (32)", icon: "⚫" },
                { id: "min:iron", name: "Hierro (16)", icon: "🔩" },
                { id: "min:gold", name: "Oro (16)", icon: "🥇" },
                { id: "min:lapis", name: "Lapislázuli (32)", icon: "🔵" },
                { id: "min:redstone", name: "Redstone (64)", icon: "🔴" },
                { id: "min:diamond", name: "Diamante (3)", icon: "💎" },
                { id: "min:emerald", name: "Esmeralda (16)", icon: "💚" },
                { id: "min:quartz", name: "Cuarzo (32)", icon: "⚪" },
                { id: "min:amethyst", name: "Amatista (16)", icon: "🔮" },
                { id: "min:copper_block", name: "Bloque Cobre (16)", icon: "🟧" },
                { id: "min:raw_iron_blk", name: "B. Hierro Bruto (8)", icon: "🟫" },
                { id: "min:raw_gold_blk", name: "B. Oro Bruto (8)", icon: "🟨" },
                { id: "min:coal_block", name: "Bloque Carbón (16)", icon: "⬛" },
                { id: "min:clay", name: "Arcilla (64)", icon: "🧱" },
                { id: "min:nether_brick", name: "Ladrillo Nether (64)", icon: "🟥" },
                { id: "min:netherite", name: "Netherite (1)", icon: "🖤" } // 30 XP
            ]
        },
        pokeballs: {
            title: "🔴 Pokéballs",
            color: "#ff4757",
            items: [
                { id: "ball:poke", name: "Poké (16)", icon: "🔴" },
                { id: "ball:great", name: "Super (10)", icon: "🔵" },
                { id: "ball:ultra", name: "Ultra (5)", icon: "⚫" },
                { id: "ball:quick", name: "Veloz (5)", icon: "⚡" },
                { id: "ball:dusk", name: "Ocaso (5)", icon: "🟢" },
                { id: "ball:luxury", name: "Lujo (5)", icon: "✨" },
                { id: "ball:heal", name: "Sana (5)", icon: "💖" },
                { id: "ball:premier", name: "Honor (10)", icon: "⚪" },
                { id: "ball:timer", name: "Turno (5)", icon: "⏳" },
                { id: "ball:net", name: "Malla (5)", icon: "🕸️" },
                { id: "ball:dive", name: "Buceo (5)", icon: "🌊" },
                { id: "ball:heavy", name: "Pesada (5)", icon: "🔩" },
                { id: "ball:level", name: "Nivel (5)", icon: "📶" },
                { id: "ball:lure", name: "Cebo (5)", icon: "🎣" },
                { id: "ball:moon", name: "Luna (5)", icon: "🌙" },
                { id: "ball:friend", name: "Amigo (5)", icon: "💚" },
                { id: "ball:love", name: "Amor (5)", icon: "❤️" },
                { id: "ball:fast", name: "Rápida (5)", icon: "⏩" },
                { id: "ball:repeat", name: "Acopio (5)", icon: "🔁" },
                { id: "ball:nest", name: "Nido (5)", icon: "🐣" },
                { id: "ball:master", name: "Master (1)", icon: "🟣" }, // 30 XP
                { id: "ball:beast", name: "Ente (1)", icon: "🌀" } // 30 XP
            ]
        },
        maquinas: {
            title: "💻 Máquinas y Mesas",
            color: "#8e44ad",
            items: [
                { id: "mach:healer", name: "Centro Pokémon", icon: "🏥" },
                { id: "mach:pc", name: "PC", icon: "💻" },
                { id: "mach:tank", name: "Tanque Restaurar", icon: "🔋" },
                { id: "mach:fossil", name: "Analizador Fósil", icon: "🦕" },
                { id: "mach:monitor", name: "Monitor", icon: "🖥️" },
                { id: "mach:campfire", name: "Hoguera Blanca", icon: "🔥" },
                { id: "mach:pedestal", name: "Pedestal Mega", icon: "🏆" },
                { id: "mach:brewing", name: "Destiladora", icon: "⚗️" },
                { id: "mach:cauldron", name: "Caldero", icon: "🥘" },
                { id: "mach:blast", name: "Alto Horno", icon: "🔥" },
                { id: "mach:smoker", name: "Ahumador", icon: "🍖" },
                { id: "mach:loom", name: "Telar", icon: "🧶" },
                { id: "mach:carto", name: "Mesa Cartografía", icon: "🗺️" },
                { id: "mach:smith", name: "Mesa Herrería", icon: "⚒️" },
                { id: "mach:grind", name: "Afiladora", icon: "⚙️" },
                { id: "mach:stonecut", name: "Cortapiedras", icon: "🔪" },
                { id: "mach:composter", name: "Compostador", icon: "♻️" },
                { id: "mach:furnace", name: "Horno", icon: "🔥" },
                { id: "mach:smoker", name: "Ahumador", icon: "🍖" },
                { id: "mach:blast", name: "Alto Horno", icon: "🔥" },
                { id: "mach:carto", name: "Mesa Cartografía", icon: "🗺️"},
                { id: "ender:ender_chest", name: "Cofre Ender", icon: "🟣" },
                { id: "ender:end_portal_frame", name: "Portal End", icon: "🌀" }

            ]
        },
        evolutivos: {
            title: "✨ Evolución",
            color: "#f1c40f",
            items: [
                { id: "evo:fire", name: "P. Fuego", icon: "🔥" },
                { id: "evo:water", name: "P. Agua", icon: "💧" },
                { id: "evo:thunder", name: "P. Trueno", icon: "⚡" },
                { id: "evo:leaf", name: "P. Hoja", icon: "🍃" },
                { id: "evo:moon", name: "P. Lunar", icon: "🌙" },
                { id: "evo:sun", name: "P. Solar", icon: "☀️" },
                { id: "evo:ice", name: "P. Hielo", icon: "❄️" },
                { id: "evo:shiny", name: "P. Día", icon: "✨" },
                { id: "evo:dusk", name: "P. Noche", icon: "🌑" },
                { id: "evo:dawn", name: "P. Alba", icon: "🌅" },
                { id: "evo:link", name: "Cable Link", icon: "🔗" },
                { id: "evo:kings_rock", name: "Roca Rey", icon: "👑" },
                { id: "evo:metal_coat", name: "Revest. Metal", icon: "🧥" },
                { id: "evo:upgrade", name: "Mejora", icon: "💾" },
                { id: "evo:dubious", name: "Disco Extraño", icon: "💿" },
                { id: "evo:protector", name: "Protector", icon: "🛡️" },
                { id: "evo:reaper", name: "Tela Terrible", icon: "👻" },
                { id: "evo:razor_fang", name: "Colmillo Agudo", icon: "🦷" },
                { id: "evo:augurite", name: "Mineral Negro", icon: "🌑" },
                { id: "evo:dragon_scale", name: "Escama Dragón", icon: "🐉" },
                { id: "evo:electirizer", name: "Electrizador", icon: "⚡" },
                { id: "evo:magmarizer", name: "Magmatizador", icon: "🌋" },
                { id: "evo:prism_scale", name: "Escama Bella", icon: "🧜‍♀️" },
                { id: "evo:oval_stone", name: "Piedra Oval", icon: "🥚" },
                { id: "evo:sweet_apple", name: "Manzana Dulce", icon: "🍎" },
                { id: "evo:tart_apple", name: "Manzana Ácida", icon: "🍏" },
                { id: "evo:whipped_dream", name: "Dulce de Nata", icon: "🍦" },
                { id: "evo:sachet", name: "Saquito Fragante", icon: "🌸" },
                { id: "evo:galarica_cuff", name: "Brazal Galanuez", icon: "💪" },
                { id: "evo:galarica_wreath", name: "Corona Galanuez", icon: "👑" },
                { id: "evo:auspicious", name: "Armadura Ausp.", icon: "🟡" },
                { id: "evo:malicious", name: "Armadura Mal.", icon: "🟣" },
                { id: "evo:sw_strawberry", name: "Conf. Fresa", icon: "🍓" },
                { id: "evo:sw_love", name: "Conf. Corazón", icon: "❤️" },
                { id: "evo:sw_clover", name: "Conf. Trébol", icon: "🍀" },
                { id: "evo:sw_star", name: "Conf. Estrella", icon: "⭐" }
            ]
        },
        equipo_pkmn: {
            title: "🎒 Equipo Pokémon & Gemas",
            color: "#27ae60",
            items: [
                { id: "cob:rod", name: "Super Caña", icon: "🎣" },
                { id: "eq:exp_share", name: "Repartir Exp", icon: "🎓" },
                { id: "eq:lucky_egg", name: "Huevo Suerte", icon: "🥚" },
                { id: "eq:leftovers", name: "Restos", icon: "🍎" },
                { id: "eq:choice_band", name: "Cinta Elegida", icon: "🎗️" },
                { id: "eq:choice_specs", name: "Gafas Elegidas", icon: "👓" },
                { id: "eq:choice_scarf", name: "Pañuelo Elegido", icon: "🧣" },
                { id: "eq:assault_vest", name: "Chaleco Asalto", icon: "🦺" },
                { id: "eq:shell_bell", name: "Cascabel Concha", icon: "🔔" },
                { id: "eq:life_orb", name: "Vidasfera", icon: "🔮" },
                { id: "eq:toxic_orb", name: "Toxisfera", icon: "🤢" },
                { id: "eq:flame_orb", name: "Llamasfera", icon: "🔥" },
                { id: "eq:eviolite", name: "Mineral Evol.", icon: "🪨" },
                { id: "eq:boots", name: "Botas Gruesas", icon: "👢" },
                { id: "eq:weakness", name: "Seguro Debilidad", icon: "📄" },
                { id: "eq:light_clay", name: "Refle luz", icon: "🧱" },
                { id: "eq:black_sludge", name: "Lodo Negro", icon: "☠️" },
                { id: "eq:soothe_bell", name: "Cascabel Alivio", icon: "🔔" },
                { id: "eq:quick_claw", name: "Garra Rápida", icon: "💅" },
                { id: "gem:fire", name: "Gema Fuego", icon: "🔥" },
                { id: "gem:water", name: "Gema Agua", icon: "💧" },
                { id: "gem:psychic", name: "Gema Psíquica", icon: "🔮" },
                { id: "gem:dragon", name: "Gema Dragón", icon: "🐲" },
                { id: "gem:fairy", name: "Gema Hada", icon: "🧚" },
                { id: "extra:adamant_orb", name: "Diamante de Sangre (Dialga)", icon: "💠" },
                { id: "extra:lustrous_orb", name: "Perla del Vacío (Palkia)", icon: "🔮" },
                { id: "extra:adamant_crystal", name: "Cristal de Adamant (Dialga)", icon: "💎" },
                { id: "extra:lustrous_globe", name: "Globo Lustroso (Palkia)", icon: "🌐" }
            ]
        },
        consumibles_y_tms: {
            title: "💊 Consumibles & TMs",
            color: "#e84393",
            items: [
                { id: "cob:rare_candy", name: "Caramelo Raro", icon: "🍬" },
                { id: "cob:ability", name: "Cápsula Hab.", icon: "💊" },
                { id: "mint:adamant", name: "Menta Firme", icon: "🌿" },
                { id: "mint:modest", name: "Menta Modesta", icon: "🌿" },
                { id: "mint:jolly", name: "Menta Alegre", icon: "🌿" },
                { id: "mint:timid", name: "Menta Miedosa", icon: "🌿" },
                { id: "mint:bold", name: "Menta Osada", icon: "🌿" },
                { id: "cob:full_restore", name: "Restaurar (1)", icon: "💖" },
                { id: "cob:max_revive", name: "Max Revivir (1)", icon: "🌟" },
                { id: "cob:potion", name: "Pociones (10)", icon: "🧪" },
                { id: "cob:full_heal", name: "Cura Total (10)", icon: "💊" },
                { id: "cob:pp_max", name: "Más PP", icon: "🔋" },
                { id: "extra:mending", name: "Libro Mending", icon: "📖" },
                { id: "extra:pokedex", name: "Pokédex", icon: "📱" },
                { id: "tmcraft:earthquake", name: "TM Terremoto", icon: "💿" },
                { id: "tmcraft:thunderbolt", name: "TM Rayo", icon: "💿" },
                { id: "tmcraft:ice_beam", name: "TM Rayo Hielo", icon: "💿" },
                { id: "tmcraft:flamethrower", name: "TM Lanzallamas", icon: "💿" },
                { id: "tmcraft:psychic", name: "TM Psíquico", icon: "💿" },
                { id: "tmcraft:shadow_ball", name: "TM Bola Sombra", icon: "💿" },
                { id: "tmcraft:protect", name: "TM Protección", icon: "💿" },
                { id: "tmcraft:toxic", name: "TM Tóxico", icon: "💿" }
            ]
        }
    },

    getCost: (id) => {
        const expensive = [
            'min:netherite', 
            'ball:master', 
            'cob:cap_gold', 
            'cob:patch'
        ];
        return expensive.includes(id) ? 30 : 1;
    },

    renderButtons: () => {
        let container = document.querySelector('#giveScreen .card > div');
        
        if (container) {
            container.innerHTML = '';
            container.className = "give-main-container"; 
            container.style.display = "block"; 
        } else {
            return;
        }

        for (const [key, section] of Object.entries(app.give.sections)) {
            const header = document.createElement('h3');
            header.innerText = section.title;
            header.style.color = section.color;
            header.style.borderBottom = `2px solid ${section.color}`;
            header.style.marginTop = "20px";
            header.style.marginBottom = "10px";
            header.style.textAlign = "left";
            header.style.fontSize = "1.1em";
            container.appendChild(header);

            const grid = document.createElement('div');
            grid.className = "give-section-grid";
            
            section.items.forEach(item => {
                const btn = document.createElement('button');
                const cost = app.give.getCost(item.id);
                
                btn.className = 'give-item-btn';
                btn.id = `btn-${item.id.replace(/:/g, '-')}`;
                btn.onclick = () => app.give.request(item.id);

                const costClass = cost > 1 ? 'color:#ff4757;' : 'color:#2ed573;';
                const bgClass = cost > 1 ? 'background:rgba(255, 71, 87, 0.1);' : 'background:rgba(46, 213, 115, 0.1);';

                if (cost > 1) {
                    btn.style.border = "1px solid #ff4757";
                }

                btn.innerHTML = `
                    <div class="give-icon">${item.icon}</div>
                    <div class="give-name">${item.name}</div>
                    <div class="give-cost" style="${costClass} ${bgClass}">${cost} XP</div>
                `;
                grid.appendChild(btn);
            });

            container.appendChild(grid);
        }
    },

    request: (itemId) => {
        if (!app.myPlayerName) {
            const storedName = localStorage.getItem('global_username'); 
            if(storedName) app.myPlayerName = storedName;
            else return alert("❌ Primero debes ponerte nombre (Login).");
        }
        
        const btnId = `btn-${itemId.replace(/:/g, '-')}`;
        const btn = document.getElementById(btnId);
        if(btn) {
            btn.style.opacity = "0.5";
            btn.style.transform = "scale(0.95)";
        }

        socket.emit('requestItem', { item: itemId, playerName: app.myPlayerName });
    }
};

setTimeout(() => app.give.renderButtons(), 500);

if (typeof socket !== 'undefined') {
    socket.on('giveSuccess', (data) => {
        const audio = document.getElementById('revealSound');
        if(audio) { audio.currentTime=0; audio.play().catch(e=>{}); }
        alert(`✅ ¡COMPRA EXITOSA!\nObjeto: ${data.item}\nCoste: ${data.cost} Niveles\nTe quedan: ${data.balance} Niveles`);
        document.querySelectorAll('.give-item-btn').forEach(b => {
            b.style.opacity = "1";
            b.style.transform = "scale(1)";
        });
    });

    socket.on('giveError', (msg) => {
        const audio = document.getElementById('dieSound');
        if(audio) { audio.currentTime=0; audio.play().catch(e=>{}); }
        alert("⚠️ " + msg);
        document.querySelectorAll('.give-item-btn').forEach(b => {
            b.style.opacity = "1";
            b.style.transform = "scale(1)";
        });
    });
}