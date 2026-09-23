import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../installations/styles/tour.css';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../shared/hooks/useTheme';

export const useInventoryTour = () => {
  const { t } = useTranslation();
  const { dark } = useTheme();
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);

  useEffect(() => {
    const completed = localStorage.getItem('inventoryTourCompleted');
    if (completed === 'true') {
      setTourCompleted(true);
    }
  }, []);

  const startTour = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      progressText: t('inventory.tour.progressText'),
      animate: !reduceMotion,
      smoothScroll: !reduceMotion,
      popoverClass: dark ? "driverjs-dark-theme" : "driverjs-light-theme",
      allowClose: true,
      steps: [
        {
          popover: {
            title: t('inventory.tour.welcome.title'),
            description: t('inventory.tour.welcome.description'),
            showButtons: ['next', 'close'],
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-operation"]',
          popover: {
            title: t('inventory.tour.navOperation.title'),
            description: t('inventory.tour.navOperation.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-inventory"]',
          popover: {
            title: t('inventory.tour.navInventory.title'),
            description: t('inventory.tour.navInventory.description'),
            side: "bottom",
            align: 'start'
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
          element: '.inventory-card-actions',
          popover: {
            title: t('inventory.tour.actions.title'),
            description: t('inventory.tour.actions.description'),
            side: "bottom",
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
