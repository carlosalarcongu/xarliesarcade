const fs = require('fs');
const path = require('path');
const os = require('os');

// CAMBIO CLAVE: Escribir en la carpeta temporal del sistema
// Así PM2 no se entera y no reinicia el servidor.
const LOG_FILE = path.join(os.tmpdir(), 'impostor_test_debug.log');

console.log(`📝 LOGGING TO: ${LOG_FILE}`); // Para que sepas dónde buscarlo

// --- CORRECCIÓN: No borrar automáticamente al importar ---
// Si el archivo no existe, lo creamos vacío. Si existe, lo respetamos.
if (!fs.existsSync(LOG_FILE)) {
    try {
        fs.writeFileSync(LOG_FILE, `=== LOG CREADO ${new Date().toISOString()} ===\n`);
    } catch (e) {}
}

// Función para limpiar el log bajo demanda (la llamaremos desde el test)
function clear() {
    try {
        fs.writeFileSync(LOG_FILE, `=== INICIO DE SESIÓN DE TEST ${new Date().toISOString()} ===\n`);
    } catch (e) {
        console.error("Error limpiando log:", e);
    }
}

function log(source, message, data = null) {
    const time = new Date().toISOString().split('T')[1].slice(0, -1);
    let line = `[${time}] [${source}] ${message}`;
    
    if (data) {
        try {
            const str = JSON.stringify(data, (key, value) => {
                if (key === 'socket') return 'SocketObject';
                return value;
            });
            line += ` | DATA: ${str}`;
        } catch (e) {
            line += ` | DATA: [Circular/Error]`;
        }
    }
    
    try {
        // Usamos appendFileSync para añadir al final sin borrar
        fs.appendFileSync(LOG_FILE, line + '\n');
    } catch (e) {
        console.error("Error escribiendo en log:", e);
    }
}

module.exports = { log, clear };