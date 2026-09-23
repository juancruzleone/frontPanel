import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "../../installations/styles/tour.css";
import { useTheme } from "../../../shared/hooks/useTheme";
import { useTranslatedRoutes } from "../../../router/useTranslatedRoutes";

const HOME_TOUR_KEY = "home-onboarding-tour-v1-shown";

export const useHomeTour = () => {
	const { t } = useTranslation();
	const { dark } = useTheme();
	const navigate = useNavigate();
	const { getRoute } = useTranslatedRoutes();
	const [tourCompleted, setTourCompleted] = useState<boolean>(false);

	useEffect(() => {
		setTourCompleted(localStorage.getItem(HOME_TOUR_KEY) === "true");
	}, []);

	const startTour = useCallback(() => {
		const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const settingsRoute = getRoute("settings");
		let navigatedToSettings = false;
		const homeTour = driver({
			showProgress: true,
			showButtons: ["next", "previous", "close"],
			progressText: t("home.tour.progressText"),
			nextBtnText: t("home.tour.buttons.next"),
			prevBtnText: t("home.tour.buttons.previous"),
			doneBtnText: t("home.tour.buttons.done"),
			allowClose: true,
			animate: !reduceMotion,
			smoothScroll: !reduceMotion,
			popoverClass: dark ? "driverjs-dark-theme" : "driverjs-light-theme",
			steps: [
				{
					popover: {
						title: t("home.tour.welcome.title"),
						description: t("home.tour.welcome.description"),
						side: "bottom",
						align: "start",
						showButtons: ["next", "close"],
						onNextClick: () => {
							navigatedToSettings = true;
							homeTour.destroy();
							localStorage.setItem(HOME_TOUR_KEY, "true");
							setTourCompleted(true);
							navigate(settingsRoute, { state: { fromHomeTour: true } });
						},
					},
				},
				{
					element: '[data-tour="open-settings"]',
					popover: {
						title: t("home.tour.settings.title"),
						description: t("home.tour.settings.description"),
						side: "bottom",
						align: "start",
						onNextClick: () => {
							navigatedToSettings = true;
							homeTour.destroy();
							localStorage.setItem(HOME_TOUR_KEY, "true");
							setTourCompleted(true);
							navigate(settingsRoute, { state: { fromHomeTour: true } });
						},
					},
				},
			],
			onDestroyed: () => {
				if (!navigatedToSettings) {
					localStorage.setItem(HOME_TOUR_KEY, "true");
					setTourCompleted(true);
				}
			},
		});

		homeTour.drive();
	}, [dark, getRoute, navigate, t]);

	return {
		tourCompleted,
		startTour,
	};
};
