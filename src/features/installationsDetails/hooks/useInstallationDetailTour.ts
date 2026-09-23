import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../installations/styles/tour.css';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../shared/hooks/useTheme';

export const useInstallationDetailTour = () => {
  const { t } = useTranslation();
  const { dark } = useTheme();
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);

  useEffect(() => {
    // Verificar si el tour ya fue completado
    const completed = localStorage.getItem('installationDetailTourCompleted');
    if (completed === 'true') {
      setTourCompleted(true);
    }
  }, []);

  const startTour = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      progressText: t('installationDetails.tour.progressText'),
      animate: !reduceMotion,
      smoothScroll: !reduceMotion,
      popoverClass: dark ? "driverjs-dark-theme" : "driverjs-light-theme",
      allowClose: true,
      steps: [
        {
          popover: {
            title: t('installationDetails.tour.welcome.title'),
            description: t('installationDetails.tour.welcome.description'),
            showButtons: ['next', 'close'],
            side: "bottom",
            align: 'start'
          }
        },
        {
          popover: {
            title: t('installationDetails.tour.createAssetFirst.title'),
            description: t('installationDetails.tour.createAssetFirst.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="open-settings"]',
          popover: {
            title: t('installationDetails.tour.goToInstallations.title'),
            description: t('installationDetails.tour.goToInstallations.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="add-device-btn"]',
          popover: {
            title: t('installationDetails.tour.addDevice.title'),
            description: t('installationDetails.tour.addDevice.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="search-filter-devices"]',
          popover: {
            title: t('installationDetails.tour.searchFilter.title'),
            description: t('installationDetails.tour.searchFilter.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          popover: {
            title: t('installationDetails.tour.deviceActions.title'),
            description: t('installationDetails.tour.deviceActions.description')
          }
        }
      ],
      nextBtnText: t('installationDetails.tour.buttons.next'),
      prevBtnText: t('installationDetails.tour.buttons.previous'),
      doneBtnText: t('installationDetails.tour.buttons.done'),
      onDestroyed: () => {
        // Marcar el tour como completado
        localStorage.setItem('installationDetailTourCompleted', 'true');
        setTourCompleted(true);
      }
    });

    driverObj.drive();
  };

  const resetTour = () => {
    localStorage.removeItem('installationDetailTourCompleted');
    setTourCompleted(false);
  };

  const skipTour = () => {
    localStorage.setItem('installationDetailTourCompleted', 'true');
    setTourCompleted(true);
  };

  return {
    tourCompleted,
    startTour,
    resetTour,
    skipTour
  };
};
