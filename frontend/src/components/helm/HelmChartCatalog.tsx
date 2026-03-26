import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { helmApi } from '../../services/api';
import { logger } from '../../utils/logger';
import HelmRepositoryManager from './HelmRepositoryManager';
import {
  CubeIcon,
  MagnifyingGlassIcon,
  RocketLaunchIcon,
  StarIcon,
  ArrowPathIcon,
  FunnelIcon,
  XMarkIcon,
  ServerStackIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors, mono } from '../../styles/linear-design';
import K8sHeader from '../kubernetes/K8sHeader';


const mockPopularCharts = [
  { name: 'nginx',       repo: 'bitnami',               description: 'NGINX Open Source web server and reverse proxy',           version: '15.1.0', downloads: '10M+', rating: 4.8 },
  { name: 'mysql',       repo: 'bitnami',               description: 'MySQL fast, reliable, scalable relational database',        version: '9.12.1', downloads: '8M+',  rating: 4.7 },
  { name: 'postgresql',  repo: 'bitnami',               description: 'PostgreSQL advanced open source relational database',       version: '12.8.0', downloads: '7M+',  rating: 4.9 },
  { name: 'redis',       repo: 'bitnami',               description: 'Redis in-memory data structure store and cache',            version: '18.0.3', downloads: '9M+',  rating: 4.8 },
  { name: 'mongodb',     repo: 'bitnami',               description: 'MongoDB cross-platform document-oriented NoSQL database',   version: '13.16.0',downloads: '6M+',  rating: 4.6 },
  { name: 'apache',      repo: 'bitnami',               description: 'Apache HTTP Server open-source web server project',         version: '10.1.2', downloads: '5M+',  rating: 4.5 },
  { name: 'prometheus',  repo: 'prometheus-community',  description: 'Prometheus monitoring system and time series database',     version: '25.0.0', downloads: '4M+',  rating: 4.9 },
  { name: 'grafana',     repo: 'grafana',               description: 'Grafana observability and data visualization platform',     version: '7.0.3',  downloads: '5M+',  rating: 4.8 },
];

const categories = ['All', 'Databases', 'Web Servers', 'Monitoring', 'CI/CD', 'Messaging', 'Storage'];
const repositories = ['All Repos', 'bitnami', 'stable', 'prometheus-community', 'jetstack', 'grafana'];

