const path = require('path');
const Database = require('better-sqlite3');
const tabuViejas = require('./games/tabu_words.js');

const db = new Database(path.join(__dirname, 'arcade.db'));

// Asegurar tabla
db.prepare(`
    CREATE TABLE IF NOT EXISTS tabu_data (
        id_unico TEXT UNIQUE,
        palabra TEXT,
        prohibida1 TEXT,
        prohibida2 TEXT,
        prohibida3 TEXT,
        prohibida4 TEXT
    )
`).run();

console.log("Iniciando migración de palabras del Tabú...");

const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO tabu_data 
    (id_unico, palabra, prohibida1, prohibida2, prohibida3, prohibida4) 
    VALUES (?, ?, ?, ?, ?, ?)
`);

let count = 0;

const insertMany = db.transaction((palabras) => {
    palabras.forEach((item, index) => {
        const idUnico = `tabu_${index + 1}`;
        const prohibidas = item.forbidden || [];
        
        const result = insertStmt.run(
            idUnico, 
            item.word, 
            prohibidas[0] || "", 
            prohibidas[1] || "", 
            prohibidas[2] || "", 
            prohibidas[3] || ""
        );
        
        if (result.changes > 0) count++;
    });
});

insertMany(tabuViejas);

console.log(`✅ Migración completada: ${count} palabras de Tabú insertadas en la base de datos.`);
console.log("Ya puedes eliminar de forma segura el archivo 'games/tabu_words.js' si lo deseas.");