const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Configuración de rutas
const htmlPath = path.join(__dirname, 'public', 'index.html');
const viewsDir = path.join(__dirname, 'views');
const partialsDir = path.join(viewsDir, 'partials');
const gamesDir = path.join(viewsDir, 'games');

// Crear directorios si no existen
[viewsDir, partialsDir, gamesDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Cargar el HTML
console.log('🔄 Leyendo public/index.html...');
const html = fs.readFileSync(htmlPath, 'utf8');
const $ = cheerio.load(html, { decodeEntities: false });

// Mapa de archivos y los IDs que contienen
const fileMap = {
    'partials/hub.ejs': ['#hubScreen'],
    'partials/login.ejs': ['#loginScreen'],
    'partials/admin.ejs': ['#authAdminScreen'],
    'partials/legal.ejs': ['#legalBanner', '#legalModal'],
    'partials/modals.ejs': ['#registerModal', '#passwordModal', '#globalRulesModal', '#floatingUserWidget'],
    'games/impostor.ejs': ['#impostorLobby', '#impostorGame'],
    'games/lobo.ejs': ['#loboLobby', '#loboGame'],
    'games/anecdotas.ejs': ['#anecdotasLobby', '#anecdotasGame'],
    'games/elmas.ejs': ['#elmasLobby', '#elmasGame', '#elmasPodiumModal'],
    'games/tabu.ejs': ['#tabuLobby', '#tabuGame'],
    'games/feedback.ejs': ['#feedbackScreen'],
    'games/pinturillo.ejs': ['#pinturilloImpLobby', '#pinturilloImpGame'],
    'games/mus.ejs': ['#musScreen', '#musVueApp'],
    'games/fifa.ejs': ['#fifaScreen'],
    'games/give.ejs': ['#giveScreen'],
    'games/cyl.ejs': ['#cylLobby', '#cylGame'],
    'games/orden.ejs': ['#ordenLobby', '#ordenGame'],
    'games/contexto.ejs': ['#contextoScreen', '#contextoRankingModal'],
    'games/consejo.ejs': ['#consejoScreen'],
    'games/fiesta.ejs': ['#fiestaScreen'],
    'games/trivial.ejs': ['#trivialScreen'],
    'games/darkstories.ejs': ['#darkstoriesScreen'],
    'games/torres.ejs': ['#torresLobby', '#torresGame'],
    'games/beber.ejs': ['#beberScreen', '#beberStatsScreen'],
    'games/stats.ejs': ['#statsSelectionScreen'],
    'games/analytics.ejs': ['#analyticsScreen'],
    'games/torneos.ejs': ['#torneosLobby', '#torneosViewScreen', '#torneosCreateModal', '#torneosResultModal', '#torneosByeModal']
};

console.log('✂️  Extrayendo componentes...');

// 1. Extraer el Head
fs.writeFileSync(path.join(partialsDir, 'head.ejs'), $.html($('head')));

// 2. Extraer Audios y Scripts
let audios = '';
$('audio').each((i, el) => { audios += $.html(el) + '\n'; });
fs.writeFileSync(path.join(partialsDir, 'audio.ejs'), audios);

let scripts = '';
$('script, link[rel="stylesheet"]').each((i, el) => { 
    // Solo cogemos los scripts y links del final del body
    if ($(el).parent()[0].name === 'body') scripts += $.html(el) + '\n'; 
});
fs.writeFileSync(path.join(partialsDir, 'scripts.ejs'), scripts);

// 3. Extraer todas las pantallas según el mapa
let includeTags = '';
for (const [filename, ids] of Object.entries(fileMap)) {
    let content = '';
    ids.forEach(id => {
        // En caso de IDs duplicados (como contextoRankingModal en tu HTML actual), seleccionamos el primero
        const element = $(id).first(); 
        if (element.length) {
            content += $.html(element) + '\n\n';
        }
    });
    
    if (content) {
        fs.writeFileSync(path.join(viewsDir, filename), content);
        includeTags += `    <%- include('${filename.replace('.ejs', '')}') %>\n`;
    }
}

// 4. Generar el index.ejs principal
const mainIndexContent = `<!DOCTYPE html>
<html lang="es">
<%- include('partials/head') %>
<body>
    <%- include('partials/audio') %>

${includeTags}
    <%- include('partials/scripts') %>
</body>
</html>`;

fs.writeFileSync(path.join(viewsDir, 'index.ejs'), mainIndexContent);

console.log('✅ ¡Modularización completada con éxito!');
console.log('📁 Revisa tu nueva carpeta /views');