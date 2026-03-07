import React, { createContext, useContext, useLayoutEffect, useState, ReactNode } from "react";

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
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.classList.add("dark");
      document.body.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      document.body.classList.remove("dark");
      document.body.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
      document.documentElement.style.colorScheme = "light";
    }
  };

  useLayoutEffect(() => {
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
