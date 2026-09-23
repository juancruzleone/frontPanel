import { useEffect, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "../styles/tour.css";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../shared/hooks/useTheme";

export const useInstallationsTour = () => {
	const { t } = useTranslation();
	const { dark } = useTheme();
	const [tourCompleted, setTourCompleted] = useState<boolean>(false);

	useEffect(() => {
		// Verificar si el tour ya fue completado
		const completed = localStorage.getItem("installationsTourCompleted");
		if (completed === "true") {
			setTourCompleted(true);
		}
	}, []);

	const startTour = () => {
		const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const driverObj = driver({
			showProgress: true,
			showButtons: ["next", "previous", "close"],
			progressText: t("installations.tour.progressText"),
			animate: !reduceMotion,
			smoothScroll: !reduceMotion,
			popoverClass: dark ? "driverjs-dark-theme" : "driverjs-light-theme",
			allowClose: true,
			steps: [
				{
					popover: {
						title: t("installations.tour.welcome.title"),
						description: t("installations.tour.welcome.description"),
						showButtons: ["next", "close"],
						side: "bottom",
						align: "start",
					},
				},
				{
					element: '[data-tour="create-installation-btn"]',
					popover: {
						title: t("installations.tour.createInstallation.title"),
						description: t("installations.tour.createInstallation.description"),
						side: "bottom",
						align: "start",
					},
				},
				{
					element: '[data-tour="search-filter"]',
					popover: {
						title: t("installations.tour.searchFilter.title"),
						description: t("installations.tour.searchFilter.description"),
						side: "bottom",
						align: "start",
					},
				},
				{
					element: '[data-tour="nav-installations"]',
					popover: {
						title: t("installations.tour.navOperation.title"),
						description: t("installations.tour.navOperation.description"),
						side: "bottom",
						align: "start",
					},
				},
				{
					element: '[data-tour="nav-clients"]',
					popover: {
						title: t("installations.tour.navClients.title"),
						description: t("installations.tour.navClients.description"),
						side: "bottom",
						align: "start",
					},
				},
			],
			nextBtnText: t("installations.tour.buttons.next"),
			prevBtnText: t("installations.tour.buttons.previous"),
			doneBtnText: t("installations.tour.buttons.done"),
			onDestroyed: () => {
				// Marcar el tour como completado
				localStorage.setItem("installationsTourCompleted", "true");
				setTourCompleted(true);
			},
		});

		driverObj.drive();
	};

	const resetTour = () => {
		localStorage.removeItem("installationsTourCompleted");
		setTourCompleted(false);
	};

	const skipTour = () => {
		localStorage.setItem("installationsTourCompleted", "true");
		setTourCompleted(true);
	};

	return {
		tourCompleted,
		startTour,
		resetTour,
		skipTour,
	};
};
