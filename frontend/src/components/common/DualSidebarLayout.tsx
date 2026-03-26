import { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  ServerStackIcon,
  RocketLaunchIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  ArrowLeftStartOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  CloudIcon,
  ServerIcon,
  FolderIcon,
  CubeTransparentIcon,
  GlobeAltIcon,
  CircleStackIcon,
  CommandLineIcon,
  DocumentDuplicateIcon,
  UserCircleIcon,
  SunIcon,
  MoonIcon,
  ArrowPathRoundedSquareIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import NotificationDropdown from './NotificationDropdown';
import type { ThemeColors } from '../../styles/linear-design';
import { getThemeColors } from '../../styles/linear-design';

// ============================================================
// TYPES
// ============================================================

interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: string;
  badgeColor?: 'blue' | 'green' | 'red' | 'purple' | 'amber';
}

interface NavSection {
  label: string;
  items: NavItem[];
}

interface LayoutProps { children: React.ReactNode; }

// ============================================================
// NAV CONFIG — flat, no sub-menus (Techerly style)
// ============================================================

const navSections: NavSection[] = [
  {
    label: 'Main menu',
    items: [
      { id: 'dashboard',       name: 'Overview',         href: '/',                        icon: HomeIcon },
      { id: 'cluster',         name: 'Cluster Overview', href: '/cluster-overview',         icon: CloudIcon },
      { id: 'nodes',           name: 'Nodes',            href: '/kubernetes/nodes',         icon: ServerIcon },
      { id: 'namespaces',      name: 'Namespaces',       href: '/namespaces',               icon: FolderIcon },
      { id: 'workloads',       name: 'Workloads',        href: '/kubernetes/workloads',     icon: CubeTransparentIcon },
      { id: 'networking',      name: 'Networking',       href: '/kubernetes/networking',    icon: GlobeAltIcon },
      { id: 'storage',         name: 'Storage',          href: '/kubernetes/storage',       icon: CircleStackIcon },
      { id: 'security',        name: 'Security',         href: '/security',                 icon: ShieldCheckIcon },
      { id: 'monitoring',      name: 'Monitoring',       href: '/monitoring',               icon: ChartBarIcon, badge: '2', badgeColor: 'red' as const },
      { id: 'ai-optimizer',    name: 'AI Optimizer',     href: '/optimization',             icon: SparklesIcon, badge: 'AI', badgeColor: 'purple' as const },
    ],
  },
  {
    label: 'Deploy',
    items: [
      { id: 'deploy',          name: 'YAML',             href: '/deploy/yaml',              icon: RocketLaunchIcon },
      { id: 'helm',            name: 'Helm',             href: '/deploy/helm',              icon: CubeTransparentIcon, badge: 'PKG',   badgeColor: 'blue'   as const },
      { id: 'argocd',          name: 'ArgoCD',           href: '/deploy/argocd',            icon: ArrowPathRoundedSquareIcon, badge: 'GitOps', badgeColor: 'purple' as const },
    ],
  },
  {
    label: 'Settings and tools',
    items: [
      { id: 'terminal',        name: 'Terminal',         href: '/kubernetes/terminal',      icon: CommandLineIcon },
      { id: 'configuration',   name: 'Configuration',    href: '/kubernetes/configuration', icon: DocumentDuplicateIcon },
      { id: 'settings',        name: 'Settings',         href: '/settings',                 icon: Cog6ToothIcon },
      { id: 'profile',         name: 'Profile',          href: '/profile',                  icon: UserCircleIcon },
      { id: 'clusters',        name: 'Clusters',         href: '/clusters',                 icon: ServerStackIcon },
    ],
  },
];

// ============================================================
// HELPERS
// ============================================================

function getBreadcrumbs(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs = [{ label: 'NextSight', href: '/' }];
  let cur = '';
  parts.forEach(p => {
    cur += `/${p}`;
    crumbs.push({ label: p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, ' '), href: cur });
  });
  return crumbs;
}

// ============================================================
// SIDEBAR COMPONENTS
// ============================================================

