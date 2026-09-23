import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../installations/styles/tour.css';
import { useTranslation } from 'react-i18next';

export const useWorkOrdersTour = () => {
  const { t } = useTranslation();
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);

  useEffect(() => {
    // Verificar si el tour ya fue completado
    const completed = localStorage.getItem('workOrdersTourCompleted');
    if (completed === 'true') {
      setTourCompleted(true);
    }
  }, []);

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      progressText: t('workOrders.tour.progressText'),
      steps: [
        {
          popover: {
            title: t('workOrders.tour.welcome.title'),
            description: t('workOrders.tour.welcome.description'),
            showButtons: ['next', 'close']
          }
        },
        {
          element: '[data-tour="nav-work-orders"]',
          popover: {
            title: t('workOrders.tour.navWorkOrders.title', { defaultValue: 'Órdenes de trabajo' }),
            description: t('workOrders.tour.navWorkOrders.description', { defaultValue: 'El menú Órdenes de trabajo agrupa el Listado y el Calendario.' }),
            side: "right",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-work-orders-list"]',
          popover: {
            title: t('workOrders.tour.navWorkOrdersList.title', { defaultValue: 'Listado de órdenes' }),
            description: t('workOrders.tour.navWorkOrdersList.description', { defaultValue: 'Desde Listado gestionas todas las órdenes de trabajo.' }),
            side: "right",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-calendar"]',
          popover: {
            title: t('workOrders.tour.navCalendar.title', { defaultValue: 'Calendario' }),
            description: t('workOrders.tour.navCalendar.description', { defaultValue: 'El calendario antes estaba como botón Ver calendario; ahora está en Órdenes de trabajo → Calendario.' }),
            side: "right",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-operation"]',
          popover: {
            title: t('workOrders.tour.createTechnician.title'),
            description: t('workOrders.tour.createTechnician.description'),
            side: "right",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-installations"]',
          popover: {
            title: t('workOrders.tour.createInstallation.title'),
            description: t('workOrders.tour.createInstallation.description'),
            side: "right",
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
            description: t('workOrders.tour.workOrderActions.description')
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
