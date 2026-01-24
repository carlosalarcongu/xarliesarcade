#!/bin/bash

# --- CONFIGURACIÓN ---

# Nombre del fichero de salida
OUTPUT_FILE="estado_proyecto.txt"

# Carpetas a ignorar (separadas por espacio)
# Se ignorarán recursivamente (ej: si pones 'games', ignorará cualquier carpeta llamada games)
IGNORE_DIRS=("node_modules" ".git" ".pm2" "logs" "games_backup" "node_modules")

# Ficheros a ignorar (puedes usar * como comodín)
IGNORE_FILES=("package-lock.json" ".env" "*.png" "*.jpg" "*.jpeg" "*.ico" "dump_project.sh" "$OUTPUT_FILE" ".DS_Store" "url.sh" "cloudflared-linux-amd64" "cloudflared-linux-arm64.deb" "cloudflared-linux-arm64" "cloudflared.exe")

# ---------------------

# Limpiar fichero de salida previo
echo "Generando reporte del proyecto..." > "$OUTPUT_FILE"
echo "Fecha: $(date)" >> "$OUTPUT_FILE"
echo "==================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Construcción del comando find dinámico
# 1. Ignorar directorios (-prune)
FIND_CMD="find . -type d \( "
first=true
for dir in "${IGNORE_DIRS[@]}"; do
    if [ "$first" = true ]; then
        FIND_CMD+="-name \"$dir\""
        first=false
    else
        FIND_CMD+=" -o -name \"$dir\""
    fi
done
FIND_CMD+=" \) -prune -o -type f"

# 2. Ignorar ficheros específicos
if [ ${#IGNORE_FILES[@]} -gt 0 ]; then
    FIND_CMD+=" \( "
    first=true
    for file in "${IGNORE_FILES[@]}"; do
        if [ "$first" = true ]; then
            FIND_CMD+="-not -name \"$file\""
            first=false
        else
            FIND_CMD+=" -a -not -name \"$file\""
        fi
    done
    FIND_CMD+=" \)"
fi

# 3. Acción final
FIND_CMD+=" -print"

# Ejecutar y procesar
echo "🔍 Escaneando archivos..."
# Usamos eval para ejecutar el comando construido
eval $FIND_CMD | sort | while read -r filepath; do
    
    # Ignoramos la referencia al propio directorio '.'
    if [ "$filepath" == "." ]; then continue; fi

    echo "📄 Procesando: $filepath"

    # Escribir cabecera en el fichero de salida
    echo "--------------------------------------------------" >> "$OUTPUT_FILE"
    echo "FICHERO: $filepath" >> "$OUTPUT_FILE"
    echo "--------------------------------------------------" >> "$OUTPUT_FILE"

    # Comprobar si es un archivo de texto o binario
    if file "$filepath" | grep -q "text"; then
        # Es texto, volcamos el contenido
        cat "$filepath" >> "$OUTPUT_FILE"
    else
        # Es binario (imagen, ejecutable, etc), ponemos un aviso
        echo "[CONTENIDO BINARIO O NO TEXTO - OMITIDO]" >> "$OUTPUT_FILE"
    fi

    echo -e "\n\n" >> "$OUTPUT_FILE"
done

echo "✅ ¡Hecho! El estado del proyecto se ha guardado en: $OUTPUT_FILE"