function NavBadge({ badge, badgeColor, t }: { badge: string; badgeColor?: string; t: ThemeColors }) {
  const c = t.badgeColors[badgeColor || 'blue'] || t.badgeColors.blue;
  return (
    <span style={{ padding: '2px 7px', fontSize: 10, fontWeight: 600, borderRadius: 9999, background: c.bg, color: c.text, flexShrink: 0 }}>
      {badge}
    </span>
  );
}

function FlatNavItem({ item, isActive, onClick, t }: { item: NavItem; isActive: boolean; onClick: () => void; t: ThemeColors }) {
  return (
    <Link to={item.href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }} onClick={onClick}>
      <div
        className="flex items-center cursor-pointer select-none"
        style={{
          gap: 10, padding: '8px 12px', borderRadius: 8, marginBottom: 2,
          background: isActive ? t.navActiveBg : 'transparent',
          color: isActive ? t.navActiveText : t.navDefaultText,
          transition: 'background 0.12s, color 0.12s',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = t.navHoverBg; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
      >
        <item.icon style={{ width: 16, height: 16, color: isActive ? t.navActiveIcon : t.navDefaultIcon, flexShrink: 0, transition: 'color 0.12s' }} />
        <span style={{ fontSize: 13.5, fontWeight: isActive ? 500 : 400, flex: 1, lineHeight: 1.4 }}>{item.name}</span>
        {item.badge && <NavBadge badge={item.badge} badgeColor={item.badgeColor} t={t} />}
      </div>
    </Link>
  );
}

function SectionLabel({ label, top, t }: { label: string; top?: boolean; t: ThemeColors }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 400, color: t.sectionLabel, padding: top ? '8px 12px 6px' : '20px 12px 6px' }}>
      {label}
    </div>
  );
}

// ============================================================
// MAIN LAYOUT
// ============================================================

