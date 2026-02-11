const axios = require('axios');
const fs = require('fs');
const path = require('path');

const RANKING_FILE = path.join(__dirname, '../ranking_contexto.json');
let wordCache = {};
const userSessions = {};

// Configuración de Headers (User-Agent genérico)
const AXIOS_CONFIG = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://contexto.me/',
        'Origin': 'https://contexto.me'
    },
    timeout: 5000 // 5 segundos máximo de espera
};

function loadRanking() {
    try { if (fs.existsSync(RANKING_FILE)) return JSON.parse(fs.readFileSync(RANKING_FILE, 'utf8')); } catch (e) {}; return {};
}

function saveRanking(data) {
    try { fs.writeFileSync(RANKING_FILE, JSON.stringify(data, null, 2)); } catch (e) {};
}

function addPoints(playerName, amount) {
    const ranking = loadRanking();
    if (!ranking[playerName]) ranking[playerName] = 0;
    ranking[playerName] += amount;
    saveRanking(ranking);
}

async function fetchWordDistance(gameId, word) {
    const cleanWord = word.toLowerCase().trim();
    const cacheKey = `${gameId}_${cleanWord}`;

    // Si ya lo sabemos, devolvemos memoria
    if (wordCache[cacheKey]) return wordCache[cacheKey];

    const url = `https://api.contexto.me/machado/es/game/${gameId}/${encodeURIComponent(cleanWord)}`;
    console.log(`[Contexto] API Request: ${url}`);

    try {
        const response = await axios.get(url, AXIOS_CONFIG);
        const data = {
            lemma: response.data.lemma,
            distance: response.data.distance,
            word: cleanWord
        };
        wordCache[cacheKey] = data;
        return data;
    } catch (error) {
        // Manejo de errores específicos
        if (error.response) {
            console.error(`[Contexto API Fail] Status: ${error.response.status}`);
            
            if (error.response.status === 404) {
                return { unknown: true }; // Palabra no existe
            }
            if (error.response.status === 500) {
                // Error interno de ellos: Probablemente ID de juego inválido
                return { error: true, message: `El juego #${gameId} no está disponible o no existe.` };
            }
        }
        return { error: true, message: "Error de conexión con Contexto." };
    }
}

const handleSocket = (io, socket) => {
    if (!userSessions[socket.id]) userSessions[socket.id] = {};

    socket.on('contexto_action', async (action) => {
        if (action.type === 'guess') {
            const { word, gameId, playerName } = action;
            if (!word || !gameId) return socket.emit('errorMsg', 'Faltan datos.');

            console.log(`[Contexto] ${playerName} -> ${word} (Juego ${gameId})`);

            if (!userSessions[socket.id][gameId]) userSessions[socket.id][gameId] = [];

            const result = await fetchWordDistance(gameId, word);

            // GESTIÓN DE ERRORES AL CLIENTE
            if (result.error) {
                return socket.emit('errorMsg', result.message || 'Error desconocido.');
            }
            if (result.unknown) {
                return socket.emit('errorMsg', `La palabra "${word}" no está en el diccionario.`);
            }

            const alreadyGuessed = userSessions[socket.id][gameId].includes(result.lemma);
            let points = 0;

            if (!alreadyGuessed) {
                userSessions[socket.id][gameId].push(result.lemma);
                
                if (result.distance === 0) points = 500;
                else if (result.distance <= 300) points = 20;
                else if (result.distance <= 3000) points = 5;
                else points = 1;

                if (playerName && points > 0) addPoints(playerName, points);
            }

            socket.emit('contexto_result', {
                word: result.lemma,
                distance: result.distance,
                points: points,
                win: result.distance === 0
            });
        }

        if (action.type === 'getRanking') {
            const data = loadRanking();
            const sorted = Object.entries(data)
                .map(([name, pts]) => ({ name, pts }))
                .sort((a, b) => b.pts - a.pts)
                .slice(0, 20);
            socket.emit('contextoRankingData', sorted);
        }

        if (action.type === 'resetRanking') {
            saveRanking({});
            socket.emit('errorMsg', 'Ranking reiniciado.');
        }
    });

    socket.on('disconnect', () => {
        delete userSessions[socket.id];
    });
};

module.exports = { init: (io) => {}, handleSocket };