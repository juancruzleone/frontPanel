import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../installations/styles/tour.css';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../shared/hooks/useTheme';

export const useManualsTour = () => {
  const { t } = useTranslation();
  const { dark } = useTheme();
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);

  useEffect(() => {
    // Verificar si el tour ya fue completado
    const completed = localStorage.getItem('manualsTourCompleted');
    if (completed === 'true') {
      setTourCompleted(true);
    }
  }, []);

  const startTour = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      progressText: t('manuals.tour.progressText'),
      animate: !reduceMotion,
      smoothScroll: !reduceMotion,
      popoverClass: dark ? "driverjs-dark-theme" : "driverjs-light-theme",
      allowClose: true,
      steps: [
        {
          popover: {
            title: t('manuals.tour.welcome.title'),
            description: t('manuals.tour.welcome.description'),
            showButtons: ['next', 'close'],
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-assets"]',
          popover: {
            title: t('manuals.tour.navMaintenance.title'),
            description: t('manuals.tour.navMaintenance.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-manuals"]',
          popover: {
            title: t('manuals.tour.navManuals.title'),
            description: t('manuals.tour.navManuals.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-assets"]',
          popover: {
            title: t('manuals.tour.goToAssets.title'),
            description: t('manuals.tour.goToAssets.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="create-manual-btn"]',
          popover: {
            title: t('manuals.tour.createManual.title'),
            description: t('manuals.tour.createManual.description'),
            side: "bottom",
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
