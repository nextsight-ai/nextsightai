import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { helmApi } from '../../services/api';
import { logger } from '../../utils/logger';
import { useToast } from '../../contexts/ToastContext';
import { useHelmReleases } from '../../hooks/useHelmData';
import type { HelmRelease, HelmReleaseStatus } from '../../types';
import {
  CubeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowPathIcon,
  EyeIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  CubeTransparentIcon,
} from '@heroicons/react/24/outline';
import { formatAge } from '../../utils/constants';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';
import K8sHeader from '../kubernetes/K8sHeader';

const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };

const helmStatusLabels: Record<string, string> = {
  deployed:          'Deployed',
  failed:            'Failed',
  'pending-install': 'Installing',
  'pending-upgrade': 'Upgrading',
  'pending-rollback':'Rolling back',
  uninstalling:      'Uninstalling',
  superseded:        'Superseded',
  unknown:           'Unknown',
};

function statusChip(status: HelmReleaseStatus, t: ReturnType<typeof getThemeColors>, isDark: boolean) {
  if (status === 'deployed')           return { bg: isDark ? 'rgba(34,197,94,0.12)'  : '#F0FDF4', color: t.success, border: isDark ? 'rgba(34,197,94,0.2)'  : '#BBF7D0' };
  if (status === 'failed')             return { bg: isDark ? 'rgba(239,68,68,0.12)'  : '#FEF2F2', color: t.error,   border: isDark ? 'rgba(239,68,68,0.2)'  : '#FECACA' };
  if (status.startsWith('pending') || status === 'uninstalling')
                                       return { bg: isDark ? 'rgba(234,179,8,0.12)'  : '#FFFBEB', color: t.warning, border: isDark ? 'rgba(234,179,8,0.2)'  : '#FDE68A' };
  return { bg: isDark ? 'rgba(156,163,175,0.1)' : '#F3F4F6', color: t.textSub, border: isDark ? t.cardBorder : '#D1D5DB' };
}

