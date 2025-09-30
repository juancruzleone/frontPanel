import React from 'react';
import { useTranslation } from 'react-i18next';
import './PlanLimitsModal.css';

interface PlanLimit {
  type: 'users' | 'facilities' | 'assets' | 'formTemplates' | 'workOrders';
  current: number;
  max: number;
}

export interface PlanLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  limits: {
    users: { current: number; max: number };
    installations: { current: number; max: number };
    assets: { current: number; max: number };
    formTemplates: { current: number; max: number };
    workOrders: { current: number; max: number };
  };
  currentPlan: string;
  limitType: 'users' | 'installations' | 'assets' | 'formTemplates' | 'workOrders';
}

const PlanLimitsModal: React.FC<PlanLimitsModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  limits,
  currentPlan,
  limitType
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const getLimitIcon = (type: string) => {
    const icons = {
      users: '👥',
      facilities: '🏢',
      assets: '⚙️',
      formTemplates: '📋',
      workOrders: '📝'
    };
    return icons[type as keyof typeof icons] || '📊';
  };

  const getLimitColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 100) return 'limit-exceeded';
    if (percentage >= 80) return 'limit-warning';
    return 'limit-normal';
  };

  return (
    <div className="plan-limits-overlay">
      <div className="plan-limits-modal">
        <div className="plan-limits-header">
          <div className="plan-limits-icon">
            <span className="error-icon">⚠️</span>
          </div>
          <h2 className="plan-limits-title">
            {t('planLimits.title')}
          </h2>
          <button 
            className="plan-limits-close"
            onClick={onClose}
            aria-label={t('planLimits.close')}
          >
            ✕
          </button>
        </div>

        <div className="plan-limits-content">
          <div className="plan-info">
            <h3 className="plan-name">
              {t('planLimits.currentPlan')}: <span className="plan-name-highlight">{currentPlan}</span>
            </h3>
          </div>

          <div className="limits-grid">
            {Object.entries(limits).map(([type, limit]) => (
              <div key={type} className={`limit-card ${getLimitColor(limit.current, limit.max)}`}>
                <div className="limit-icon">
                  {getLimitIcon(type)}
                </div>
                <div className="limit-info">
                  <h4 className="limit-type">
                    {t(`planLimits.types.${type}`)}
                  </h4>
                  <div className="limit-usage">
                    <span className="limit-current">{limit.current}</span>
                    <span className="limit-separator">/</span>
                    <span className="limit-max">{limit.max}</span>
                  </div>
                  <div className="limit-bar">
                    <div 
                      className="limit-progress"
                      style={{ width: `${Math.min((limit.current / limit.max) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="limit-percentage">
                    {Math.round((limit.current / limit.max) * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="plan-limits-footer">
            <p className="upgrade-message">
              {t('planLimits.upgradeMessage')}
            </p>
            <div className="plan-limits-actions">
              <button 
                className="btn-secondary"
                onClick={onClose}
              >
                {t('planLimits.understood')}
              </button>
              <button 
                className="btn-primary"
                onClick={() => {
                  // TODO: Implementar navegación a planes
                  window.open('/plans', '_blank');
                }}
              >
                {t('planLimits.upgradePlan')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanLimitsModal;
