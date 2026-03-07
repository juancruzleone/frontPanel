import { Outlet } from "react-router-dom"
import Nav from "../shared/components/Nav/Nav"
import TopBar from "../shared/components/TopBar/TopBar"
import Footer from "../shared/components/Footer"
import React, { useEffect } from 'react';
import styles from './MainLayout.module.css';

import { useLayoutStore } from "../store/layoutStore";
import { useAuthStore } from "../store/authStore";
import { socketService } from "../shared/services/socketService";

const MainLayout: React.FC = () => {
  const { isSidebarCollapsed } = useLayoutStore();
  const { isAuthenticated, userId } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && userId) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, userId]);

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
