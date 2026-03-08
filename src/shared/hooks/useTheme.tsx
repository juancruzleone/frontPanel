import React, { createContext, useContext, useLayoutEffect, useRef, useState, ReactNode } from "react";

interface ThemeContextType {
  dark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const transitionTimeoutRef = useRef<number | null>(null);
  const isFirstRender = useRef(true);

  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const nextTheme = dark ? "dark" : "light";

    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
      root.classList.remove("theme-transition");
      body.classList.remove("theme-transition");
      root.classList.remove("theme-syncing");
      body.classList.remove("theme-syncing");
    }

    if (!isFirstRender.current) {
      root.classList.add("theme-transition");
      body.classList.add("theme-transition");
    }

    if (dark) {
      root.classList.add("dark");
      body.classList.add("dark");
    } else {
      root.classList.remove("dark");
      body.classList.remove("dark");
    }

    root.setAttribute("data-theme", nextTheme);
    body.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
    root.style.colorScheme = nextTheme;

    if (!isFirstRender.current) {
      void root.offsetHeight;
      void body.offsetHeight;
    }

    isFirstRender.current = false;

    transitionTimeoutRef.current = window.setTimeout(() => {
      root.classList.remove("theme-transition");
      body.classList.remove("theme-transition");
      root.classList.remove("theme-syncing");
      body.classList.remove("theme-syncing");
      transitionTimeoutRef.current = null;
    }, 500);
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
