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

  const applyTheme = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      document.body.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
      
      // Aplicar variables CSS para modo oscuro
      document.documentElement.style.setProperty('--color-bg', '#121212');
      document.documentElement.style.setProperty('--color-bg-light', '#23272b');
      document.documentElement.style.setProperty('--color-text', '#f5f5f5');
      document.documentElement.style.setProperty('--color-text-secondary', '#b0b0b0');
      document.documentElement.style.setProperty('--color-card', '#23272b');
      document.documentElement.style.setProperty('--color-card-border', '#333');
      document.documentElement.style.setProperty('--color-skeleton', '#23272b');
      document.documentElement.style.setProperty('--color-skeleton-light', '#333');
      document.documentElement.style.setProperty('--color-icon', '#f5f5f5');
      document.documentElement.style.setProperty('--color-themebox-bg', '#23272b');
      document.documentElement.style.setProperty('--color-themebox-border', '#333');
      document.documentElement.style.setProperty('--color-primary', '#fff');
      document.documentElement.style.setProperty('--color-primary-hover', '#e0e0e0');
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      document.body.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
      
      // Aplicar variables CSS para modo claro
      document.documentElement.style.setProperty('--color-bg', '#D1D1D1');
      document.documentElement.style.setProperty('--color-bg-light', '#f7f7f7');
      document.documentElement.style.setProperty('--color-text', '#000');
      document.documentElement.style.setProperty('--color-text-secondary', '#666');
      document.documentElement.style.setProperty('--color-card', '#fff');
      document.documentElement.style.setProperty('--color-card-border', '#e0e0e0');
      document.documentElement.style.setProperty('--color-skeleton', '#a0a0a0');
      document.documentElement.style.setProperty('--color-skeleton-light', '#909090');
      document.documentElement.style.setProperty('--color-icon', '#000');
      document.documentElement.style.setProperty('--color-themebox-bg', '#f0f0f0');
      document.documentElement.style.setProperty('--color-themebox-border', '#e0e0e0');
      document.documentElement.style.setProperty('--color-primary', '#000');
      document.documentElement.style.setProperty('--color-primary-hover', '#333');
    }
  };

  useEffect(() => {
    applyTheme(dark);
  }, [dark]);

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