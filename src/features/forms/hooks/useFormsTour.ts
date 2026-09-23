import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../installations/styles/tour.css';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../shared/hooks/useTheme';

export const useFormsTour = () => {
  const { t } = useTranslation();
  const { dark } = useTheme();
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);

  useEffect(() => {
    // Verificar si el tour ya fue completado
    const completed = localStorage.getItem('formsTourCompleted');
    if (completed === 'true') {
      setTourCompleted(true);
    }
  }, []);

  const startTour = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      progressText: t('forms.tour.progressText'),
      animate: !reduceMotion,
      smoothScroll: !reduceMotion,
      popoverClass: dark ? "driverjs-dark-theme" : "driverjs-light-theme",
      allowClose: true,
      steps: [
        {
          popover: {
            title: t('forms.tour.welcome.title'),
            description: t('forms.tour.welcome.description'),
            showButtons: ['next', 'close'],
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-assets"]',
          popover: {
            title: t('forms.tour.navMaintenance.title'),
            description: t('forms.tour.navMaintenance.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-forms"]',
          popover: {
            title: t('forms.tour.navForms.title'),
            description: t('forms.tour.navForms.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="open-settings"]',
          popover: {
            title: t('forms.tour.createCategory.title'),
            description: t('forms.tour.createCategory.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="create-template-btn"]',
          popover: {
            title: t('forms.tour.createTemplate.title'),
            description: t('forms.tour.createTemplate.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="search-filter"]',
          popover: {
            title: t('forms.tour.searchFilter.title'),
            description: t('forms.tour.searchFilter.description'),
            side: "bottom",
            align: 'start'
          }
        }
      ],
      nextBtnText: t('forms.tour.buttons.next'),
      prevBtnText: t('forms.tour.buttons.previous'),
      doneBtnText: t('forms.tour.buttons.done'),
      onDestroyed: () => {
        // Marcar el tour como completado
        localStorage.setItem('formsTourCompleted', 'true');
        setTourCompleted(true);
      }
    });

    driverObj.drive();
  };

  const resetTour = () => {
    localStorage.removeItem('formsTourCompleted');
    setTourCompleted(false);
  };

  const skipTour = () => {
    localStorage.setItem('formsTourCompleted', 'true');
    setTourCompleted(true);
  };

  return {
    tourCompleted,
    startTour,
    resetTour,
    skipTour
  };
};
