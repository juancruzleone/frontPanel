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
import { TrialStatusCard } from "../features/billing/components/TrialStatusCard";

const HOME_ROUTES = new Set(
	Object.values(routeTranslations).map(({ home }) => `/${home}`),
);

const MainLayout: React.FC = () => {
	const { isSidebarCollapsed } = useLayoutStore();
	const { isAuthenticated, isAuthResolved, userId, role, accessMode, trial } = useAuthStore();
	const location = useLocation();

	useEffect(() => {
		if (isAuthResolved && isAuthenticated && accessMode === "full" && userId) {
			socketService.connect();
			pushNotificationService.initialize();
		} else {
			socketService.disconnect();
		}

		return () => {
			socketService.disconnect();
		};
	}, [accessMode, isAuthResolved, isAuthenticated, userId]);

	return (
		<div className={styles.layoutContainer}>
			<Nav />
			<div
				className={`${styles.contentArea} ${isSidebarCollapsed ? styles.collapsed : ""}`}
			>
				<TopBar />
				<main>
					{trial?.status === "active" && isAdmin(role) && HOME_ROUTES.has(location.pathname) && <TrialStatusCard trial={trial} />}
					<Outlet />
				</main>
				<Footer />
			</div>
		</div>
	);
};

export default MainLayout;
