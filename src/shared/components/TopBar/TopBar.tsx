import React, { useState, useRef, useEffect } from 'react';
import { Bell, Settings, Search, Menu, X, Check, Trash2, Clock, Sun, Moon, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../../store/notificationStore';
import { useAuthStore } from '../../../store/authStore';
import { useLayoutStore } from '../../../store/layoutStore';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import styles from './TopBar.module.css';

import esFlag from '../../../../src/assets/flags/es.svg'
import frFlag from '../../../../src/assets/flags/fr.svg'
import usFlag from '../../../../src/assets/flags/us.svg'
import deFlag from '../../../../src/assets/flags/de.svg'
import jpFlag from '../../../../src/assets/flags/jp.svg'
import krFlag from '../../../../src/assets/flags/kr.svg'
import saFlag from '../../../../src/assets/flags/sa.svg'
import brFlag from '../../../../src/assets/flags/br.svg'
import cnFlag from '../../../../src/assets/flags/cn.svg'
import itFlag from '../../../../src/assets/flags/it.svg'

const flagMap: Record<string, string> = {
    es: esFlag,
    fr: frFlag,
    en: usFlag,
    us: usFlag,
    de: deFlag,
    it: itFlag,
    ja: jpFlag,
    jp: jpFlag,
    ko: krFlag,
    kr: krFlag,
    ar: saFlag,
    pt: brFlag,
    br: brFlag,
    zh: cnFlag,
    cn: cnFlag,
}

const TopBar: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotificationStore();
    const { isSidebarCollapsed } = useLayoutStore();
    const { dark, toggleTheme } = useTheme();
    const user = useAuthStore((s) => s.user);

    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);

    const notifRef = useRef<HTMLDivElement>(null);
    const langRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
            if (langRef.current && !langRef.current.contains(event.target as Node)) {
                setIsLangOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const languages = [
        { code: 'es', name: t('languageSelector.spanish'), flag: '🇪🇸' },
        { code: 'en', name: t('languageSelector.english'), flag: '🇺🇸' },
        { code: 'fr', name: t('languageSelector.french'), flag: '🇫🇷' },
        { code: 'pt', name: t('languageSelector.portuguese'), flag: '🇵🇹' },
        { code: 'de', name: t('languageSelector.german'), flag: '🇩🇪' },
        { code: 'it', name: t('languageSelector.italian'), flag: '🇮🇹' },
        { code: 'ja', name: t('languageSelector.japanese'), flag: '🇯🇵' },
        { code: 'ko', name: t('languageSelector.korean'), flag: '🇰🇷' },
        { code: 'zh', name: t('languageSelector.chinese'), flag: '🇨🇳' },
        { code: 'ar', name: t('languageSelector.arabic'), flag: '🇸🇦' }
    ]

    const currentLangCode = (i18n.resolvedLanguage || i18n.language || 'es').split('-')[0]
    const currentFlag = flagMap[currentLangCode] || esFlag

    const handleLanguageChange = (languageCode: string) => {
        i18n.changeLanguage(languageCode)
        setIsLangOpen(false)
    }

    const formatTime = (date: Date) => {
        try {
            const now = new Date();
            const diffInMinutes = Math.floor((date.getTime() - now.getTime()) / (1000 * 60));
            return new Intl.RelativeTimeFormat(currentLangCode, { numeric: 'auto' }).format(diffInMinutes, 'minute');
        } catch {
            return t('notifications.justNow');
        }
    };

    return (
        <header className={`${styles.topBar} ${isSidebarCollapsed ? styles.expanded : ''}`}>
            <div className={styles.topBarContainer}>
                <div className={styles.actions}>
                    <div className={styles.langContainer} ref={langRef}>
                        <button
                            className={styles.actionButton}
                            onClick={() => setIsLangOpen(!isLangOpen)}
                            aria-label="Idioma"
                        >
                            <img src={currentFlag} alt={i18n.language} className={styles.flagImg} />
                        </button>
                        {isLangOpen && (
                            <div className={styles.langDropdown}>
                                {languages.map((language) => (
                                    <button
                                        key={language.code}
                                        className={`${styles.langOption} ${currentLangCode === language.code ? styles.activeLang : ''}`}
                                        onClick={() => handleLanguageChange(language.code)}
                                    >
                                        <img src={flagMap[language.code] || esFlag} alt={language.code} className={styles.flagImgSmall} />
                                        <span>{language.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        className={styles.actionButton}
                        onClick={toggleTheme}
                        aria-label="Cambiar tema"
                    >
                        {dark ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    <div className={styles.notificationsContainer} ref={notifRef}>
                        <button
                            className={styles.actionButton}
                            onClick={() => setIsNotifOpen(!isNotifOpen)}
                            aria-label="Notificaciones"
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
                        </button>

                        {isNotifOpen && (
                            <div className={styles.dropdown}>
                                <div className={styles.dropdownHeader}>
                                    <h3>{t('notifications.title') || 'Notificaciones'}</h3>
                                    <div className={styles.headerActions}>
                                        <button onClick={markAllAsRead} title={t('notifications.markAllAsRead')}>
                                            <Check size={16} />
                                        </button>
                                        <button onClick={clearNotifications} title={t('notifications.clearAll')}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className={styles.notificationsList}>
                                    {notifications.length === 0 ? (
                                        <div className={styles.emptyState}>
                                            <Bell size={40} className={styles.emptyIcon} />
                                            <p>{t('notifications.empty')}</p>
                                        </div>
                                    ) : (
                                        notifications.map((notif) => (
                                            <div
                                                key={notif.id}
                                                className={`${styles.notificationItem} ${!notif.read ? styles.unread : ''}`}
                                                onClick={() => markAsRead(notif.id)}
                                            >
                                                <div className={styles.notifContent}>
                                                    <h4 className={styles.notifTitle}>{notif.title}</h4>
                                                    <p className={styles.notifMessage}>{notif.message}</p>
                                                    <span className={styles.notifTime}>
                                                        <Clock size={12} /> {formatTime(new Date(notif.date))}
                                                    </span>
                                                </div>
                                                {!notif.read && <div className={styles.unreadIndicator} />}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        className={styles.actionButton}
                        aria-label="Configuración"
                        onClick={() => navigate('/configuracion')}
                        data-tour="open-settings"
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default TopBar;
