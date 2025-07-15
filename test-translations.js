// Test para verificar traducciones
const fs = require('fs')

// Leer el archivo de traducción español
const esTranslations = JSON.parse(fs.readFileSync('./src/i18n/locales/es.json', 'utf8'))

// Verificar si las claves existen
const testKeys = [
  'manuals.uploadFile',
  'manuals.selectPdfFile',
  'manuals.changeFile',
  'manuals.dragAndDrop',
  'manuals.cancel',
  'manuals.uploading'
]

testKeys.forEach(key => {
  const keys = key.split('.')
  let value = esTranslations
  
  for (const k of keys) {
    if (value && value[k]) {
      value = value[k]
    } else {
      value = `❌ CLAVE NO ENCONTRADA: ${key}`
      break
    }
  }
  
  console.log(`${key}: ${value}`)
})

console.log('✅ Verificación completada') 