import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../installations/styles/tour.css';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../shared/hooks/useTheme';

export const useClientsTour = () => {
    const { t } = useTranslation();
    const { dark } = useTheme();
    const [tourCompleted, setTourCompleted] = useState<boolean>(false);

    useEffect(() => {
        const completed = localStorage.getItem('clientsTourCompleted');
        if (completed === 'true') {
            setTourCompleted(true);
        }
    }, []);

    const startTour = () => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const driverObj = driver({
            showProgress: true,
            showButtons: ['next', 'previous', 'close'],
            progressText: t('clients.tour.progressText'),
            animate: !reduceMotion,
            smoothScroll: !reduceMotion,
            popoverClass: dark ? "driverjs-dark-theme" : "driverjs-light-theme",
            allowClose: true,
            steps: [
                {
                    popover: {
                        title: t('clients.tour.welcome.title'),
                        description: t('clients.tour.welcome.description'),
                        showButtons: ['next', 'close'],
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    element: '[data-tour="nav-installations"]',
                    popover: {
                        title: t('clients.tour.navOperation.title'),
                        description: t('clients.tour.navOperation.description'),
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    element: '[data-tour="nav-clients"]',
                    popover: {
                        title: t('clients.tour.navClients.title'),
                        description: t('clients.tour.navClients.description'),
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    element: '[data-tour="add-client-btn"]',
                    popover: {
                        title: t('clients.tour.addClient.title'),
                        description: t('clients.tour.addClient.description'),
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    element: '[data-tour="search-clients"]',
                    popover: {
                        title: t('clients.tour.searchClients.title'),
                        description: t('clients.tour.searchClients.description'),
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    popover: {
                        title: t('clients.tour.clientActions.title'),
                        description: t('clients.tour.clientActions.description')
                    }
                }
            ],
            nextBtnText: t('clients.tour.buttons.next'),
            prevBtnText: t('clients.tour.buttons.previous'),
            doneBtnText: t('clients.tour.buttons.done'),
            onDestroyed: () => {
                localStorage.setItem('clientsTourCompleted', 'true');
                setTourCompleted(true);
            }
        });

        driverObj.drive();
    };

    const resetTour = () => {
        localStorage.removeItem('clientsTourCompleted');
        setTourCompleted(false);
    };

    const skipTour = () => {
        localStorage.setItem('clientsTourCompleted', 'true');
        setTourCompleted(true);
    };

    return {
        tourCompleted,
        startTour,
        resetTour,
        skipTour
    };
};
