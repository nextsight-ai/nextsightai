import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LinkIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  TrashIcon,
  CloudIcon,
  BeakerIcon,
  ChartBarIcon,
  BellIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { settingsApi, Integration as ApiIntegration } from '../../services/api';
import { logger } from '../../utils/logger';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';

interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  config?: Record<string, string>;
  isManaged?: boolean;
  setupUrl?: string;
}

// Map API categories to display categories
const categoryMap: Record<string, string> = {
  'source-control': 'Source Control',
  'ci-cd': 'CI/CD',
  'monitoring': 'Monitoring',
  'logging': 'Logging',
  'cloud': 'Cloud',
  'notification': 'Notifications',
};

// Icon mapping for integrations
const iconMap: Record<string, string> = {
  'github': '🐙',
  'gitlab': '🦊',
  'argocd': '🔄',
  'helm': '⎈',
  'jenkins': '🔧',
  'grafana': '📈',
  'prometheus': '📊',
  'loki': '📝',
  'aws': '☁️',
  'azure': '🌐',
  'gcp': '🔷',
  'slack': '💬',
};

// Tab configuration
const tabs = [
  { id: 'all', label: 'All', icon: LinkIcon },
  { id: 'source-control', label: 'Source Control', icon: LinkIcon },
  { id: 'ci-cd', label: 'CI/CD', icon: BeakerIcon },
  { id: 'monitoring', label: 'Monitoring', icon: ChartBarIcon },
  { id: 'logging', label: 'Logging', icon: ChartBarIcon },
  { id: 'cloud', label: 'Cloud', icon: CloudIcon },
  { id: 'notification', label: 'Notifications', icon: BellIcon },
];

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [connectForm, setConnectForm] = useState({ endpoint: '', apiToken: '' });

  // Fetch integrations from API
  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await settingsApi.listIntegrations();

      const transformed = response.data.map((item: ApiIntegration) => ({
        id: item.id,
        name: item.name,
        category: categoryMap[item.category] || item.category,
        description: item.description || '',
        icon: iconMap[item.icon?.toLowerCase() || ''] || '🔗',
        status: item.status,
        lastSync: item.last_sync ? new Date(item.last_sync).toLocaleString() : undefined,
        isManaged: item.is_managed ?? false,
        setupUrl: item.setup_url ?? undefined,
        config: item.config as Record<string, string> | undefined,
      }));

      setIntegrations(transformed);
    } catch (err: any) {
      logger.error('Failed to fetch integrations', err);
      setError(err.response?.data?.detail || 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (integration: Integration) => {
    if (integration.isManaged && integration.setupUrl) {
      navigate(integration.setupUrl);
      return;
    }
    setSelectedIntegration(integration);
    setConnectForm({ endpoint: '', apiToken: '' });
    setShowConnectModal(true);
  };

  const handleSubmitConnect = async () => {
    if (!selectedIntegration || !connectForm.endpoint) return;

    try {
      setConnectingId(selectedIntegration.id);
      await settingsApi.connectIntegration(selectedIntegration.id, {
        endpoint: connectForm.endpoint,
        api_token: connectForm.apiToken || undefined,
      });
      await fetchIntegrations();
      setShowConnectModal(false);
    } catch (err: any) {
      logger.error('Failed to connect integration', err);
      setError(err.response?.data?.detail || 'Failed to connect integration');
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      setConnectingId(id);
      await settingsApi.disconnectIntegration(id);
      await fetchIntegrations();
    } catch (err: any) {
      logger.error('Failed to disconnect integration', err);
      setError(err.response?.data?.detail || 'Failed to disconnect integration');
    } finally {
      setConnectingId(null);
    }
  };

  const handleSync = async (id: string) => {
    try {
      setConnectingId(id);
      await settingsApi.checkIntegrationStatus(id);
      await fetchIntegrations();
    } catch (err: any) {
      logger.error('Failed to sync integration', err);
    } finally {
      setConnectingId(null);
    }
  };

  const handleEdit = (integration: Integration) => {
    setSelectedIntegration(integration);
    setConnectForm({
      endpoint: integration.config?.endpoint || '',
      apiToken: integration.config?.api_token || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedIntegration) return;

    try {
      setConnectingId(selectedIntegration.id);
      await settingsApi.connectIntegration(selectedIntegration.id, {
        endpoint: connectForm.endpoint,
        api_token: connectForm.apiToken || undefined,
      });
      await fetchIntegrations();
      setShowEditModal(false);
    } catch (err: any) {
      logger.error('Failed to update integration', err);
      setError(err.response?.data?.detail || 'Failed to update integration');
    } finally {
      setConnectingId(null);
    }
  };

  const tabToCategory: Record<string, string | null> = {
    'all': null,
    'source-control': 'Source Control',
    'ci-cd': 'CI/CD',
    'monitoring': 'Monitoring',
    'logging': 'Logging',
    'cloud': 'Cloud',
    'notification': 'Notifications',
  };

  const selectedCategory = tabToCategory[activeTab];

  const connectedIntegrations = integrations.filter(i => i.status === 'connected' || i.status === 'error');
  const availableIntegrations = integrations.filter(i => i.status === 'disconnected');

  const filteredConnected = connectedIntegrations.filter(
    i => !selectedCategory || i.category === selectedCategory
  );

  const filteredAvailable = availableIntegrations.filter(
    i => !selectedCategory || i.category === selectedCategory
  );

  const cardStyle = {
    background: t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 12,
    padding: 16,
  };

  const inputStyle = {
    background: 'transparent',
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 6,
    padding: '6px 10px',
    color: t.text,
    fontSize: 13,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, background: t.mainBg }}>
        <ArrowPathIcon style={{ width: 28, height: 28, color: t.info, animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ color: t.text }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <LinkIcon style={{ width: 22, height: 22, color: t.info }} />
            <h1 style={{ fontSize: 20, fontWeight: 600, color: t.text, margin: 0 }}>Integrations</h1>
          </div>
          <p style={{ fontSize: 13, color: t.textMuted, margin: 0, paddingLeft: 34 }}>
            Connect external services and tools to NextSight AI
          </p>
        </div>
        <button
          onClick={fetchIntegrations}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', background: t.cardBg,
            border: `1px solid ${t.cardBorder}`, borderRadius: 8,
            color: t.textSub, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          <ArrowPathIcon style={{ width: 14, height: 14 }} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', marginBottom: 16,
          background: t.errorBg, border: `1px solid ${t.error}`,
          borderRadius: 8, fontSize: 13, color: t.error,
        }}>
          {error}
        </div>
      )}

      {/* Category Tabs */}
      <div style={{
        display: 'flex', gap: 6, flexWrap: 'wrap',
        borderBottom: `1px solid ${t.cardBorder}`, paddingBottom: 16, marginBottom: 24,
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', whiteSpace: 'nowrap',
              background: activeTab === tab.id ? t.info : t.cardBg,
              color: activeTab === tab.id ? '#fff' : t.textSub,
              border: activeTab === tab.id ? 'none' : `1px solid ${t.cardBorder}`,
            }}
          >
            <tab.icon style={{ width: 13, height: 13 }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Connected Integrations */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: t.textSub, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 14px' }}>
          Connected Integrations ({filteredConnected.length})
        </h3>

        {filteredConnected.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: t.mainBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
            }}>
              <LinkIcon style={{ width: 24, height: 24, color: t.textMuted }} />
            </div>
            <h4 style={{ fontSize: 15, fontWeight: 500, color: t.text, margin: '0 0 6px' }}>
              {selectedCategory ? `No ${selectedCategory} Integrations` : 'No Integrations Connected'}
            </h4>
            <p style={{ fontSize: 13, color: t.textMuted, margin: 0 }}>Connect an integration below to get started</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {filteredConnected.map((integration) => (
              <div
                key={integration.id}
                style={{
                  ...cardStyle,
                  borderColor: integration.status === 'error' ? t.error : t.cardBorder,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{integration.icon}</span>
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 500, color: t.text, margin: 0 }}>{integration.name}</h4>
                      <p style={{ fontSize: 11, color: t.textMuted, margin: '2px 0 0' }}>{integration.category}</p>
                    </div>
                  </div>
                  {integration.status === 'connected'
                    ? <CheckCircleIcon style={{ width: 18, height: 18, color: t.success }} />
                    : <ExclamationCircleIcon style={{ width: 18, height: 18, color: t.error }} />}
                </div>
                <p style={{ fontSize: 12, color: t.textSub, margin: '0 0 10px' }}>{integration.description}</p>
                {integration.lastSync && (
                  <p style={{ fontSize: 11, color: t.textMuted, margin: '0 0 10px' }}>Last synced: {integration.lastSync}</p>
                )}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: 10, borderTop: `1px solid ${t.cardBorder}`,
                }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                    background: integration.status === 'connected' ? t.successBg : t.errorBg,
                    color: integration.status === 'connected' ? t.success : t.error,
                    border: `1px solid ${integration.status === 'connected' ? t.success : t.error}`,
                  }}>
                    {integration.status === 'connected' ? 'Connected' : 'Error'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button
                      onClick={() => handleSync(integration.id)}
                      disabled={connectingId === integration.id}
                      style={{
                        padding: 6, background: 'transparent', border: 'none',
                        borderRadius: 6, cursor: 'pointer', color: t.textMuted,
                        opacity: connectingId === integration.id ? 0.5 : 1,
                      }}
                    >
                      <ArrowPathIcon style={{ width: 14, height: 14 }} />
                    </button>
                    <button
                      onClick={() => handleEdit(integration)}
                      style={{ padding: 6, background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: t.textMuted }}
                      title="Configure"
                    >
                      <Cog6ToothIcon style={{ width: 14, height: 14 }} />
                    </button>
                    <button
                      onClick={() => handleDisconnect(integration.id)}
                      disabled={connectingId === integration.id}
                      style={{
                        padding: 6, background: 'transparent', border: 'none',
                        borderRadius: 6, cursor: 'pointer', color: t.textMuted,
                        opacity: connectingId === integration.id ? 0.5 : 1,
                      }}
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

      {/* Available Integrations */}
      <div>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: t.textSub, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 14px' }}>
          Available Integrations ({filteredAvailable.length})
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {filteredAvailable.map((integration) => (
            <div
              key={integration.id}
              style={{
                ...cardStyle,
                borderColor: integration.isManaged ? t.info : t.cardBorder,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{integration.icon}</span>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 500, color: t.text, margin: 0 }}>{integration.name}</h4>
                    <p style={{ fontSize: 10, color: t.textMuted, margin: '1px 0 0' }}>{integration.category}</p>
                  </div>
                </div>
                {integration.isManaged && (
                  <span style={{
                    padding: '1px 6px', borderRadius: 20, fontSize: 10, fontWeight: 500,
                    background: t.infoBg, color: t.info, border: `1px solid ${t.info}`,
                  }}>
                    Managed
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: t.textMuted, margin: '0 0 10px' }}>{integration.description}</p>
              <button
                onClick={() => handleConnect(integration)}
                disabled={connectingId === integration.id}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  cursor: connectingId === integration.id ? 'not-allowed' : 'pointer',
                  opacity: connectingId === integration.id ? 0.5 : 1,
                  background: integration.isManaged ? t.info : 'transparent',
                  color: integration.isManaged ? '#fff' : t.info,
                  border: integration.isManaged ? 'none' : `1px solid ${t.info}`,
                }}
              >
                {connectingId === integration.id ? (
                  <ArrowPathIcon style={{ width: 12, height: 12 }} />
                ) : integration.isManaged ? (
                  <Cog6ToothIcon style={{ width: 12, height: 12 }} />
                ) : (
                  <PlusIcon style={{ width: 12, height: 12 }} />
                )}
                {integration.isManaged ? 'Setup' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Connect Modal */}
      {showConnectModal && selectedIntegration && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)',
        }}>
          <div style={{
            width: '100%', maxWidth: 440,
            background: t.cardBg, border: `1px solid ${t.cardBorder}`,
            borderRadius: 14, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: t.text, margin: 0 }}>
                Connect {selectedIntegration.name}
              </h3>
              <button
                onClick={() => setShowConnectModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 4 }}
              >
                <XMarkIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>
                  Endpoint URL *
                </label>
                <input
                  type="url"
                  value={connectForm.endpoint}
                  onChange={(e) => setConnectForm(f => ({ ...f, endpoint: e.target.value }))}
                  placeholder="https://api.example.com"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>
                  API Token (optional)
                </label>
                <input
                  type="password"
                  value={connectForm.apiToken}
                  onChange={(e) => setConnectForm(f => ({ ...f, apiToken: e.target.value }))}
                  placeholder="Enter API token"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setShowConnectModal(false)}
                style={{
                  flex: 1, padding: '8px 16px', borderRadius: 8,
                  background: 'transparent', border: `1px solid ${t.cardBorder}`,
                  color: t.textSub, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitConnect}
                disabled={!connectForm.endpoint || connectingId !== null}
                style={{
                  flex: 1, padding: '8px 16px', borderRadius: 8,
                  background: t.info, border: 'none',
                  color: '#fff', fontSize: 13, fontWeight: 500,
                  cursor: !connectForm.endpoint || connectingId !== null ? 'not-allowed' : 'pointer',
                  opacity: !connectForm.endpoint || connectingId !== null ? 0.5 : 1,
                }}
              >
                {connectingId ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Configure Modal */}
      {showEditModal && selectedIntegration && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)',
        }}>
          <div style={{
            width: '100%', maxWidth: 440,
            background: t.cardBg, border: `1px solid ${t.cardBorder}`,
            borderRadius: 14, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{selectedIntegration.icon}</span>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: t.text, margin: 0 }}>
                    Configure {selectedIntegration.name}
                  </h3>
                  <span style={{
                    fontSize: 11, padding: '1px 8px', borderRadius: 20,
                    background: selectedIntegration.status === 'connected' ? t.successBg : t.errorBg,
                    color: selectedIntegration.status === 'connected' ? t.success : t.error,
                    border: `1px solid ${selectedIntegration.status === 'connected' ? t.success : t.error}`,
                  }}>
                    {selectedIntegration.status === 'connected' ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 4 }}
              >
                <XMarkIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {selectedIntegration.config?.auto_detected && (
              <div style={{
                marginBottom: 16, padding: '10px 12px',
                background: t.infoBg, border: `1px solid ${t.info}`, borderRadius: 8,
              }}>
                <p style={{ fontSize: 12, color: t.info, margin: 0 }}>
                  <strong>Auto-detected</strong> in namespace: {selectedIntegration.config?.namespace || 'unknown'}
                </p>
                <p style={{ fontSize: 12, color: t.info, margin: '4px 0 0' }}>
                  Service: {selectedIntegration.config?.service || 'unknown'}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>
                  Endpoint URL
                </label>
                <input
                  type="url"
                  value={connectForm.endpoint}
                  onChange={(e) => setConnectForm(f => ({ ...f, endpoint: e.target.value }))}
                  placeholder="https://api.example.com"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>
                  API Token (optional)
                </label>
                <input
                  type="password"
                  value={connectForm.apiToken}
                  onChange={(e) => setConnectForm(f => ({ ...f, apiToken: e.target.value }))}
                  placeholder="Enter API token"
                  style={inputStyle}
                />
              </div>

              {selectedIntegration.lastSync && (
                <p style={{ fontSize: 11, color: t.textMuted, margin: 0 }}>
                  Last synced: {selectedIntegration.lastSync}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  flex: 1, padding: '8px 16px', borderRadius: 8,
                  background: 'transparent', border: `1px solid ${t.cardBorder}`,
                  color: t.textSub, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!connectForm.endpoint || connectingId !== null}
                style={{
                  flex: 1, padding: '8px 16px', borderRadius: 8,
                  background: t.info, border: 'none',
                  color: '#fff', fontSize: 13, fontWeight: 500,
                  cursor: !connectForm.endpoint || connectingId !== null ? 'not-allowed' : 'pointer',
                  opacity: !connectForm.endpoint || connectingId !== null ? 0.5 : 1,
                }}
              >
                {connectingId ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
