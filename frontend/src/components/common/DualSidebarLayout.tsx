import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  ServerStackIcon,
  RocketLaunchIcon,
  BeakerIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  LinkIcon,
  Cog6ToothIcon,
  SunIcon,
  MoonIcon,
  ChevronRightIcon,
  ChevronDownIcon,
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
  DocumentTextIcon,
  CommandLineIcon,
  DocumentDuplicateIcon,
  UserCircleIcon,
  UserGroupIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import ClusterSwitcher from './ClusterSwitcher';
import NamespaceFilter from './NamespaceFilter';
import NotificationDropdown from './NotificationDropdown';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

interface Level1Item {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  badge?: string;
  badgeColor?: 'blue' | 'green' | 'red' | 'purple' | 'amber';
}

interface Level2SubItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface Level2Group {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Level2SubItem[];
}

interface Level2Config {
  title: string;
  items: (Level2SubItem | Level2Group)[];
}

interface LayoutProps {
  children: React.ReactNode;
}

// ============================================================
// NAVIGATION CONFIGURATION
// ============================================================

import { featureFlagService } from '../../services/featureFlags';

// ... (imports)

// ============================================================
// NAVIGATION CONFIGURATION
// ============================================================

const level1Navigation: Level1Item[] = [
  { id: 'dashboard', name: 'Dashboard', icon: HomeIcon, href: '/' },
  // Modules WITH Level-2 sidebar (multiple sections)
  { id: 'kubernetes', name: 'Kubernetes', icon: ServerStackIcon },
  { id: 'deploy', name: 'Deploy', icon: RocketLaunchIcon },
  { id: 'pipelines', name: 'Pipelines', icon: BeakerIcon, badge: '3', badgeColor: 'blue' },
  // Modules WITHOUT Level-2 sidebar (single page with tabs inside)
  { id: 'ai-optimizer', name: 'AI Optimizer', icon: SparklesIcon, badge: 'AI', badgeColor: 'purple', href: '/optimization' },
  { id: 'security', name: 'Security Center', icon: ShieldCheckIcon, href: '/security' },
  { id: 'monitoring', name: 'Monitoring & Logs', icon: ChartBarIcon, badge: '2', badgeColor: 'red', href: '/monitoring' },
  { id: 'cost', name: 'Cost Analyzer', icon: CurrencyDollarIcon, href: '/cost' },
  { id: 'integrations', name: 'Integrations', icon: LinkIcon, href: '/integrations' },
  { id: 'settings', name: 'Settings', icon: Cog6ToothIcon },
].filter(item => {
  if (item.id === 'pipelines') return featureFlagService.isEnabled('enablePipelines');
  if (item.id === 'cost') return featureFlagService.isEnabled('enableCostAnalysis');
  if (item.id === 'integrations') return featureFlagService.isEnabled('enableArgoCd'); // Partial check, or just always show if any integration enabled? Assuming always show for now unless specific
  return true;
});

// Only modules with multiple SECTIONS get Level-2 sidebar
const level2Configurations: Record<string, Level2Config> = {
  kubernetes: {
    title: 'Kubernetes',
    items: [
      { name: 'Cluster Overview', href: '/cluster-overview', icon: CloudIcon },
      { name: 'Nodes', href: '/kubernetes/nodes', icon: ServerIcon },
      { name: 'Namespaces', href: '/namespaces', icon: FolderIcon },
      { name: 'Workloads', href: '/kubernetes/workloads', icon: CubeTransparentIcon },
      { name: 'Configuration', href: '/kubernetes/configuration', icon: DocumentDuplicateIcon },
      { name: 'Networking', href: '/kubernetes/networking', icon: GlobeAltIcon },
      { name: 'Storage', href: '/kubernetes/storage', icon: CircleStackIcon },
      { name: 'Terminal', href: '/kubernetes/terminal', icon: CommandLineIcon },
    ],
  },
  deploy: {
    title: 'Deploy',
    items: [
      { name: 'YAML Deploy', href: '/deploy/yaml', icon: DocumentTextIcon },
      { name: 'Helm Deploy', href: '/deploy/helm', icon: CubeTransparentIcon },
      { name: 'ArgoCD Deploy', href: '/deploy/argocd', icon: CloudIcon },
    ],
  },
  pipelines: {
    title: 'Pipelines',
    items: [
      { name: 'All Pipelines', href: '/pipelines', icon: BeakerIcon },
    ],
  },
  settings: {
    title: 'Settings',
    items: [
      { name: 'General Settings', href: '/settings', icon: Cog6ToothIcon },
      { name: 'Profile', href: '/profile', icon: UserCircleIcon },
      { name: 'Cluster Management', href: '/clusters', icon: ServerStackIcon },
      { name: 'User Management', href: '/admin/users', icon: UserGroupIcon, badge: 'Admin' },
      { name: 'API Keys', href: '/admin/api-keys', icon: KeyIcon },
    ],
  },
  // Other modules (AI Optimizer, Security, Monitoring, Cost, Integrations)
  // have direct href links and use horizontal tabs INSIDE the page
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function isGroup(item: Level2SubItem | Level2Group): item is Level2Group {
  return 'items' in item;
}

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const parts = pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [
    { label: 'Home', href: '/' },
  ];

  let currentPath = '';
  parts.forEach((part) => {
    currentPath += `/${part}`;
    const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
    breadcrumbs.push({ label, href: currentPath });
  });

  return breadcrumbs;
}

