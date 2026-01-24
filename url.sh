#!/bin/bash
echo "----------------------------------------"
echo "🔍 Buscando la URL de tu túnel..."
FOUND_URL=$(pm2 logs tunel-cf --nostream --lines 200 | grep -o "https://[a-zA-Z0-9-]*\.trycloudflare\.com" | tail -n 1)

if [ -z "$FOUND_URL" ]; then
    echo "❌ No se encontró la URL en los últimos logs."
    echo "Intenta reiniciar el túnel: pm2 restart tunel-cf"
else
    echo "✅ URL ENCONTRADA:"
    echo "👉 $FOUND_URL"
fi
echo "----------------------------------------"
