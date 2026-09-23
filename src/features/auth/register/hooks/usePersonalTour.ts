import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../../installations/styles/tour.css';
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
      progressText: t('personal.tour.progressText'),
      steps: [
        {
          popover: {
            title: t('personal.tour.welcome.title'),
            description: t('personal.tour.welcome.description'),
            showButtons: ['next', 'close']
          }
        },
        {
          element: '[data-tour="nav-operation"]',
          popover: {
            title: t('personal.tour.navOperation.title', { defaultValue: 'Personal en Operación' }),
            description: t('personal.tour.navOperation.description', { defaultValue: 'Personal ahora está en Operación → Personal.' }),
            side: "right",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-personal"]',
          popover: {
            title: t('personal.tour.navPersonal.title', { defaultValue: 'Ir a Personal' }),
            description: t('personal.tour.navPersonal.description', { defaultValue: 'Accede a Personal desde el menú Operación.' }),
            side: "right",
            align: 'start'
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