// ============================================================
// COMPONENTS
// ============================================================

// Level-1 Sidebar Item
function Level1NavItem({
  item,
  isActive,
  onClick,
}: {
  item: Level1Item;
  isActive: boolean;
  onClick: () => void;
}) {
  const content = (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-xl cursor-pointer transition-all duration-200 group ${isActive
          ? 'bg-white/20 text-white shadow-glass border border-white/30'
          : 'text-gray-400 hover:bg-white/10 hover:text-gray-200 border border-transparent'
        }`}
      onClick={onClick}
    >
      <item.icon className="h-5 w-5" />
      {item.badge && (
        <span
          className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold rounded-full ${item.badgeColor === 'red'
              ? 'bg-red-500 text-white'
              : item.badgeColor === 'purple'
                ? 'bg-purple-500 text-white'
                : item.badgeColor === 'amber'
                  ? 'bg-amber-500 text-white'
                  : item.badgeColor === 'green'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-blue-500 text-white'
            }`}
        >
          {item.badge}
        </span>
      )}

      {/* Tooltip */}
      <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
        {item.name}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900 dark:border-r-slate-700" />
      </div>
    </motion.div>
  );

  if (item.href) {
    return <Link to={item.href}>{content}</Link>;
  }

  return content;
}

// Level-2 Collapsible Group
function Level2CollapsibleGroup({
  group,
  isExpanded,
  onToggle,
  activeHref,
}: {
  group: Level2Group;
  isExpanded: boolean;
  onToggle: () => void;
  activeHref: string;
}) {
  const hasActiveChild = group.items.some(
    (item) => item.href.split('?')[0] === activeHref.split('?')[0]
  );

  return (
    <div className="mb-1">
      <motion.button
        whileHover={{ x: 2 }}
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 ${hasActiveChild
            ? 'bg-white/10 text-white border border-white/20'
            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
          }`}
      >
        <div className="flex items-center gap-2.5">
          <group.icon className="h-4 w-4" />
          <span className="text-sm font-medium">{group.name}</span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-white/10 pl-3">
              {group.items.map((item) => {
                const isActive = item.href.split('?')[0] === activeHref.split('?')[0];
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-all duration-200 ${isActive
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                      }`}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Level-2 Simple Item
function Level2SimpleItem({
  item,
  activeHref,
}: {
  item: Level2SubItem;
  activeHref: string;
}) {
  const isActive = item.href.split('?')[0] === activeHref.split('?')[0];

  return (
    <Link
      to={item.href}
      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 mb-0.5 ${isActive
          ? 'bg-white/10 text-white font-medium border border-white/20'
          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
        }`}
    >
      <div className="flex items-center gap-2.5">
        <item.icon className="h-4 w-4" />
        <span>{item.name}</span>
      </div>
      {item.badge && (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-blue-500/20 text-blue-400">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// Breadcrumb Component
function Breadcrumbs({ items }: { items: { label: string; href: string }[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm">
      {items.map((item, index) => (
        <div key={item.href} className="flex items-center gap-1">
          {index > 0 && (
            <ChevronRightIcon className="h-3.5 w-3.5 text-gray-600" />
          )}
          <Link
            to={item.href}
            className={`transition-colors ${index === items.length - 1
                ? 'text-white font-medium'
                : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            {item.label}
          </Link>
        </div>
      ))}
    </nav>
  );
}

// ============================================================
// MAIN LAYOUT COMPONENT
// ============================================================

