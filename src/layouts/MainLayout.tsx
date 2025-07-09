import { Outlet } from "react-router-dom"
import Nav from "../shared/components/Nav/Nav"
import Footer from "../shared/components/Footer"
import styles from "./MainLayout.module.css"
import { ThemeProvider } from "../shared/hooks/useTheme"

const MainLayout = () => {
  return (
    <ThemeProvider>
      <div className={styles.layoutContainer}>
        <Nav />
        <div className={styles.contentArea}>
          <main>
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </ThemeProvider>
  )
}

export default MainLayout
