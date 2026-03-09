#!/bin/bash

# Verificación de build para Frontend
# Uso: ./build-check.sh

set -e

echo "🔍 Verificando build..."

# Verificar que existe el directorio dist
if [[ ! -d "dist" ]]; then
    echo "❌ Directorio dist no encontrado"
    exit 1
fi

# Verificar que existe index.html
if [[ ! -f "dist/index.html" ]]; then
    echo "❌ index.html no encontrado en dist"
    exit 1
fi

# Verificar tamaño del bundle
BUNDLE_SIZE=$(du -sh dist | cut -f1)
echo "📦 Tamaño del bundle: $BUNDLE_SIZE"

# Verificar que existen assets
if [[ ! -d "dist/assets" ]]; then
    echo "⚠️  Directorio assets no encontrado"
else
    ASSETS_COUNT=$(find dist/assets -type f | wc -l)
    echo "📁 Assets encontrados: $ASSETS_COUNT archivos"
fi

# Verificar que no hay archivos .map en producción (opcional)
MAP_FILES=$(find dist -name "*.map" | wc -l)
if [[ "$MAP_FILES" -gt 0 ]]; then
    echo "⚠️  Se encontraron $MAP_FILES archivos .map (considerar removerlos en producción)"
fi

echo "✅ Build verificado correctamente"
