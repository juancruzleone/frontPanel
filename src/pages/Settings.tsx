import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import '../features/installations/styles/tour.css'
import {
  Settings as SettingsIcon,
  Check,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import styles from '../features/settings/styles/settings.module.css'
import ModalManageInstallationTypes from '../features/settings/components/ModalManageInstallationTypes'
import ModalManageDeviceCategories from '../features/settings/components/ModalManageDeviceCategories'
import ModalManageFormCategories from '../features/settings/components/ModalManageFormCategories'
import useInstallationTypes from '../features/installations/hooks/useInstallationTypes'
import useCategories from '../features/installations/hooks/useCategories'
import useFormCategories from '../features/forms/hooks/useFormCategories'
import { useTheme } from '../shared/hooks/useTheme'
import Skeleton from '../shared/components/Skeleton'

const Settings = () => {
  const { t } = useTranslation()
  const location = useLocation() as { state?: { fromHomeTour?: boolean } }
  const { dark } = useTheme()
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  const { installationTypes, loadInstallationTypes, loading: loadingTypes } = useInstallationTypes()
  const { categories: assetCategories, loadCategories: loadAssetCategories, loading: loadingAssets } = useCategories()
  const { categories: formCategories, loadCategories: loadFormCategories, loading: loadingForms } = useFormCategories()

  useEffect(() => {
    document.title = t('settings.titlePage')
  }, [t])

  const startSettingsTour = useCallback(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tour = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      progressText: t('settings.tour.progressText', { defaultValue: '{{current}} de {{total}}' }),
      nextBtnText: t('settings.tour.buttons.next', { defaultValue: 'Siguiente' }),
      prevBtnText: t('settings.tour.buttons.previous', { defaultValue: 'Anterior' }),
      doneBtnText: t('settings.tour.buttons.done', { defaultValue: 'Finalizar' }),
      allowClose: true,
      animate: !reduceMotion,
      smoothScroll: !reduceMotion,
      popoverClass: dark ? "driverjs-dark-theme" : "driverjs-light-theme",
      steps: [
        {
          popover: {
            title: t('settings.tour.welcome.title', { defaultValue: 'Configuración del sistema' }),
            description: t('settings.tour.welcome.description', { defaultValue: 'Completá estos 3 pasos para dejar la plataforma lista: tipos de instalación, categorías de activos y categorías de formularios.' }),
            side: "bottom" as const,
            align: "start" as const,
            showButtons: ["next", "close"]
          }
        },
        {
          element: '[data-tour="settings-initial-card"]',
          popover: {
            title: t('settings.tour.checklist.title', { defaultValue: 'Checklist de configuración' }),
            description: t('settings.tour.checklist.description', { defaultValue: 'Acá ves el progreso y el estado de cada paso. Empezá por el primer pendiente.' }),
            side: "bottom" as const,
            align: "start" as const,
          }
        },
        {
          element: '[data-tour="settings-manage-installation-types"]',
          popover: {
            title: t('settings.tour.manageTypes.title', { defaultValue: 'Gestionar tipos de instalación' }),
            description: t('settings.tour.manageTypes.description', { defaultValue: 'Creá los tipos de instalación que usarás al crear instalaciones.' }),
            side: "bottom" as const,
            align: "start" as const,
          }
        },
      ],
      onDestroyed: () => {
        localStorage.setItem('settingsTourCompleted', 'true');
      }
    });
    tour.drive();
  }, [dark, t])

  useEffect(() => {
    if ((location.state as { fromHomeTour?: boolean })?.fromHomeTour) {
      const timer = window.setTimeout(() => startSettingsTour(), 400);
      return () => window.clearTimeout(timer);
    }
    if (localStorage.getItem('settingsTourCompleted') !== 'true' && localStorage.getItem('home-onboarding-tour-v1-shown') === 'true') {
      // optional auto hint, do not auto-drive aggressively
    }
  }, [location.state, startSettingsTour])

  const reloadAll = useCallback(async () => {
    try {
      await Promise.allSettled([
        loadInstallationTypes(true),
        loadAssetCategories(true),
        loadFormCategories(true),
      ])
    } finally {
      setIsInitialLoading(false)
    }
  }, [loadInstallationTypes, loadAssetCategories, loadFormCategories])

  useEffect(() => {
    reloadAll()
  }, [reloadAll])

  const hasInstallationTypes = installationTypes.length > 0
  const hasAssetCategories = assetCategories.length > 0
  const hasFormCategories = formCategories.length > 0
  const hasAnyData = hasInstallationTypes || hasAssetCategories || hasFormCategories
  const isSyncing = isInitialLoading || loadingTypes || loadingAssets || loadingForms

  const completedCount = [hasInstallationTypes, hasAssetCategories, hasFormCategories].filter(Boolean).length
  const totalSteps = 3
  const progressPercent = Math.round((completedCount / totalSteps) * 100)

  const handleOpenModal = (sectionId: string) => {
    setActiveModal(sectionId)
  }

  const handleCloseModal = () => {
    setActiveModal(null)
    reloadAll()
  }

  const checklistItems = [
    {
      id: 'installation-types',
      number: 1,
      title: t('settings.typesInstallation', { defaultValue: t('settings.installationTypes') }),
      description: t('settings.typesInstallationDesc'),
      completed: hasInstallationTypes,
    },
    {
      id: 'device-categories',
      number: 2,
      title: t('settings.assetCategories'),
      description: t('settings.assetCategoriesDesc'),
      completed: hasAssetCategories,
    },
    {
      id: 'form-categories',
      number: 3,
      title: t('settings.formCategories'),
      description: t('settings.formCategoriesDesc'),
      completed: hasFormCategories,
    },
  ]

  return (
    <>
      <div className={styles.containerSettings} data-tour="settings-container">
        <div className={styles.topSection}>
          <div>
            <h1 className={styles.title}>{t('settings.title')}</h1>
            <p className={styles.subtitle}>{t('settings.subtitle')}</p>
          </div>
        </div>

        {/* Configuración inicial */}
        {isInitialLoading && !hasAnyData ? (
          <section className={styles.initialCard} data-tour="settings-initial-card">
            <div className={styles.initialHeader}>
              <div className={styles.initialHeaderIcon}>
                <SettingsIcon size={22} />
              </div>
              <div className={styles.initialHeaderText} style={{ width: '100%' }}>
                <h2 className={styles.initialTitle}>{t('settings.initialConfig')}</h2>
                <p className={styles.initialDesc}>{t('settings.initialConfigDesc')}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '24px 0' }}>
              <Skeleton height={24} width="40%" style={{ borderRadius: 6 }} />
              <Skeleton height={10} width="100%" style={{ borderRadius: 6 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map((n) => (
                <Skeleton key={n} height={68} width="100%" style={{ borderRadius: 8 }} />
              ))}
            </div>
          </section>
        ) : (
          <section className={styles.initialCard} data-tour="settings-initial-card">
            <div className={styles.initialHeader}>
              <div className={styles.initialHeaderIcon}>
                <SettingsIcon size={22} />
              </div>
              <div className={styles.initialHeaderText}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 className={styles.initialTitle}>{t('settings.initialConfig')}</h2>
                  {isSyncing && (
                    <RefreshCw size={16} className={styles.syncSpinner} data-testid="settings-syncing" />
                  )}
                </div>
                <p className={styles.initialDesc}>{t('settings.initialConfigDesc')}</p>
              </div>
            </div>

            <div className={styles.progressSection}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>
                  {t('settings.stepsCompleted', { completed: completedCount, total: totalSteps })}
                </span>
                <span className={styles.progressPercent}>{progressPercent}%</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className={styles.checklist} data-tour="settings-checklist">
              {checklistItems.map((item) => (
                <div key={item.id} className={styles.checklistItem} data-tour={`settings-step-${item.id}`}>
                  <div className={`${styles.circleNumber} ${item.completed ? styles.circleCompleted : styles.circlePending}`}>
                    {item.completed ? <Check size={14} /> : item.number}
                  </div>
                  <div className={styles.checklistContent}>
                    <h3 className={styles.checklistTitle}>{item.title}</h3>
                    <p className={styles.checklistDesc}>{item.description}</p>
                  </div>
                  <div className={styles.checklistActions}>
                    <span className={`${styles.statusBadge} ${item.completed ? styles.statusCompleted : styles.statusPending}`}>
                      {item.completed ? <Check size={12} /> : null}
                      {item.completed ? t('settings.completed') : t('settings.pending')}
                    </span>
                    <button
                      data-tour={`settings-manage-${item.id}`}
                      className={`${styles.manageButton} ${item.completed ? styles.manageButtonCompleted : styles.manageButtonPending}`}
                      onClick={() => handleOpenModal(item.id)}
                    >
                      {t('settings.manage')} <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      <ModalManageInstallationTypes
        isOpen={activeModal === 'installation-types'}
        onRequestClose={handleCloseModal}
      />
      <ModalManageDeviceCategories
        isOpen={activeModal === 'device-categories'}
        onRequestClose={handleCloseModal}
      />
      <ModalManageFormCategories
        isOpen={activeModal === 'form-categories'}
        onRequestClose={handleCloseModal}
      />
    </>
  )
}

export default Settings
