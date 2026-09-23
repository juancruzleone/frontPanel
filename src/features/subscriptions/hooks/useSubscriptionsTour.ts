import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../installations/styles/tour.css';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../shared/hooks/useTheme';

export const useSubscriptionsTour = () => {
  const { t } = useTranslation();
  const { dark } = useTheme();
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);

  useEffect(() => {
    // Verificar si el tour ya fue completado
    const completed = localStorage.getItem('subscriptionsTourCompleted');
    if (completed === 'true') {
      setTourCompleted(true);
    }
  }, []);

  const startTour = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      progressText: t('subscriptions.tour.progressText'),
      animate: !reduceMotion,
      smoothScroll: !reduceMotion,
      popoverClass: dark ? "driverjs-dark-theme" : "driverjs-light-theme",
      allowClose: true,
      steps: [
        {
          popover: {
            title: t('subscriptions.tour.welcome.title'),
            description: t('subscriptions.tour.welcome.description'),
            showButtons: ['next', 'close'],
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-installations"]',
          popover: {
            title: t('subscriptions.tour.goToInstallations.title'),
            description: t('subscriptions.tour.goToInstallations.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-maintenance"]',
          popover: {
            title: t('subscriptions.tour.navMaintenance.title'),
            description: t('subscriptions.tour.navMaintenance.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="filter-by-month"]',
          popover: {
            title: t('subscriptions.tour.filterByMonth.title'),
            description: t('subscriptions.tour.filterByMonth.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="filter-by-status"]',
          popover: {
            title: t('subscriptions.tour.filterByStatus.title'),
            description: t('subscriptions.tour.filterByStatus.description'),
            side: "bottom",
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
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="months-display"]',
          popover: {
            title: t('subscriptions.tour.months.title'),
            description: t('subscriptions.tour.months.description'),
            side: "bottom",
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
