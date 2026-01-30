app.give = {
    // Lista visual de objetos
    items: [
        // Cobblemon
        { id: "cobblemon:poke_ball", name: "Poké Ball", icon: "🔴" },
        { id: "cobblemon:great_ball", name: "Super Ball", icon: "🔵" },
        // { id: "cobblemon:ultra_ball", name: "Ultra Ball", icon: "🟡" },
        { id: "cobblemon:pokedex_red", name: "Pokédex", icon: "📱" },
        { id: "cobblemon:potion", name: "Poción (Pokémon)", icon: "🧪" },

        // Equipo
        { id: "minecraft:iron_sword", name: "Espada Hierro", icon: "⚔️" },
        { id: "minecraft:chainmail_chestplate", name: "Peto Malla", icon: "👕" },
        { id: "minecraft:leather_boots", name: "Botas Cuero", icon: "👢" },

        //Minerales 
        { id: "minecraft:iron_ingot", name: "Lingote Hierro", icon: "🔩" },
        { id: "minecraft:diamond", name: "Diamante", icon: "💎" },
        { id: "minecraft:gold_ingot", name: "Lingote Oro", icon: "💰" },
        { id: "minecraft:emerald", name: "Esmeralda", icon: "💚" },


        // Utilidades
        { id: "minecraft:torch", name: "Antorchas", icon: "🔥" },
        { id: "minecraft:bread", name: "Pan", icon: "🍞" },
        { id: "minecraft:oak_log", name: "Madera Roble", icon: "🪵" },
        { id: "minecraft:water_bucket", name: "Cubo Agua", icon: "💧" },
        { id: "minecraft:scaffolding", name: "Andamios", icon: "🏗️" },

        //Construcción
        { id: "minecraft:oak_planks", name: "Tablones Roble", icon: "🪵" },
        { id: "minecraft:stone_bricks", name: "Ladrillos Piedra", icon: "🧱"},
        { id: "minecraft:glass", name: "Bloque Vidrio", icon: "🪟"},
        { id: "minecraft:dirt", name: "Bloque Hierro (tú crees)", icon: "🔩" }
    ],

    // Función para renderizar los botones dinámicamente
    renderButtons: () => {
        const container = document.querySelector('#giveScreen .card > div');
        if (!container) return;

        container.innerHTML = ''; // Limpiar botones viejos

        app.give.items.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'cat-btn give-btn';
            btn.id = `btn-${item.id.replace(/:/g, '-')}`; // ID seguro para CSS
            btn.onclick = () => app.give.request(item.id);
            
            btn.innerHTML = `
                <div style="font-size:2em">${item.icon}</div>
                <div>${item.name}</div>
            `;
            
            container.appendChild(btn);
        });
    },

    request: (itemId) => {
        if (!app.myPlayerName) return alert("Primero debes ponerte nombre en el Lobby.");
        
        // Bloqueo visual preventivo
        const btn = document.getElementById(`btn-${itemId.replace(/:/g, '-')}`);
        if(btn) btn.style.opacity = "0.5";

        socket.emit('requestItem', {
            item: itemId,
            playerName: app.myPlayerName
        });
    }
};

// Inicializar botones al cargar
// (Asegúrate de llamar a app.give.renderButtons() cuando muestres la pantalla o al inicio)
// Puedes añadir esta línea al final de este archivo o en el main.js window.onload
// Pero para simplificar, si el elemento ya existe, lo renderizamos:
setTimeout(() => app.give.renderButtons(), 500); 


// Escuchar respuestas del servidor
socket.on('giveSuccess', (data) => {
    const audio = document.getElementById('revealSound');
    if(audio) { audio.currentTime=0; audio.play(); }
    
    alert(`✅ ¡Recibido! (${data.quantity}x ${data.item.split(':')[1]})`);
    
    // Restaurar opacidad de todos los botones
    document.querySelectorAll('.give-btn').forEach(b => b.style.opacity = "1");
});

socket.on('giveError', (msg) => {
    alert("⚠️ " + msg); // Mensaje de cooldown o error
    document.querySelectorAll('.give-btn').forEach(b => b.style.opacity = "1");
});