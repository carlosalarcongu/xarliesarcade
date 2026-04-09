const path = require('path');
const Database = require('better-sqlite3');
const oldDatabase = require('./games/database.js');

const db = new Database(path.join(__dirname, 'arcade.db'));

// 1. Crear la tabla si no existe
db.prepare(`
    CREATE TABLE IF NOT EXISTS impostor_data (
        id_unico TEXT UNIQUE,
        categoria TEXT,
        palabra TEXT,
        pista TEXT,
        aux1 TEXT
    )
`).run();

console.log("Iniciando migración de palabras del Impostor...");

const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO impostor_data 
    (id_unico, categoria, palabra, pista, aux1) 
    VALUES (?, ?, ?, ?, ?)
`);

let count = 0;

// 2. Transacción para insertar los datos de forma rápida y segura
const insertMany = db.transaction((categories) => {
    for (const [catKey, catData] of Object.entries(categories)) {
        // Ignoramos MIX porque es una categoría dinámica, no tiene palabras propias
        if (catKey === 'MIX') continue;
        
        catData.words.forEach((item, index) => {
            const idUnico = `imp_${catKey}_${index}`;
            const result = insertStmt.run(
                idUnico,        // id_unico
                catKey,         // categoria (ej: "FÁCILES")
                item.word,      // palabra
                item.hint,      // pista
                catData.label   // aux1 (Nombre bonito con emoji)
            );
            
            if (result.changes > 0) count++;
        });
    }
});

insertMany(oldDatabase);

console.log(`✅ Migración completada: ${count} palabras insertadas.`);