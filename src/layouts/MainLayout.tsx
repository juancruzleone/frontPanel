import { Outlet, useLocation } from "react-router";
import Nav from "../shared/components/Nav/Nav";
import TopBar from "../shared/components/TopBar/TopBar";
import Footer from "../shared/components/Footer";
import React, { useEffect } from "react";
import styles from "./MainLayout.module.css";

import { useLayoutStore } from "../store/layoutStore";
import { useAuthStore } from "../store/authStore";
import { socketService } from "../shared/services/socketService";
import { pushNotificationService } from "../shared/services/pushNotificationService";
import { routeTranslations } from "../router/routeTranslations";
import { isAdmin } from "../shared/utils/roleUtils";
import { useHomeTour } from "../features/home/hooks/useHomeTour";

const ONBOARDING_TOUR_KEY = "home-onboarding-tour-v1-shown";
const HOME_ROUTES = new Set(
	Object.values(routeTranslations).map(({ home }) => `/${home}`),
);

const MainLayout: React.FC = () => {
	const { isSidebarCollapsed } = useLayoutStore();
	const { isAuthenticated, isAuthResolved, userId, role } = useAuthStore();
	const location = useLocation();
	const { startTour } = useHomeTour();

	useEffect(() => {
		if (isAuthResolved && isAuthenticated && userId) {
			socketService.connect();
			pushNotificationService.initialize();
		} else {
			socketService.disconnect();
		}

		return () => {
			socketService.disconnect();
		};
	}, [isAuthResolved, isAuthenticated, userId]);

	useEffect(() => {
		if (!isAuthenticated) {
			return;
		}

		if (localStorage.getItem(ONBOARDING_TOUR_KEY) === "true") {
			return;
		}

		if (!isAdmin(role)) {
			return;
		}

		if (!HOME_ROUTES.has(location.pathname)) {
			return;
		}

		if (!window.matchMedia("(min-width: 1024px)").matches) {
			return;
		}

		const timeoutId = window.setTimeout(startTour, 350);
		return () => window.clearTimeout(timeoutId);
	}, [isAuthenticated, location.pathname, role, startTour]);

	return (
		<div className={styles.layoutContainer}>
			<Nav />
			<div
				className={`${styles.contentArea} ${isSidebarCollapsed ? styles.collapsed : ""}`}
			>
				<TopBar />
				<main>
					<Outlet />
				</main>
				<Footer />
			</div>
		</div>
	);
};

export default MainLayout;
