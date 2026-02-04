import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useCallback } from 'react';
import { routeTranslations, type RouteKey, type Language } from './routeTranslations';

/**
 * Hook para manejar rutas traducidas dinámicamente
 */
export const useTranslatedRoutes = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const currentLang = i18n.language.split('-')[0] as Language;

  /**
   * Obtiene la ruta traducida para un key específico
   */
  const getRoute = useCallback((key: RouteKey, params?: Record<string, string>): string => {
    const lang = i18n.language.split('-')[0] as Language;
    const translations = routeTranslations[lang] || routeTranslations.es;
    let route = `/${translations[key]}`;

    // Reemplazar parámetros si existen
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        route += `/${paramValue}`;
      });
    }

    return route;
  }, [i18n.language]);

  /**
   * Navega a una ruta traducida
   */
  const navigateToRoute = useCallback((key: RouteKey, params?: Record<string, string>) => {
    const route = getRoute(key, params);
    navigate(route);
  }, [getRoute, navigate]);

  /**
   * Obtiene el key de ruta desde una URL traducida
   */
  const getRouteKeyFromPath = useCallback((path: string): RouteKey | null => {
    const pathSegment = path.split('/')[1]; // Obtener el primer segmento
    
    // Buscar en todas las traducciones
    for (const [key, value] of Object.entries(routeTranslations[currentLang])) {
      if (value === pathSegment) {
        return key as RouteKey;
      }
    }
    
    return null;
  }, [currentLang]);

  /**
   * Actualiza la URL cuando cambia el idioma
   */
  useEffect(() => {
    const currentPath = location.pathname;
    const pathSegments = currentPath.split('/').filter(Boolean);
    
    if (pathSegments.length === 0) return;

    // Buscar el key de la ruta actual en cualquier idioma
    let routeKey: RouteKey | null = null;
    let params: string[] = [];

    for (const lang of Object.keys(routeTranslations) as Language[]) {
      const translations = routeTranslations[lang];
      for (const [key, value] of Object.entries(translations)) {
        if (pathSegments[0] === value) {
          routeKey = key as RouteKey;
          params = pathSegments.slice(1);
          break;
        }
      }
      if (routeKey) break;
    }

    if (routeKey) {
      const newTranslations = routeTranslations[currentLang];
      const newPath = `/${newTranslations[routeKey]}${params.length > 0 ? '/' + params.join('/') : ''}`;
      
      // Solo navegar si la ruta cambió
      if (newPath !== currentPath) {
        navigate(newPath, { replace: true });
      }
    }
  }, [currentLang, location.pathname, navigate]);

  return {
    getRoute,
    navigateToRoute,
    getRouteKeyFromPath,
    currentLang,
  };
};
