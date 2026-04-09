// migrate_elmas.js
const path = require('path');
const Database = require('better-sqlite3');
const preguntasViejas = require('./games/preguntas_elmas.js');

const db = new Database(path.join(__dirname, 'arcade.db'));

// 1. Crear la tabla si no existe
db.prepare(`
    CREATE TABLE IF NOT EXISTS elmas_data (
        id_unico TEXT UNIQUE,
        pregunta TEXT
    )
`).run();

console.log("Iniciando migración de preguntas de 'El MÁS...'...");

const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO elmas_data (id_unico, pregunta) VALUES (?, ?)
`);

let count = 0;

// 2. Transacción para insertar rápidamente
const insertMany = db.transaction((preguntas) => {
    preguntas.forEach((preguntaStr, index) => {
        const idUnico = `elmas_${index + 1}`;
        
        const result = insertStmt.run(idUnico, preguntaStr);
        if (result.changes > 0) count++;
    });
});

// Comprobamos si lo que importamos es un array directamente o un objeto con un array dentro
const listaPreguntas = Array.isArray(preguntasViejas) ? preguntasViejas : (preguntasViejas.questions || []);

insertMany(listaPreguntas);

console.log(`✅ Migración completada: ${count} preguntas insertadas en la base de datos.`);
console.log("Ya puedes eliminar de forma segura el archivo 'games/preguntas_elmas.js' si lo deseas.");