export default function DualSidebarLayout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const t = useMemo(() => getThemeColors(theme), [theme]);

  const pageBg = theme === 'light' ? '#EAECF0' : '#0a0a0a';
  const cardBg = theme === 'light' ? '#FFFFFF' : '#111111';
  const sidebarBg = theme === 'light' ? '#F7F8FA' : '#0f0f0f';

  const [mobileOpen, setMobileOpen] = useState(false);

  const breadcrumbs = useMemo(() => getBreadcrumbs(location.pathname), [location.pathname]);

  // Determine active nav item by matching href
  const activeId = useMemo(() => {
    const p = location.pathname;
    for (const section of navSections) {
      // Match most specific (longest) href first
      const sorted = [...section.items].sort((a, b) => b.href.length - a.href.length);
      const match = sorted.find(item => p === item.href || (item.href !== '/' && p.startsWith(item.href)));
      if (match) return match.id;
    }
    return 'dashboard';
  }, [location.pathname]);

  // ─── Sidebar render function ─────────────────────────────────────────────────
  const renderSidebar = ({ onItemClick }: { onItemClick?: () => void }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: sidebarBg }}>
      {/* Logo */}
      <div
        style={{
          height: 64, padding: '0 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0, cursor: 'pointer',
        }}
        onClick={() => { navigate('/'); onItemClick?.(); }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <SparklesIcon style={{ width: 17, height: 17, color: '#fff' }} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, lineHeight: 1.25 }}>NextSight</div>
          <div style={{ fontSize: 10, color: t.textMuted, lineHeight: 1.2 }}>K8s Platform</div>
        </div>
      </div>

      {/* Navigation — flat, no sub-menus */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {navSections.map((section, si) => (
          <div key={section.label}>
            <SectionLabel label={section.label} top={si === 0} t={t} />
            {section.items.map(item => (
              <FlatNavItem key={item.id} item={item} isActive={activeId === item.id} onClick={() => onItemClick?.()} t={t} />
            ))}
          </div>
        ))}
      </nav>

      {/* User profile — bottom of sidebar */}
      <div style={{ padding: '8px 8px 12px', flexShrink: 0 }}>
        {user && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = t.navHoverBg; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{user.username.charAt(0).toUpperCase()}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</div>
              <div style={{ fontSize: 11, color: t.textMuted, textTransform: 'capitalize' }}>{user.role}</div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); logout(); }}
              style={{ padding: 5, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = theme === 'light' ? '#FEF2F2' : 'rgba(239,68,68,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = t.textMuted; e.currentTarget.style.background = 'transparent'; }}
              title="Sign out"
            >
              <ArrowLeftStartOnRectangleIcon style={{ width: 15, height: 15 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ─── Breadcrumb bar helpers ──────────────────────────────────────────────────

  const IconBtn = ({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) => (
    <button
      onClick={onClick} title={title}
      style={{
        width: 32, height: 32, borderRadius: 7,
        background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: t.textSub, transition: 'background 0.12s, color 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = t.navHoverBg; e.currentTarget.style.color = t.text; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textSub; }}
    >
      {children}
    </button>
  );

  return (
    <div style={{
      height: '100vh',
      background: pageBg,
      fontFamily: 'Inter, system-ui, sans-serif',
      boxSizing: 'border-box',
      overflow: 'hidden',
      padding: 8,
    }}>

      {/* ── ONE big card (sidebar + content together) ──────────── */}
      <div style={{
        display: 'flex',
        height: '100%',
        background: cardBg,
        overflow: 'hidden',
        borderRadius: 12,
        boxShadow: theme === 'light'
          ? '0 4px 40px rgba(0,0,0,0.10)'
          : '0 4px 40px rgba(0,0,0,0.5)',
      }}>

        {/* ── SIDEBAR — left portion of the card ─────────────────────── */}
        <aside
          className="hidden lg:flex flex-col"
          style={{
            width: 240,
            flexShrink: 0,
            background: sidebarBg,
            position: 'sticky',
            top: 0,
            height: '100%',
            overflowY: 'auto',
            borderRadius: '12px 0 0 12px',
          }}
        >
          {renderSidebar({})}
        </aside>

        {/* ── CONTENT — right portion of the card ────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Breadcrumb bar */}
          <div style={{
            height: 52, padding: '0 28px',
            display: 'flex', alignItems: 'center', gap: 12,
            borderBottom: `1px solid ${t.sidebarBorder}`,
            flexShrink: 0, background: cardBg,
          }}>
            <button
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              style={{ padding: 5, borderRadius: 7, background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSub }}
            >
              <Bars3Icon style={{ width: 20, height: 20 }} />
            </button>

            <nav style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
              {breadcrumbs.map((crumb, i) => (
                <div key={crumb.href} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {i > 0 && <ChevronRightIcon style={{ width: 11, height: 11, color: t.textMuted, flexShrink: 0 }} />}
                  <Link
                    to={crumb.href}
                    style={{
                      fontSize: 13, color: i === breadcrumbs.length - 1 ? t.text : t.textSub,
                      fontWeight: i === breadcrumbs.length - 1 ? 500 : 400,
                      textDecoration: 'none', whiteSpace: 'nowrap', transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => i < breadcrumbs.length - 1 && (e.currentTarget.style.color = t.text)}
                    onMouseLeave={e => i < breadcrumbs.length - 1 && (e.currentTarget.style.color = t.textSub)}
                  >
                    {crumb.label}
                  </Link>
                </div>
              ))}
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <NotificationDropdown />
              <IconBtn onClick={toggleTheme} title={theme === 'light' ? 'Dark mode' : 'Light mode'}>
                {theme === 'light' ? <MoonIcon style={{ width: 16, height: 16 }} /> : <SunIcon style={{ width: 16, height: 16 }} />}
              </IconBtn>
              <IconBtn title="Search (⌘K)"><MagnifyingGlassIcon style={{ width: 16, height: 16 }} /></IconBtn>
              {user && (
                <div
                  style={{ width: 28, height: 28, borderRadius: '50%', marginLeft: 6, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => navigate('/profile')} title="Profile"
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{user.username.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Page content */}
          <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 32px' }}>
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
              {children}
            </motion.div>
          </main>

        </div>
      </div>

      {/* ── MOBILE SIDEBAR OVERLAY ────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50 }}
              className="lg:hidden" onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 240, zIndex: 51, display: 'flex', flexDirection: 'column' }}
              className="lg:hidden"
            >
              <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 1 }}>
                <button onClick={() => setMobileOpen(false)} style={{ padding: 5, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSub, display: 'flex' }}>
                  <XMarkIcon style={{ width: 18, height: 18 }} />
                </button>
              </div>
              {renderSidebar({ onItemClick: () => setMobileOpen(false) })}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

