import i18n from "../../i18n"

/**
 * Translation tables for values that come from the backend, not from the
 * interface. i18next cannot help here: the backend stores Spanish tokens
 * (`pendiente`, `plan_mantenimiento`, `En Progreso`), so every label below has
 * to be resolved by hand against the active language.
 *
 * Two rules make this file safe to extend:
 *
 * 1. `BackendLabelTable` is keyed by `BackendTranslationLanguage`, so a table
 *    that forgets one of the ten supported languages is a compile error, not a
 *    runtime surprise in the UI.
 * 2. `resolveBackendLabel` is the only lookup path, and its fallback order is
 *    documented once, below. A missing label never silently becomes Spanish.
 */

/** The ten languages registered in `src/i18n/index.ts`. Keep in sync with `src/i18n/locales/`. */
export const BACKEND_TRANSLATION_LANGUAGES = ['es', 'en', 'fr', 'pt', 'de', 'it', 'ja', 'ko', 'zh', 'ar'] as const

export type BackendTranslationLanguage = (typeof BACKEND_TRANSLATION_LANGUAGES)[number]

/**
 * Neutral pivot used when the active language is registered in i18next but has
 * no entry in a backend table (a future eleventh language, for example).
 * Spanish is deliberately *not* the pivot: it is the source language of the
 * backend tokens, so falling back to it would show untranslated Spanish to
 * every user outside Spain instead of a language they can read.
 */
export const BACKEND_LABEL_FALLBACK_LANGUAGE: BackendTranslationLanguage = 'en'

export type BackendLabelTable = Record<BackendTranslationLanguage, Record<string, string>>

/**
 * Resolves a language tag (`pt-BR`, `ja`, `undefined`) to a supported base tag.
 *
 * `fallbackLng: 'es'` in `src/i18n/index.ts` is honoured when i18next has not
 * reported a language at all — that only happens before `i18n.init()` or in a
 * unit test that renders without the provider. Once a language *is* reported,
 * an unsupported one resolves to the English pivot, never to Spanish.
 */
export const resolveBackendLanguage = (language?: string): BackendTranslationLanguage => {
  const base = (language ?? '').split('-')[0]
  return (BACKEND_TRANSLATION_LANGUAGES as readonly string[]).includes(base)
    ? (base as BackendTranslationLanguage)
    : BACKEND_LABEL_FALLBACK_LANGUAGE
}

const activeBackendLanguage = (): BackendTranslationLanguage =>
  resolveBackendLanguage(i18n.resolvedLanguage || i18n.language || 'es')

/**
 * Canonicalises a token so `Pendiente`, `pendiente` and ` PENDIENTE ` address
 * the same entry. Only Latin-script text is decomposed: Hangul, kana and
 * ideographs lose their composition under NFD, so they are left alone.
 */
