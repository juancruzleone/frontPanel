import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../installations/styles/tour.css';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useTheme } from '../../../shared/hooks/useTheme';

export const useAssetsTour = () => {
  const { t, i18n } = useTranslation();
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);

  useEffect(() => {
    // Verificar si el tour ya fue completado
    const completed = localStorage.getItem('assetsTourCompleted');
    if (completed === 'true') {
      setTourCompleted(true);
    }
  }, []);

  const startTour = () => {
    void i18n.language;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      progressText: t('assets.tour.progressText'),
      animate: !reduceMotion,
      smoothScroll: !reduceMotion,
      popoverClass: dark ? "driverjs-dark-theme" : "driverjs-light-theme",
      allowClose: true,
      steps: [
        {
          popover: {
            title: t('assets.tour.welcome.title'),
            description: t('assets.tour.welcome.description'),
            showButtons: ['next', 'close'],
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-assets"]',
          popover: {
            title: t('assets.tour.goToForms.title'),
            description: t('assets.tour.goToForms.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="nav-forms"]',
          popover: {
            title: t('assets.tour.goToForms.title'),
            description: t('assets.tour.goToForms.description'),
            side: "bottom",
            align: 'start',
            onNextClick: () => {
              driverObj.destroy();
              navigate('/formularios', { state: { fromAssetsTour: true } });
            }
          }
        },
        {
          element: '[data-tour="nav-manuals"]',
          popover: {
            title: t('assets.tour.viewManuals.title'),
            description: t('assets.tour.viewManuals.description'),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '[data-tour="open-settings"]',
          popover: {
            title: t('assets.tour.viewFormCategories.title'),
            description: t('assets.tour.viewFormCategories.description'),
            side: "bottom",
            align: 'start'
          }
        }
      ],
      nextBtnText: t('assets.tour.buttons.next'),
      prevBtnText: t('assets.tour.buttons.previous'),
      doneBtnText: t('assets.tour.buttons.done'),
      onDestroyed: () => {
        // Marcar el tour como completado cuando se cierra
        localStorage.setItem('assetsTourCompleted', 'true');
        setTourCompleted(true);
      }
    });

    driverObj.drive();
  };

  const continueFormsTour = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      progressText: t('assets.tour.progressText'),
      animate: !reduceMotion,
      smoothScroll: !reduceMotion,
      popoverClass: dark ? "driverjs-dark-theme" : "driverjs-light-theme",
      allowClose: true,
      steps: [
        {
          element: '[data-tour="create-template-btn"]',
          popover: {
            title: t('assets.tour.createFormTemplate.title'),
            description: t('assets.tour.createFormTemplate.description'),
            side: "bottom",
            align: 'start',
            showButtons: ['next', 'close']
          }
        },
        {
          element: '[data-tour="open-settings"]',
          popover: {
            title: t('assets.tour.viewFormCategories.title'),
            description: t('assets.tour.viewFormCategories.description'),
            side: "bottom",
            align: 'start',
            onNextClick: () => {
              driverObj.destroy();
              navigate('/activos', { state: { fromFormsTour: true } });
            }
          }
        }
      ],
      nextBtnText: t('assets.tour.buttons.next'),
      prevBtnText: t('assets.tour.buttons.previous'),
      doneBtnText: t('assets.tour.buttons.done')
    });

    driverObj.drive();
  };

  const continueAssetsTour = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      progressText: t('assets.tour.progressText'),
      animate: !reduceMotion,
      smoothScroll: !reduceMotion,
      popoverClass: dark ? "driverjs-dark-theme" : "driverjs-light-theme",
      allowClose: true,
      steps: [
        {
          element: '[data-tour="create-asset-btn"]',
          popover: {
            title: t('assets.tour.createAsset.title'),
            description: t('assets.tour.createAsset.description'),
            side: "bottom",
            align: 'start',
            showButtons: ['next', 'close']
          }
        },
        {
          element: '[data-tour="search-filter"]',
          popover: {
            title: t('assets.tour.searchFilter.title'),
            description: t('assets.tour.searchFilter.description'),
            side: "bottom",
            align: 'start'
          }
        }
      ],
      nextBtnText: t('assets.tour.buttons.next'),
      prevBtnText: t('assets.tour.buttons.previous'),
      doneBtnText: t('assets.tour.buttons.done'),
      onDestroyed: () => {
        // Marcar el tour como completado
        localStorage.setItem('assetsTourCompleted', 'true');
        setTourCompleted(true);
      }
    });

    driverObj.drive();
  };

  const resetTour = () => {
    localStorage.removeItem('assetsTourCompleted');
    setTourCompleted(false);
  };

  const skipTour = () => {
    localStorage.setItem('assetsTourCompleted', 'true');
    setTourCompleted(true);
  };

  return {
    tourCompleted,
    startTour,
    continueFormsTour,
    continueAssetsTour,
    resetTour,
    skipTour
  };
};
