import React, { useState, useRef, useEffect } from "react";
import { Search, Bell, Check, Trash2, Clock, Sun, Moon } from "lucide-react";
import { useNotificationStore } from "../../../store/notificationStore";
import { useLayoutStore } from "../../../store/layoutStore";
import { useAuthStore } from "../../../store/authStore";
import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "react-i18next";
import { formatRelativeTime } from "../../utils/formatRelativeTime";
import styles from "./TopBar.module.css";

import esFlag from "../../../../src/assets/flags/es.svg";
import frFlag from "../../../../src/assets/flags/fr.svg";
import usFlag from "../../../../src/assets/flags/us.svg";
import deFlag from "../../../../src/assets/flags/de.svg";
import jpFlag from "../../../../src/assets/flags/jp.svg";
import krFlag from "../../../../src/assets/flags/kr.svg";
import saFlag from "../../../../src/assets/flags/sa.svg";
import brFlag from "../../../../src/assets/flags/br.svg";
import cnFlag from "../../../../src/assets/flags/cn.svg";
import itFlag from "../../../../src/assets/flags/it.svg";

const flagMap: Record<string, string> = {
	es: esFlag,
	fr: frFlag,
	en: usFlag,
	us: usFlag,
	de: deFlag,
	it: itFlag,
	ja: jpFlag,
	jp: jpFlag,
	ko: krFlag,
	kr: krFlag,
	ar: saFlag,
	pt: brFlag,
	br: brFlag,
	zh: cnFlag,
	cn: cnFlag,
};

