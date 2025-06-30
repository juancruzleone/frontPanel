"use client"

import { NavLink, useNavigate } from "react-router-dom"
import { useAuthStore } from "../../../store/authStore"
import { LogOut, Home, Package, FileText, BookOpen, ClipboardList, Calendar } from "lucide-react"
import styles from "./Nav.module.css"

const Nav = () => {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const setLogoutMessage = useAuthStore((s) => s.setLogoutMessage)
  const navigate = useNavigate()

  const handleLogout = () => {
    setLogoutMessage("Sesión cerrada con éxito.")
    logout()
    navigate("/", { replace: true })
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.logoArea}>
        {/* Acá podés poner tu logo */}
        <h2 className={styles.logo}> {/*LeoneSuite*/}</h2>
      </div>

      <ul className={styles.menu}>
        <li>
          <NavLink to="/instalaciones" className={({ isActive }) => (isActive ? styles.active : "")}>
            <Home size={20} /> Instalaciones
          </NavLink>
        </li>

        <li>
          <NavLink to="/activos" className={({ isActive }) => (isActive ? styles.active : "")}>
            <Package size={20} /> Activos
          </NavLink>
        </li>

        <li>
          <NavLink to="/formularios" className={({ isActive }) => (isActive ? styles.active : "")}>
            <FileText size={20} /> Formularios
          </NavLink>
        </li>

        <li>
          <NavLink to="/manuales" className={({ isActive }) => (isActive ? styles.active : "")}>
            <BookOpen size={20} /> Manuales
          </NavLink>
        </li>

        <li>
          <NavLink to="/ordenes-trabajo" className={({ isActive }) => (isActive ? styles.active : "")}>
            <ClipboardList size={20} /> Órdenes de trabajo
          </NavLink>
        </li>

        <li>
          <NavLink to="/calendario" className={({ isActive }) => (isActive ? styles.active : "")}>
            <Calendar size={20} /> Calendario
          </NavLink>
        </li>
      </ul>

      <div className={styles.userSection}>
        {user && (
          <button className={styles.logoutButton} onClick={handleLogout}>
            <LogOut size={18} /> Cerrar sesión
          </button>
        )}
      </div>
    </nav>
  )
}

export default Nav
