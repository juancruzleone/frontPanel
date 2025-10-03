import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTranslation } from 'react-i18next';

export const usePersonalTour = () => {
  const { t, i18n } = useTranslation();
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);

  useEffect(() => {
    const completed = localStorage.getItem('personalTourCompleted');
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
            title: t('personal.tour.welcome.title'),
            description: t('personal.tour.welcome.description')
          }
        },
        {
          element: '[data-tour="add-technician-btn"]',
          popover: {
            title: t('personal.tour.addTechnician.title'),
            description: t('personal.tour.addTechnician.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="search-technicians"]',
          popover: {
            title: t('personal.tour.searchTechnicians.title'),
            description: t('personal.tour.searchTechnicians.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          popover: {
            title: t('personal.tour.technicianActions.title'),
            description: t('personal.tour.technicianActions.description')
          }
        }
      ],
      nextBtnText: t('personal.tour.buttons.next'),
      prevBtnText: t('personal.tour.buttons.previous'),
      doneBtnText: t('personal.tour.buttons.done'),
      onDestroyed: () => {
        localStorage.setItem('personalTourCompleted', 'true');
        setTourCompleted(true);
      }
    });

    driverObj.drive();
  };

  const resetTour = () => {
    localStorage.removeItem('personalTourCompleted');
    setTourCompleted(false);
  };

  const skipTour = () => {
    localStorage.setItem('personalTourCompleted', 'true');
    setTourCompleted(true);
  };

  return {
    tourCompleted,
    startTour,
    resetTour,
    skipTour
  };
};
