import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
	Settings,
	ChevronsLeft,
	ChevronsRight,
	ChevronDown,
	Boxes,
	Shield,
	Wrench,
	Briefcase,
	Cog,
	CalendarCog,
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
import { useCSRFStore } from "../../../store/csrfStore";
import { getRouteMenuOpenState } from "./navRouteState";

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
	const settingsRoute = getRoute("settings");
	const auditRoute = getRoute("audit");
	const currentRouteMenuState = getRouteMenuOpenState(location.pathname, {
		workOrders: [workOrdersRoute, calendarRoute],
		maintenance: [maintenancePlanRoute],
		operation: [inventoryRoute, personalRoute, suppliersRoute],
	});
	const {
		workOrders: isWorkOrdersSectionActive,
		maintenance: isMaintenanceSectionActive,
		operation: isOperationSectionActive,
	} = currentRouteMenuState;
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isWorkOrdersMenuOpen, setIsWorkOrdersMenuOpen] = useState(
		() => isWorkOrdersSectionActive,
	);
	const [isWorkOrdersHovered, setIsWorkOrdersHovered] = useState(false);
	const [isOperationMenuOpen, setIsOperationMenuOpen] = useState(
		() => isOperationSectionActive,
	);
	const [isOperationHovered, setIsOperationHovered] = useState(false);
	const [isMaintenanceMenuOpen, setIsMaintenanceMenuOpen] = useState(
		() => isMaintenanceSectionActive,
	);
	const [isMaintenanceHovered, setIsMaintenanceHovered] = useState(false);

	useEffect(() => {
		if (isMenuOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
	}, [isMenuOpen]);

	useEffect(() => {
		setIsWorkOrdersMenuOpen(isWorkOrdersSectionActive);
		setIsOperationMenuOpen(isOperationSectionActive);
		setIsMaintenanceMenuOpen(isMaintenanceSectionActive);
	}, [
		isWorkOrdersSectionActive,
		isOperationSectionActive,
		isMaintenanceSectionActive,
	]);

	useEffect(() => {
		if (isSidebarCollapsed) {
			setIsWorkOrdersMenuOpen(false);
			setIsOperationMenuOpen(false);
			setIsMaintenanceMenuOpen(false);
		}
	}, [isSidebarCollapsed]);

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
		setIsWorkOrdersHovered(false);
		setIsOperationHovered(false);
		setIsMaintenanceHovered(false);
	}, [location.pathname]);

	const handleLogout = () => {
		setLogoutMessage("Sesión cerrada con éxito.");
		const csrfToken = useCSRFStore.getState().token;

		logoutSession(csrfToken)
			.catch(() => null)
			.finally(() => {
				logout();
				navigate("/", { replace: true });
				setIsMenuOpen(false);
			});
	};

	const handleWorkOrdersMouseEnter = () => {
		if (isSidebarCollapsed) {
			if (workOrdersTimeoutRef.current) {
				clearTimeout(workOrdersTimeoutRef.current);
			}
			setIsWorkOrdersHovered(true);
		}
	};

	const handleWorkOrdersMouseLeave = () => {
		if (isSidebarCollapsed) {
			workOrdersTimeoutRef.current = setTimeout(() => {
				setIsWorkOrdersHovered(false);
			}, 300);
		}
	};

	const handleWorkOrdersSubmenuEnter = () => {
		if (isSidebarCollapsed && workOrdersTimeoutRef.current) {
			clearTimeout(workOrdersTimeoutRef.current);
			setIsWorkOrdersHovered(true);
		}
	};

	const handleWorkOrdersSubmenuLeave = () => {
		if (isSidebarCollapsed) {
			workOrdersTimeoutRef.current = setTimeout(() => {
				setIsWorkOrdersHovered(false);
			}, 300);
		}
	};

	const handleOperationMouseEnter = () => {
		if (isSidebarCollapsed) {
			if (operationTimeoutRef.current) {
				clearTimeout(operationTimeoutRef.current);
			}
			setIsOperationHovered(true);
		}
	};

	const handleOperationMouseLeave = () => {
		if (isSidebarCollapsed) {
			operationTimeoutRef.current = setTimeout(() => {
				setIsOperationHovered(false);
			}, 300);
		}
	};

	const handleOperationSubmenuEnter = () => {
		if (isSidebarCollapsed && operationTimeoutRef.current) {
			clearTimeout(operationTimeoutRef.current);
			setIsOperationHovered(true);
		}
	};

	const handleOperationSubmenuLeave = () => {
		if (isSidebarCollapsed) {
			operationTimeoutRef.current = setTimeout(() => {
				setIsOperationHovered(false);
			}, 300);
		}
	};

	const handleMaintenanceMouseEnter = () => {
		if (isSidebarCollapsed) {
			if (maintenanceTimeoutRef.current) {
				clearTimeout(maintenanceTimeoutRef.current);
			}
			setIsMaintenanceHovered(true);
		}
	};

	const handleMaintenanceMouseLeave = () => {
		if (isSidebarCollapsed) {
			maintenanceTimeoutRef.current = setTimeout(() => {
				setIsMaintenanceHovered(false);
			}, 300);
		}
	};

	const handleMaintenanceSubmenuEnter = () => {
		if (isSidebarCollapsed && maintenanceTimeoutRef.current) {
			clearTimeout(maintenanceTimeoutRef.current);
			setIsMaintenanceHovered(true);
		}
	};

	const handleMaintenanceSubmenuLeave = () => {
		if (isSidebarCollapsed) {
			maintenanceTimeoutRef.current = setTimeout(() => {
				setIsMaintenanceHovered(false);
			}, 300);
		}
	};

	return (
		<>
			<button
				className={`${styles.menuToggle} ${isMenuOpen ? styles.menuToggleOpen : ""}`}
				onClick={() => setIsMenuOpen((prev) => !prev)}
				aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
			>
				{isMenuOpen ? <X size={20} /> : <Menu size={20} />}
			</button>

			<nav
				className={`${styles.nav} ${isMenuOpen ? styles.open : ""} ${isSidebarCollapsed ? styles.collapsed : ""}`}
			>
				<button
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
						{!isSuperAdminUser && !isClientUser && (
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
						{!isSuperAdminUser && !isClientUser && (
							<li
								className={styles.menuGroup}
								onMouseEnter={handleWorkOrdersMouseEnter}
								onMouseLeave={handleWorkOrdersMouseLeave}
							>
								<button
									type="button"
									data-tour="nav-work-orders"
									className={`${styles.groupButton} ${isWorkOrdersSectionActive ? styles.active : ""}`}
									onClick={() => setIsWorkOrdersMenuOpen((prev) => !prev)}
									aria-expanded={
										isWorkOrdersMenuOpen ||
										(isSidebarCollapsed && isWorkOrdersHovered)
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
									className={`${styles.submenu} ${isWorkOrdersMenuOpen || (isSidebarCollapsed && isWorkOrdersHovered) ? styles.submenuOpen : ""}`}
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
								</div>
							</li>
						)}
						{!isTechnicianUser && !isSuperAdminUser && !isClientUser && (
							<li
								className={styles.menuGroup}
								onMouseEnter={handleMaintenanceMouseEnter}
								onMouseLeave={handleMaintenanceMouseLeave}
							>
								<button
									type="button"
									data-tour="nav-maintenance"
									className={`${styles.groupButton} ${isMaintenanceSectionActive ? styles.active : ""}`}
									onClick={() => setIsMaintenanceMenuOpen((prev) => !prev)}
									aria-expanded={
										isMaintenanceMenuOpen ||
										(isSidebarCollapsed && isMaintenanceHovered)
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
									className={`${styles.submenu} ${isMaintenanceMenuOpen || (isSidebarCollapsed && isMaintenanceHovered) ? styles.submenuOpen : ""}`}
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
							<li data-tour="nav-installations">
								<NavLink
									to={installationsRoute}
									className={({ isActive }) => (isActive ? styles.active : "")}
									onClick={() => setIsMenuOpen(false)}
								>
									<Building size={20} />{" "}
									<span className={styles.linkText}>
										{t("nav.installations")}
									</span>
								</NavLink>
							</li>
						)}
						{!isTechnicianUser && !isSuperAdminUser && !isClientUser && (
							<li data-tour="nav-assets">
								<NavLink
									to={assetsRoute}
									className={({ isActive }) => (isActive ? styles.active : "")}
									onClick={() => setIsMenuOpen(false)}
								>
									<Package size={20} />{" "}
									<span className={styles.linkText}>{t("nav.assets")}</span>
								</NavLink>
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
									onClick={() => setIsOperationMenuOpen((prev) => !prev)}
									aria-expanded={
										isOperationMenuOpen ||
										(isSidebarCollapsed && isOperationHovered)
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
									className={`${styles.submenu} ${isOperationMenuOpen || (isSidebarCollapsed && isOperationHovered) ? styles.submenuOpen : ""}`}
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
						{/* Panel Admin solo para super_admin */}
						{isSuperAdminUser && (
							<li>
								<NavLink
									to="/panel-admin"
									className={({ isActive }) => (isActive ? styles.active : "")}
									onClick={() => setIsMenuOpen(false)}
								>
									<Settings size={20} />{" "}
									<span className={styles.linkText}>Panel Admin</span>
								</NavLink>
							</li>
						)}
						{/* Auditoría para admin y super_admin */}
						{(isAdminUser || isSuperAdminUser) && (
							<li>
								<NavLink
									to={auditRoute}
									className={({ isActive }) => (isActive ? styles.active : "")}
									onClick={() => setIsMenuOpen(false)}
								>
									<Shield size={20} />{" "}
									<span className={styles.linkText}>{t("nav.audit")}</span>
								</NavLink>
							</li>
						)}
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
												navigate("/perfil");
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
											onClick={() => {
												if (!isClientUser && !isAdminUser) {
													setIsMenuOpen(false);
													navigate("/perfil");
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
										</span>
									</div>
									<button
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
