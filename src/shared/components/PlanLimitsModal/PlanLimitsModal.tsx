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
    internalUsers?: { current: number; max: number; percentage?: number };
    clients?: { current: number; max: number; percentage?: number };
    installations: { current: number; max: number };
    assets: { current: number; max: number };
    formTemplates: { current: number; max: number };
    workOrders: { current: number; max: number };
  };
  currentPlan: string;
  limitType: 'users' | 'internalUsers' | 'clients' | 'installations' | 'assets' | 'formTemplates' | 'workOrders';
  warnings?: string[];
}

const PlanLimitsModal: React.FC<PlanLimitsModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  limits,
  currentPlan,
  warnings = [],
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const getLimitIcon = (type: string) => {
    const icons: Record<string,string> = {
      users: '👥', internalUsers: '👥', clients: '🤝',
      facilities: '🏢', assets: '⚙️', formTemplates: '📋', workOrders: '📝'
    };
    return icons[type] || '📊';
  };
  const bucketTone = (pct:number, bucket:'internalUsers'|'clients') => {
    if (warnings.includes(`${bucket}_100`) || pct >= 100) return 'limit-exceeded';
    if (warnings.includes(`${bucket}_80`) || pct >= 80) return 'limit-warning';
    return 'limit-normal';
  };
  const getLimitColor = (current: number, max: number, type?: string) => {
    if (type === 'internalUsers' || type === 'clients') {
      const pct = max ? Math.round((current / max) * 100) : 0;
      return bucketTone(pct, type as 'internalUsers'|'clients');
    }
    const percentage = max ? (current / max) * 100 : 0;
    if (percentage >= 100) return 'limit-exceeded';
    if (percentage >= 80) return 'limit-warning';
    return 'limit-normal';
  };
  const hasSplit = !!(limits.internalUsers && limits.clients);
  const displayLimits = hasSplit ? { internalUsers: limits.internalUsers!, clients: limits.clients! } : limits;

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
            {Object.entries(displayLimits).map(([type, limit]) => (
              <div key={type} className={`limit-card ${getLimitColor((limit as any).current, (limit as any).max, type)}`}>
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
