import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTranslation } from 'react-i18next';

export const useClientsTour = () => {
    const { t, i18n } = useTranslation();
    const [tourCompleted, setTourCompleted] = useState<boolean>(false);

    useEffect(() => {
        const completed = localStorage.getItem('clientsTourCompleted');
        if (completed === 'true') {
            setTourCompleted(true);
        }
    }, []);

    const startTour = () => {
        const driverObj = driver({
            showProgress: true,
            showButtons: ['next', 'previous', 'close'],
            progressText: t('clients.tour.progressText'),
            steps: [
                {
                    popover: {
                        title: t('clients.tour.welcome.title'),
                        description: t('clients.tour.welcome.description')
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
