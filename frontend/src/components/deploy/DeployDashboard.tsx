import { useState } from 'react';
import YAMLDeployEnhanced from './YAMLDeployEnhanced';
import HelmDeploy from './HelmDeploy';
import ArgoCDDeploy from './ArgoCDDeploy';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';
import { RocketLaunchIcon } from '@heroicons/react/24/outline';

type DeployTab = 'yaml' | 'helm' | 'argocd';

const TABS: { id: DeployTab; label: string; badge: string; desc: string }[] = [
  { id: 'yaml',   label: 'YAML',   badge: 'AI',     desc: 'Deploy Kubernetes manifests directly' },
  { id: 'helm',   label: 'Helm',   badge: 'PKG',    desc: 'Package manager for Kubernetes' },
  { id: 'argocd', label: 'ArgoCD', badge: 'GitOps', desc: 'Continuous delivery via Git' },
];

export default function DeployDashboard() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const isDark = theme === 'dark';
  const [active, setActive] = useState<DeployTab>('yaml');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-28px -32px', height: 'calc(100vh - 52px)', color: t.text, overflow: 'hidden' }}>

      {/* ── Header bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', height: 48, borderBottom: `1px solid ${t.cardBorder}`,
        background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RocketLaunchIcon style={{ width: 14, height: 14, color: '#3b82f6' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, letterSpacing: -0.2 }}>Deployment Center</div>
            <div style={{ fontSize: 10, color: t.textMuted, lineHeight: 1.2 }}>
              {TABS.find(t => t.id === active)?.desc}
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: 8, padding: 3 }}>
          {TABS.map(tab => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: isActive ? (isDark ? 'rgba(255,255,255,0.09)' : '#fff') : 'transparent',
                  color: isActive ? t.text : t.textMuted,
                  fontSize: 11, fontWeight: isActive ? 500 : 400,
                  boxShadow: isActive ? (isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.08)') : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: 0.5,
                  color: isActive ? '#3b82f6' : t.textMuted,
                  fontFamily: "'SF Mono','Fira Code',monospace",
                }}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {active === 'yaml'   && <YAMLDeployEnhanced key="yaml" />}
        {active === 'helm'   && <HelmDeploy key="helm" />}
        {active === 'argocd' && <ArgoCDDeploy key="argocd" />}
      </div>
    </div>
  );
}
