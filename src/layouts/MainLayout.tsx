import { Outlet } from "react-router-dom"
import Nav from "../shared/components/Nav/Nav"
import TopBar from "../shared/components/TopBar/TopBar"
import Footer from "../shared/components/Footer"
import React, { useEffect } from 'react';
import styles from './MainLayout.module.css';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTranslation } from 'react-i18next';

import { useLayoutStore } from "../store/layoutStore";
import { useAuthStore } from "../store/authStore";
import { socketService } from "../shared/services/socketService";
import { pushNotificationService } from "../shared/services/pushNotificationService";
import { useTheme } from "../shared/hooks/useTheme";

const ONBOARDING_TOUR_KEY = 'onboarding-tour-v2-shown'

const MainLayout: React.FC = () => {
  const { isSidebarCollapsed } = useLayoutStore();
  const { isAuthenticated, userId } = useAuthStore();
  const { t } = useTranslation();
  const { dark } = useTheme();

  useEffect(() => {
    if (isAuthenticated && userId) {
      socketService.connect();
      pushNotificationService.initialize();
    } else {
      socketService.disconnect();
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, userId]);

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    if (localStorage.getItem(ONBOARDING_TOUR_KEY) === 'true') {
      return
    }

    const runOnboardingTour = () => {
      const onboardingTour = driver({
        showProgress: true,
        allowClose: true,
        animate: true,
        smoothScroll: true,
        popoverClass: dark ? 'driverjs-dark-theme' : 'driverjs-light-theme',
        steps: [
          {
            popover: {
              title: t('installations.tour.welcome.title'),
              description: t('installations.tour.welcome.description'),
              side: 'bottom',
              align: 'start',
              showButtons: ['next', 'close'],
            },
          },
          {
            element: '[data-tour="open-settings"]',
            popover: {
              title: t('installations.tour.createInstallationType.title'),
              description: t('installations.tour.createInstallationType.description'),
              side: 'left',
              align: 'start',
            },
          },
          {
            element: '[data-tour="nav-assets"]',
            popover: {
              title: t('installationDetails.tour.createAssetFirst.title'),
              description: t('installationDetails.tour.createAssetFirst.description'),
              side: 'right',
              align: 'start',
            },
          },
          {
            element: '[data-tour="nav-installations"]',
            popover: {
              title: t('installations.tour.createInstallation.title'),
              description: t('installations.tour.createInstallation.description'),
              side: 'right',
              align: 'start',
            },
          },
        ],
        onDestroyed: () => {
          localStorage.setItem(ONBOARDING_TOUR_KEY, 'true')
        },
      })

      onboardingTour.drive()
    }

    const timeoutId = window.setTimeout(runOnboardingTour, 350)
    return () => window.clearTimeout(timeoutId)
  }, [dark, isAuthenticated, t])

  return (
    <div className={styles.layoutContainer}>
      <Nav />
      <div className={`${styles.contentArea} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
        <TopBar />
        <main>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout
