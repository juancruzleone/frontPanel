import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "../../installations/styles/tour.css";
import { useTheme } from "../../../shared/hooks/useTheme";

const HOME_TOUR_KEY = "home-onboarding-tour-v1-shown";

export const useHomeTour = () => {
	const { t } = useTranslation();
	const { dark } = useTheme();
	const [tourCompleted, setTourCompleted] = useState<boolean>(false);

	useEffect(() => {
		setTourCompleted(localStorage.getItem(HOME_TOUR_KEY) === "true");
	}, []);

	const startTour = useCallback(() => {
		const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
					},
				},
				{
					element: '[data-tour="open-settings"]',
					popover: {
						title: t("home.tour.settings.title"),
						description: t("home.tour.settings.description"),
						side: "right",
						align: "start",
					},
				},
			],
			onDestroyed: () => {
				localStorage.setItem(HOME_TOUR_KEY, "true");
				setTourCompleted(true);
			},
		});

		homeTour.drive();
	}, [dark, t]);

	return {
		tourCompleted,
		startTour,
	};
};