export default function HelmChartCatalog() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedRepo, setSelectedRepo] = useState('All Repos');
  const [charts, setCharts] = useState(mockPopularCharts);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showRepoManager, setShowRepoManager] = useState(false);
  const [showVersionSelector, setShowVersionSelector] = useState(false);
  const [selectedChart, setSelectedChart] = useState<typeof mockPopularCharts[0] | null>(null);
  const [chartVersions, setChartVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  useEffect(() => {
    setCharts(mockPopularCharts);
    if (searchQuery) fetchCharts(searchQuery);
  }, [searchQuery]);

  const fetchCharts = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await helmApi.searchCharts(query, selectedRepo !== 'All Repos' ? selectedRepo : undefined);
      if (res.data && Array.isArray(res.data)) {
        setCharts(res.data.map((c: any) => ({
          name: c.name, repo: c.repository || 'unknown',
          description: c.description || 'No description', version: c.version || 'latest',
          downloads: c.downloads || 'N/A', rating: c.rating || 4.5,
        })));
      }
    } catch (err) { logger.error('Failed to search charts', err); }
    finally { setLoading(false); }
  };

  const filteredCharts = charts.filter(c =>
    (c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (selectedRepo === 'All Repos' || c.repo === selectedRepo)
  );

  const handleInstallChart = async (chart: typeof mockPopularCharts[0]) => {
    setSelectedChart(chart);
    setShowVersionSelector(true);
    setLoadingVersions(true);
    try {
      const res = await helmApi.getChartVersions(`${chart.repo}/${chart.name}`);
      setChartVersions(Array.isArray(res.data) && res.data.length > 0
        ? res.data
        : [{ version: chart.version, app_version: '', description: chart.description }]);
    } catch {
      setChartVersions([{ version: chart.version, app_version: '', description: chart.description }]);
    } finally { setLoadingVersions(false); }
  };

  const handleSelectVersion = (version: string) => {
    if (!selectedChart) return;
    setShowVersionSelector(false);
    navigate(`/deploy/helm/workspace?mode=install&chart=${selectedChart.repo}/${selectedChart.name}&version=${version}`);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await helmApi.updateRepositories();
      if (searchQuery) await fetchCharts(searchQuery);
      else setCharts(mockPopularCharts);
    } catch (err) { logger.error('Failed to refresh', err); }
    finally { setLoading(false); }
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ margin: '-28px -32px', height: 'calc(100vh - 68px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: t.text }}>

      <K8sHeader
        title="Chart Catalog"
        subtitle="Browse and install charts from your repositories"
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => setShowRepoManager(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 11, fontWeight: 500, background: isDark ? t.navHoverBg : '#F9FAFB', color: isDark ? t.textSub : '#374151', border: `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}`, borderRadius: 6, cursor: 'pointer' }}>
              <ServerStackIcon style={{ width: 12, height: 12 }} /> Manage Repos
            </button>
            <button onClick={handleRefresh} disabled={loading} style={{ padding: '5px 7px', background: isDark ? t.navHoverBg : '#F9FAFB', border: `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}`, borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, display: 'flex', alignItems: 'center' }}>
              <ArrowPathIcon style={{ width: 13, height: 13, color: t.textSub, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        }
      />

      {/* ── Search / filter bar ── */}
      <div style={{ padding: '0 32px', height: 48, display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${t.cardBorder}`, background: isDark ? 'rgba(255,255,255,0.01)' : t.cardBg, flexShrink: 0 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <MagnifyingGlassIcon style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: t.textMuted }} />
          <input
            type="text"
            placeholder="Search charts by name or description…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}`, borderRadius: 6, padding: '5px 9px 5px 26px', color: t.text, fontSize: 11, outline: 'none', width: '100%' }}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 11, fontWeight: 500, borderRadius: 6, cursor: 'pointer', border: `1px solid ${showFilters ? '#3b82f6' : (isDark ? t.cardBorder : '#D1D5DB')}`, background: showFilters ? (isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF') : (isDark ? t.navHoverBg : '#F9FAFB'), color: showFilters ? '#3b82f6' : (isDark ? t.textSub : '#374151') }}
        >
          <FunnelIcon style={{ width: 11, height: 11 }} /> Filters
          {(selectedCategory !== 'All' || selectedRepo !== 'All Repos') && (
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
          )}
        </button>
        {(searchQuery || selectedCategory !== 'All' || selectedRepo !== 'All Repos') && (
          <button onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setSelectedRepo('All Repos'); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 10, color: t.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>
            <XMarkIcon style={{ width: 11, height: 11 }} /> Clear
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: t.textMuted }}>{filteredCharts.length} chart{filteredCharts.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div style={{ padding: '10px 32px', borderBottom: `1px solid ${t.cardBorder}`, background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)', display: 'flex', gap: 32, flexShrink: 0 }}>
          {[
            { label: 'Category', items: categories, value: selectedCategory, set: setSelectedCategory },
            { label: 'Repository', items: repositories, value: selectedRepo, set: setSelectedRepo },
          ].map(({ label, items, value, set }) => (
            <div key={label}>
              <div style={{ fontSize: 9, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {items.map(item => (
                  <button key={item} onClick={() => set(item)} style={{ padding: '3px 9px', fontSize: 10, fontWeight: 500, borderRadius: 5, cursor: 'pointer', border: `1px solid ${item === value ? '#3b82f6' : (isDark ? t.cardBorder : '#D1D5DB')}`, background: item === value ? (isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF') : (isDark ? t.navHoverBg : '#F9FAFB'), color: item === value ? '#3b82f6' : (isDark ? t.textSub : '#374151') }}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Chart grid ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px' }}>
        {loading && filteredCharts.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <ArrowPathIcon style={{ width: 22, height: 22, color: t.textMuted, animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 12, color: t.textMuted }}>Loading charts…</span>
            </div>
          </div>
        ) : filteredCharts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8 }}>
            <CubeIcon style={{ width: 32, height: 32, color: t.textMuted }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>No charts found</span>
            <span style={{ fontSize: 11, color: t.textMuted }}>Try adjusting your search or filters</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {filteredCharts.map(chart => (
              <div
                key={`${chart.repo}/${chart.name}`}
                style={{ background: t.cardBg, border: `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}`, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, transition: 'border-color 0.12s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#3b82f6'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = isDark ? t.cardBorder : '#D1D5DB'; }}
              >
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF', border: `1px solid ${isDark ? 'rgba(59,130,246,0.2)' : '#BFDBFE'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CubeIcon style={{ width: 16, height: 16, color: '#3b82f6' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chart.name}</div>
                    <div style={{ fontSize: 10, color: isDark ? t.textMuted : '#6B7280', ...mono }}>{chart.repo}</div>
                  </div>
                </div>

                {/* Description */}
                <div style={{ fontSize: 11, color: isDark ? t.textSub : '#4B5563', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, minHeight: 33 }}>
                  {chart.description}
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <StarIcon style={{ width: 11, height: 11, color: '#f59e0b', fill: '#f59e0b' }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: isDark ? t.textSub : '#374151' }}>{chart.rating}</span>
                  </div>
                  <span style={{ fontSize: 10, color: t.textMuted }}>{chart.downloads} downloads</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: t.textMuted, ...mono }}>v{chart.version}</span>
                </div>

                {/* Install button */}
                <button
                  onClick={() => handleInstallChart(chart)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 12px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(59,130,246,0.3)', marginTop: 2 }}
                >
                  <RocketLaunchIcon style={{ width: 12, height: 12 }} /> Install
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Repo Manager modal ── */}
      <HelmRepositoryManager
        isOpen={showRepoManager}
        onClose={() => setShowRepoManager(false)}
        onRepositoriesUpdated={handleRefresh}
      />

      {/* ── Version selector modal ── */}
      {showVersionSelector && selectedChart && (
        <>
          <div onClick={() => setShowVersionSelector(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 480, maxHeight: '70vh', background: t.cardBg, border: `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}`, borderRadius: 14, boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.5)' : '0 24px 80px rgba(0,0,0,0.18)', zIndex: 70, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${isDark ? t.cardBorder : '#E5E7EB'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF', border: `1px solid ${isDark ? 'rgba(59,130,246,0.2)' : '#BFDBFE'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CubeIcon style={{ width: 14, height: 14, color: '#3b82f6' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Select Version</div>
                  <div style={{ fontSize: 11, color: t.textMuted, ...mono }}>{selectedChart.repo}/{selectedChart.name}</div>
                </div>
              </div>
              <button onClick={() => setShowVersionSelector(false)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', display: 'flex', padding: 4 }}>
                <XMarkIcon style={{ width: 15, height: 15 }} />
              </button>
            </div>

            {/* Version list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {loadingVersions ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
                  <ArrowPathIcon style={{ width: 20, height: 20, color: t.textMuted, animation: 'spin 1s linear infinite' }} />
                </div>
              ) : chartVersions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: t.textMuted, fontSize: 12 }}>
                  <ClockIcon style={{ width: 28, height: 28, margin: '0 auto 8px' }} />
                  No versions available
                </div>
              ) : chartVersions.map((ver, idx) => (
                <button
                  key={`${ver.version}-${idx}`}
                  onClick={() => handleSelectVersion(ver.version)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, border: `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}`, background: isDark ? t.navHoverBg : '#F9FAFB', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.1s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#3b82f6'; (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(59,130,246,0.08)' : '#EFF6FF'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? t.cardBorder : '#D1D5DB'; (e.currentTarget as HTMLButtonElement).style.background = isDark ? t.navHoverBg : '#F9FAFB'; }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: t.text, ...mono }}>v{ver.version}</span>
                      {idx === 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: isDark ? 'rgba(34,197,94,0.12)' : '#F0FDF4', color: t.success, border: `1px solid ${isDark ? 'rgba(34,197,94,0.2)' : '#BBF7D0'}` }}>Latest</span>}
                      {ver.app_version && <span style={{ fontSize: 10, color: t.textMuted }}>App v{ver.app_version}</span>}
                    </div>
                    {ver.description && <div style={{ fontSize: 10, color: isDark ? t.textMuted : '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>{ver.description}</div>}
                  </div>
                  <RocketLaunchIcon style={{ width: 13, height: 13, color: '#3b82f6', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
