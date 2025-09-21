import { Outlet } from "react-router-dom"
import Nav from "../shared/components/Nav/Nav"
import Footer from "../shared/components/Footer"
import React from 'react';

const MainLayout: React.FC = () => {
  return (
    <div className="main-layout">
      <Nav />
      <div className="contentArea">
        <main>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout
