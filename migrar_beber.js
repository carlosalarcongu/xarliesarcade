const fs = require('fs');
const Database = require('better-sqlite3');

// Esto creará el archivo arcade.db automáticamente
const db = new Database('arcade.db'); 

// 1. Creamos las tablas con su estructura profesional
db.exec(`
  CREATE TABLE IF NOT EXISTS beber_whitelist (
    name TEXT PRIMARY KEY
  );
  CREATE TABLE IF NOT EXISTS beber_records (
    id TEXT PRIMARY KEY,
    user TEXT,
    drink TEXT,
    date TEXT
  );
`);

// 2. Leemos tu JSON antiguo
if (fs.existsSync('./beber_database.json')) {
    const raw = fs.readFileSync('./beber_database.json', 'utf8');
    const data = JSON.parse(raw);

    // 3. Volcamos la whitelist
    const insertWhitelist = db.prepare('INSERT OR IGNORE INTO beber_whitelist (name) VALUES (?)');
    data.whitelist.forEach(name => insertWhitelist.run(name));

    // 4. Volcamos los registros de bebidas
    const insertRecord = db.prepare('INSERT OR IGNORE INTO beber_records (id, user, drink, date) VALUES (?, ?, ?, ?)');
    data.records.forEach(r => insertRecord.run(String(r.id), r.user, r.drink, r.date));

    console.log("✅ Migración de Beber completada. Todos los datos están ahora en arcade.db");
} else {
    console.log("❌ No se encontró beber_database.json");
}