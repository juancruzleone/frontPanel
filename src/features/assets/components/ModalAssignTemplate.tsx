import { useEffect, useState } from "react";
import useAssets from "../../../../src/features/assets/hooks/useAssets";
import { Asset } from "../hooks/useAssets";
import styles from "../styles/Modal.module.css";
import { fetchTemplates } from "../services/assetServices";
import { useTranslation } from "react-i18next"

interface ModalAssignTemplateProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmitSuccess: (message: string) => void;
  onAssignTemplate: (assetId: string, templateId: string) => Promise<{ message: string }>;
  asset: Asset | null;
}

interface Template {
  _id: string;
  nombre: string;
}

const ModalAssignTemplate = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onAssignTemplate,
  asset,
}: ModalAssignTemplateProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation()

  const handleClose = () => {
    setSelectedTemplate("");
    setFormErrors({});
    onRequestClose();
  };

  useEffect(() => {
    if (isOpen) {
      setLoadingTemplates(true);
      fetchTemplates()
        .then(data => {
          setTemplates(data);
          setLoadingTemplates(false);
        })
        .catch(err => {
          console.error("Error al cargar plantillas:", err);
          setLoadingTemplates(false);
        });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!asset?._id) return;
    
    if (!selectedTemplate) {
      setFormErrors({ templateId: "Debe seleccionar una plantilla" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onAssignTemplate(asset._id, selectedTemplate);
      onSubmitSuccess(result.message);
      handleClose();
    } catch (err) {
      console.error("Error al asignar plantilla:", err);
      setFormErrors({ general: "Error al asignar la plantilla" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !asset) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('assets.assignTemplate', { asset: asset.nombre })}</h2>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <form onSubmit={handleSubmit} className={styles.assignForm}>
            <div className={styles.assignFormInner}>
              <div className={styles.formGroup}>
                <label>{t('assets.template')}</label>
                {loadingTemplates ? (
                  <div className={styles.loadingMessage}>
                    <div className={styles.spinner}></div>
                    {t('assets.loadingTemplates')}
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => {
                        setSelectedTemplate(e.target.value);
                        setFormErrors({});
                      }}
                      className={formErrors.templateId ? styles.errorInput : ""}
                      disabled={isSubmitting}
                    >
                      <option value="">{t('assets.templatePlaceholder')}</option>
                      {templates.map(template => (
                        <option key={template._id} value={template._id}>
                          {template.nombre}
                        </option>
                      ))}
                    </select>
                    {formErrors.templateId && (
                      <p className={styles.inputError}>{formErrors.templateId}</p>
                    )}
                  </>
                )}
              </div>

              {formErrors.general && (
                <div className={styles.generalError}>
                  {formErrors.general}
                </div>
              )}
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className={styles.cancelButton}
              >
                {t('assets.cancel')}
              </button>
              <button
                type="submit"
                disabled={!selectedTemplate || loadingTemplates || isSubmitting}
                className={styles.submitButton}
                aria-label={t('assets.assignTemplateTooltip')}
                data-tooltip={t('assets.assignTemplateTooltip')}
              >
                {isSubmitting ? t('common.saving') : t('assets.assign')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModalAssignTemplate;