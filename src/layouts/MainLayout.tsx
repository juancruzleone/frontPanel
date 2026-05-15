import { Outlet, useLocation } from "react-router-dom";
import Nav from "../shared/components/Nav/Nav";
import TopBar from "../shared/components/TopBar/TopBar";
import Footer from "../shared/components/Footer";
import React, { useEffect } from "react";
import styles from "./MainLayout.module.css";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useTranslation } from "react-i18next";

import { useLayoutStore } from "../store/layoutStore";
import { useAuthStore } from "../store/authStore";
import { socketService } from "../shared/services/socketService";
import { pushNotificationService } from "../shared/services/pushNotificationService";
import { useTheme } from "../shared/hooks/useTheme";
import { routeTranslations } from "../router/routeTranslations";
import { isClient, isSuperAdmin } from "../shared/utils/roleUtils";

const ONBOARDING_TOUR_KEY = "onboarding-tour-v2-shown";
const HOME_ROUTES = new Set(
	Object.values(routeTranslations).map(({ home }) => `/${home}`),
);

const MainLayout: React.FC = () => {
	const { isSidebarCollapsed } = useLayoutStore();
	const { isAuthenticated, userId, role } = useAuthStore();
	const { t } = useTranslation();
	const { dark } = useTheme();
	const location = useLocation();

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
			return;
		}

		if (localStorage.getItem(ONBOARDING_TOUR_KEY) === "true") {
			return;
		}

		if (isClient(role) || isSuperAdmin(role)) {
			return;
		}

		if (!HOME_ROUTES.has(location.pathname)) {
			return;
		}

		if (!window.matchMedia("(min-width: 1024px)").matches) {
			return;
		}

		const runOnboardingTour = () => {
			const onboardingTour = driver({
				showProgress: true,
				progressText: t("installations.tour.progressText"),
				nextBtnText: t("installations.tour.buttons.next"),
				prevBtnText: t("installations.tour.buttons.previous"),
				doneBtnText: t("installations.tour.buttons.done"),
				allowClose: true,
				animate: true,
				smoothScroll: true,
				popoverClass: dark ? "driverjs-dark-theme" : "driverjs-light-theme",
				steps: [
					{
						popover: {
							title: t("installations.tour.welcome.title"),
							description: t("installations.tour.welcome.description"),
							side: "bottom",
							align: "start",
							showButtons: ["next", "close"],
						},
					},
					{
						element: '[data-tour="open-settings"]',
						popover: {
							title: t("installations.tour.createInstallationType.title"),
							description: t(
								"installations.tour.createInstallationType.description",
							),
							side: "right",
							align: "start",
						},
					},
				],
				onDestroyed: () => {
					localStorage.setItem(ONBOARDING_TOUR_KEY, "true");
				},
			});

			onboardingTour.drive();
		};

		const timeoutId = window.setTimeout(runOnboardingTour, 350);
		return () => window.clearTimeout(timeoutId);
	}, [dark, isAuthenticated, location.pathname, role, t]);

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
