import { NavLink, useLocation, useNavigate } from "react-router";
import { useAuthStore } from "../../../store/authStore";
import {
	LogOut,
	Home,
	Package,
	Truck,
	ClipboardList,
	Menu,
	X,
	Building,
	User,
	Users,
	BookOpen,
	FileText,
	Calendar,
	Settings,
	ChevronsLeft,
	ChevronsRight,
	ChevronDown,
	Boxes,
	Wrench,
	Briefcase,
	Cog,
	CalendarCog,
	ClipboardCheck,
} from "lucide-react";
import { useLayoutStore } from "../../../store/layoutStore";
import styles from "./Nav.module.css";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
	isTechnician,
	isSuperAdmin,
	isClient,
	isAdmin,
} from "../../utils/roleUtils";
import { useTranslatedRoutes } from "../../../router";
import { logoutSession } from "../../../features/auth/services/loginServices";
import { runExplicitLogout } from "../../../features/auth/services/explicitLogout";
import { useCSRFStore } from "../../../store/csrfStore";
import { getRouteMenuOpenState } from "./navRouteState";
import { toast } from "sonner";

const isMobileDrawerViewport = () =>
	typeof window !== "undefined" &&
	window.matchMedia("(max-width: 1023px)").matches;

const Nav = () => {
	const { t } = useTranslation();
	const user = useAuthStore((s) => s.user);
	const role = useAuthStore((s) => s.role);
	const logout = useAuthStore((s) => s.logout);
	const setLogoutMessage = useAuthStore((s) => s.setLogoutMessage);
	const navigate = useNavigate();
	const location = useLocation();
	const { isSidebarCollapsed, toggleSidebar } = useLayoutStore();
	const { getRoute } = useTranslatedRoutes();
	const workOrdersTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const operationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const maintenanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const assetsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const installationsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Usar las utilidades de roles
	const isTechnicianUser = isTechnician(role);
	const isSuperAdminUser = isSuperAdmin(role);
	const isClientUser = isClient(role);
	const isAdminUser = isAdmin(role);

	const homeRoute = getRoute("home");
	const workOrdersRoute = getRoute("workOrders");
	const calendarRoute = getRoute("calendar");
	const maintenancePlanRoute = getRoute("maintenancePlan");
	const installationsRoute = getRoute("installations");
	const assetsRoute = getRoute("assets");
	const inventoryRoute = getRoute("inventory");
	const suppliersRoute = getRoute("suppliers");
	const personalRoute = getRoute("personal");
	const clientsRoute = getRoute("clients");
	const formsRoute = getRoute("forms");
	const manualsRoute = getRoute("manuals");
	const settingsRoute = getRoute("settings");
	const panelAdminRoute = getRoute("panelAdmin");
	const profileRoute = getRoute("profile");
	const complianceRoute = getRoute("compliance");
	const currentRouteMenuState = getRouteMenuOpenState(location.pathname, {
		workOrders: [workOrdersRoute, calendarRoute],
		maintenance: [maintenancePlanRoute],
		operation: [inventoryRoute, personalRoute, suppliersRoute],
		assets: [assetsRoute, formsRoute, manualsRoute],
		installations: [installationsRoute, clientsRoute],
	});
	const {
		workOrders: isWorkOrdersSectionActive,
		maintenance: isMaintenanceSectionActive,
		operation: isOperationSectionActive,
		assets: isAssetsSectionActive,
		installations: isInstallationsSectionActive,
	} = currentRouteMenuState;
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	type MenuKey =
		| "workOrders"
		| "maintenance"
		| "operation"
		| "assets"
		| "installations";
	const getInitialOpenMenu = (): MenuKey | null => {
		if (isWorkOrdersSectionActive) return "workOrders";
		if (isMaintenanceSectionActive) return "maintenance";
		if (isOperationSectionActive) return "operation";
		if (isAssetsSectionActive) return "assets";
		if (isInstallationsSectionActive) return "installations";
		return null;
	};
	const [openMenu, setOpenMenu] = useState<MenuKey | null>(getInitialOpenMenu);
	const isWorkOrdersMenuOpen = openMenu === "workOrders";
	const isOperationMenuOpen = openMenu === "operation";
	const isMaintenanceMenuOpen = openMenu === "maintenance";
	const isAssetsMenuOpen = openMenu === "assets";
	const isInstallationsMenuOpen = openMenu === "installations";
	const toggleMenu = (menu: MenuKey) => {
		setOpenMenu((prev) => (prev === menu ? null : menu));
	};
	const [isWorkOrdersHovered, setIsWorkOrdersHovered] = useState(false);
	const [isOperationHovered, setIsOperationHovered] = useState(false);
	const [isMaintenanceHovered, setIsMaintenanceHovered] = useState(false);
	const [isAssetsHovered, setIsAssetsHovered] = useState(false);
	const [isInstallationsHovered, setIsInstallationsHovered] = useState(false);
	const [isMobileDrawer, setIsMobileDrawer] = useState(isMobileDrawerViewport);
	const isCollapsedDesktop = isSidebarCollapsed && !isMobileDrawer;

	useEffect(() => {
		const mediaQuery = window.matchMedia("(max-width: 1023px)");
		const updateIsMobileDrawer = () => setIsMobileDrawer(mediaQuery.matches);

		updateIsMobileDrawer();
		mediaQuery.addEventListener("change", updateIsMobileDrawer);

		return () => mediaQuery.removeEventListener("change", updateIsMobileDrawer);
	}, []);

	useEffect(() => {
		if (isMenuOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
	}, [isMenuOpen]);

	useEffect(() => {
		if (isWorkOrdersSectionActive) setOpenMenu("workOrders");
		else if (isMaintenanceSectionActive) setOpenMenu("maintenance");
		else if (isOperationSectionActive) setOpenMenu("operation");
		else if (isAssetsSectionActive) setOpenMenu("assets");
		else if (isInstallationsSectionActive) setOpenMenu("installations");
		else setOpenMenu(null);
	}, [
		isWorkOrdersSectionActive,
		isOperationSectionActive,
		isMaintenanceSectionActive,
		isAssetsSectionActive,
		isInstallationsSectionActive,
	]);

	useEffect(() => {
		if (isCollapsedDesktop) {
			setOpenMenu(null);
		}
	}, [isCollapsedDesktop]);

	useEffect(() => {
		if (workOrdersTimeoutRef.current) {
			clearTimeout(workOrdersTimeoutRef.current);
		}
		if (operationTimeoutRef.current) {
			clearTimeout(operationTimeoutRef.current);
		}
		if (maintenanceTimeoutRef.current) {
			clearTimeout(maintenanceTimeoutRef.current);
		}
		if (assetsTimeoutRef.current) {
			clearTimeout(assetsTimeoutRef.current);
		}
		if (installationsTimeoutRef.current) {
			clearTimeout(installationsTimeoutRef.current);
		}
		setIsWorkOrdersHovered(false);
		setIsOperationHovered(false);
		setIsMaintenanceHovered(false);
		setIsAssetsHovered(false);
		setIsInstallationsHovered(false);
	}, [location.pathname]);

	const handleLogout = async () => {
		const csrfToken = useCSRFStore.getState().token;

		try {
			await runExplicitLogout({
				csrfToken,
				logoutSession,
				logout,
				setLogoutMessage,
				navigate,
			});
		} catch (error) {
			toast.error(t("common.error"), {
				description: error instanceof Error ? error.message : undefined,
			});
		} finally {
			setIsMenuOpen(false);
		}
	};

	const handleWorkOrdersMouseEnter = () => {
		if (isCollapsedDesktop) {
			if (workOrdersTimeoutRef.current) {
				clearTimeout(workOrdersTimeoutRef.current);
			}
			setIsWorkOrdersHovered(true);
		}
	};

	const handleWorkOrdersMouseLeave = () => {
		if (isCollapsedDesktop) {
			workOrdersTimeoutRef.current = setTimeout(() => {
				setIsWorkOrdersHovered(false);
			}, 300);
		}
	};

	const handleWorkOrdersSubmenuEnter = () => {
		if (isCollapsedDesktop && workOrdersTimeoutRef.current) {
			clearTimeout(workOrdersTimeoutRef.current);
			setIsWorkOrdersHovered(true);
		}
	};

	const handleWorkOrdersSubmenuLeave = () => {
		if (isCollapsedDesktop) {
			workOrdersTimeoutRef.current = setTimeout(() => {
				setIsWorkOrdersHovered(false);
			}, 300);
		}
	};

	const handleOperationMouseEnter = () => {
		if (isCollapsedDesktop) {
			if (operationTimeoutRef.current) {
				clearTimeout(operationTimeoutRef.current);
			}
			setIsOperationHovered(true);
		}
	};

	const handleOperationMouseLeave = () => {
		if (isCollapsedDesktop) {
			operationTimeoutRef.current = setTimeout(() => {
				setIsOperationHovered(false);
			}, 300);
		}
	};

	const handleOperationSubmenuEnter = () => {
		if (isCollapsedDesktop && operationTimeoutRef.current) {
			clearTimeout(operationTimeoutRef.current);
			setIsOperationHovered(true);
		}
	};

	const handleOperationSubmenuLeave = () => {
		if (isCollapsedDesktop) {
			operationTimeoutRef.current = setTimeout(() => {
				setIsOperationHovered(false);
			}, 300);
		}
	};

	const handleMaintenanceMouseEnter = () => {
		if (isCollapsedDesktop) {
			if (maintenanceTimeoutRef.current) {
				clearTimeout(maintenanceTimeoutRef.current);
			}
			setIsMaintenanceHovered(true);
		}
	};

	const handleMaintenanceMouseLeave = () => {
		if (isCollapsedDesktop) {
			maintenanceTimeoutRef.current = setTimeout(() => {
				setIsMaintenanceHovered(false);
			}, 300);
		}
	};

	const handleMaintenanceSubmenuEnter = () => {
		if (isCollapsedDesktop && maintenanceTimeoutRef.current) {
			clearTimeout(maintenanceTimeoutRef.current);
			setIsMaintenanceHovered(true);
		}
	};

	const handleMaintenanceSubmenuLeave = () => {
		if (isCollapsedDesktop) {
			maintenanceTimeoutRef.current = setTimeout(() => {
				setIsMaintenanceHovered(false);
			}, 300);
		}
	};

	const handleAssetsMouseEnter = () => {
		if (isCollapsedDesktop) {
			if (assetsTimeoutRef.current) {
				clearTimeout(assetsTimeoutRef.current);
			}
			setIsAssetsHovered(true);
		}
	};

	const handleAssetsMouseLeave = () => {
		if (isCollapsedDesktop) {
			assetsTimeoutRef.current = setTimeout(() => {
				setIsAssetsHovered(false);
			}, 300);
		}
	};

	const handleAssetsSubmenuEnter = () => {
		if (isCollapsedDesktop && assetsTimeoutRef.current) {
			clearTimeout(assetsTimeoutRef.current);
			setIsAssetsHovered(true);
		}
	};

	const handleAssetsSubmenuLeave = () => {
		if (isCollapsedDesktop) {
			assetsTimeoutRef.current = setTimeout(() => {
				setIsAssetsHovered(false);
			}, 300);
		}
	};

	const handleInstallationsMouseEnter = () => {
		if (isCollapsedDesktop) {
			if (installationsTimeoutRef.current) {
				clearTimeout(installationsTimeoutRef.current);
			}
			setIsInstallationsHovered(true);
		}
	};

	const handleInstallationsMouseLeave = () => {
		if (isCollapsedDesktop) {
			installationsTimeoutRef.current = setTimeout(() => {
				setIsInstallationsHovered(false);
			}, 300);
		}
	};

	const handleInstallationsSubmenuEnter = () => {
		if (isCollapsedDesktop && installationsTimeoutRef.current) {
			clearTimeout(installationsTimeoutRef.current);
			setIsInstallationsHovered(true);
		}
	};

	const handleInstallationsSubmenuLeave = () => {
		if (isCollapsedDesktop) {
			installationsTimeoutRef.current = setTimeout(() => {
				setIsInstallationsHovered(false);
			}, 300);
		}
	};

	return (
		<>
			<button
				type="button"
				className={`${styles.menuToggle} ${isMenuOpen ? styles.menuToggleOpen : ""}`}
				onClick={() => setIsMenuOpen((prev) => !prev)}
				aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
			>
				{isMenuOpen ? <X size={20} /> : <Menu size={20} />}
			</button>

			<nav
				className={`${styles.nav} ${isMenuOpen ? styles.open : ""} ${isCollapsedDesktop ? styles.collapsed : ""}`}
			>
				<button
					type="button"
					className={styles.collapseButton}
					onClick={toggleSidebar}
					aria-label={
						isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"
					}
				>
					{isSidebarCollapsed ? (
						<ChevronsRight size={20} />
					) : (
						<ChevronsLeft size={20} />
					)}
				</button>
				<div className={styles.navContent}>
					<div className={styles.logoArea}>
						<div className={styles.logoContainer}>
							<img
								src="/logo leonix 5.svg"
								alt="Leonix Logo"
								className={styles.logoImage}
							/>
							<span className={styles.logoText}>Leonix</span>
						</div>
					</div>
					<ul className={styles.menu}>
						{!isSuperAdminUser && (
							<li>
								<NavLink
									to={homeRoute}
									className={({ isActive }) => (isActive ? styles.active : "")}
									onClick={() => setIsMenuOpen(false)}
								>
									<Home size={20} />{" "}
									<span className={styles.linkText}>{t("nav.home")}</span>
								</NavLink>
							</li>
						)}
						{!isSuperAdminUser && (
							<li
								className={styles.menuGroup}
								onMouseEnter={handleWorkOrdersMouseEnter}
								onMouseLeave={handleWorkOrdersMouseLeave}
							>
								<button
									type="button"
									data-tour="nav-work-orders"
									className={`${styles.groupButton} ${isWorkOrdersSectionActive ? styles.active : ""}`}
									onClick={() => toggleMenu("workOrders")}
									aria-expanded={
										isWorkOrdersMenuOpen ||
										(isCollapsedDesktop && isWorkOrdersHovered)
									}
								>
									<span className={styles.groupButtonContent}>
										<Wrench size={20} />{" "}
										<span className={styles.linkText}>
											{t("nav.workOrdersGroup")}
										</span>
									</span>
									<ChevronDown
										size={16}
										className={`${styles.groupChevron} ${isWorkOrdersMenuOpen ? styles.groupChevronOpen : ""}`}
									/>
								</button>
								<div
									className={`${styles.submenu} ${styles.resourcesSubmenu} ${isWorkOrdersMenuOpen || (isCollapsedDesktop && isWorkOrdersHovered) ? styles.submenuOpen : ""}`}
									onMouseEnter={handleWorkOrdersSubmenuEnter}
									onMouseLeave={handleWorkOrdersSubmenuLeave}
								>
								<NavLink
										to={workOrdersRoute}
										data-tour="nav-work-orders-list"
										className={({ isActive }) =>
											`${styles.submenuLink} ${isActive ? styles.active : ""}`
										}
										onClick={() => {
											setIsMenuOpen(false);
											setIsWorkOrdersHovered(false);
										}}
									>
										<ClipboardList size={20} />{" "}
										<span className={styles.linkText}>
											{t("nav.workOrdersList")}
										</span>
									</NavLink>
									<NavLink
										to={calendarRoute}
										data-tour="nav-calendar"
										className={({ isActive }) =>
											`${styles.submenuLink} ${isActive ? styles.active : ""}`
										}
										onClick={() => {
											setIsMenuOpen(false);
											setIsWorkOrdersHovered(false);
										}}
									>
										<Calendar size={20} />{" "}
										<span className={styles.linkText}>
											{t("nav.calendar")}
										</span>
									</NavLink>
								</div>
							</li>
						)}
						{!isSuperAdminUser && !isClientUser && (
							<li
								className={styles.menuGroup}
								onMouseEnter={handleMaintenanceMouseEnter}
								onMouseLeave={handleMaintenanceMouseLeave}
							>
								<button
									type="button"
									data-tour="nav-maintenance"
									className={`${styles.groupButton} ${isMaintenanceSectionActive ? styles.active : ""}`}
									onClick={() => toggleMenu("maintenance")}
									aria-expanded={
										isMaintenanceMenuOpen ||
										(isCollapsedDesktop && isMaintenanceHovered)
									}
								>
									<span className={styles.groupButtonContent}>
										<Cog size={20} />{" "}
										<span className={styles.linkText}>
											{t("nav.maintenance")}
										</span>
									</span>
									<ChevronDown
										size={16}
										className={`${styles.groupChevron} ${isMaintenanceMenuOpen ? styles.groupChevronOpen : ""}`}
									/>
								</button>
								<div
									className={`${styles.submenu} ${styles.resourcesSubmenu} ${isMaintenanceMenuOpen || (isCollapsedDesktop && isMaintenanceHovered) ? styles.submenuOpen : ""}`}
									onMouseEnter={handleMaintenanceSubmenuEnter}
									onMouseLeave={handleMaintenanceSubmenuLeave}
								>
									{!isTechnicianUser && !isSuperAdminUser && !isClientUser && (
										<NavLink
											to={maintenancePlanRoute}
											data-tour="nav-maintenance-plan"
											className={({ isActive }) =>
												`${styles.submenuLink} ${isActive ? styles.active : ""}`
											}
											onClick={() => {
												setIsMenuOpen(false);
												setIsMaintenanceHovered(false);
											}}
										>
											<CalendarCog size={20} />{" "}
											<span className={styles.linkText}>
												{t("nav.maintenancePlan")}
											</span>
										</NavLink>
									)}

								</div>
							</li>
						)}
						{!isSuperAdminUser && (
							<li
								className={styles.menuGroup}
								onMouseEnter={handleInstallationsMouseEnter}
								onMouseLeave={handleInstallationsMouseLeave}
							>
								<button
									type="button"
									data-tour="nav-installations"
									className={`${styles.groupButton} ${isInstallationsSectionActive ? styles.active : ""}`}
									onClick={() => toggleMenu("installations")}
									aria-expanded={
										isInstallationsMenuOpen ||
										(isCollapsedDesktop && isInstallationsHovered)
									}
								>
									<span className={styles.groupButtonContent}>
										<Building size={20} />{" "}
										<span className={styles.linkText}>
											{t("nav.installations")}
										</span>
									</span>
									<ChevronDown
										size={16}
										className={`${styles.groupChevron} ${isInstallationsMenuOpen ? styles.groupChevronOpen : ""}`}
									/>
								</button>
								<div
									className={`${styles.submenu} ${styles.resourcesSubmenu} ${isInstallationsMenuOpen || (isCollapsedDesktop && isInstallationsHovered) ? styles.submenuOpen : ""}`}
									onMouseEnter={handleInstallationsSubmenuEnter}
									onMouseLeave={handleInstallationsSubmenuLeave}
								>
									<NavLink
										to={installationsRoute}
										data-tour="nav-installations-list"
										className={({ isActive }) =>
											`${styles.submenuLink} ${isActive ? styles.active : ""}`
										}
										onClick={() => {
											setIsMenuOpen(false);
											setIsInstallationsHovered(false);
										}}
									>
										<Building size={20} />{" "}
										<span className={styles.linkText}>
											{t("nav.list")}
										</span>
									</NavLink>
									{isAdminUser && (
										<NavLink
											to={clientsRoute}
											data-tour="nav-clients"
											className={({ isActive }) =>
												`${styles.submenuLink} ${isActive ? styles.active : ""}`
											}
											onClick={() => {
												setIsMenuOpen(false);
												setIsInstallationsHovered(false);
											}}
										>
											<Users size={20} />{" "}
											<span className={styles.linkText}>
												{t("nav.clients")}
											</span>
										</NavLink>
									)}
								</div>
							</li>
						)}
						{!isTechnicianUser && !isSuperAdminUser && !isClientUser && (
							<li
								className={styles.menuGroup}
								onMouseEnter={handleAssetsMouseEnter}
								onMouseLeave={handleAssetsMouseLeave}
							>
								<button
									type="button"
									data-tour="nav-assets"
									className={`${styles.groupButton} ${isAssetsSectionActive ? styles.active : ""}`}
									onClick={() => toggleMenu("assets")}
									aria-expanded={
										isAssetsMenuOpen ||
										(isCollapsedDesktop && isAssetsHovered)
									}
								>
									<span className={styles.groupButtonContent}>
										<Package size={20} />{" "}
										<span className={styles.linkText}>
											{t("nav.assets")}
										</span>
									</span>
									<ChevronDown
										size={16}
										className={`${styles.groupChevron} ${isAssetsMenuOpen ? styles.groupChevronOpen : ""}`}
									/>
								</button>
								<div
									className={`${styles.submenu} ${styles.resourcesSubmenu} ${isAssetsMenuOpen || (isCollapsedDesktop && isAssetsHovered) ? styles.submenuOpen : ""}`}
									onMouseEnter={handleAssetsSubmenuEnter}
									onMouseLeave={handleAssetsSubmenuLeave}
								>
									<NavLink
										to={assetsRoute}
										data-tour="nav-assets-list"
										className={({ isActive }) =>
											`${styles.submenuLink} ${isActive ? styles.active : ""}`
										}
										onClick={() => {
											setIsMenuOpen(false);
											setIsAssetsHovered(false);
										}}
									>
										<Package size={20} />{" "}
										<span className={styles.linkText}>
											{t("nav.list")}
										</span>
									</NavLink>
									{isAdminUser && (
										<NavLink
											to={formsRoute}
											data-tour="nav-forms"
											className={({ isActive }) =>
												`${styles.submenuLink} ${isActive ? styles.active : ""}`
											}
											onClick={() => {
												setIsMenuOpen(false);
												setIsAssetsHovered(false);
											}}
										>
											<FileText size={20} />{" "}
											<span className={styles.linkText}>
												{t("nav.forms")}
											</span>
										</NavLink>
									)}
									<NavLink
										to={manualsRoute}
										data-tour="nav-manuals"
										className={({ isActive }) =>
											`${styles.submenuLink} ${isActive ? styles.active : ""}`
										}
										onClick={() => {
											setIsMenuOpen(false);
											setIsAssetsHovered(false);
										}}
									>
										<BookOpen size={20} />{" "}
										<span className={styles.linkText}>
											{t("nav.manuals")}
										</span>
									</NavLink>
								</div>
							</li>
						)}
						{!isSuperAdminUser && !isClientUser && (
							<li
								className={styles.menuGroup}
								onMouseEnter={handleOperationMouseEnter}
								onMouseLeave={handleOperationMouseLeave}
							>
								<button
									type="button"
									data-tour="nav-operation"
									className={`${styles.groupButton} ${isOperationSectionActive ? styles.active : ""}`}
									onClick={() => toggleMenu("operation")}
									aria-expanded={
										isOperationMenuOpen ||
										(isCollapsedDesktop && isOperationHovered)
									}
								>
									<span className={styles.groupButtonContent}>
										<Briefcase size={20} />{" "}
										<span className={styles.linkText}>
											{t("nav.operation")}
										</span>
									</span>
									<ChevronDown
										size={16}
										className={`${styles.groupChevron} ${isOperationMenuOpen ? styles.groupChevronOpen : ""}`}
									/>
								</button>
								<div
									className={`${styles.submenu} ${styles.resourcesSubmenu} ${isOperationMenuOpen || (isCollapsedDesktop && isOperationHovered) ? styles.submenuOpen : ""}`}
									onMouseEnter={handleOperationSubmenuEnter}
									onMouseLeave={handleOperationSubmenuLeave}
								>
									<NavLink
										to={inventoryRoute}
										data-tour="nav-inventory"
										className={({ isActive }) =>
											`${styles.submenuLink} ${isActive ? styles.active : ""}`
										}
										onClick={() => {
											setIsMenuOpen(false);
											setIsOperationHovered(false);
										}}
									>
										<Boxes size={20} />{" "}
										<span className={styles.linkText}>
											{t("nav.inventory")}
										</span>
									</NavLink>
									{!isTechnicianUser && !isSuperAdminUser && !isClientUser && (
										<NavLink
											to={personalRoute}
											data-tour="nav-personal"
											className={({ isActive }) =>
												`${styles.submenuLink} ${isActive ? styles.active : ""}`
											}
											onClick={() => {
												setIsMenuOpen(false);
												setIsOperationHovered(false);
											}}
										>
											<User size={20} />{" "}
											<span className={styles.linkText}>
												{t("nav.personal")}
											</span>
										</NavLink>
									)}
									{isAdminUser && (
										<NavLink
											to={suppliersRoute}
											data-tour="nav-suppliers"
											className={({ isActive }) =>
												`${styles.submenuLink} ${isActive ? styles.active : ""}`
											}
											onClick={() => {
												setIsMenuOpen(false);
												setIsOperationHovered(false);
											}}
										>
											<Truck size={20} />{" "}
											<span className={styles.linkText}>
												{t("nav.suppliers")}
											</span>
										</NavLink>
									)}
								</div>
							</li>
						)}
						{/* Panel Admin solo para super_admin */}
						{isSuperAdminUser && (
							<li>
								<NavLink
									to={panelAdminRoute}
									className={({ isActive }) => (isActive ? styles.active : "")}
									onClick={() => setIsMenuOpen(false)}
								>
									<Settings size={20} />{" "}
									<span className={styles.linkText}>Panel Admin</span>
								</NavLink>
							</li>
						)}
						{/* Cumplimiento para admin y técnicos */}
					{!isSuperAdminUser && !isClientUser && (
						<li>
							<NavLink
								to={complianceRoute}
								data-tour="nav-compliance"
								className={({ isActive }) =>
									isActive ? styles.active : ""
								}
								onClick={() => setIsMenuOpen(false)}
							>
								<ClipboardCheck size={20} />{" "}
								<span className={styles.linkText}>
									{t("nav.compliance")}
								</span>
							</NavLink>
						</li>
					)}
						{isAdminUser && (
							<li data-tour="open-settings">
								<NavLink
									to={settingsRoute}
									className={({ isActive }) => (isActive ? styles.active : "")}
									onClick={() => setIsMenuOpen(false)}
								>
									<Settings size={20} />{" "}
									<span className={styles.linkText}>{t("settings.title")}</span>
								</NavLink>
							</li>
						)}
					{/* Auditoría oculta para todos los usuarios - solo accesible por ruta directa si es necesario */}
					</ul>
					<div className={styles.bottomSection}>
						<div className={styles.userSection}>
							{user && (
								<div className={styles.userInfo}>
									<div
										className={styles.userAvatar}
										onClick={() => {
											if (!isClientUser && !isAdminUser) {
												setIsMenuOpen(false);
												navigate(profileRoute);
											}
										}}
										style={{
											cursor:
												isClientUser || isAdminUser ? "default" : "pointer",
										}}
										title={
											!isClientUser && !isAdminUser
												? t("common.viewProfile") || "Ver perfil"
												: undefined
										}
									>
										{user.substring(0, 2).toUpperCase()}
									</div>
									<div className={styles.userDetails}>
										<span
											className={styles.userName}
											title={user}
											onClick={() => {
												if (!isClientUser && !isAdminUser) {
													setIsMenuOpen(false);
													navigate(profileRoute);
												}
											}}
											style={{
												cursor:
													isClientUser || isAdminUser ? "default" : "pointer",
											}}
										>
											{user}
										</span>
										<span className={styles.userRole}>
												{isSuperAdminUser
													? t("roles.superAdmin")
													: isAdminUser
														? t("roles.admin")
														: isTechnicianUser
															? t("roles.technician")
															: isClientUser
																? t("roles.client")
																: t("roles.user")}
										</span>
									</div>
									<button
										type="button"
										className={styles.logoutButton}
										onClick={handleLogout}
										title={t("nav.logout")}
									>
										<LogOut size={18} />
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</nav>
		</>
	);
};

export default Nav;
