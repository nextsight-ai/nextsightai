import { useState, useEffect } from 'react';
import { helmApi } from '../../services/api';
import { logger } from '../../utils/logger';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline';

const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };

interface HelmRepository {
  name: string;
  url: string;
}

interface HelmRepositoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onRepositoriesUpdated?: () => void;
}

export default function HelmRepositoryManager({ isOpen, onClose, onRepositoriesUpdated }: HelmRepositoryManagerProps) {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';

  const [repositories, setRepositories] = useState<HelmRepository[]>([
    { name: 'bitnami', url: 'https://charts.bitnami.com/bitnami' },
    { name: 'stable', url: 'https://charts.helm.sh/stable' },
    { name: 'prometheus-community', url: 'https://prometheus-community.github.io/helm-charts' },
    { name: 'jetstack', url: 'https://charts.jetstack.io' },
  ]);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchRepositories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await helmApi.listRepositories();
      if (response.data?.repositories) {
        setRepositories(response.data.repositories);
      }
    } catch (err) {
      logger.error('Failed to fetch repositories', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchRepositories();
  }, [isOpen]);

  const handleAddRepository = async () => {
    if (!newRepoName.trim() || !newRepoUrl.trim()) { setError('Repository name and URL are required'); return; }
    try { new URL(newRepoUrl); } catch { setError('Invalid URL format'); return; }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await helmApi.addRepository(newRepoName.trim(), newRepoUrl.trim());
      setSuccess(`Repository "${newRepoName}" added successfully`);
      setNewRepoName('');
      setNewRepoUrl('');
      fetchRepositories();
      onRepositoriesUpdated?.();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      logger.error('Failed to add repository', err);
      setError('Failed to add repository. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRepository = async (name: string) => {
    if (!confirm(`Are you sure you want to remove repository "${name}"?`)) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await helmApi.removeRepository(name);
      setSuccess(`Repository "${name}" removed successfully`);
      fetchRepositories();
      onRepositoriesUpdated?.();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      logger.error('Failed to remove repository', err);
      setError(`Failed to remove repository "${name}"`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRepositories = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await helmApi.updateRepositories();
      setSuccess('All repositories updated successfully');
      fetchRepositories();
      onRepositoriesUpdated?.();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      logger.error('Failed to update repositories', err);
      setError('Failed to update repositories');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const border = `1px solid ${t.cardBorder}`;
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 12,
    border, borderRadius: 7,
    background: isDark ? 'rgba(0,0,0,0.2)' : '#fff',
    color: t.text, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 600, background: t.cardBg, borderRadius: 14, boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(0,0,0,0.15)', border, overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: border }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#3b82f6,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ServerStackIcon style={{ width: 17, height: 17, color: '#fff' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Helm Repositories</h2>
              <p style={{ fontSize: 11, color: t.textMuted }}>Manage chart repositories</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, background: 'transparent', border: `1px solid ${t.cardBorder}`, cursor: 'pointer', color: t.textMuted }}
            onMouseEnter={e => { e.currentTarget.style.background = t.navHoverBg; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <XMarkIcon style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, maxHeight: '65vh', overflowY: 'auto' }}>

          {/* Status messages */}
          {error && (
            <div style={{ marginBottom: 12, padding: '9px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <ExclamationCircleIcon style={{ width: 15, height: 15, color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: '#EF4444' }}>{error}</p>
            </div>
          )}
          {success && (
            <div style={{ marginBottom: 12, padding: '9px 12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircleIcon style={{ width: 15, height: 15, color: '#10B981', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: '#10B981' }}>{success}</p>
            </div>
          )}

          {/* Add Repository */}
          <div style={{ marginBottom: 20, padding: 14, background: isDark ? 'rgba(0,0,0,0.15)' : '#F9FAFB', borderRadius: 10, border }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>Add New Repository</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: isDark ? '#D1D5DB' : '#374151', marginBottom: 5 }}>Repository Name</label>
                <input
                  type="text"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  placeholder="e.g., bitnami"
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = t.cardBorder; }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: isDark ? '#D1D5DB' : '#374151', marginBottom: 5 }}>Repository URL</label>
                <input
                  type="text"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  placeholder="https://charts.bitnami.com/bitnami"
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = t.cardBorder; }}
                />
              </div>
            </div>
            <button
              onClick={handleAddRepository}
              disabled={loading || !newRepoName.trim() || !newRepoUrl.trim()}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 0', borderRadius: 8, border: 'none',
                background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                opacity: (loading || !newRepoName.trim() || !newRepoUrl.trim()) ? 0.5 : 1,
                boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
              }}
            >
              <PlusIcon style={{ width: 15, height: 15 }} />
              Add Repository
            </button>
          </div>

          {/* Repository List Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: t.text }}>
              Installed Repositories ({repositories.length})
            </h3>
            <button
              onClick={handleUpdateRepositories}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7,
                fontSize: 11, fontWeight: 500, cursor: 'pointer',
                background: isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF',
                color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)',
                opacity: loading ? 0.5 : 1,
              }}
            >
              <ArrowPathIcon style={{ width: 13, height: 13 }} />
              Update All
            </button>
          </div>

          {/* Repository List */}
          {loading && repositories.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
              <ArrowPathIcon style={{ width: 28, height: 28, color: t.textMuted }} />
            </div>
          ) : repositories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <ServerStackIcon style={{ width: 40, height: 40, color: t.textMuted, margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, color: t.textMuted }}>No repositories configured</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {repositories.map((repo) => (
                <div
                  key={repo.name}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: t.cardBg, border, borderRadius: 9 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#3b82f6'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = t.cardBorder; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{repo.name}</span>
                      <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 9999, background: 'rgba(16,185,129,0.1)', color: '#10B981', fontWeight: 500 }}>Active</span>
                    </div>
                    <p style={{ fontSize: 11, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...mono }}>{repo.url}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveRepository(repo.name)}
                    disabled={loading}
                    title="Remove repository"
                    style={{ marginLeft: 10, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, background: 'transparent', border: '1px solid transparent', cursor: 'pointer', color: '#EF4444', opacity: loading ? 0.4 : 1 }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    <TrashIcon style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Popular Repositories Reference */}
          <div style={{ marginTop: 20, padding: 14, background: isDark ? 'rgba(59,130,246,0.06)' : '#EFF6FF', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10 }}>
            <h4 style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#93C5FD' : '#1D4ED8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Popular Repositories</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                ['Bitnami', 'https://charts.bitnami.com/bitnami'],
                ['Jetstack', 'https://charts.jetstack.io'],
                ['Prometheus', 'https://prometheus-community.github.io/helm-charts'],
              ].map(([name, url]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: isDark ? '#BFDBFE' : '#1E40AF', flexShrink: 0 }}>{name}:</span>
                  <code style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)', color: isDark ? '#93C5FD' : '#2563EB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...mono }}>{url}</code>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '12px 20px', borderTop: border }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: isDark ? t.navHoverBg : '#F3F4F6',
              color: isDark ? '#E5E7EB' : '#374151',
              border,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isDark ? t.navHoverBg : '#F3F4F6'; }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
