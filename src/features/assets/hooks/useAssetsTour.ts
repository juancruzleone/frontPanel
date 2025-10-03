import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../installations/styles/tour.css';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';

export const useAssetsTour = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);

  useEffect(() => {
    // Verificar si el tour ya fue completado
    const completed = localStorage.getItem('assetsTourCompleted');
    if (completed === 'true') {
      setTourCompleted(true);
    }
  }, []);

  const startTour = () => {
    // Forzar recreación con el idioma actual
    const currentLang = i18n.language;
    
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps: [
        {
          popover: {
            title: t('assets.tour.welcome.title'),
            description: t('assets.tour.welcome.description')
          }
        },
        {
          element: '[data-tour="nav-forms"]',
          popover: {
            title: t('assets.tour.goToForms.title'),
            description: t('assets.tour.goToForms.description'),
            side: "right",
            align: 'start',
            onNextClick: () => {
              driverObj.destroy();
              // Navegar a formularios y continuar el tour allí
              navigate('/formularios', { state: { fromAssetsTour: true } });
            }
          }
        }
      ],
      nextBtnText: t('assets.tour.buttons.next'),
      prevBtnText: t('assets.tour.buttons.previous'),
      doneBtnText: t('assets.tour.buttons.done'),
      onDestroyed: () => {
        // Si se destruye antes de completar, no marcar como completado
        if (location.pathname === '/activos') {
          // Solo marcar como completado si estamos al final del tour completo
        }
      }
    });

    driverObj.drive();
  };

  const continueFormsTour = () => {
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps: [
        {
          element: '[data-tour="create-form-template-btn"]',
          popover: {
            title: t('assets.tour.createFormTemplate.title'),
            description: t('assets.tour.createFormTemplate.description'),
            side: "left",
            align: 'start'
          }
        },
        {
          element: '[data-tour="manage-categories-btn"]',
          popover: {
            title: t('assets.tour.viewFormCategories.title'),
            description: t('assets.tour.viewFormCategories.description'),
            side: "bottom",
            align: 'start',
            onNextClick: () => {
              driverObj.destroy();
              // Volver a activos y continuar el tour
              navigate('/activos', { state: { fromFormsTour: true } });
            }
          }
        }
      ],
      nextBtnText: t('assets.tour.buttons.next'),
      prevBtnText: t('assets.tour.buttons.previous'),
      doneBtnText: t('assets.tour.buttons.done')
    });

    driverObj.drive();
  };

  const continueAssetsTour = () => {
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps: [
        {
          element: '[data-tour="create-asset-btn"]',
          popover: {
            title: t('assets.tour.createAsset.title'),
            description: t('assets.tour.createAsset.description'),
            side: "left",
            align: 'start'
          }
        },
        {
          element: '[data-tour="search-filter"]',
          popover: {
            title: t('assets.tour.searchFilter.title'),
            description: t('assets.tour.searchFilter.description'),
            side: "bottom",
            align: 'start'
          }
        }
      ],
      nextBtnText: t('assets.tour.buttons.next'),
      prevBtnText: t('assets.tour.buttons.previous'),
      doneBtnText: t('assets.tour.buttons.done'),
      onDestroyed: () => {
        // Marcar el tour como completado
        localStorage.setItem('assetsTourCompleted', 'true');
        setTourCompleted(true);
      }
    });

    driverObj.drive();
  };

  const resetTour = () => {
    localStorage.removeItem('assetsTourCompleted');
    setTourCompleted(false);
  };

  const skipTour = () => {
    localStorage.setItem('assetsTourCompleted', 'true');
    setTourCompleted(true);
  };

  return {
    tourCompleted,
    startTour,
    continueFormsTour,
    continueAssetsTour,
    resetTour,
    skipTour
  };
};
