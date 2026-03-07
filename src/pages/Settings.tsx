import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Package, Building2, Smartphone, FileText, ChevronRight } from 'lucide-react'
import styles from '../features/settings/styles/settings.module.css'
import ModalManageInstallationTypes from '../features/settings/components/ModalManageInstallationTypes'
import ModalManageDeviceCategories from '../features/settings/components/ModalManageDeviceCategories'
import ModalManageFormCategories from '../features/settings/components/ModalManageFormCategories'

const Settings = () => {
  const { t } = useTranslation()
  const [activeSection, setActiveSection] = useState<string>('installation-types')
  const [activeModal, setActiveModal] = useState<string | null>(null)

  useEffect(() => {
    document.title = t('settings.titlePage')
  }, [t])

  const settingsSections = [
    {
      id: 'installation-types',
      title: t('settings.installationTypes'),
      description: t('settings.installationTypesDesc'),
      icon: <Building2 size={20} />,
      color: '#3b82f6',
    },
    {
      id: 'device-categories',
      title: t('settings.deviceCategories'),
      description: t('settings.deviceCategoriesDesc'),
      icon: <Smartphone size={20} />,
      color: '#f59e0b',
    },
    {
      id: 'form-categories',
      title: t('settings.formCategories'),
      description: t('settings.formCategoriesDesc'),
      icon: <FileText size={20} />,
      color: '#8b5cf6',
    },
  ]

  const handleOpenModal = (sectionId: string) => {
    setActiveModal(sectionId)
  }

  const handleCloseModal = () => {
    setActiveModal(null)
  }

  const activeSectionData = settingsSections.find(s => s.id === activeSection)

  return (
    <>
      <div className={styles.containerSettings}>
        <div className={styles.topSection}>
          <div>
            <h1 className={styles.title}>{t('settings.title')}</h1>
            <p className={styles.subtitle}>{t('settings.subtitle')}</p>
          </div>
        </div>

        <div className={styles.settingsLayout}>
          {/* Sidebar de navegación */}
          <aside className={styles.sidebar}>
            <nav className={styles.sidebarNav}>
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  className={`${styles.sidebarItem} ${activeSection === section.id ? styles.sidebarItemActive : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <div className={styles.sidebarItemContent}>
                    <span className={styles.sidebarItemTitle}>{section.title}</span>
                    <span className={styles.sidebarItemDesc}>{section.description}</span>
                  </div>
                </button>
              ))}
            </nav>
          </aside>

          {/* Contenido principal */}
          <main className={styles.mainContent}>
            {activeSectionData && (
              <div className={styles.contentCard}>
                <div className={styles.contentHeader}>
                  <div>
                    <h2 className={styles.contentTitle}>{activeSectionData.title}</h2>
                    <p className={styles.contentDescription}>{activeSectionData.description}</p>
                  </div>
                </div>

                <div className={styles.contentBody}>
                  <button
                    className={styles.manageButton}
                    onClick={() => handleOpenModal(activeSection)}
                  >
                    {t('settings.manage')} {activeSectionData.title}
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
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