function NamespaceDropdown({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', fontSize: 11, fontWeight: 500,
        background: isDark ? t.navHoverBg : '#F9FAFB',
        border: `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}`,
        borderRadius: 6, color: t.text, cursor: 'pointer', ...mono,
      }}>
        <span>{value}</span>
        <ChevronDownIcon style={{ width: 11, height: 11, color: t.textMuted, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', zIndex: 50, top: 'calc(100% + 6px)', right: 0,
          background: t.cardBg, border: `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}`,
          borderRadius: 8, overflow: 'hidden', boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.12)',
          minWidth: 140,
        }}>
          {options.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} style={{
              width: '100%', padding: '7px 12px', textAlign: 'left', fontSize: 11,
              background: opt === value ? (isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF') : 'transparent',
              color: opt === value ? '#3b82f6' : t.text, border: 'none', cursor: 'pointer', ...mono,
            }}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HelmDashboard() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const toast = useToast();
  const [selectedNamespace, setSelectedNamespace] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { releases, isLoading: initialLoading, isRefetching: loading, error, refresh } = useHelmReleases(selectedNamespace);

  const namespaces = useMemo(() => {
    const ns = new Set(['all', 'default']);
    releases.forEach(r => ns.add(r.namespace));
    return Array.from(ns);
  }, [releases]);

  const filteredReleases = releases.filter(r =>
    (r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     r.chart.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (selectedNamespace === 'all' || r.namespace === selectedNamespace)
  );

  const handleRefresh = async () => { await refresh(); toast.success('Refreshed', 'Helm releases updated'); };

  const handleUpgrade = async (release: HelmRelease) => {
    try {
      const res = await helmApi.upgradeRelease(release.namespace, release.name, { chart: release.chart, reuse_values: true });
      if (res.data.success) { toast.success('Upgrade Started', `Upgrading ${release.name}`); refresh(); }
      else toast.error('Upgrade Failed', res.data.message || `Failed to upgrade ${release.name}`);
    } catch (err: any) {
      logger.error('Failed to upgrade release', err);
      toast.error('Upgrade Failed', err.response?.data?.detail || err.message || `Failed to upgrade ${release.name}`);
    }
  };

  const handleDelete = async (release: HelmRelease) => {
    if (!confirm(`Delete release "${release.name}"?`)) return;
    try {
      const res = await helmApi.uninstallRelease(release.namespace, release.name);
      if (res.data.success) { toast.success('Deleted', `Release ${release.name} deleted`); refresh(); }
      else toast.error('Delete Failed', res.data.message || `Failed to delete ${release.name}`);
    } catch (err: any) {
      logger.error('Failed to delete release', err);
      toast.error('Delete Failed', err.response?.data?.detail || err.message || `Failed to delete ${release.name}`);
    }
  };

  const stats = {
    total:    releases.length,
    deployed: releases.filter(r => r.status === 'deployed').length,
    failed:   releases.filter(r => r.status === 'failed').length,
    pending:  releases.filter(r => r.status.startsWith('pending')).length,
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ margin: '-28px -32px', height: 'calc(100vh - 68px)', display: 'flex', flexDirection: 'column', background: t.mainBg, color: t.text, overflow: 'hidden' }}>

      <K8sHeader
        title="Helm Releases"
        subtitle="Manage and monitor chart deployments"
        rightContent={
          <button
            onClick={() => navigate('/deploy/helm/catalog')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 11, fontWeight: 600, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}
          >
            <PlusIcon style={{ width: 12, height: 12 }} />
            Install Chart
          </button>
        }
      />

      {/* ── Stats strip ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 32px', height: 48, borderBottom: `1px solid ${t.cardBorder}`, background: isDark ? 'rgba(255,255,255,0.01)' : t.cardBg, flexShrink: 0 }}>
        {[
          { label: 'Total',    value: stats.total,    color: '#3b82f6',  Icon: CubeTransparentIcon },
          { label: 'Deployed', value: stats.deployed, color: t.success,  Icon: CheckCircleIcon },
          { label: 'Failed',   value: stats.failed,   color: t.error,    Icon: XCircleIcon },
          { label: 'Pending',  value: stats.pending,  color: t.warning,  Icon: ClockIcon },
        ].map(({ label, value, color, Icon }, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 24, marginRight: 24, borderRight: i < 3 ? `1px solid ${t.cardBorder}` : 'none' }}>
            <Icon style={{ width: 13, height: 13, color, flexShrink: 0 }} />
            <span style={{ fontSize: 18, fontWeight: 700, color, ...mono, lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: 10, color: isDark ? t.textMuted : '#6B7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
          </div>
        ))}

        {/* Right side: search + filter + refresh */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <MagnifyingGlassIcon style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: t.textMuted }} />
            <input
              type="text"
              placeholder="Search releases…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent', border: `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}`,
                borderRadius: 6, padding: '4px 9px 4px 26px', color: t.text,
                fontSize: 11, outline: 'none', width: 180,
              }}
            />
          </div>
          <NamespaceDropdown value={selectedNamespace} options={namespaces} onChange={setSelectedNamespace} />
          <button
            onClick={handleRefresh} disabled={loading}
            style={{ padding: '5px 8px', background: isDark ? t.navHoverBg : '#F9FAFB', border: `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}`, borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, display: 'flex', alignItems: 'center' }}
          >
            <ArrowPathIcon style={{ width: 13, height: 13, color: t.textSub, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{ margin: '0 32px', marginTop: 12, padding: '9px 14px', background: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: `1px solid ${isDark ? 'rgba(239,68,68,0.2)' : '#FECACA'}`, borderRadius: 8, fontSize: 12, color: t.error, flexShrink: 0 }}>
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {/* ── Release list ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px 90px 80px 120px', gap: 0, padding: '0 32px', height: 34, alignItems: 'center', borderBottom: `1px solid ${t.cardBorder}`, flexShrink: 0, background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.015)' }}>
          {['Release', 'Chart', 'Namespace', 'Version', 'Updated', 'Actions'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 600, color: isDark ? t.textMuted : '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {(initialLoading || loading) && releases.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <ArrowPathIcon style={{ width: 22, height: 22, color: t.textMuted, animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12, color: t.textMuted }}>Loading releases…</span>
              </div>
            </div>
          ) : filteredReleases.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF', border: `1px solid ${isDark ? 'rgba(59,130,246,0.2)' : '#BFDBFE'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CubeIcon style={{ width: 22, height: 22, color: '#3b82f6' }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>No releases found</div>
              <div style={{ fontSize: 11, color: t.textMuted }}>
                {searchQuery ? 'Try adjusting your search' : 'Install your first chart to get started'}
              </div>
              {!searchQuery && (
                <button
                  onClick={() => navigate('/deploy/helm/catalog')}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 11, fontWeight: 600, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', marginTop: 4 }}
                >
                  <PlusIcon style={{ width: 12, height: 12 }} /> Install Chart
                </button>
              )}
            </div>
          ) : filteredReleases.map((release, idx) => {
            const chip = statusChip(release.status, t, isDark);
            return (
              <div
                key={`${release.namespace}/${release.name}`}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 140px 100px 90px 80px 120px',
                  gap: 0, padding: '0 32px', height: 46, alignItems: 'center',
                  borderBottom: `1px solid ${t.cardBorder}`,
                  background: idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.008)'),
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.008)'); }}
              >
                {/* Release name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: chip.bg, border: `1px solid ${chip.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CubeIcon style={{ width: 11, height: 11, color: chip.color }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{release.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 3, background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`, ...mono }}>
                      {helmStatusLabels[release.status] || release.status}
                    </span>
                  </div>
                </div>

                {/* Chart */}
                <span style={{ fontSize: 11, color: isDark ? t.textSub : '#374151', ...mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{release.chart}</span>

                {/* Namespace */}
                <span style={{ fontSize: 11, color: isDark ? t.textMuted : '#4B5563', ...mono }}>{release.namespace}</span>

                {/* Version */}
                <span style={{ fontSize: 11, color: isDark ? t.textSub : '#374151', ...mono }}>{release.chart_version}</span>

                {/* Updated */}
                <span style={{ fontSize: 11, color: isDark ? t.textMuted : '#6B7280' }}>{formatAge(release.updated)}</span>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => navigate(`/deploy/helm/workspace/${release.namespace}/${release.name}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 10, fontWeight: 500, background: isDark ? t.navHoverBg : '#F3F4F6', color: t.text, border: `1px solid ${isDark ? t.cardBorder : '#D1D5DB'}`, borderRadius: 5, cursor: 'pointer' }}
                  >
                    <EyeIcon style={{ width: 11, height: 11 }} /> View
                  </button>
                  <button
                    onClick={() => handleUpgrade(release)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 10, fontWeight: 500, background: isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF', color: '#3b82f6', border: `1px solid ${isDark ? 'rgba(59,130,246,0.2)' : '#BFDBFE'}`, borderRadius: 5, cursor: 'pointer' }}
                  >
                    <ArrowUpTrayIcon style={{ width: 11, height: 11 }} /> Up
                  </button>
                  <button
                    onClick={() => handleDelete(release)}
                    style={{ padding: '4px 6px', background: 'transparent', color: t.error, border: 'none', borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title="Delete"
                  >
                    <TrashIcon style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer count */}
        {filteredReleases.length > 0 && (
          <div style={{ padding: '0 32px', height: 32, display: 'flex', alignItems: 'center', borderTop: `1px solid ${t.cardBorder}`, flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: t.textMuted }}>{filteredReleases.length} release{filteredReleases.length !== 1 ? 's' : ''}{searchQuery || selectedNamespace !== 'all' ? ' (filtered)' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}
