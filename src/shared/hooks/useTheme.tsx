import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

// Tipos para el contexto
interface ThemeContextType {
  dark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [dark, setDark] = useState(() => {
    // Lee de localStorage o del sistema
    const stored = localStorage.getItem("theme");
    if (stored === "dark") return true;
    if (stored === "light") return false;
    // Si no hay preferencia, usa el sistema
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const [isInitialized, setIsInitialized] = useState(false);

  const applyTheme = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
      
      // Aplicar variables CSS para modo oscuro
      document.documentElement.style.setProperty('--color-bg', '#121212');
      document.documentElement.style.setProperty('--color-bg-light', '#23272b');
      document.documentElement.style.setProperty('--color-text', '#f5f5f5');
      document.documentElement.style.setProperty('--color-card', '#23272b');
      document.documentElement.style.setProperty('--color-card-border', '#333');
      document.documentElement.style.setProperty('--color-skeleton', '#23272b');
      document.documentElement.style.setProperty('--color-skeleton-light', '#333');
      document.documentElement.style.setProperty('--color-icon', '#f5f5f5');
      document.documentElement.style.setProperty('--color-themebox-bg', '#23272b');
      document.documentElement.style.setProperty('--color-themebox-border', '#333');
      document.documentElement.style.setProperty('--color-primary', '#1976d2');
      document.documentElement.style.setProperty('--color-primary-dark', '#1565c0');
      document.documentElement.style.setProperty('--color-primary-light', 'rgba(25, 118, 210, 0.1)');
      document.documentElement.style.setProperty('--color-secondary', '#057E74');
      document.documentElement.style.setProperty('--color-accent', '#fbc02d');
      document.documentElement.style.setProperty('--color-success', '#388e3c');
      document.documentElement.style.setProperty('--color-danger', '#e53935');
      document.documentElement.style.setProperty('--color-danger-light', '#ffebee');
      document.documentElement.style.setProperty('--color-danger-border', '#ffcdd2');
      document.documentElement.style.setProperty('--color-text-secondary', '#9e9e9e');
      document.documentElement.style.setProperty('--color-nav', '#034F49');
      document.documentElement.style.setProperty('--color-nav-active', '#057E74');
      document.documentElement.style.setProperty('--color-nav-hover', '#057E74');
      document.documentElement.style.setProperty('--color-nav-logout', '#b30010');
      document.documentElement.style.setProperty('--color-nav-logout-hover', '#d40012');
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
      
      // Aplicar variables CSS para modo claro
      document.documentElement.style.setProperty('--color-bg', '#D1D1D1');
      document.documentElement.style.setProperty('--color-bg-light', '#f7f7f7');
      document.documentElement.style.setProperty('--color-text', '#111');
      document.documentElement.style.setProperty('--color-card', '#fff');
      document.documentElement.style.setProperty('--color-card-border', '#e0e0e0');
      document.documentElement.style.setProperty('--color-skeleton', '#a0a0a0');
      document.documentElement.style.setProperty('--color-skeleton-light', '#909090');
      document.documentElement.style.setProperty('--color-icon', '#111');
      document.documentElement.style.setProperty('--color-themebox-bg', '#f0f0f0');
      document.documentElement.style.setProperty('--color-themebox-border', '#e0e0e0');
      document.documentElement.style.setProperty('--color-primary', '#1976d2');
      document.documentElement.style.setProperty('--color-primary-dark', '#1565c0');
      document.documentElement.style.setProperty('--color-primary-light', 'rgba(25, 118, 210, 0.1)');
      document.documentElement.style.setProperty('--color-secondary', '#057E74');
      document.documentElement.style.setProperty('--color-accent', '#fbc02d');
      document.documentElement.style.setProperty('--color-success', '#388e3c');
      document.documentElement.style.setProperty('--color-danger', '#e53935');
      document.documentElement.style.setProperty('--color-danger-light', '#ffebee');
      document.documentElement.style.setProperty('--color-danger-border', '#ffcdd2');
      document.documentElement.style.setProperty('--color-text-secondary', '#9e9e9e');
      document.documentElement.style.setProperty('--color-nav', '#034F49');
      document.documentElement.style.setProperty('--color-nav-active', '#057E74');
      document.documentElement.style.setProperty('--color-nav-hover', '#057E74');
      document.documentElement.style.setProperty('--color-nav-logout', '#d40012');
      document.documentElement.style.setProperty('--color-nav-logout-hover', '#b30010');
    }
  };

  useEffect(() => {
    // Solo aplicar el tema si no se ha aplicado desde el script del HTML
    if (!isInitialized) {
      setIsInitialized(true);
      return;
    }

    applyTheme(dark);
  }, [dark, isInitialized]);

  const toggleTheme = () => setDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ dark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return context;
}; 