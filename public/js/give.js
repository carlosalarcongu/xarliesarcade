// Aseguramos que 'app' existe
window.app = window.app || {};

app.give = {
    // --- LISTA DE OBJETOS ---
    items: [
        // ACCIONES ESPECIALES
        { id: "special:mending", name: "Sorpresa (Mending)", icon: "✨" }, 
        { id: "special:madrid", name: "Hala Madrid", icon: "🏆" }, 
        { id: "special:sacrifice", name: "Sacrificio", icon: "👹" }, 
        { id: "special:trade", name: "Rare Candy (1💎)", icon: "🍬" }, 

        // PIEDRAS EVOLUTIVAS (Coste: 1 Diamante)
        { id: "stone:fire_stone", name: "Piedra Fuego", icon: "🔥" },
        { id: "stone:water_stone", name: "Piedra Agua", icon: "💧" },
        { id: "stone:thunder_stone", name: "Piedra Trueno", icon: "⚡" },
        { id: "stone:leaf_stone", name: "Piedra Hoja", icon: "🍃" },
        { id: "stone:moon_stone", name: "Piedra Lunar", icon: "🌙" },
        { id: "stone:sun_stone", name: "Piedra Solar", icon: "☀️" },
        { id: "stone:ice_stone", name: "Piedra Hielo", icon: "❄️" },
        { id: "stone:shiny_stone", name: "Piedra Día", icon: "✨" },
        { id: "stone:dusk_stone", name: "Piedra Noche", icon: "🌑" },
        { id: "stone:dawn_stone", name: "Piedra Alba", icon: "🌅" },
        { id: "stone:link_cable", name: "Cable Unión", icon: "🔗" },

        // VITAMINAS / STATS (Coste: 1 Diamante)
        { id: "stat:hp_up", name: "Más PS", icon: "➕" },
        { id: "stat:protein", name: "Proteína (Atq)", icon: "💪" },
        { id: "stat:iron", name: "Hierro (Def)", icon: "🛡️" },
        { id: "stat:calcium", name: "Calcio (At.Sp)", icon: "🔮" },
        { id: "stat:zinc", name: "Zinc (Def.Sp)", icon: "🎆" },
        { id: "stat:carbos", name: "Carburante (Vel)", icon: "👟" },
        { id: "stat:pp_up", name: "Más PP", icon: "🔋" },

        // COBBLEMON (Gratis/Cooldown)
        { id: "cobblemon:poke_ball", name: "Poké Ball", icon: "🔴" },
        { id: "cobblemon:great_ball", name: "Super Ball", icon: "🔵" },
        { id: "cobblemon:pokedex_red", name: "Pokédex", icon: "📱" },
        { id: "cobblemon:potion", name: "Poción", icon: "🧪" },

        // MINERALES / UTILIDADES
        { id: "minecraft:iron_ingot", name: "Lingote Hierro", icon: "🔩" },
        { id: "minecraft:diamond", name: "Diamante", icon: "💎" },
        { id: "minecraft:torch", name: "Antorchas", icon: "🔥" },
        { id: "minecraft:bread", name: "Pan", icon: "🍞" },
        { id: "minecraft:water_bucket", name: "Cubo Agua", icon: "💧" }
    ],

    renderButtons: () => {
        let container = document.querySelector('#giveScreen .card > div') || document.querySelector('#give-buttons-container');
        if (!container) return;

        container.innerHTML = ''; 
        const style = document.createElement('style');
        style.innerHTML = `
            .give-btn { 
                margin: 5px; padding: 10px; border-radius: 8px; cursor: pointer; 
                background: #f0f0f0; border: 1px solid #ccc; display: inline-block; 
                text-align: center; width: 100px; vertical-align: top; transition: 0.2s;
            }
            .give-btn:hover { background: #e0e0e0; transform: translateY(-2px); }
            .premium-btn { border: 2px solid #00e5ff !important; background: #e0faff !important; }
        `;
        container.appendChild(style);

        app.give.items.forEach(item => {
            const btn = document.createElement('button');
            const isDiamond = item.id.startsWith('stone:') || item.id.startsWith('stat:') || item.id === 'special:trade';
            const isSpecial = item.id.startsWith('special:') && item.id !== 'special:trade';

            btn.className = `cat-btn give-btn ${isDiamond ? 'premium-btn' : ''}`;
            btn.id = `btn-${item.id.replace(/:/g, '-')}`;
            btn.onclick = () => app.give.request(item.id);

            let labelStyle = isDiamond ? 'color: #008ba3; font-weight: bold;' : (isSpecial ? 'color: #b8860b;' : '');

            btn.innerHTML = `
                <div style="font-size:24px; margin-bottom:5px;">${item.icon}</div>
                <div style="font-size:11px; line-height:1.1; ${labelStyle}">${item.name}</div>
                ${isDiamond ? '<div style="font-size:9px; color:#008ba3;">💎 x1</div>' : ''}
            `;
            
            if (isSpecial) btn.style.border = "2px solid gold";
            container.appendChild(btn);
        });
    },

    request: (itemId) => {
        if (!app.myPlayerName) {
            const storedName = localStorage.getItem('playerName'); 
            if(storedName) app.myPlayerName = storedName;
            else return alert("❌ Primero debes ponerte nombre.");
        }
        document.getElementById(`btn-${itemId.replace(/:/g, '-')}`).style.opacity = "0.5";
        socket.emit('requestItem', { item: itemId, playerName: app.myPlayerName });
    }
};

setTimeout(() => app.give.renderButtons(), 500);

if (typeof socket !== 'undefined') {
    socket.on('giveSuccess', (data) => {
        const audio = document.getElementById('revealSound');
        if(audio) { audio.currentTime=0; audio.play().catch(e=>{}); }
        alert(`✅ Recibido: ${data.item.split(':')[1] || data.item}`);
        document.querySelectorAll('.give-btn').forEach(b => b.style.opacity = "1");
    });
    socket.on('giveError', (msg) => {
        alert("⚠️ " + msg);
        document.querySelectorAll('.give-btn').forEach(b => b.style.opacity = "1");
    });
}