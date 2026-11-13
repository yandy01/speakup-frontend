import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, BookOpen, Home, MessageCircle, LogOut, Menu, Moon, Sun, UserRound, X, ScrollText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Brand } from './Brand';

const navItems = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/exercises', label: 'Parcours', icon: BookOpen },
  { to: '/coach', label: 'Coach', icon: MessageCircle },
  { to: '/reading', label: 'Lecture', icon: ScrollText },
  { to: '/progress', label: 'Progrès', icon: BarChart3 },
];
const pageNames: Record<string, string> = { '/':'Accueil', '/coach':'Mon professeur', '/exercises':'Mon parcours', '/reading':'Téléprompteur', '/progress':'Ma progression', '/profile':'Mon profil', '/challenge':'Défi minute' };

export function AppShell() {
  const { user, signOut } = useAuth(); const location = useLocation(); const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [theme, setTheme] = useState<'dark'|'light'>(() => localStorage.getItem('eloqia-theme') === 'dark' ? 'dark' : 'light');
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('eloqia-theme', theme); }, [theme]);
  const title = useMemo(() => pageNames[location.pathname] ?? 'ELOQIA', [location.pathname]);
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Orateur';
  const initials = String(displayName).trim().slice(0,2).toUpperCase();
  return <div className="app-shell">
    {mobileMenu && <button className="mobile-scrim" aria-label="Fermer le menu" onClick={() => setMobileMenu(false)} />}
    <aside className={`sidebar ${mobileMenu?'sidebar-open':''}`}>
      <div className="sidebar-top"><Brand/><button className="icon-button mobile-close" onClick={() => setMobileMenu(false)} aria-label="Fermer"><X size={19}/></button></div>
      <div className="workspace-label">MON ESPACE</div>
      <nav className="side-nav">{navItems.map(({to,label,icon:Icon,end})=><NavLink key={to} to={to} end={end} className={({isActive})=>`nav-link ${isActive?'active':''}`} onClick={()=>setMobileMenu(false)}><Icon size={19} strokeWidth={1.8}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-spacer"/>
      <NavLink to="/profile" className={({isActive})=>`nav-link secondary-nav ${isActive?'active':''}`} onClick={()=>setMobileMenu(false)}><UserRound size={18}/><span>Mon profil</span></NavLink>
      <div className="sidebar-footer"><span className="footer-dot"/> ELOQIA · Version bêta</div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button mobile-menu-button" onClick={()=>setMobileMenu(true)} aria-label="Ouvrir le menu"><Menu size={20}/></button><div><span className="eyebrow">TON ESPACE</span><h1>{title}</h1></div></div>
        <div className="topbar-actions"><button className="icon-button mobile-profile-button" onClick={()=>navigate('/profile')} aria-label="Ouvrir mon profil"><UserRound size={18}/></button><button className="icon-button theme-toggle" onClick={()=>setTheme(v=>v==='dark'?'light':'dark')} aria-label={theme==='dark'?'Activer le mode clair':'Activer le mode sombre'} title={theme==='dark'?'Mode clair':'Mode sombre'}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button><div className="language-pill"><span className="language-flag">FR</span><span>Français</span></div><button className="user-chip" onClick={()=>navigate('/profile')}><span className="avatar">{initials}</span><span className="user-chip-name">{displayName}</span></button><button className="icon-button desktop-signout" title="Se déconnecter" aria-label="Se déconnecter" onClick={()=>void signOut()}><LogOut size={18}/></button></div>
      </header>
      <div className="page-content"><Outlet/></div>
      <footer className="app-footer"><span>© {new Date().getFullYear()} ELOQIA</span><span>L’art de mieux s’exprimer.</span><button onClick={()=>navigate('/profile')}><UserRound size={13}/> Paramètres</button></footer>
    </main>
    <nav className="mobile-bottom-nav" aria-label="Navigation principale">{navItems.map(({to,label,icon:Icon,end})=><NavLink key={to} to={to} end={end} className={({isActive})=>`bottom-nav-item ${isActive?'active':''}`}><Icon size={22} strokeWidth={1.9}/><span>{label}</span></NavLink>)}</nav>
  </div>;
}