export const normaliseBackendToken = (value: string): string => {
  const trimmed = (value ?? '').trim().replace(/\s+/g, ' ')
  if (!trimmed || !/[\u00c0-\u024f]/.test(trimmed)) return trimmed.toLowerCase()
  return trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/**
 * Looks a backend value up in a table.
 *
 * Resolution order, in one place on purpose:
 *   1. `aliases` maps any Spanish or English display form the backend may send
 *      (`Plan de mantenimiento`, `Maintenance plan`) onto the canonical key.
 *   2. the active language's label for that key;
 *   3. the English pivot's label, when the active language predates the table;
 *   4. the value unchanged, when it is not a known token at all. An unknown
 *      status is data, not a translation gap, so it is passed through instead
 *      of being replaced by a guess.
 */
export const resolveBackendLabel = (
  table: BackendLabelTable,
  value: string,
  aliases: Record<string, string> = {},
): string => {
  const normalised = normaliseBackendToken(value)
  const key = aliases[normalised] ?? normalised
  const localized = table[activeBackendLanguage()]?.[key]
  if (localized) return localized
  return table[BACKEND_LABEL_FALLBACK_LANGUAGE]?.[key] ?? value
}

/* ------------------------------------------------------------------ *
 * Work order status
 * ------------------------------------------------------------------ */

const WORK_ORDER_STATUS_LABELS: BackendLabelTable = {
  es: {
    'pendiente': 'Pendiente',
    'asignada': 'Asignada',
    'en_progreso': 'En Progreso',
    'completada': 'Completada',
    'cancelada': 'Cancelada'
  },
  en: {
    'pendiente': 'Pending',
    'asignada': 'Assigned',
    'en_progreso': 'In Progress',
    'completada': 'Completed',
    'cancelada': 'Cancelled'
  },
  fr: {
    'pendiente': 'En Attente',
    'asignada': 'Assignée',
    'en_progreso': 'En Cours',
    'completada': 'Terminée',
    'cancelada': 'Annulée'
  },
  pt: {
    'pendiente': 'Pendente',
    'asignada': 'Atribuída',
    'en_progreso': 'Em Andamento',
    'completada': 'Concluída',
    'cancelada': 'Cancelada'
  },
  de: {
    'pendiente': 'Ausstehend',
    'asignada': 'Zugewiesen',
    'en_progreso': 'In Bearbeitung',
    'completada': 'Abgeschlossen',
    'cancelada': 'Storniert'
  },
  it: {
    'pendiente': 'In Attesa',
    'asignada': 'Assegnata',
    'en_progreso': 'In Corso',
    'completada': 'Completata',
    'cancelada': 'Annullata'
  },
  ja: {
    'pendiente': '保留中',
    'asignada': '割り当て済み',
    'en_progreso': '進行中',
    'completada': '完了',
    'cancelada': 'キャンセル'
  },
  ko: {
    'pendiente': '대기 중',
    'asignada': '할당됨',
    'en_progreso': '진행 중',
    'completada': '완료됨',
    'cancelada': '취소됨'
  },
  zh: {
    'pendiente': '待处理',
    'asignada': '已分配',
    'en_progreso': '进行中',
    'completada': '已完成',
    'cancelada': '已取消'
  },
  ar: {
    'pendiente': 'قيد الانتظار',
    'asignada': 'مُسندة',
    'en_progreso': 'قيد التنفيذ',
    'completada': 'مكتملة',
    'cancelada': 'ملغية'
  }
}

const WORK_ORDER_STATUS_ALIASES: Record<string, string> = {
  'en progreso': 'en_progreso',
  'in progress': 'en_progreso',
  'pending': 'pendiente',
  'assigned': 'asignada',
  'complete': 'completada',
  'completed': 'completada',
  'cancelled': 'cancelada',
  'canceled': 'cancelada'
}

// Traduce el estado de una orden de trabajo al idioma activo.
export const translateWorkOrderStatus = (status: string): string =>
  resolveBackendLabel(WORK_ORDER_STATUS_LABELS, status, WORK_ORDER_STATUS_ALIASES)

/* ------------------------------------------------------------------ *
 * Priority
 * ------------------------------------------------------------------ */

const PRIORITY_LABELS: BackendLabelTable = {
  es: {
    'baja': 'Baja',
    'media': 'Media',
    'alta': 'Alta',
    'critica': 'Crítica'
  },
  en: {
    'baja': 'Low',
    'media': 'Medium',
    'alta': 'High',
    'critica': 'Critical'
  },
  fr: {
    'baja': 'Faible',
    'media': 'Moyenne',
    'alta': 'Élevée',
    'critica': 'Critique'
  },
  pt: {
    'baja': 'Baixa',
    'media': 'Média',
    'alta': 'Alta',
    'critica': 'Crítica'
  },
  de: {
    'baja': 'Niedrig',
    'media': 'Mittel',
    'alta': 'Hoch',
    'critica': 'Kritisch'
  },
  it: {
    'baja': 'Bassa',
    'media': 'Media',
    'alta': 'Alta',
    'critica': 'Critica'
  },
  ja: {
    'baja': '低',
    'media': '中',
    'alta': '高',
    'critica': '緊急'
  },
  ko: {
    'baja': '낮음',
    'media': '보통',
    'alta': '높음',
    'critica': '긴급'
  },
  zh: {
    'baja': '低',
    'media': '中',
    'alta': '高',
    'critica': '紧急'
  },
  ar: {
    'baja': 'منخفضة',
    'media': 'متوسطة',
    'alta': 'عالية',
    'critica': 'حرجة'
  }
}

const PRIORITY_ALIASES: Record<string, string> = {
  'low': 'baja',
  'medium': 'media',
  'normal': 'media',
  'high': 'alta',
  'critical': 'critica'
}

// Traduce la prioridad de una orden de trabajo al idioma activo.
export const translatePriority = (priority: string): string =>
  resolveBackendLabel(PRIORITY_LABELS, priority, PRIORITY_ALIASES)

/* ------------------------------------------------------------------ *
 * Work type
 * ------------------------------------------------------------------ */

const WORK_TYPE_LABELS: BackendLabelTable = {
  es: {
    'mantenimiento': 'Mantenimiento',
    'reparacion': 'Reparación',
    'instalacion': 'Instalación',
    'inspeccion': 'Inspección',
    'limpieza': 'Limpieza',
    'calibracion': 'Calibración',
    'actualizacion': 'Actualización',
    'diagnostico': 'Diagnóstico'
  },
  en: {
    'mantenimiento': 'Maintenance',
    'reparacion': 'Repair',
    'instalacion': 'Installation',
    'inspeccion': 'Inspection',
    'limpieza': 'Cleaning',
    'calibracion': 'Calibration',
    'actualizacion': 'Update',
    'diagnostico': 'Diagnosis'
  },
  // `Maintenance` is the French word, not the English one left in place.
  fr: {
    'mantenimiento': 'Maintenance',
    'reparacion': 'Réparation',
    'instalacion': 'Installation',
    'inspeccion': 'Inspection',
    'limpieza': 'Nettoyage',
    'calibracion': 'Calibration',
    'actualizacion': 'Mise à jour',
    'diagnostico': 'Diagnostic'
  },
  pt: {
    'mantenimiento': 'Manutenção',
    'reparacion': 'Reparo',
    'instalacion': 'Instalação',
    'inspeccion': 'Inspeção',
    'limpieza': 'Limpeza',
    'calibracion': 'Calibração',
    'actualizacion': 'Atualização',
    'diagnostico': 'Diagnóstico'
  },
  de: {
    'mantenimiento': 'Wartung',
    'reparacion': 'Reparatur',
    'instalacion': 'Installation',
    'inspeccion': 'Inspektion',
    'limpieza': 'Reinigung',
    'calibracion': 'Kalibrierung',
    'actualizacion': 'Aktualisierung',
    'diagnostico': 'Diagnose'
  },
  it: {
    'mantenimiento': 'Manutenzione',
    'reparacion': 'Riparazione',
    'instalacion': 'Installazione',
    'inspeccion': 'Ispezione',
    'limpieza': 'Pulizia',
    'calibracion': 'Calibrazione',
    'actualizacion': 'Aggiornamento',
    'diagnostico': 'Diagnosi'
  },
  ja: {
    'mantenimiento': 'メンテナンス',
    'reparacion': '修理',
    'instalacion': '設置',
    'inspeccion': '検査',
    'limpieza': '清掃',
    'calibracion': 'キャリブレーション',
    'actualizacion': '更新',
    'diagnostico': '診断'
  },
  ko: {
    'mantenimiento': '유지보수',
    'reparacion': '수리',
    'instalacion': '설치',
    'inspeccion': '점검',
    'limpieza': '청소',
    'calibracion': '보정',
    'actualizacion': '업데이트',
    'diagnostico': '진단'
  },
  zh: {
    'mantenimiento': '维护',
    'reparacion': '维修',
    'instalacion': '安装',
    'inspeccion': '检查',
    'limpieza': '清洁',
    'calibracion': '校准',
    'actualizacion': '更新',
    'diagnostico': '诊断'
  },
  ar: {
    'mantenimiento': 'صيانة',
    'reparacion': 'إصلاح',
    'instalacion': 'تركيب',
    'inspeccion': 'فحص',
    'limpieza': 'تنظيف',
    'calibracion': 'معايرة',
    'actualizacion': 'تحديث',
    'diagnostico': 'تشخيص'
  }
}

const WORK_TYPE_ALIASES: Record<string, string> = {
  'maintenance': 'mantenimiento',
  'repair': 'reparacion',
  'installation': 'instalacion',
  'inspection': 'inspeccion',
  'cleaning': 'limpieza',
  'calibration': 'calibracion',
  'update': 'actualizacion',
  'updating': 'actualizacion',
  'diagnosis': 'diagnostico',
  'diagnostic': 'diagnostico'
}

// Traduce el tipo de trabajo al idioma activo.
export const translateWorkType = (workType: string): string =>
  resolveBackendLabel(WORK_TYPE_LABELS, workType, WORK_TYPE_ALIASES)

/* ------------------------------------------------------------------ *
 * Order type (corrective / preventive)
 * ------------------------------------------------------------------ */

const ORDER_TYPE_LABELS: BackendLabelTable = {
  es: {
    'correctivo': 'Correctivo',
    'preventivo': 'Preventivo'
  },
  en: {
    'correctivo': 'Corrective',
    'preventivo': 'Preventive'
  },
  fr: {
    'correctivo': 'Correctif',
    'preventivo': 'Préventif'
  },
  pt: {
    'correctivo': 'Corretivo',
    'preventivo': 'Preventivo'
  },
  de: {
    'correctivo': 'Korrektiv',
    'preventivo': 'Präventiv'
  },
  it: {
    'correctivo': 'Correttivo',
    'preventivo': 'Preventivo'
  },
  ja: {
    'correctivo': '是正',
    'preventivo': '予防'
  },
  ko: {
    'correctivo': '교정',
    'preventivo': '예방'
  },
  zh: {
    'correctivo': '纠正性',
    'preventivo': '预防性'
  },
  ar: {
    'correctivo': 'تصحيحي',
    'preventivo': 'وقائي'
  }
}

const ORDER_TYPE_ALIASES: Record<string, string> = {
  'corrective': 'correctivo',
  'curative': 'correctivo',
  'preventive': 'preventivo',
  'prevention': 'preventivo'
}

// Traduce el tipo de orden (correctiva o preventiva) al idioma activo.
export const translateOrderType = (orderType: string): string =>
  resolveBackendLabel(ORDER_TYPE_LABELS, orderType, ORDER_TYPE_ALIASES)

/* ------------------------------------------------------------------ *
 * Order origin
 * ------------------------------------------------------------------ */

const ORDER_ORIGIN_LABELS: BackendLabelTable = {
  es: {
    'manual': 'Manual',
    'plan_mantenimiento': 'Plan de mantenimiento'
  },
  en: {
    'manual': 'Manual',
    'plan_mantenimiento': 'Maintenance plan'
  },
  fr: {
    'manual': 'Manuel',
    'plan_mantenimiento': 'Plan de maintenance'
  },
  pt: {
    'manual': 'Manual',
    'plan_mantenimiento': 'Plano de manutenção'
  },
  de: {
    'manual': 'Manuell',
    'plan_mantenimiento': 'Wartungsplan'
  },
  it: {
    'manual': 'Manuale',
    'plan_mantenimiento': 'Piano di manutenzione'
  },
  ja: {
    'manual': '手動',
    'plan_mantenimiento': '保守計画'
  },
  ko: {
    'manual': '수동',
    'plan_mantenimiento': '유지보수 계획'
  },
  zh: {
    'manual': '手动',
    'plan_mantenimiento': '维护计划'
  },
  ar: {
    'manual': 'يدوي',
    'plan_mantenimiento': 'خطة الصيانة'
  }
}

/**
 * `origen` reaches the UI either as the stored key (`plan_mantenimiento`) or
 * already localised in Spanish (`Plan de mantenimiento`), depending on the
 * endpoint. Without these aliases the second form matched nothing and was
 * rendered verbatim, which is why the origin looked Spanish in every language
 * while its label translated correctly.
 */
const ORDER_ORIGIN_ALIASES: Record<string, string> = {
  'plan de mantenimiento': 'plan_mantenimiento',
  'maintenance plan': 'plan_mantenimiento',
  'mantenimiento': 'plan_mantenimiento',
  'manually': 'manual'
}

// Traduce el origen de la orden (manual o plan) al idioma activo.
export const translateOrderOrigin = (origin: string): string =>
  resolveBackendLabel(ORDER_ORIGIN_LABELS, origin, ORDER_ORIGIN_ALIASES)

/* ------------------------------------------------------------------ *
 * User role
 * ------------------------------------------------------------------ */

const USER_ROLE_LABELS: BackendLabelTable = {
  es: {
    'tecnico': 'Técnico',
    'cliente': 'Cliente',
    'admin': 'Administrador',
    'supervisor': 'Supervisor',
    'manager': 'Gerente'
  },
  en: {
    'tecnico': 'Technician',
    'cliente': 'Client',
    'admin': 'Administrator',
    'supervisor': 'Supervisor',
    'manager': 'Manager'
  },
  fr: {
    'tecnico': 'Technicien',
    'cliente': 'Client',
    'admin': 'Administrateur',
    'supervisor': 'Superviseur',
    'manager': 'Gestionnaire'
  },
  pt: {
    'tecnico': 'Técnico',
    'cliente': 'Cliente',
    'admin': 'Administrador',
    'supervisor': 'Supervisor',
    'manager': 'Gerente'
  },
  de: {
    'tecnico': 'Techniker',
    'cliente': 'Kunde',
    'admin': 'Administrator',
    'supervisor': 'Aufseher',
    'manager': 'Manager'
  },
  it: {
    'tecnico': 'Tecnico',
    'cliente': 'Cliente',
    'admin': 'Amministratore',
    'supervisor': 'Supervisore',
    'manager': 'Manager'
  },
  ja: {
    'tecnico': '技術者',
    'cliente': 'クライアント',
    'admin': '管理者',
    'supervisor': '監督者',
    'manager': 'マネージャー'
  },
  ko: {
    'tecnico': '기술자',
    'cliente': '고객',
    'admin': '관리자',
    'supervisor': '감독자',
    'manager': '매니저'
  },
  zh: {
    'tecnico': '技术员',
    'cliente': '客户',
    'admin': '管理员',
    'supervisor': '主管',
    'manager': '经理'
  },
  ar: {
    'tecnico': 'فني',
    'cliente': 'عميل',
    'admin': 'مدير',
    'supervisor': 'مشرف',
    'manager': 'مدير'
  }
}

// `técnico` used to be a second key; normalising the token covers both spellings.
const USER_ROLE_ALIASES: Record<string, string> = {
  'technician': 'tecnico',
  'client': 'cliente',
  'customer': 'cliente',
  'administrator': 'admin',
  'administrador': 'admin',
  'sysadmin': 'admin'
}

// Traduce el rol del usuario al idioma activo.
export const translateUserRole = (role: string): string =>
  resolveBackendLabel(USER_ROLE_LABELS, role, USER_ROLE_ALIASES)

/* ------------------------------------------------------------------ *
 * Form field type
 * ------------------------------------------------------------------ */

const FORM_FIELD_TYPE_LABELS: BackendLabelTable = {
  es: {
    'text': 'Texto',
    'textarea': 'Área de texto',
    'number': 'Número',
    'date': 'Fecha',
    'select': 'Selección',
    'checkbox': 'Casilla de verificación',
    'radio': 'Botón de radio',
    'file': 'Archivo'
  },
  en: {
    'text': 'Text',
    'textarea': 'Text area',
    'number': 'Number',
    'date': 'Date',
    'select': 'Select',
    'checkbox': 'Checkbox',
    'radio': 'Radio button',
    'file': 'File'
  },
  fr: {
    'text': 'Texte',
    'textarea': 'Zone de texte',
    'number': 'Nombre',
    'date': 'Date',
    'select': 'Sélection',
    'checkbox': 'Case à cocher',
    'radio': 'Bouton radio',
    'file': 'Fichier'
  },
  pt: {
    'text': 'Texto',
    'textarea': 'Área de texto',
    'number': 'Número',
    'date': 'Data',
    'select': 'Seleção',
    'checkbox': 'Caixa de seleção',
    'radio': 'Botão de rádio',
    'file': 'Arquivo'
  },
  de: {
    'text': 'Text',
    'textarea': 'Textbereich',
    'number': 'Zahl',
    'date': 'Datum',
    'select': 'Auswahl',
    'checkbox': 'Kontrollkästchen',
    'radio': 'Optionsfeld',
    'file': 'Datei'
  },
  // `File` is the term Italian interfaces use for an attachment.
  it: {
    'text': 'Testo',
    'textarea': 'Area di testo',
    'number': 'Numero',
    'date': 'Data',
    'select': 'Selezione',
    'checkbox': 'Casella di controllo',
    'radio': 'Pulsante radio',
    'file': 'File'
  },
  ja: {
    'text': 'テキスト',
    'textarea': 'テキストエリア',
    'number': '数値',
    'date': '日付',
    'select': '選択',
    'checkbox': 'チェックボックス',
    'radio': 'ラジオボタン',
    'file': 'ファイル'
  },
  ko: {
    'text': '텍스트',
    'textarea': '텍스트 영역',
    'number': '숫자',
    'date': '날짜',
    'select': '선택',
    'checkbox': '체크박스',
    'radio': '라디오 버튼',
    'file': '파일'
  },
  zh: {
    'text': '文本',
    'textarea': '文本区域',
    'number': '数字',
    'date': '日期',
    'select': '选择',
    'checkbox': '复选框',
    'radio': '单选按钮',
    'file': '文件'
  },
  ar: {
    'text': 'نص',
    'textarea': 'منطقة نصية',
    'number': 'رقم',
    'date': 'تاريخ',
    'select': 'اختيار',
    'checkbox': 'مربع اختيار',
    'radio': 'زر راديو',
    'file': 'ملف'
  }
}

const FORM_FIELD_TYPE_ALIASES: Record<string, string> = {
  'texto': 'text',
  'area de texto': 'textarea',
  'text area': 'textarea',
  'numero': 'number',
  'fecha': 'date',
  'data': 'date',
  'seleccion': 'select',
  'selecion': 'select',
  'dropdown': 'select',
  'casilla de verificacion': 'checkbox',
  'caixa de selecao': 'checkbox',
  'boton de radio': 'radio',
  'archivo': 'file',
  'arquivo': 'file'
}

// Traduce el tipo de campo de un formulario al idioma activo.
export const translateFormFieldType = (fieldType: string): string =>
  resolveBackendLabel(FORM_FIELD_TYPE_LABELS, fieldType, FORM_FIELD_TYPE_ALIASES)

/* ------------------------------------------------------------------ *
 * Device status
 * ------------------------------------------------------------------ */

/**
 * Maps every spelling the backend has been observed to send for a device to
 * the canonical key of the table below. Spanish is the stored language, so its
 * display forms are the primary aliases; the English forms are included
 * because some endpoints already return localised text.
 */
const DEVICE_STATUS_ALIASES: Record<string, string> = {
  'activo': 'activo',
  'active': 'activo',
  'inactivo': 'inactivo',
  'inattivo': 'inactivo',
  'inactive': 'inactivo',
  'en mantenimiento': 'mantenimiento',
  'mantenimiento': 'mantenimiento',
  'under maintenance': 'mantenimiento',
  'in maintenance': 'mantenimiento',
  'fuera de servicio': 'fuera_servicio',
  'fuera_servicio': 'fuera_servicio',
  'out of service': 'fuera_servicio',
  'pendiente de revision': 'pendiente_revision',
  'pendiente_revision': 'pendiente_revision',
  'pending review': 'pendiente_revision'
}

const DEVICE_STATUS_LABELS: BackendLabelTable = {
  es: {
    'activo': 'Activo',
    'inactivo': 'Inactivo',
    'mantenimiento': 'En Mantenimiento',
    'fuera_servicio': 'Fuera de Servicio',
    'pendiente_revision': 'Pendiente de Revisión'
  },
  en: {
    'activo': 'Active',
    'inactivo': 'Inactive',
    'mantenimiento': 'Under Maintenance',
    'fuera_servicio': 'Out of Service',
    'pendiente_revision': 'Pending Review'
  },
  fr: {
    'activo': 'Actif',
    'inactivo': 'Inactif',
    'mantenimiento': 'En maintenance',
    'fuera_servicio': 'Hors Service',
    'pendiente_revision': 'En Attente de Révision'
  },
  pt: {
    'activo': 'Ativo',
    'inactivo': 'Inativo',
    'mantenimiento': 'Em Manutenção',
    'fuera_servicio': 'Fora de Serviço',
    'pendiente_revision': 'Pendente de Revisão'
  },
  de: {
    'activo': 'Aktiv',
    'inactivo': 'Inaktiv',
    'mantenimiento': 'In Wartung',
    'fuera_servicio': 'Außer Betrieb',
    'pendiente_revision': 'Zur Überprüfung'
  },
  it: {
    'activo': 'Attivo',
    'inactivo': 'Inattivo',
    'mantenimiento': 'In Manutenzione',
    'fuera_servicio': 'Fuori Servizio',
    'pendiente_revision': 'In Attesa di Revisione'
  },
  ja: {
    'activo': 'アクティブ',
    'inactivo': '非アクティブ',
    'mantenimiento': 'メンテナンス中',
    'fuera_servicio': 'サービス停止',
    'pendiente_revision': 'レビュー待ち'
  },
  ko: {
    'activo': '활성',
    'inactivo': '비활성',
    'mantenimiento': '유지보수 중',
    'fuera_servicio': '서비스 중단',
    'pendiente_revision': '검토 대기'
  },
  zh: {
    'activo': '活跃',
    'inactivo': '非活跃',
    'mantenimiento': '维护中',
    'fuera_servicio': '停止服务',
    'pendiente_revision': '待审查'
  },
  ar: {
    'activo': 'نشط',
    'inactivo': 'غير نشط',
    'mantenimiento': 'قيد الصيانة',
    'fuera_servicio': 'خارج الخدمة',
    'pendiente_revision': 'في انتظار المراجعة'
  }
}

// Traduce el estado de un dispositivo al idioma activo.
export const translateDeviceStatus = (status: string): string =>
  resolveBackendLabel(DEVICE_STATUS_LABELS, status, DEVICE_STATUS_ALIASES)

/* ------------------------------------------------------------------ *
 * Months
 * ------------------------------------------------------------------ */

// Nombres de meses en español: el backend los usa como forma canónica.
export const monthNamesES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const monthTranslations: Record<BackendTranslationLanguage, string[]> = {
  es: monthNamesES,
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  fr: [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ],
  pt: [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ],
  de: [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ],
  it: [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ],
  ja: [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ],
  ko: [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ],
  zh: [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ],
  ar: [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ]
};

const monthIndexOf = (month: string, language: BackendTranslationLanguage): number => {
  const needle = normaliseBackendToken(month)
  if (!needle) return -1
  return monthTranslations[language].findIndex((name) => normaliseBackendToken(name) === needle)
}

/**
 * Returns `monthES` in the language of the interface.
 *
 * A month already written in the target language, or written in English, is
 * accepted because both arrive from the API. An unrecognised string is
 * returned unchanged (see `resolveBackendLabel` for the same rule), and an
 * unsupported language resolves through English rather than Spanish.
 */
export function translateMonthToCurrentLang(monthES: string, lang: string): string {
  const language = resolveBackendLanguage(lang || 'es')
  let index = monthIndexOf(monthES, 'es')
  if (index === -1) index = monthIndexOf(monthES, BACKEND_LABEL_FALLBACK_LANGUAGE)
  if (index === -1) index = monthIndexOf(monthES, language)
  if (index === -1) return monthES
  return monthTranslations[language][index] ?? monthES
}

/** Reverse of `translateMonthToCurrentLang`; the canonical form is Spanish. */
export function translateMonthToES(month: string, lang: string): string {
  const language = resolveBackendLanguage(lang || 'es')
  let index = monthIndexOf(month, language)
  if (index === -1) index = monthIndexOf(month, BACKEND_LABEL_FALLBACK_LANGUAGE)
  if (index === -1) index = monthIndexOf(month, 'es')
  if (index === -1) return month
  return monthNamesES[index] ?? month
}

/* ------------------------------------------------------------------ *
 * Frequencies
 * ------------------------------------------------------------------ */

export const frequencyMapES = ['Mensual', 'Trimestral', 'Semestral', 'Anual'];
export const frequencyMapValues = ['mensual', 'trimestral', 'semestral', 'anual'];

export const frequencyTranslations: Record<BackendTranslationLanguage, string[]> = {
  es: frequencyMapES,
  en: ['Monthly', 'Quarterly', 'Semiannual', 'Annual'],
  fr: ['Mensuel', 'Trimestriel', 'Semestriel', 'Annuel'],
  pt: ['Mensal', 'Trimestral', 'Semestral', 'Anual'],
  de: ['Monatlich', 'Vierteljährlich', 'Halbjährlich', 'Jährlich'],
  it: ['Mensile', 'Trimestrale', 'Semestrale', 'Annuale'],
  ja: ['毎月', '四半期ごと', '半年ごと', '毎年'],
  ko: ['매월', '분기별', '반기별', '매년'],
  zh: ['每月', '每季度', '每半年', '每年'],
  ar: ['شهري', 'ربع سنوي', 'نصف سنوي', 'سنوي']
};

// Cualquier forma que el backend use para una frecuencia, en clave canónica en español.
const FREQUENCY_ALIASES: Record<string, string> = {
  'mensual': 'Mensual',
  'monthly': 'Mensual',
  'trimestral': 'Trimestral',
  'quarterly': 'Trimestral',
  'semestral': 'Semestral',
  'semiannual': 'Semestral',
  'semi-annual': 'Semestral',
  'biannual': 'Semestral',
  'anual': 'Anual',
  'annual': 'Anual',
  'yearly': 'Anual'
}

const canonicalFrequencyES = (freq: string): string => {
  const normalised = normaliseBackendToken(freq)
  if (!normalised) return freq
  if (FREQUENCY_ALIASES[normalised]) return FREQUENCY_ALIASES[normalised]
  const capitalized = normalised.charAt(0).toUpperCase() + normalised.slice(1)
  return frequencyMapES.includes(capitalized) ? capitalized : freq
}

/** Same contract as `translateMonthToCurrentLang`: unknown input passes through unchanged. */
export function translateFrequencyToCurrentLang(freqES: string, lang: string): string {
  const language = resolveBackendLanguage(lang || 'es')
  const index = frequencyMapES.indexOf(canonicalFrequencyES(freqES))
  if (index === -1) return freqES
  return frequencyTranslations[language][index] ?? freqES
}

/** Reverse of `translateFrequencyToCurrentLang`; the canonical form is Spanish. */
export function translateFrequencyToES(freq: string, lang: string): string {
  const language = resolveBackendLanguage(lang || 'es')
  const normalised = normaliseBackendToken(freq)
  const findIn = (list: string[]) => list.findIndex((item) => normaliseBackendToken(item) === normalised)
  let index = findIn(frequencyTranslations[language])
  if (index === -1) index = findIn(frequencyTranslations[BACKEND_LABEL_FALLBACK_LANGUAGE])
  if (index === -1) index = findIn(frequencyMapES)
  if (index === -1) return freq
  return frequencyMapES[index] ?? freq
}
