import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../styles/tour.css';
import { useTranslation } from 'react-i18next';

export const useInstallationsTour = () => {
  const { t } = useTranslation();
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);

  useEffect(() => {
    // Verificar si el tour ya fue completado
    const completed = localStorage.getItem('installationsTourCompleted');
    if (completed === 'true') {
      setTourCompleted(true);
    }
  }, []);

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps: [
        {
          popover: {
            title: t('installations.tour.welcome.title'),
            description: t('installations.tour.welcome.description')
          }
        },
        {
          element: '[data-tour="create-installation-type-btn"]',
          popover: {
            title: t('installations.tour.createInstallationType.title'),
            description: t('installations.tour.createInstallationType.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="view-installation-types-btn"]',
          popover: {
            title: t('installations.tour.viewInstallationTypes.title'),
            description: t('installations.tour.viewInstallationTypes.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="create-installation-btn"]',
          popover: {
            title: t('installations.tour.createInstallation.title'),
            description: t('installations.tour.createInstallation.description'),
            side: "left",
            align: 'start'
          }
        },
        {
          element: '[data-tour="search-filter"]',
          popover: {
            title: t('installations.tour.searchFilter.title'),
            description: t('installations.tour.searchFilter.description'),
            side: "bottom",
            align: 'start'
          }
        }
      ],
      nextBtnText: t('installations.tour.buttons.next'),
      prevBtnText: t('installations.tour.buttons.previous'),
      doneBtnText: t('installations.tour.buttons.done'),
      onDestroyed: () => {
        // Marcar el tour como completado
        localStorage.setItem('installationsTourCompleted', 'true');
        setTourCompleted(true);
      }
    });

    driverObj.drive();
  };

  const resetTour = () => {
    localStorage.removeItem('installationsTourCompleted');
    setTourCompleted(false);
  };

  const skipTour = () => {
    localStorage.setItem('installationsTourCompleted', 'true');
    setTourCompleted(true);
  };

  return {
    tourCompleted,
    startTour,
    resetTour,
    skipTour
  };
};
