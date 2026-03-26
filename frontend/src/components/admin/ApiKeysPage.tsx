import { useState } from 'react';
import {
  KeyIcon,
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors, mono, createCard } from '../../styles/linear-design';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
  permissions: string[];
  status: 'active' | 'expired' | 'revoked';
}

export default function ApiKeysPage() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';

  const [apiKeys] = useState<ApiKey[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const card = createCard(t, isDark);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: `1px solid ${t.cardBorder}`,
    background: t.mainBg,
    color: t.text,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const StatusBadge = ({ status }: { status: ApiKey['status'] }) => {
    const cfg = status === 'active'
      ? { bg: t.successBg, color: t.success, icon: CheckCircleIcon, label: 'Active' }
      : status === 'expired'
      ? { bg: t.warningBg, color: t.warning, icon: ExclamationTriangleIcon, label: 'Expired' }
      : { bg: t.errorBg, color: t.error, icon: ExclamationTriangleIcon, label: 'Revoked' };
    const Icon = cfg.icon;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 500, background: cfg.bg, color: cfg.color }}>
        <Icon style={{ width: 11, height: 11 }} />
        {cfg.label}
      </span>
    );
  };

  return (
    <div style={{ color: t.text }}>

      {/* ── Page header ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <KeyIcon style={{ width: 20, height: 20, color: t.info }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: t.text, margin: 0 }}>API Keys</h1>
          </div>
          <div style={{ fontSize: 13, color: t.textSub }}>Manage API keys for programmatic access to NextSight AI</div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: t.info, border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
        >
          <PlusIcon style={{ width: 13, height: 13 }} />
          Create API Key
        </button>
      </div>

      {/* ── Security Notice ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: t.warningBg, border: `1px solid ${t.warning}30`, borderRadius: 10, marginBottom: 24 }}>
        <ShieldCheckIcon style={{ width: 18, height: 18, color: t.warning, flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.warning, marginBottom: 3 }}>Security Notice</div>
          <p style={{ margin: 0, fontSize: 12, color: t.textSub, lineHeight: 1.6 }}>
            API keys provide programmatic access to your NextSight AI account. Keep them secure and never share them publicly. Rotate keys regularly and revoke any that may have been compromised.
          </p>
        </div>
      </div>

      {/* ── API Keys list ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
          Your API Keys
        </div>

        {apiKeys.length === 0 ? (
          <div style={{ ...card, padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(255,255,255,0.06)' : t.cardBorder, borderRadius: 14, padding: 18, marginBottom: 16 }}>
              <KeyIcon style={{ width: 28, height: 28, color: t.textMuted }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 8 }}>No API keys yet</div>
            <div style={{ fontSize: 13, color: t.textSub, marginBottom: 20 }}>Create your first API key to start integrating with NextSight AI</div>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{ padding: '8px 20px', background: t.info, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              Create API Key
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {apiKeys.map(apiKey => (
              <div key={apiKey.id} style={{ ...card, padding: 18 }}>

                {/* Key header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ background: t.infoBg, borderRadius: 9, padding: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <KeyIcon style={{ width: 16, height: 16, color: t.info }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 2 }}>{apiKey.name}</div>
                      <div style={{ fontSize: 11, color: t.textMuted }}>Created {apiKey.createdAt}</div>
                    </div>
                  </div>
                  <StatusBadge status={apiKey.status} />
                </div>

                {/* Key value */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: t.mainBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8, marginBottom: 14 }}>
                  <code style={{ flex: 1, fontSize: 12, ...mono, color: t.textSub }}>
                    {visibleKeys.has(apiKey.id) ? apiKey.key : '••••••••••••••••••••••••••••••'}
                  </code>
                  <button onClick={() => toggleKeyVisibility(apiKey.id)} title={visibleKeys.has(apiKey.id) ? 'Hide' : 'Show'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 4, display: 'flex', alignItems: 'center' }}>
                    {visibleKeys.has(apiKey.id) ? <EyeSlashIcon style={{ width: 14, height: 14 }} /> : <EyeIcon style={{ width: 14, height: 14 }} />}
                  </button>
                  <button onClick={() => copyToClipboard(apiKey.key, apiKey.id)} title="Copy" style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedKey === apiKey.id ? t.success : t.textMuted, padding: 4, display: 'flex', alignItems: 'center' }}>
                    {copiedKey === apiKey.id ? <CheckCircleIcon style={{ width: 14, height: 14 }} /> : <ClipboardDocumentIcon style={{ width: 14, height: 14 }} />}
                  </button>
                </div>

                {/* Permissions + meta */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {apiKey.permissions.map(perm => (
                      <span key={perm} style={{ padding: '2px 8px', fontSize: 11, fontWeight: 500, borderRadius: 4, background: t.mainBg, border: `1px solid ${t.cardBorder}`, color: t.textSub }}>
                        {perm}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: t.textMuted }}>
                    {apiKey.lastUsed && <span>Last used: {apiKey.lastUsed}</span>}
                    {apiKey.expiresAt && <span>Expires: {apiKey.expiresAt}</span>}
                    <button title="Revoke key" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 4, display: 'flex', alignItems: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.color = t.error)}
                      onMouseLeave={e => (e.currentTarget.style.color = t.textMuted)}
                    >
                      <TrashIcon style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create modal ─────────────────────────────────────────────── */}
      {showCreateModal && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} onClick={() => setShowCreateModal(false)} />
          <div style={{ position: 'fixed', inset: 0, zIndex: 51, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
            <div
              style={{ width: '100%', maxWidth: 440, background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 14, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.4)', pointerEvents: 'auto' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ background: t.infoBg, borderRadius: 9, padding: 8, display: 'flex' }}>
                  <KeyIcon style={{ width: 16, height: 16, color: t.info }} />
                </div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: t.text }}>Create New API Key</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>Key Name</label>
                  <input type="text" placeholder="e.g., Production API Key" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>Permissions</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 14px', background: t.mainBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8 }}>
                    {['Read', 'Write', 'Delete', 'Admin'].map(perm => (
                      <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: t.textSub }}>
                        <input type="checkbox" style={{ cursor: 'pointer', accentColor: t.info }} />
                        {perm}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>Expiration</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option>Never</option>
                    <option>30 days</option>
                    <option>90 days</option>
                    <option>1 year</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: '9px 16px', borderRadius: 8, border: `1px solid ${t.cardBorder}`, background: 'transparent', color: t.textSub, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: '9px 16px', borderRadius: 8, border: 'none', background: t.info, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                    Create Key
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
