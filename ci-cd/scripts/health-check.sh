#!/bin/bash

# Health check para Frontend
# Uso: ./health-check.sh [URL]

URL=${1:-"https://leonix.net.ar"}

echo "🏥 Verificando salud de $URL..."

# Verificar que el sitio responde
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL")

if [[ "$HTTP_CODE" == "200" ]]; then
    echo "✅ Sitio respondiendo correctamente (HTTP $HTTP_CODE)"
else
    echo "❌ Sitio no responde correctamente (HTTP $HTTP_CODE)"
    exit 1
fi

# Verificar headers de seguridad
echo "🔒 Verificando headers de seguridad..."
HEADERS=$(curl -s -I "$URL")

check_header() {
    HEADER=$1
    if echo "$HEADERS" | grep -qi "$HEADER"; then
        echo "  ✅ $HEADER presente"
    else
        echo "  ⚠️  $HEADER ausente"
    fi
}

check_header "X-Frame-Options"
check_header "X-Content-Type-Options"
check_header "Strict-Transport-Security"
check_header "Content-Security-Policy"

echo "✅ Health check completado"
