#!/bin/bash

# Setup de secrets para Frontend
# Uso: ./setup-secrets.sh [staging|production]

ENVIRONMENT=${1:-staging}

echo "🔐 Configurando secrets para $ENVIRONMENT..."

# Validar entorno
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo "❌ Entorno inválido. Usar: staging o production"
    exit 1
fi

# Crear archivo .env si no existe
if [[ ! -f ".env" ]]; then
    if [[ -f ".env.example" ]]; then
        cp .env.example .env
        echo "✅ Archivo .env creado desde .env.example"
    else
        echo "❌ No se encontró .env.example"
        exit 1
    fi
fi

echo "📝 Configurando variables de entorno para $ENVIRONMENT..."

# Variables según entorno
if [[ "$ENVIRONMENT" == "production" ]]; then
    API_URL="https://api.leonix.net.ar"
else
    API_URL="https://api-staging.leonix.net.ar"
fi

# Actualizar .env
cat > .env << EOF
# Entorno: $ENVIRONMENT
# Generado: $(date)

# API Configuration
VITE_API_URL=$API_URL
VITE_ENVIRONMENT=$ENVIRONMENT

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_TRACKING=true

# IMPORTANTE: Nunca commitear este archivo
# Solo variables públicas (VITE_*) son seguras en frontend
EOF

echo "✅ Secrets configurados correctamente"
echo "⚠️  Recuerda: NUNCA commitear el archivo .env"
echo "⚠️  Solo usar variables VITE_* (públicas) en frontend"
