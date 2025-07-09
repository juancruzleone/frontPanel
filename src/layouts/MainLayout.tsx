import { Outlet } from "react-router-dom"
import Nav from "../shared/components/Nav/Nav"
import Footer from "../shared/components/Footer"
import styles from "./MainLayout.module.css"

const MainLayout = () => {
  return (
    <div className={styles.layoutContainer}>
      <Nav />
      <div className={styles.contentArea}>
        <main>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}

export default MainLayout
