import { Outlet } from "react-router-dom"
import Nav from "../shared/components/Nav/Nav"
import Footer from "../shared/components/Footer"
import React from 'react';
import styles from './MainLayout.module.css';

import { useLayoutStore } from "../store/layoutStore";

const MainLayout: React.FC = () => {
  const { isSidebarCollapsed } = useLayoutStore();

  return (
    <div className={styles.layoutContainer}>
      <Nav />
      <div className={`${styles.contentArea} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
        <main>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout
