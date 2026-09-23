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
            description: t('subscriptions.tour.welcome.description'),
            showButtons: ['next', 'close']
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
          element: '[data-tour="nav-maintenance"]',
          popover: {
            title: t('subscriptions.tour.navMaintenance.title', { defaultValue: 'Plan en Mantenimiento' }),
            description: t('subscriptions.tour.navMaintenance.description', { defaultValue: 'El Plan de mantenimiento ahora vive en Mantenimiento → Plan de mantenimiento.' }),
            side: "right",
            align: 'start'
          }
        },
        {
          element: '[data-tour="filter-by-month"]',
          popover: {
            title: t('subscriptions.tour.filterByMonth.title', { defaultValue: 'Filtrar por mes' }),
            description: t('subscriptions.tour.filterByMonth.description', { defaultValue: 'El selector filtrar por mes está a la izquierda del filtrar por estado (tabletSelectsRow en iPad/mobile).' }),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="filter-by-status"]',
          popover: {
            title: t('subscriptions.tour.filterByStatus.title', { defaultValue: 'Filtrar por estado' }),
            description: t('subscriptions.tour.filterByStatus.description', { defaultValue: 'Filtra por estado (activo/pendiente/inactivo) junto al filtro por mes.' }),
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
