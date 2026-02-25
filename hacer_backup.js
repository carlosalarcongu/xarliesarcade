const Database = require('better-sqlite3');
const db = new Database('arcade.db');

const fecha = new Date().toISOString().split('T')[0]; // Ej: 2026-02-25
const backupPath = `backup_arcade_${fecha}.db`;

db.backup(backupPath)
  .then(() => {
      console.log(`✅ Copia de seguridad guardada con éxito: ${backupPath}`);
  })
  .catch((err) => {
      console.error('❌ Error al hacer la copia:', err);
  });