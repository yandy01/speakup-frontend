import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Bot, Dumbbell, Home, LogOut, Menu, Moon, ScrollText, Sun, UserRound, X, BarChart3 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Brand } from './Brand';

const navItems = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/exercises', label: 'Exercices', icon: Dumbbell },
  { to: '/coach', label: 'Coach IA', icon: Bot },
  { to: '/reading', label: 'Téléprompteur', icon: ScrollText },
  { to: '/profile', label: 'Profil', icon: UserRound },
];

const pageNames: Record<string, string> = {
  '/': 'Accueil', '/coach': 'Coach IA', '/exercises': 'Mes exercices',
  '/reading': 'Téléprompteur', '/progress': 'Ma progression',
  '/profile': 'Mon profil', '/challenge': 'Défi oral',
};

export function AppShell() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => localStorage.getItem('eloqia-theme') === 'dark' ? 'dark' : 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('eloqia-theme', theme);
  }, [theme]);
  useEffect(() => setMobileMenu(false), [location.pathname]);

  const title = useMemo(() => pageNames[location.pathname] ?? 'Eloquia', [location.pathname]);
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Orateur';
  const initials = String(displayName).trim().slice(0, 2).toUpperCase();

  return <div className="app-shell eloqia-app-shell">
    {mobileMenu && <button className="mobile-scrim" aria-label="Fermer le menu" onClick={() => setMobileMenu(false)} />}
    <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
      <div className="sidebar-top"><Brand /><button className="icon-button mobile-close" onClick={() => setMobileMenu(false)} aria-label="Fermer"><X size={19} /></button></div>
      <div className="workspace-label">VOTRE ESPACE</div>
      <nav className="side-nav" aria-label="Navigation principale">
        {navItems.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Icon size={20} strokeWidth={1.9} /><span>{label}</span>
        </NavLink>)}
      </nav>
      <div className="sidebar-spacer" />
      <NavLink to="/progress" className={({ isActive }) => `nav-link secondary-nav ${isActive ? 'active' : ''}`}><BarChart3 size={19} /><span>Ma progression</span></NavLink>
      <div className="sidebar-footer"><span className="footer-dot" /> Eloquia · Français</div>
    </aside>

    <main className="main-area">
      <header className="topbar eloqia-topbar">
        <div className="topbar-left">
          <button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(true)} aria-label="Ouvrir le menu"><Menu size={20} /></button>
          <div className="topbar-mobile-brand"><Brand compact /></div>
          <div className="topbar-desktop-title"><span className="eyebrow">VOTRE ESPACE</span><h1>{title}</h1></div>
        </div>
        <div className="topbar-actions">
          <button className="icon-button theme-toggle" onClick={() => setTheme(value => value === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'} title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}>
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button className="user-chip" onClick={() => navigate('/profile')} aria-label="Ouvrir mon profil"><span className="avatar">{initials}</span><span className="user-chip-name">{displayName}</span></button>
          <button className="icon-button desktop-signout" title="Se déconnecter" aria-label="Se déconnecter" onClick={() => void signOut()}><LogOut size={18} /></button>
        </div>
      </header>
      <div className="page-content"><Outlet /></div>
      <footer className="app-footer"><span>© {new Date().getFullYear()} Eloquia</span><span>L’art de mieux s’exprimer.</span><button onClick={() => navigate('/profile')}><UserRound size={14} /> Paramètres</button></footer>
    </main>

    <nav className="mobile-bottom-nav" aria-label="Navigation principale">
      {navItems.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <Icon size={22} strokeWidth={1.9} /><span>{label}</span>
      </NavLink>)}
    </nav>
  </div>;
}
