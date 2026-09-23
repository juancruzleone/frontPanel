import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../installations/styles/tour.css';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../shared/hooks/useTheme';

export const useWorkOrdersTour = () => {
  const { t } = useTranslation();
  const { dark } = useTheme();
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);

  useEffect(() => {
    // Verificar si el tour ya fue completado
    const completed = localStorage.getItem('workOrdersTourCompleted');
    if (completed === 'true') {
      setTourCompleted(true);
    }
  }, []);

  const startTour = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      progressText: t('workOrders.tour.progressText'),
      animate: !reduceMotion,
      smoothScroll: !reduceMotion,
      popoverClass: dark ? "driverjs-dark-theme" : "driverjs-light-theme",
      allowClose: true,
      steps: [
        {
          popover: {
            title: t('workOrders.tour.welcome.title'),
            description: t('workOrders.tour.welcome.description'),
            showButtons: ['next', 'close'],
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-work-orders"]',
          popover: {
            title: t('workOrders.tour.navWorkOrders.title'),
            description: t('workOrders.tour.navWorkOrders.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-work-orders-list"]',
          popover: {
            title: t('workOrders.tour.navWorkOrdersList.title'),
            description: t('workOrders.tour.navWorkOrdersList.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-calendar"]',
          popover: {
            title: t('workOrders.tour.navCalendar.title'),
            description: t('workOrders.tour.navCalendar.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-operation"]',
          popover: {
            title: t('workOrders.tour.createTechnician.title'),
            description: t('workOrders.tour.createTechnician.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-installations"]',
          popover: {
            title: t('workOrders.tour.createInstallation.title'),
            description: t('workOrders.tour.createInstallation.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="create-work-order-btn"]',
          popover: {
            title: t('workOrders.tour.createWorkOrder.title'),
            description: t('workOrders.tour.createWorkOrder.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="search-filter"]',
          popover: {
            title: t('workOrders.tour.searchFilter.title'),
            description: t('workOrders.tour.searchFilter.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          popover: {
            title: t('workOrders.tour.workOrderActions.title'),
            description: t('workOrders.tour.workOrderActions.description'),
            side: "bottom",
            align: 'start'
          }
        }
      ],
      nextBtnText: t('workOrders.tour.buttons.next'),
      prevBtnText: t('workOrders.tour.buttons.previous'),
      doneBtnText: t('workOrders.tour.buttons.done'),
      onDestroyed: () => {
        // Marcar el tour como completado
        localStorage.setItem('workOrdersTourCompleted', 'true');
        setTourCompleted(true);
      }
    });

    driverObj.drive();
  };

  const resetTour = () => {
    localStorage.removeItem('workOrdersTourCompleted');
    setTourCompleted(false);
  };

  const skipTour = () => {
    localStorage.setItem('workOrdersTourCompleted', 'true');
    setTourCompleted(true);
  };

  return {
    tourCompleted,
    startTour,
    resetTour,
    skipTour
  };
};
