import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../installations/styles/tour.css';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../shared/hooks/useTheme';

export const useSuppliersTour = () => {
  const { t } = useTranslation();
  const { dark } = useTheme();
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);

  useEffect(() => {
    const completed = localStorage.getItem('suppliersTourCompleted');
    if (completed === 'true') {
      setTourCompleted(true);
    }
  }, []);

  const startTour = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      progressText: t('suppliers.tour.progressText'),
      animate: !reduceMotion,
      smoothScroll: !reduceMotion,
      popoverClass: dark ? "driverjs-dark-theme" : "driverjs-light-theme",
      allowClose: true,
      steps: [
        {
          popover: {
            title: t('suppliers.tour.welcome.title'),
            description: t('suppliers.tour.welcome.description'),
            showButtons: ['next', 'close'],
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-operation"]',
          popover: {
            title: t('suppliers.tour.navOperation.title'),
            description: t('suppliers.tour.navOperation.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-suppliers"]',
          popover: {
            title: t('suppliers.tour.navSuppliers.title'),
            description: t('suppliers.tour.navSuppliers.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="suppliers-add-btn"]',
          popover: {
            title: t('suppliers.tour.addSupplier.title'),
            description: t('suppliers.tour.addSupplier.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="suppliers-search"]',
          popover: {
            title: t('suppliers.tour.search.title'),
            description: t('suppliers.tour.search.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '.supplier-card-actions',
          popover: {
            title: t('suppliers.tour.actions.title'),
            description: t('suppliers.tour.actions.description'),
            side: "bottom",
            align: 'start'
          }
        }
      ],
      nextBtnText: t('suppliers.tour.buttons.next'),
      prevBtnText: t('suppliers.tour.buttons.previous'),
      doneBtnText: t('suppliers.tour.buttons.done'),
      onDestroyed: () => {
        localStorage.setItem('suppliersTourCompleted', 'true');
        setTourCompleted(true);
      }
    });

    driverObj.drive();
  };

  const resetTour = () => {
    localStorage.removeItem('suppliersTourCompleted');
    setTourCompleted(false);
  };

  const skipTour = () => {
    localStorage.setItem('suppliersTourCompleted', 'true');
    setTourCompleted(true);
  };

  return {
    tourCompleted,
    startTour,
    resetTour,
    skipTour
  };
};