export default function DualSidebarLayout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [activeModule, setActiveModule] = useState<string>('dashboard');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Workloads', 'Nodes']));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Determine active module from current path
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
      setActiveModule('dashboard');
    } else if (path.startsWith('/cluster-overview') || path.startsWith('/kubernetes') || path.startsWith('/namespaces') || path.startsWith('/networking') || path.startsWith('/storage') || path.startsWith('/nodes')) {
      setActiveModule('kubernetes');
    } else if (path.startsWith('/deploy')) {
      setActiveModule('deploy');
    } else if (path.startsWith('/pipelines')) {
      setActiveModule('pipelines');
    } else if (path.startsWith('/optimization') || path.startsWith('/ai')) {
      setActiveModule('ai-optimizer');
    } else if (path.startsWith('/security')) {
      setActiveModule('security');
    } else if (path.startsWith('/monitoring') || path.startsWith('/events')) {
      setActiveModule('monitoring');
    } else if (path.startsWith('/cost')) {
      setActiveModule('cost');
    } else if (path.startsWith('/integrations')) {
      setActiveModule('integrations');
    } else if (path.startsWith('/settings') || path.startsWith('/profile') || path.startsWith('/clusters') || path.startsWith('/admin')) {
      setActiveModule('settings');
    }
  }, [location.pathname]);

  const level2Config = useMemo(() => {
    const config = level2Configurations[activeModule] || null;

    // Filter settings items based on user role
    if (config && activeModule === 'settings' && user) {
      const isAdmin = user.role === 'admin';
      return {
        ...config,
        items: config.items.filter(item => {
          // Only show User Management to admins
          if (!isGroup(item) && item.href === '/admin/users') {
            return isAdmin;
          }
          return true;
        }),
      };
    }

    return config;
  }, [activeModule, user]);

  const breadcrumbs = useMemo(() => {
    return getBreadcrumbs(location.pathname);
  }, [location.pathname]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const handleLevel1Click = (item: Level1Item) => {
    if (item.href) {
      navigate(item.href);
    } else {
      setActiveModule(item.id);
      // Navigate to first item in Level-2 config
      const config = level2Configurations[item.id];
      if (config && config.items.length > 0) {
        const firstItem = config.items[0];
        if (isGroup(firstItem)) {
          navigate(firstItem.items[0].href);
        } else {
          navigate(firstItem.href);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 transition-colors duration-300">
      {/* Subtle background glow effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* ============================================================ */}
      {/* LEVEL-1 SIDEBAR (Main Navigation) */}
      {/* ============================================================ */}
      <aside className="fixed left-0 top-0 bottom-0 w-16 bg-black/40 backdrop-blur-xl border-r border-white/10 z-50 flex flex-col shadow-glass">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-white/10">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shadow-glass cursor-pointer hover:bg-white/20 transition-colors"
            onClick={() => navigate('/')}
          >
            <SparklesIcon className="h-5 w-5 text-white" />
          </motion.div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 px-2 space-y-2 overflow-y-auto">
          {level1Navigation.map((item) => (
            <Level1NavItem
              key={item.id}
              item={item}
              isActive={activeModule === item.id}
              onClick={() => handleLevel1Click(item)}
            />
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-2 space-y-2 border-t border-white/10">
          {/* Theme Toggle - Hidden for dark-only design */}
          {/* <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="w-12 h-12 flex items-center justify-center rounded-xl text-gray-400 hover:bg-white/10 hover:text-gray-200 transition-colors"
          >
            <MoonIcon className="h-5 w-5" />
          </motion.button> */}

          {/* User Avatar */}
          {user && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative w-12 h-12 flex items-center justify-center"
            >
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shadow-glass cursor-pointer hover:bg-white/20 transition-colors">
                <span className="text-white font-bold text-sm">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="absolute bottom-0 right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-gray-900" />
            </motion.div>
          )}
        </div>
      </aside>

      {/* ============================================================ */}
      {/* LEVEL-2 SIDEBAR (Context Navigation) */}
      {/* ============================================================ */}
      <AnimatePresence>
        {level2Config && activeModule !== 'dashboard' && (
          <motion.aside
            initial={{ x: -240, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -240, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-16 top-0 bottom-0 w-60 bg-black/40 backdrop-blur-xl border-r border-white/10 z-40 flex flex-col shadow-glass"
          >
            {/* Header */}
            <div className="h-16 px-4 flex items-center border-b border-white/10">
              <h2 className="text-base font-semibold text-white">
                {level2Config.title}
              </h2>
            </div>

            {/* Context Panel - Namespace Filter (Kubernetes module only) */}
            {activeModule === 'kubernetes' && (
              <div className="px-3 py-3 border-b border-white/10 space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Filter NS
                  </label>
                  <NamespaceFilter />
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 overflow-y-auto">
              {level2Config.items.map((item) => {
                if (isGroup(item)) {
                  return (
                    <Level2CollapsibleGroup
                      key={item.name}
                      group={item}
                      isExpanded={expandedGroups.has(item.name)}
                      onToggle={() => toggleGroup(item.name)}
                      activeHref={location.pathname + location.search}
                    />
                  );
                }
                return (
                  <Level2SimpleItem
                    key={item.href}
                    item={item}
                    activeHref={location.pathname + location.search}
                  />
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-white/10">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <SparklesIcon className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-semibold text-white">
                    AI-Powered
                  </span>
                </div>
                <p className="text-[10px] text-gray-500">
                  NextSight AI v2.0
                </p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MAIN CONTENT AREA */}
      {/* ============================================================ */}
      <div
        className={`min-h-screen flex flex-col transition-all duration-300 ${level2Config && activeModule !== 'dashboard' ? 'ml-[304px]' : 'ml-16'
          }`}
      >
        {/* ============================================================ */}
        {/* TOP HEADER */}
        {/* ============================================================ */}
        <header className="sticky top-0 z-30 h-16 bg-black/40 backdrop-blur-xl border-b border-white/10 shadow-glass">
          {/* Subtle accent line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-cyan-500/30" />

          <div className="h-full px-4 lg:px-6 flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-white/10"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Bars3Icon className="h-5 w-5 text-gray-300" />
            </button>

            {/* Breadcrumbs */}
            <div className="hidden md:block">
              <Breadcrumbs items={breadcrumbs} />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Search */}
            <div className="relative">
              <motion.div
                animate={{ width: searchFocused ? 280 : 200 }}
                className="relative"
              >
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white/10 backdrop-blur-xl border border-white/20 focus:border-white/40 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all hover:bg-white/15"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-gray-500 bg-white/10 rounded">
                  ⌘K
                </kbd>
              </motion.div>
            </div>

            {/* Cluster Switcher - Only for cluster-related modules */}
            {(activeModule === 'kubernetes' || activeModule === 'deploy' || activeModule === 'security' ||
              activeModule === 'monitoring' || activeModule === 'ai-optimizer' || activeModule === 'cost' ||
              activeModule === 'pipelines') && <ClusterSwitcher />}

            {/* Notifications */}
            <NotificationDropdown />

            {/* User Section */}
            {user && (
              <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium text-white">
                    {user.username}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">
                    {user.role}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={logout}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Sign out"
                >
                  <ArrowLeftStartOnRectangleIcon className="h-5 w-5" />
                </motion.button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* ============================================================ */}
      {/* MOBILE MENU OVERLAY */}
      {/* ============================================================ */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-black/90 backdrop-blur-xl border-r border-white/10 z-50 lg:hidden overflow-y-auto"
            >
              {/* Mobile Header */}
              <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                    <SparklesIcon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg font-bold text-white">
                    NextSight AI
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/10"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {/* Mobile Navigation */}
              <nav className="p-4 space-y-2">
                {level1Navigation.map((item) => {
                  const isActive = activeModule === item.id;
                  const config = level2Configurations[item.id];

                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => {
                          handleLevel1Click(item);
                          if (item.href) {
                            setMobileMenuOpen(false);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${isActive
                            ? 'bg-white/10 text-white border border-white/20'
                            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        {config && !item.href && (
                          <ChevronDownIcon
                            className={`h-4 w-4 transition-transform ${isActive ? 'rotate-180' : ''
                              }`}
                          />
                        )}
                      </button>

                      {/* Submenu */}
                      <AnimatePresence>
                        {isActive && config && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="ml-4 mt-1 space-y-0.5 overflow-hidden"
                          >
                            {config.items.map((subItem) => {
                              if (isGroup(subItem)) {
                                return (
                                  <div key={subItem.name} className="py-1">
                                    <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
                                      {subItem.name}
                                    </p>
                                    {subItem.items.map((child) => (
                                      <Link
                                        key={child.href}
                                        to={child.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                      >
                                        <child.icon className="h-4 w-4" />
                                        {child.name}
                                      </Link>
                                    ))}
                                  </div>
                                );
                              }
                              return (
                                <Link
                                  key={subItem.href}
                                  to={subItem.href}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                >
                                  <subItem.icon className="h-4 w-4" />
                                  {subItem.name}
                                </Link>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
