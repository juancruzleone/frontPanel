import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../installations/styles/tour.css';
import { useTranslation } from 'react-i18next';

export const useSubscriptionsTour = () => {
  const { t } = useTranslation();
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);

  useEffect(() => {
    // Verificar si el tour ya fue completado
    const completed = localStorage.getItem('subscriptionsTourCompleted');
    if (completed === 'true') {
      setTourCompleted(true);
    }
  }, []);

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      progressText: t('subscriptions.tour.progressText'),
      steps: [
        {
          popover: {
            title: t('subscriptions.tour.welcome.title'),
            description: t('subscriptions.tour.welcome.description')
          }
        },
        {
          element: '[data-tour="nav-installations"]',
          popover: {
            title: t('subscriptions.tour.goToInstallations.title'),
            description: t('subscriptions.tour.goToInstallations.description'),
            side: "right",
            align: 'start'
          }
        },
        {
          element: '[data-tour="search-filter-subscriptions"]',
          popover: {
            title: t('subscriptions.tour.searchFilter.title'),
            description: t('subscriptions.tour.searchFilter.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="edit-frequency-btn"]',
          popover: {
            title: t('subscriptions.tour.editFrequency.title'),
            description: t('subscriptions.tour.editFrequency.description'),
            side: "left",
            align: 'start'
          }
        },
        {
          element: '[data-tour="months-display"]',
          popover: {
            title: t('subscriptions.tour.months.title'),
            description: t('subscriptions.tour.months.description'),
            side: "left",
            align: 'start'
          }
        }
      ],
      nextBtnText: t('subscriptions.tour.buttons.next'),
      prevBtnText: t('subscriptions.tour.buttons.previous'),
      doneBtnText: t('subscriptions.tour.buttons.done'),
      onDestroyed: () => {
        // Marcar el tour como completado
        localStorage.setItem('subscriptionsTourCompleted', 'true');
        setTourCompleted(true);
      }
    });

    driverObj.drive();
  };

  const resetTour = () => {
    localStorage.removeItem('subscriptionsTourCompleted');
    setTourCompleted(false);
  };

  const skipTour = () => {
    localStorage.setItem('subscriptionsTourCompleted', 'true');
    setTourCompleted(true);
  };

  return {
    tourCompleted,
    startTour,
    resetTour,
    skipTour
  };
};
