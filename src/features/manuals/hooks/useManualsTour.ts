import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../installations/styles/tour.css';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export const useManualsTour = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);

  useEffect(() => {
    // Verificar si el tour ya fue completado
    const completed = localStorage.getItem('manualsTourCompleted');
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
            title: t('manuals.tour.welcome.title'),
            description: t('manuals.tour.welcome.description')
          }
        },
        {
          element: '[data-tour="nav-assets"]',
          popover: {
            title: t('manuals.tour.goToAssets.title'),
            description: t('manuals.tour.goToAssets.description'),
            side: "right",
            align: 'start'
          }
        },
        {
          element: '[data-tour="create-manual-btn"]',
          popover: {
            title: t('manuals.tour.createManual.title'),
            description: t('manuals.tour.createManual.description'),
            side: "left",
            align: 'start'
          }
        },
        {
          element: '[data-tour="search-filter"]',
          popover: {
            title: t('manuals.tour.searchFilter.title'),
            description: t('manuals.tour.searchFilter.description'),
            side: "bottom",
            align: 'start'
          }
        }
      ],
      nextBtnText: t('manuals.tour.buttons.next'),
      prevBtnText: t('manuals.tour.buttons.previous'),
      doneBtnText: t('manuals.tour.buttons.done'),
      onDestroyed: () => {
        // Marcar el tour como completado
        localStorage.setItem('manualsTourCompleted', 'true');
        setTourCompleted(true);
      }
    });

    driverObj.drive();
  };

  const resetTour = () => {
    localStorage.removeItem('manualsTourCompleted');
    setTourCompleted(false);
  };

  const skipTour = () => {
    localStorage.setItem('manualsTourCompleted', 'true');
    setTourCompleted(true);
  };

  return {
    tourCompleted,
    startTour,
    resetTour,
    skipTour
  };
};
