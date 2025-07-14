// Test para verificar traducciones
import i18n from './src/i18n/index.ts'

// Cambiar a inglés para probar
i18n.changeLanguage('en')

console.log('Testing translations:')
console.log('manuals.uploadFile:', i18n.t('manuals.uploadFile'))
console.log('manuals.selectPdfFile:', i18n.t('manuals.selectPdfFile'))
console.log('manuals.changeFile:', i18n.t('manuals.changeFile'))
console.log('manuals.dragAndDrop:', i18n.t('manuals.dragAndDrop'))
console.log('manuals.cancel:', i18n.t('manuals.cancel'))
console.log('manuals.uploading:', i18n.t('manuals.uploading'))

// Cambiar a español
i18n.changeLanguage('es')
console.log('\nEn español:')
console.log('manuals.uploadFile:', i18n.t('manuals.uploadFile'))
console.log('manuals.selectPdfFile:', i18n.t('manuals.selectPdfFile'))
console.log('manuals.changeFile:', i18n.t('manuals.changeFile'))
console.log('manuals.dragAndDrop:', i18n.t('manuals.dragAndDrop'))
console.log('manuals.cancel:', i18n.t('manuals.cancel'))
console.log('manuals.uploading:', i18n.t('manuals.uploading')) 