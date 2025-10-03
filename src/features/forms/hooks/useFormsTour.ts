import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../installations/styles/tour.css';
import { useTranslation } from 'react-i18next';

export const useFormsTour = () => {
  const { t, i18n } = useTranslation();
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);

  useEffect(() => {
    // Verificar si el tour ya fue completado
    const completed = localStorage.getItem('formsTourCompleted');
    if (completed === 'true') {
      setTourCompleted(true);
    }
  }, []);

  const startTour = () => {
    // Forzar recreación con el idioma actual
    const currentLang = i18n.language;
    
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      progressText: t('forms.tour.progressText'),
      steps: [
        {
          popover: {
            title: t('forms.tour.welcome.title'),
            description: t('forms.tour.welcome.description')
          }
        },
        {
          element: '[data-tour="create-form-category-btn"]',
          popover: {
            title: t('forms.tour.createCategory.title'),
            description: t('forms.tour.createCategory.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="manage-categories-btn"]',
          popover: {
            title: t('forms.tour.viewCategories.title'),
            description: t('forms.tour.viewCategories.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="create-form-template-btn"]',
          popover: {
            title: t('forms.tour.createTemplate.title'),
            description: t('forms.tour.createTemplate.description'),
            side: "left",
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