const TopBar: React.FC = () => {
	const { t, i18n } = useTranslation();
	const {
		notifications,
		unreadCount,
		markAsRead,
		markAllAsRead,
		clearNotifications,
	} = useNotificationStore();
	const { isSidebarCollapsed } = useLayoutStore();
	const { dark, toggleTheme } = useTheme();
	const { user, role } = useAuthStore();
	const [isNotifOpen, setIsNotifOpen] = useState(false);
	const [isLangOpen, setIsLangOpen] = useState(false);
	const [isThemeSpinning, setIsThemeSpinning] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const notifRef = useRef<HTMLDivElement>(null);
	const langRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.ctrlKey || event.metaKey) && (event.key === "k" || event.key === "K")) {
				event.preventDefault();
				searchInputRef.current?.focus();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				notifRef.current &&
				!notifRef.current.contains(event.target as Node)
			) {
				setIsNotifOpen(false);
			}
			if (langRef.current && !langRef.current.contains(event.target as Node)) {
				setIsLangOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const languages = [
		{ code: "es", name: t("languageSelector.spanish"), flag: "🇪🇸" },
		{ code: "en", name: t("languageSelector.english"), flag: "🇺🇸" },
		{ code: "fr", name: t("languageSelector.french"), flag: "🇫🇷" },
		{ code: "pt", name: t("languageSelector.portuguese"), flag: "🇵🇹" },
		{ code: "de", name: t("languageSelector.german"), flag: "🇩🇪" },
		{ code: "it", name: t("languageSelector.italian"), flag: "🇮🇹" },
		{ code: "ja", name: t("languageSelector.japanese"), flag: "🇯🇵" },
		{ code: "ko", name: t("languageSelector.korean"), flag: "🇰🇷" },
		{ code: "zh", name: t("languageSelector.chinese"), flag: "🇨🇳" },
		{ code: "ar", name: t("languageSelector.arabic"), flag: "🇸🇦" },
	];

	const currentLangCode = (
		i18n.resolvedLanguage ||
		i18n.language ||
		"es"
	).split("-")[0];
	const currentFlag = flagMap[currentLangCode] || esFlag;

	const handleLanguageChange = (languageCode: string) => {
		i18n.changeLanguage(languageCode);
		setIsLangOpen(false);
	};

	const handleThemeToggle = () => {
		setIsThemeSpinning(true);
		toggleTheme();
		window.setTimeout(() => {
			setIsThemeSpinning(false);
		}, 650);
	};

	const userInitials = (user || "US").substring(0, 2).toUpperCase();
	const roleName = role ? (t(`roles.${role}`, { defaultValue: role }) || role) : "";

	return (
		<header
			className={`${styles.topBar} ${isSidebarCollapsed ? styles.expanded : ""}`}
		>
			<div className={styles.topBarContainer}>
				<div className={styles.searchContainer} data-tour="topbar-search">
					<div className={styles.searchWrapper}>
						<Search size={16} className={styles.searchIcon} aria-hidden />
						<input
							ref={searchInputRef}
							type="search"
							className={styles.searchInput}
							placeholder="Buscar activos, instalaciones, órdenes de trabajo..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							aria-label="Buscar activos, instalaciones y órdenes de trabajo"
						/>
						<kbd className={styles.searchKbd} aria-hidden>Ctrl + K</kbd>
					</div>
				</div>

				<div className={styles.actions} data-tour="topbar-actions">
					<div className={styles.langContainer} ref={langRef} data-tour="topbar-language">
						<button
							className={styles.actionButton}
							onClick={() => setIsLangOpen(!isLangOpen)}
							aria-label="Idioma"
						>
							<img
								src={currentFlag}
								alt={i18n.language}
								className={styles.flagImg}
							/>
						</button>
						{isLangOpen && (
							<div className={styles.langDropdown} role="menu">
								{languages.map((language) => {
									const isActive = currentLangCode === language.code;
									return (
										<button
											key={language.code}
											role="menuitem"
											aria-current={isActive ? "true" : undefined}
											title={language.name}
											className={`${styles.langOption} ${isActive ? styles.activeLang : ""}`}
											onClick={() => handleLanguageChange(language.code)}
										>
											<img
												src={flagMap[language.code] || esFlag}
												alt=""
												className={styles.flagImgSmall}
											/>
											<span className={styles.langName}>{language.name}</span>
											{isActive && <Check size={14} className={styles.checkIcon} aria-hidden />}
										</button>
									);
								})}
							</div>
						)}
					</div>

					<button
						data-tour="topbar-theme"
						className={`${styles.actionButton} ${styles.themeToggleButton} ${dark ? styles.themeDark : styles.themeLight} ${isThemeSpinning ? styles.themeSpinActive : ""}`}
						onClick={handleThemeToggle}
						aria-label="Cambiar tema"
					>
						<span className={styles.themeIconStack}>
							<Sun
								size={20}
								className={`${styles.themeIcon} ${styles.sunIcon}`}
							/>
							<Moon
								size={20}
								className={`${styles.themeIcon} ${styles.moonIcon}`}
							/>
						</span>
					</button>

					<div className={styles.notificationsContainer} ref={notifRef} data-tour="topbar-notifications">
						<button
							className={styles.actionButton}
							onClick={() => setIsNotifOpen(!isNotifOpen)}
							aria-label="Notificaciones"
						>
							<Bell size={20} />
							{unreadCount > 0 && (
								<span className={styles.badge}>{unreadCount}</span>
							)}
						</button>

						{isNotifOpen && (
							<div className={styles.dropdown}>
								<div className={styles.dropdownHeader}>
									<h3>{t("notifications.title") || "Notificaciones"}</h3>
									<div className={styles.headerActions}>
										<button
											onClick={markAllAsRead}
											title={t("notifications.markAllAsRead")}
										>
											<Check size={16} />
										</button>
										<button
											onClick={clearNotifications}
											title={t("notifications.clearAll")}
										>
											<Trash2 size={16} />
										</button>
									</div>
								</div>
								<div className={styles.notificationsList}>
									{notifications.length === 0 ? (
										<div className={styles.emptyState}>
											<Bell size={40} className={styles.emptyIcon} />
											<p>{t("notifications.empty")}</p>
										</div>
									) : (
										notifications.map((notif) => (
											<div
												key={notif.id}
												className={`${styles.notificationItem} ${!notif.read ? styles.unread : ""}`}
												onClick={() => markAsRead(notif.id)}
											>
												<div className={styles.notifContent}>
													<h4 className={styles.notifTitle}>{notif.title}</h4>
													<p className={styles.notifMessage}>{notif.message}</p>
													<span className={styles.notifTime}>
														<Clock size={12} />{" "}
														{formatRelativeTime(
															new Date(notif.date),
															currentLangCode,
															t("notifications.justNow"),
														)}
													</span>
												</div>
												{!notif.read && (
													<div className={styles.unreadIndicator} />
												)}
											</div>
										))
									)}
								</div>
							</div>
						)}
					</div>

					{user && (
						<div className={styles.topBarUser} title={`${user} (${roleName})`}>
							<div className={styles.userAvatar} aria-hidden>
								{userInitials}
							</div>
							<div className={styles.userMeta}>
								<span className={styles.userName} style={{ color: "#ffffff" }}>{user}</span>
								<span className={styles.userRole} style={{ color: "rgba(255, 255, 255, 0.7)" }}>{roleName}</span>
							</div>
						</div>
					)}
				</div>
			</div>
		</header>
	);
};

export default TopBar;
