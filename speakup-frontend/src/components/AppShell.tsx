import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, BarChart3, ChevronDown, CircleHelp, Crown, Home, MessageCircle, Settings, UserRound, LogOut, Menu, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Brand } from './Brand';

const navItems = [
  { to: '/', label: 'Vue d’ensemble', icon: Home, end: true },
  { to: '/coach', label: 'Coach IA', icon: MessageCircle },
  { to: '/exercises', label: 'Exercices', icon: BookOpen },
  { to: '/progress', label: 'Progression', icon: BarChart3 },
  { to: '/profile', label: 'Mon profil', icon: UserRound },
];

const pageNames: Record<string, string> = {
  '/': 'Vue d’ensemble', '/coach': 'Coach IA', '/exercises': 'Bibliothèque d’exercices', '/progress': 'Ma progression', '/profile': 'Mon profil',
};

export function AppShell() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenu, setMobileMenu] = useState(false);
  const title = useMemo(() => pageNames[location.pathname] ?? 'SpeakUp AI', [location.pathname]);
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Apprenant';
  const initials = String(displayName).trim().slice(0, 2).toUpperCase();

  return (
    <div className="app-shell">
      {mobileMenu && <button className="mobile-scrim" aria-label="Fermer le menu" onClick={() => setMobileMenu(false)} />}
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top"><Brand /><button className="icon-button mobile-close" onClick={() => setMobileMenu(false)} aria-label="Fermer"><X size={19} /></button></div>
        <div className="workspace-label">ESPACE PERSONNEL</div>
        <nav className="side-nav">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileMenu(false)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {label === 'Coach IA' && <span className="nav-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="premium-card">
          <div className="premium-icon"><Crown size={17} /></div>
          <strong>Débloquez votre potentiel</strong>
          <p>Découvrez l’expérience Premium et progressez plus vite.</p>
          <button className="premium-link" onClick={() => window.alert('Les achats Premium seront activés après la configuration du système d’abonnement.')}>Découvrir Premium <span>↗</span></button>
        </div>
        <button className="nav-link secondary-nav" onClick={() => window.alert('Le centre d’aide sera connecté lors de la mise en place du support.') }><CircleHelp size={18} /><span>Centre d’aide</span></button>
        <div className="sidebar-footer"><span className="footer-dot" /> Version bêta · 0.1.0</div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(true)} aria-label="Ouvrir le menu"><Menu size={20} /></button><div><span className="eyebrow">VOTRE ESPACE</span><h1>{title}</h1></div></div>
          <div className="topbar-actions">
            <div className="language-pill"><span className="language-flag">FR</span><span>Français</span><ChevronDown size={14} /></div>
            <div className="user-chip"><span className="avatar">{initials}</span><span className="user-chip-name">{displayName}</span></div>
            <button className="icon-button" title="Se déconnecter" aria-label="Se déconnecter" onClick={() => void signOut()}><LogOut size={18} /></button>
          </div>
        </header>
        <div className="page-content"><Outlet /></div>
        <footer className="app-footer"><span>© {new Date().getFullYear()} SpeakUp AI</span><span>Speak better. Express yourself. Grow.</span><button onClick={() => window.alert('Paramètres supplémentaires disponibles prochainement.') }><Settings size={13} /> Paramètres</button></footer>
      </main>
    </div>
  );
}
