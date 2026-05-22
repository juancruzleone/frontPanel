#!/bin/bash

# Script de deployment para Frontend (Netlify/Vercel)
# Uso: ./deploy.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Iniciando deployment a $ENVIRONMENT..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Validar entorno
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    error "Entorno inválido. Usar: staging o production"
fi

# Verificar que estamos en la rama correcta
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$ENVIRONMENT" == "production" && "$CURRENT_BRANCH" != "main" ]]; then
    error "Production solo puede deployarse desde la rama 'main'"
fi

if [[ "$ENVIRONMENT" == "staging" && "$CURRENT_BRANCH" != "develop" ]]; then
    warning "Staging normalmente se deploya desde 'develop', estás en '$CURRENT_BRANCH'"
fi

# Verificar que no hay cambios sin commitear
if [[ -n $(git status -s) ]]; then
    error "Hay cambios sin commitear. Commitea o descarta los cambios antes de deployar."
fi

# Instalar dependencias
log "📦 Instalando dependencias..."
bun ci --ignore-scripts || error "Error instalando dependencias"

# Ejecutar linting
log "🔍 Ejecutando linting..."
bun run lint || error "Linting falló"

# Ejecutar type checking
log "📝 Verificando tipos..."
bun run type-check || error "Type checking falló"

# Ejecutar tests
log "🧪 Ejecutando tests..."
bun run test || error "Tests fallaron"

# Ejecutar security audit
log "🔒 Ejecutando security audit..."
bun audit --audit-level=moderate || warning "Se encontraron vulnerabilidades"

# Build
log "🏗️  Construyendo aplicación..."
if [[ "$ENVIRONMENT" == "production" ]]; then
    bun run build || error "Build falló"
else
    bun run build:staging || bun run build || error "Build falló"
fi

# Verificar que el build existe
if [[ ! -d "dist" ]]; then
    error "Directorio dist no encontrado después del build"
fi

log "✅ Build completado exitosamente"

# Deploy según plataforma
if [[ -n "$NETLIFY_AUTH_TOKEN" ]]; then
    log "🌐 Deploying a Netlify..."
    if [[ "$ENVIRONMENT" == "production" ]]; then
        bunx netlify-cli deploy --prod --dir=dist || error "Deploy a Netlify falló"
    else
        bunx netlify-cli deploy --dir=dist || error "Deploy a Netlify falló"
    fi
elif [[ -n "$VERCEL_TOKEN" ]]; then
    log "🌐 Deploying a Vercel..."
    if [[ "$ENVIRONMENT" == "production" ]]; then
        bunx vercel --prod || error "Deploy a Vercel falló"
    else
        bunx vercel || error "Deploy a Vercel falló"
    fi
else
    warning "No se encontró token de Netlify o Vercel. Saltando deploy automático."
    log "Build disponible en ./dist"
fi

log "✅ Deployment completado exitosamente!"
log "📊 Timestamp: $TIMESTAMP"
