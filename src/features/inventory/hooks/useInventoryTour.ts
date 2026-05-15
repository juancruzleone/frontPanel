import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../installations/styles/tour.css';
import { useTranslation } from 'react-i18next';

export const useInventoryTour = () => {
  const { t } = useTranslation();
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);

  useEffect(() => {
    const completed = localStorage.getItem('inventoryTourCompleted');
    if (completed === 'true') {
      setTourCompleted(true);
    }
  }, []);

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      progressText: t('inventory.tour.progressText'),
      steps: [
        {
          popover: {
            title: t('inventory.tour.welcome.title'),
            description: t('inventory.tour.welcome.description'),
            showButtons: ['next', 'close']
          }
        },
        {
          element: '[data-tour="inventory-add-btn"]',
          popover: {
            title: t('inventory.tour.addItem.title'),
            description: t('inventory.tour.addItem.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="inventory-low-stock"]',
          popover: {
            title: t('inventory.tour.lowStock.title'),
            description: t('inventory.tour.lowStock.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="inventory-search"]',
          popover: {
            title: t('inventory.tour.search.title'),
            description: t('inventory.tour.search.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '.inventory-card-actions', // We'll add this class to the actions container
          popover: {
            title: t('inventory.tour.actions.title'),
            description: t('inventory.tour.actions.description'),
            side: "left",
            align: 'start'
          }
        }
      ],
      nextBtnText: t('inventory.tour.buttons.next'),
      prevBtnText: t('inventory.tour.buttons.previous'),
      doneBtnText: t('inventory.tour.buttons.done'),
      onDestroyed: () => {
        localStorage.setItem('inventoryTourCompleted', 'true');
        setTourCompleted(true);
      }
    });

    driverObj.drive();
  };

  const resetTour = () => {
    localStorage.removeItem('inventoryTourCompleted');
    setTourCompleted(false);
  };

  const skipTour = () => {
    localStorage.setItem('inventoryTourCompleted', 'true');
    setTourCompleted(true);
  };

  return {
    tourCompleted,
    startTour,
    resetTour,
    skipTour
  };
};
