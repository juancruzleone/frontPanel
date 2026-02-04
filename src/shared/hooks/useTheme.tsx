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
      document.body.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      document.body.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
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