import i18n from "../../i18n"

// Función para traducir estados de órdenes de trabajo
export const translateWorkOrderStatus = (status: string): string => {
  const currentLanguage = i18n.language || 'es'
  
  const translations: Record<string, Record<string, string>> = {
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

  return translations[currentLanguage]?.[status] || status
}

// Función para traducir prioridades
export const translatePriority = (priority: string): string => {
  const currentLanguage = i18n.language || 'es'
  
  const translations: Record<string, Record<string, string>> = {
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

  return translations[currentLanguage]?.[priority] || priority
}

// Función para traducir tipos de trabajo
export const translateWorkType = (workType: string): string => {
  const currentLanguage = i18n.language || 'es'
  
  const translations: Record<string, Record<string, string>> = {
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

  return translations[currentLanguage]?.[workType] || workType
}

// Función para traducir roles de usuario
export const translateUserRole = (role: string): string => {
  const currentLanguage = i18n.language || 'es'
  
  const translations: Record<string, Record<string, string>> = {
    es: {
      'tecnico': 'Técnico',
      'admin': 'Administrador',
      'supervisor': 'Supervisor',
      'manager': 'Gerente'
    },
    en: {
      'tecnico': 'Technician',
      'admin': 'Administrator',
      'supervisor': 'Supervisor',
      'manager': 'Manager'
    },
    fr: {
      'tecnico': 'Technicien',
      'admin': 'Administrateur',
      'supervisor': 'Superviseur',
      'manager': 'Gestionnaire'
    },
    pt: {
      'tecnico': 'Técnico',
      'admin': 'Administrador',
      'supervisor': 'Supervisor',
      'manager': 'Gerente'
    },
    de: {
      'tecnico': 'Techniker',
      'admin': 'Administrator',
      'supervisor': 'Aufseher',
      'manager': 'Manager'
    },
    it: {
      'tecnico': 'Tecnico',
      'admin': 'Amministratore',
      'supervisor': 'Supervisore',
      'manager': 'Manager'
    },
    ja: {
      'tecnico': '技術者',
      'admin': '管理者',
      'supervisor': '監督者',
      'manager': 'マネージャー'
    },
    ko: {
      'tecnico': '기술자',
      'admin': '관리자',
      'supervisor': '감독자',
      'manager': '매니저'
    },
    zh: {
      'tecnico': '技术员',
      'admin': '管理员',
      'supervisor': '主管',
      'manager': '经理'
    },
    ar: {
      'tecnico': 'فني',
      'admin': 'مدير',
      'supervisor': 'مشرف',
      'manager': 'مدير'
    }
  }

  return translations[currentLanguage]?.[role] || role
}

// Función para traducir tipos de campos de formularios
export const translateFormFieldType = (fieldType: string): string => {
  const currentLanguage = i18n.language || 'es'
  
  const translations: Record<string, Record<string, string>> = {
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

  return translations[currentLanguage]?.[fieldType] || fieldType
}

// Función para traducir estados de dispositivos
export const translateDeviceStatus = (status: string): string => {
  const currentLanguage = i18n.language || 'es'
  
  const translations: Record<string, Record<string, string>> = {
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
      'mantenimiento': 'En Maintenance',
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

  return translations[currentLanguage]?.[status] || status
} 