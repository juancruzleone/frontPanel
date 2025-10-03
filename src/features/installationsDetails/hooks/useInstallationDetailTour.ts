import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../installations/styles/tour.css';
import { useTranslation } from 'react-i18next';

export const useInstallationDetailTour = () => {
  const { t } = useTranslation();
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);

  useEffect(() => {
    // Verificar si el tour ya fue completado
    const completed = localStorage.getItem('installationDetailTourCompleted');
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
            title: t('installationDetails.tour.welcome.title'),
            description: t('installationDetails.tour.welcome.description')
          }
        },
        {
          element: '[data-tour="nav-installations"]',
          popover: {
            title: t('installationDetails.tour.goToInstallations.title'),
            description: t('installationDetails.tour.goToInstallations.description'),
            side: "right",
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
