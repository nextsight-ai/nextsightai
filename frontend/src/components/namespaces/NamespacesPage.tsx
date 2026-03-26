import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowPathIcon, PlusIcon, MagnifyingGlassIcon,
  FolderIcon, CubeIcon, RocketLaunchIcon,
  TrashIcon, Squares2X2Icon, ListBulletIcon,
} from '@heroicons/react/24/outline';
import { kubernetesApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import type { NamespaceDetail } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';
import K8sHeader from '../kubernetes/K8sHeader';
import ResourceDetailWindow, { type RDWResource } from '../kubernetes/ResourceDetailWindow';

const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };
const PROTECTED = ['default', 'kube-system', 'kube-public', 'kube-node-lease'];

// ─── Modal shell ──────────────────────────────────────────────────────────────
function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', padding: 16 }} onClick={onClose}>
      <div style={{ background: t.cardBg, borderRadius: 14, width: '100%', maxWidth: 480, border: `1px solid ${t.cardBorder}`, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: t.text, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: 4, fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Create modal ─────────────────────────────────────────────────────────────
function CreateNamespaceModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const [name, setName] = useState('');
  const [labels, setLabels] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) { setError('Name is required'); return; }
    const nameRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
    if (!nameRegex.test(name)) { setError('Lowercase alphanumeric with hyphens, max 63 chars'); return; }
    setLoading(true); setError(null);
    try {
      const labelsObj: Record<string, string> = {};
      labels.forEach(l => { if (l.key) labelsObj[l.key] = l.value; });
      await kubernetesApi.createNamespace({ name, labels: Object.keys(labelsObj).length > 0 ? labelsObj : undefined });
      onSuccess(); onClose(); setName(''); setLabels([{ key: '', value: '' }]);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to create namespace');
    } finally { setLoading(false); }
  };

  const inputStyle = { width: '100%', padding: '8px 12px', background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8, fontSize: 12, color: t.text, outline: 'none', boxSizing: 'border-box' as const };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Namespace">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 11, color: '#fca5a5' }}>{error}</div>}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>Name</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value.toLowerCase())} style={{ ...inputStyle, ...mono }} placeholder="my-namespace" />
          <p style={{ marginTop: 4, fontSize: 10, color: t.textMuted }}>Lowercase alphanumeric with hyphens</p>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>Labels <span style={{ color: t.textMuted, fontWeight: 400 }}>(optional)</span></label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {labels.map((label, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8 }}>
                <input type="text" placeholder="Key" value={label.key} onChange={e => { const n = [...labels]; n[idx].key = e.target.value; setLabels(n); }} style={{ ...inputStyle, ...mono }} />
                <input type="text" placeholder="Value" value={label.value} onChange={e => { const n = [...labels]; n[idx].value = e.target.value; setLabels(n); }} style={{ ...inputStyle, ...mono }} />
                {labels.length > 1 && <button type="button" onClick={() => setLabels(p => p.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 18 }}>×</button>}
              </div>
            ))}
            <button type="button" onClick={() => setLabels(p => [...p, { key: '', value: '' }])} style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer', fontSize: 11, fontWeight: 500, textAlign: 'left', padding: 0 }}>+ Add Label</button>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <button type="button" onClick={onClose} style={{ padding: '7px 14px', background: 'none', border: 'none', color: t.textSub, cursor: 'pointer', fontSize: 12, borderRadius: 8 }}>Cancel</button>
          <button type="submit" disabled={loading} style={{ padding: '7px 16px', background: '#a855f7', border: 'none', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 500, borderRadius: 8, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({ isOpen, onClose, onConfirm, namespaceName, loading }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; namespaceName: string; loading: boolean }) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const [confirmText, setConfirmText] = useState('');
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Namespace">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#fca5a5', margin: '0 0 4px' }}>This action cannot be undone</p>
          <p style={{ fontSize: 11, color: '#dc2626', margin: 0 }}>All resources in <code style={{ ...mono, background: 'rgba(239,68,68,0.15)', padding: '1px 5px', borderRadius: 4 }}>{namespaceName}</code> will be permanently deleted.</p>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>Type <code style={{ color: '#ef4444', ...mono }}>{namespaceName}</code> to confirm</label>
          <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8, fontSize: 12, color: t.text, outline: 'none', ...mono, boxSizing: 'border-box' }} placeholder="Enter namespace name" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '7px 14px', background: 'none', border: 'none', color: t.textSub, cursor: 'pointer', fontSize: 12, borderRadius: 8 }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading || confirmText !== namespaceName} style={{ padding: '7px 16px', background: '#ef4444', border: 'none', color: '#fff', cursor: (loading || confirmText !== namespaceName) ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 500, borderRadius: 8, opacity: (loading || confirmText !== namespaceName) ? 0.5 : 1 }}>
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NamespacesPage() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';
  const { hasRole } = useAuth();
  const canManage = hasRole('operator');

  const [namespaces, setNamespaces] = useState<NamespaceDetail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [rdw, setRdw] = useState<{ resources: RDWResource[]; activeId: string; forceRestore: number } | null>(null);

  const openNamespace = (ns: NamespaceDetail) => {
    const id = `Namespace/_/${ns.name}`;
    setRdw(prev => {
      if (!prev) return { resources: [{ id, kind: 'Namespace', name: ns.name, namespace: '', resourceObj: ns }], activeId: id, forceRestore: 0 };
      if (prev.resources.some(r => r.id === id)) return { ...prev, activeId: id, forceRestore: prev.forceRestore + 1 };
      return { ...prev, resources: [...prev.resources, { id, kind: 'Namespace', name: ns.name, namespace: '', resourceObj: ns }], activeId: id, forceRestore: prev.forceRestore + 1 };
    });
  };

  const closeRdwTab = (id: string) => setRdw(prev => {
    if (!prev) return null;
    const resources = prev.resources.filter(r => r.id !== id);
    if (!resources.length) return null;
    return { ...prev, resources, activeId: prev.activeId === id ? resources[resources.length - 1].id : prev.activeId };
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'system' | 'user'>('all');

  const loadNamespaces = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await kubernetesApi.getNamespacesWithDetails();
      const unique = Array.from(new Map((res.data || []).map((ns: NamespaceDetail) => [ns.name, ns])).values()) as NamespaceDetail[];
      setNamespaces(unique);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load namespaces');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadNamespaces(); }, [loadNamespaces]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleteLoading(true);
    try {
      await kubernetesApi.deleteNamespace(deleteModal.name);
      loadNamespaces(); setDeleteModal(null); setRdw(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to delete namespace');
    } finally { setDeleteLoading(false); }
  };

  const filteredNamespaces = useMemo(() => namespaces.filter(ns => {
    const matchesSearch = ns.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isSystem = PROTECTED.includes(ns.name);
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'active' && ns.status === 'Active') ||
      (filterStatus === 'system' && isSystem) ||
      (filterStatus === 'user' && !isSystem);
    return matchesSearch && matchesFilter;
  }), [namespaces, searchQuery, filterStatus]);

  const stats = useMemo(() => ({
    total:       namespaces.length,
    active:      namespaces.filter(ns => ns.status === 'Active').length,
    pods:        namespaces.reduce((a, ns) => a + ns.pods, 0),
    deployments: namespaces.reduce((a, ns) => a + ns.deployments, 0),
  }), [namespaces]);

  const card = { background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 14, boxShadow: isDark ? 'none' : '0 1px 6px rgba(0,0,0,0.05)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-28px -32px', height: 'calc(100vh - 52px)', color: t.text, overflow: 'hidden' }}>

      <K8sHeader
        title="Namespaces"
        subtitle="Manage cluster namespace isolation"
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={loadNamespaces} disabled={loading} style={{ background: 'transparent', border: 'none', color: t.textSub, cursor: loading ? 'wait' : 'pointer', fontSize: 11, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
              onMouseEnter={e => !loading && (e.currentTarget.style.color = t.text)}
              onMouseLeave={e => !loading && (e.currentTarget.style.color = t.textSub)}>
              <ArrowPathIcon style={{ width: 12, height: 12 }} />
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            {canManage && (
              <button onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#a855f7', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 500, borderRadius: 7 }}>
                <PlusIcon style={{ width: 11, height: 11 }} />
                Create
              </button>
            )}
          </div>
        }
      />

      <main style={{ flex: 1, overflow: 'auto', padding: '20px 32px' }}>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        )}

        {/* ── Stats strip ──────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { icon: FolderIcon,       label: 'Total',       value: loading ? '—' : String(stats.total),       color: '#a855f7' },
            { icon: FolderIcon,       label: 'Active',      value: loading ? '—' : String(stats.active),      color: '#22c55e' },
            { icon: CubeIcon,         label: 'Total Pods',  value: loading ? '—' : String(stats.pods),        color: '#3b82f6' },
            { icon: RocketLaunchIcon, label: 'Deployments', value: loading ? '—' : String(stats.deployments), color: '#f59e0b' },
          ].map((s, i) => (
            <div key={i} style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: s.color + (isDark ? '22' : '18'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon style={{ width: 16, height: 16, color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: t.text, lineHeight: 1, marginBottom: 2 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: t.textMuted }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
            <MagnifyingGlassIcon style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: t.textSub }} />
            <input type="text" placeholder="Search namespaces…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '7px 10px 7px 28px', background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8, fontSize: 12, color: t.text, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 3, background: t.cardBg, padding: 3, borderRadius: 8, border: `1px solid ${t.cardBorder}` }}>
            {(['all', 'active', 'system', 'user'] as const).map(f => (
              <button key={f} onClick={() => setFilterStatus(f)} style={{ padding: '5px 10px', background: filterStatus === f ? '#a855f7' : 'transparent', border: 'none', color: filterStatus === f ? '#fff' : t.textMuted, cursor: 'pointer', fontSize: 11, fontWeight: 500, borderRadius: 6, textTransform: 'capitalize', transition: 'all 0.15s' }}>
                {f}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 3, background: t.cardBg, padding: 3, borderRadius: 8, border: `1px solid ${t.cardBorder}` }}>
            <button onClick={() => setViewMode('grid')} style={{ padding: '5px 8px', background: viewMode === 'grid' ? '#a855f7' : 'transparent', border: 'none', color: viewMode === 'grid' ? '#fff' : t.textMuted, cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center' }}>
              <Squares2X2Icon style={{ width: 13, height: 13 }} />
            </button>
            <button onClick={() => setViewMode('table')} style={{ padding: '5px 8px', background: viewMode === 'table' ? '#a855f7' : 'transparent', border: 'none', color: viewMode === 'table' ? '#fff' : t.textMuted, cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center' }}>
              <ListBulletIcon style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>

        {/* ── Loading ───────────────────────────────────────────────────── */}
        {loading && namespaces.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: t.textMuted, fontSize: 13 }}>Loading namespaces…</div>
        )}

        {/* ── Content ───────────────────────────────────────────────────── */}
        {!loading && (
          <div>
            <div>
              {filteredNamespaces.length === 0 ? (
                <div style={{ ...card, padding: '40px 24px', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>
                  {searchQuery ? 'No matches found' : 'No namespaces'}
                </div>
              ) : viewMode === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                  {filteredNamespaces.map(ns => {
                    const isProtected = PROTECTED.includes(ns.name);
                    const isSelected  = rdw?.activeId === `Namespace/_/${ns.name}`;
                    const isActive    = ns.status === 'Active';
                    return (
                      <div key={ns.name} onClick={() => openNamespace(ns)}
                        style={{ ...card, padding: '14px 16px', cursor: 'pointer', borderColor: isSelected ? '#a855f7' : t.cardBorder, position: 'relative', transition: 'all 0.15s' }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = t.navHoverBg; }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = t.cardBg; }}>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <FolderIcon style={{ width: 14, height: 14, color: isProtected ? '#3b82f6' : '#a855f7', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ns.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#22c55e' : '#f59e0b', boxShadow: isActive ? '0 0 5px #22c55e' : '0 0 5px #f59e0b' }} />
                            {isProtected && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: isDark ? 'rgba(59,130,246,0.15)' : '#DBEAFE', color: '#3b82f6', fontWeight: 600 }}>SYS</span>}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                          {[
                            { label: 'Pods',    value: ns.pods },
                            { label: 'Deploy',  value: ns.deployments },
                            { label: 'Svc',     value: ns.services },
                            { label: 'Age',     value: ns.age, text: true },
                          ].map((item, i) => (
                            <div key={i} style={{ textAlign: 'center', padding: '6px 4px', background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 7 }}>
                              <div style={{ fontSize: item.text ? 10 : 13, fontWeight: item.text ? 400 : 700, color: t.text, ...mono }}>{item.value}</div>
                              <div style={{ fontSize: 9, color: t.textMuted, marginTop: 1 }}>{item.label}</div>
                            </div>
                          ))}
                        </div>

                        {canManage && !isProtected && (
                          <button onClick={e => { e.stopPropagation(); setDeleteModal({ isOpen: true, name: ns.name }); }}
                            style={{ position: 'absolute', top: 10, right: 10, background: t.cardBg, border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', padding: '3px 6px', fontSize: 11, borderRadius: 6, opacity: 0, transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', gap: 3 }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                            <TrashIcon style={{ width: 11, height: 11 }} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Table view */
                <div style={{ ...card, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 70px 70px 70px 70px 70px 90px 44px', gap: 8, padding: '9px 18px', fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: `1px solid ${t.cardBorder}` }}>
                    <span>Name</span><span>Status</span>
                    <span style={{ textAlign: 'center' }}>Pods</span>
                    <span style={{ textAlign: 'center' }}>Deploy</span>
                    <span style={{ textAlign: 'center' }}>Svc</span>
                    <span style={{ textAlign: 'center' }}>CM</span>
                    <span style={{ textAlign: 'center' }}>Sec</span>
                    <span>Age</span><span />
                  </div>
                  {filteredNamespaces.map((ns, i) => {
                    const isProtected = PROTECTED.includes(ns.name);
                    const isSelected  = rdw?.activeId === `Namespace/_/${ns.name}`;
                    const isActive    = ns.status === 'Active';
                    return (
                      <div key={ns.name} onClick={() => openNamespace(ns)}
                        style={{ display: 'grid', gridTemplateColumns: '2fr 100px 70px 70px 70px 70px 70px 90px 44px', gap: 8, padding: '10px 18px', borderBottom: i < filteredNamespaces.length - 1 ? `1px solid ${t.cardBorder}` : 'none', cursor: 'pointer', background: isSelected ? (isDark ? 'rgba(168,85,247,0.1)' : '#faf5ff') : 'transparent', alignItems: 'center', transition: 'background 0.1s' }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = t.navHoverBg; }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <FolderIcon style={{ width: 13, height: 13, color: isProtected ? '#3b82f6' : '#a855f7', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: t.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ns.name}</span>
                          {isProtected && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: isDark ? 'rgba(59,130,246,0.15)' : '#DBEAFE', color: '#3b82f6', fontWeight: 600, flexShrink: 0 }}>SYS</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#22c55e' : '#f59e0b', boxShadow: isActive ? '0 0 4px rgba(34,197,94,0.5)' : '0 0 4px rgba(245,158,11,0.5)' }} />
                          <span style={{ fontSize: 11, color: isActive ? '#22c55e' : '#f59e0b', fontWeight: 500 }}>{ns.status}</span>
                        </div>
                        {[ns.pods, ns.deployments, ns.services, ns.configmaps, ns.secrets].map((v, ci) => (
                          <span key={ci} style={{ fontSize: 11, textAlign: 'center', color: t.textSub, ...mono }}>{v}</span>
                        ))}
                        <span style={{ fontSize: 11, color: t.textMuted, ...mono }}>{ns.age}</span>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          {canManage && !isProtected && (
                            <button onClick={e => { e.stopPropagation(); setDeleteModal({ isOpen: true, name: ns.name }); }}
                              style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={e => e.currentTarget.style.color = t.textMuted}>
                              <TrashIcon style={{ width: 13, height: 13 }} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {rdw && (
        <ResourceDetailWindow
          resources={rdw.resources}
          activeId={rdw.activeId}
          onActiveChange={id => setRdw(prev => prev ? { ...prev, activeId: id } : null)}
          onCloseTab={closeRdwTab}
          onClose={() => setRdw(null)}
          forceRestore={rdw.forceRestore}
        />
      )}

      <CreateNamespaceModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={loadNamespaces} />
      {deleteModal && <DeleteConfirmModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal(null)} onConfirm={handleDelete} namespaceName={deleteModal.name} loading={deleteLoading} />}
    </div>
  );
}
