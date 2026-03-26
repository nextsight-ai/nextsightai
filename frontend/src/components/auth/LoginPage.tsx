import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  EyeIcon, EyeSlashIcon, ExclamationCircleIcon, SparklesIcon,
  ServerStackIcon, CubeIcon, CpuChipIcon, CircleStackIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/axios';

interface OAuthProvider { name: string; key: string; }

const GoogleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);
const GitHubIcon = () => (
  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
  </svg>
);
const GitLabIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24">
    <path fill="#E24329" d="M12 21.35l3.19-9.81H8.81z"/>
    <path fill="#FC6D26" d="M12 21.35l-3.19-9.81H2.29z"/>
    <path fill="#FCA326" d="M2.29 11.54l-.95 2.93c-.09.27 0 .57.23.73L12 21.35z"/>
    <path fill="#E24329" d="M2.29 11.54h6.52L5.95 2.67c-.1-.3-.52-.3-.62 0z"/>
    <path fill="#FC6D26" d="M12 21.35l3.19-9.81h6.52z"/>
    <path fill="#FCA326" d="M21.71 11.54l.95 2.93c.09.27 0 .57-.23.73L12 21.35z"/>
    <path fill="#E24329" d="M21.71 11.54h-6.52l2.86-8.87c.1-.3.52-.3.62 0z"/>
  </svg>
);

// ── Dashboard screenshot mock ─────────────────────────────────────────────────
function DashboardMock() {
  const mono = "'SF Mono','Fira Code',Consolas,monospace";
  const b  = 'rgba(255,255,255,0.06)';
  const bg = 'rgba(255,255,255,0.025)';

  const kpis = [
    { icon: ServerStackIcon, label: 'Nodes',  value: '12',  sub: '11 ready',    color: '#3b82f6', pct: 92 },
    { icon: CubeIcon,        label: 'Pods',   value: '247', sub: '241 running', color: '#8b5cf6', pct: 78 },
    { icon: CpuChipIcon,     label: 'CPU',    value: '43%', sub: 'cluster avg', color: '#f59e0b', pct: 43 },
    { icon: CircleStackIcon, label: 'Memory', value: '61%', sub: 'cluster avg', color: '#ec4899', pct: 61 },
  ];

  const workloads = [
    { name: 'api-gateway',    ns: 'production', ready: '3/3', status: 'Healthy',  color: '#4ade80' },
    { name: 'auth-service',   ns: 'production', ready: '2/2', status: 'Healthy',  color: '#4ade80' },
    { name: 'ml-inference',   ns: 'ai-system',  ready: '1/2', status: 'Degraded', color: '#fbbf24' },
    { name: 'redis-cache',    ns: 'data',       ready: '3/3', status: 'Healthy',  color: '#4ade80' },
    { name: 'event-consumer', ns: 'backend',    ready: '2/2', status: 'Healthy',  color: '#4ade80' },
  ];

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', boxSizing: 'border-box', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 9, borderBottom: `1px solid ${b}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SparklesIcon style={{ width: 9, height: 9, color: '#fff' }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#f9fafb' }}>Cluster Overview</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{ padding: '2px 7px', borderRadius: 4, background: bg, border: `1px solid ${b}`, fontSize: 8, color: '#9ca3af', fontFamily: mono }}>prod-k8s</div>
          <div style={{ padding: '2px 7px', borderRadius: 4, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)', fontSize: 8, color: '#4ade80' }}>● Healthy</div>
        </div>
      </div>
      {/* KPI row */}
      <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: bg, border: `1px solid ${b}`, borderRadius: 7, padding: '8px 9px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <k.icon style={{ width: 9, height: 9, color: k.color }} />
              <span style={{ fontSize: 8, color: '#6b7280' }}>{k.label}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: k.color, lineHeight: 1, marginBottom: 3 }}>{k.value}</div>
            <div style={{ height: 2, borderRadius: 9999, background: k.color + '22' }}>
              <div style={{ width: `${k.pct}%`, height: '100%', borderRadius: 9999, background: k.color }} />
            </div>
          </div>
        ))}
      </div>
      {/* Table */}
      <div style={{ flex: 1, background: bg, border: `1px solid ${b}`, borderRadius: 7, overflow: 'hidden', minHeight: 0 }}>
        <div style={{ padding: '6px 10px', borderBottom: `1px solid ${b}`, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: '#f9fafb' }}>Workloads</span>
          <span style={{ fontSize: 7, padding: '1px 5px', borderRadius: 9999, background: b, color: '#6b7280' }}>5</span>
          <span style={{ marginLeft: 'auto', fontSize: 7, color: '#4ade80' }}>● 4 healthy</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.9fr 40px 56px', gap: 6, padding: '4px 10px', fontSize: 7, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: `1px solid ${b}` }}>
          <span>Name</span><span>Namespace</span><span>Ready</span><span>Status</span>
        </div>
        {workloads.map((w, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.9fr 40px 56px', gap: 6, padding: '5px 10px', alignItems: 'center', borderBottom: i < workloads.length - 1 ? `1px solid ${b}` : 'none' }}>
            <span style={{ fontSize: 9, color: '#f9fafb', fontFamily: mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</span>
            <span style={{ fontSize: 8, color: '#9ca3af' }}>{w.ns}</span>
            <span style={{ fontSize: 8, color: '#9ca3af', fontFamily: mono }}>{w.ready}</span>
            <span style={{ fontSize: 7, padding: '2px 5px', borderRadius: 9999, background: w.color + '15', color: w.color, fontWeight: 500, width: 'fit-content' }}>{w.status}</span>
          </div>
        ))}
      </div>
      {/* AI strip */}
      <div style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 7, background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <SparklesIcon style={{ width: 10, height: 10, color: '#a78bfa', flexShrink: 0 }} />
        <span style={{ fontSize: 9, color: '#a78bfa', fontWeight: 500 }}>AI Insight:</span>
        <span style={{ fontSize: 9, color: '#6b7280' }}>ml-inference CPU-throttling at 78% — scale ×2 replicas recommended</span>
      </div>
    </div>
  );
}

// ── Login Page ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [remember, setRemember]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [oauth, setOAuth]         = useState<OAuthProvider[]>([]);
  const [oauthLoading, setOAuthLoading] = useState<string | null>(null);
  const [focused, setFocused]     = useState<string | null>(null);
  const [showForm, setShowForm]   = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  useEffect(() => {
    const r = localStorage.getItem('nextsight_remember_user');
    if (r) { setUsername(r); setRemember(true); }
    api.get('/auth/oauth/providers')
      .then(res => { if (res.data.enabled && res.data.providers) setOAuth(res.data.providers); })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      await login(username, password);
      if (remember) localStorage.setItem('nextsight_remember_user', username);
      else localStorage.removeItem('nextsight_remember_user');
      navigate(from, { replace: true });
    } catch { setError('Invalid username or password'); }
    finally { setLoading(false); }
  };

  const handleOAuth = async (provider: string) => {
    setOAuthLoading(provider); setError(null);
    try {
      const res = await api.get(`/auth/oauth/${provider}/authorize`);
      if (res.data.authorization_url) window.location.href = res.data.authorization_url;
    } catch { setError(`Failed to initiate ${provider} login`); setOAuthLoading(null); }
  };

  const oauthIcon = (key: string) => {
    if (key === 'google') return <GoogleIcon />;
    if (key === 'github') return <GitHubIcon />;
    if (key === 'gitlab') return <GitLabIcon />;
    return null;
  };

  const brd   = 'rgba(255,255,255,0.08)';
  const text  = '#F9FAFB';
  const muted = '#6B7280';
  const sub   = '#9CA3AF';
  const blue  = '#3b82f6';

  const inp = (f: string): React.CSSProperties => ({
    width: '100%', padding: '10px 13px',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${focused === f ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 8, fontSize: 13, color: text, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  });

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#070708', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden', position: 'relative' }}>

      {/* ── Ambient light blobs (Devtron-style) ─────────────────────────── */}
      {/* Purple/violet — lower left */}
      <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '55vw', height: '65vh', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(124,58,237,0.28) 0%, rgba(109,40,217,0.12) 35%, transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />
      {/* Red/crimson — upper center-left */}
      <div style={{ position: 'absolute', top: '-15%', left: '18%', width: '40vw', height: '55vh', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(190,18,60,0.22) 0%, rgba(220,38,38,0.08) 40%, transparent 65%)', filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0 }} />
      {/* White/cool spotlight — upper right area of left panel */}
      <div style={{ position: 'absolute', top: '-20%', left: '38%', width: '28vw', height: '50vh', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,255,255,0.1) 0%, rgba(200,220,255,0.04) 45%, transparent 65%)', filter: 'blur(35px)', pointerEvents: 'none', zIndex: 0 }} />
      {/* Blue subtle — right panel */}
      <div style={{ position: 'absolute', top: '20%', right: '-5%', width: '25vw', height: '60vh', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(59,130,246,0.06) 0%, transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* ════ LEFT — product showcase ═════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 32px', gap: 20, position: 'relative', zIndex: 1, minWidth: 0, borderRight: `1px solid rgba(255,255,255,0.06)` }}>

        {/* Brand */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(59,130,246,0.4)', flexShrink: 0 }}>
            <SparklesIcon style={{ width: 16, height: 16, color: '#fff' }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: text, letterSpacing: -0.3 }}>NextSight</span>
        </div>

        {/* Hero text */}
        <div style={{ flexShrink: 0 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: text, letterSpacing: -0.8, margin: '0 0 8px', lineHeight: 1.2 }}>
            Kubernetes management,<br />
            <span style={{ background: 'linear-gradient(90deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              supercharged with AI.
            </span>
          </h1>
          <p style={{ fontSize: 12.5, color: muted, margin: 0, lineHeight: 1.6 }}>
            Full visibility into clusters, workloads, security and costs<br />across all your environments — in one platform.
          </p>
        </div>

        {/* App window mock */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          {/* Floating window */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(10,10,14,0.75)',
            backdropFilter: 'blur(1px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.06)',
          }}>
            {/* Window chrome */}
            <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', opacity: 0.7 }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', opacity: 0.7 }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', opacity: 0.7 }} />
              <div style={{ flex: 1, margin: '0 10px', height: 16, borderRadius: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 8, color: '#4b5563' }}>app.nextsight.io/dashboard</span>
              </div>
            </div>
            <DashboardMock />
          </div>

          {/* Floating AI card — overlapping the window */}
          <div style={{
            position: 'absolute', bottom: 20, right: -16,
            background: 'rgba(15,10,30,0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(139,92,246,0.25)',
            borderRadius: 10, padding: '10px 14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            width: 200,
            zIndex: 2,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
              <SparklesIcon style={{ width: 11, height: 11, color: '#a78bfa' }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: '#a78bfa' }}>AI Insight</span>
            </div>
            <div style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.5 }}>
              ml-inference is throttling.<br />
              <span style={{ color: '#c4b5fd' }}>Scale ×2 replicas</span> to reduce latency by ~40%.
            </div>
          </div>
        </div>

      </div>

      {/* ════ RIGHT — login panel ══════════════════════════════════════════ */}
      <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%' }}>

          {/* Card */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 18,
            padding: '36px 32px',
            boxShadow: '0 2px 40px rgba(0,0,0,0.4)',
          }}>
            {/* Logo + title */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(59,130,246,0.4)', marginBottom: 14 }}>
                <SparklesIcon style={{ width: 24, height: 24, color: '#fff' }} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: text, margin: '0 0 4px', letterSpacing: -0.4, textAlign: 'center' }}>NextSight</h2>
              <p style={{ fontSize: 13, color: muted, margin: 0, textAlign: 'center' }}>Sign in to your dashboard</p>
            </div>

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, marginBottom: 16 }}>
                <ExclamationCircleIcon style={{ width: 13, height: 13, color: '#f87171', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>
              </div>
            )}

            {/* OAuth buttons */}
            {oauth.length > 0 && !showForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {oauth.map(p => (
                  <button key={p.key} type="button" onClick={() => handleOAuth(p.key)} disabled={oauthLoading !== null}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.18)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    style={{ width: '100%', padding: '11px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, cursor: oauthLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, color: text, fontWeight: 500, transition: 'all 0.15s', opacity: oauthLoading === p.key ? 0.5 : 1, fontFamily: 'inherit' }}>
                    {oauthIcon(p.key)}
                    Continue with <span style={{ textTransform: 'capitalize' }}>{p.name}</span>
                  </button>
                ))}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
                  <div style={{ flex: 1, height: 1, background: brd }} />
                  <span style={{ fontSize: 11, color: muted }}>or</span>
                  <div style={{ flex: 1, height: 1, background: brd }} />
                </div>
              </div>
            )}

            {/* Sign in with password — Devtron's "Login As Administrator" style */}
            {!showForm ? (
              <button type="button" onClick={() => setShowForm(true)}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.18)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
                style={{ width: '100%', padding: '11px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, cursor: 'pointer', fontSize: 13, color: text, fontWeight: 500, transition: 'all 0.15s', fontFamily: 'inherit' }}>
                Sign in with Username
              </button>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: sub, marginBottom: 5 }}>Username</label>
                  <input type="text" required value={username} onChange={e => setUsername(e.target.value)}
                    placeholder="Enter your username" autoFocus
                    onFocus={() => setFocused('u')} onBlur={() => setFocused(null)}
                    style={inp('u')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: sub, marginBottom: 5 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} required value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                      onFocus={() => setFocused('p')} onBlur={() => setFocused(null)}
                      style={{ ...inp('p'), paddingRight: 40 }} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: muted, cursor: 'pointer', padding: 2, display: 'flex' }}>
                      {showPass ? <EyeSlashIcon style={{ width: 15, height: 15 }} /> : <EyeIcon style={{ width: 15, height: 15 }} />}
                    </button>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                    style={{ width: 13, height: 13, accentColor: blue, cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: muted }}>Remember me</span>
                </label>

                <button type="submit" disabled={loading}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
                  onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                  style={{ width: '100%', padding: '11px 16px', background: blue, border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'opacity 0.15s', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 20px rgba(59,130,246,0.35)', fontFamily: 'inherit' }}>
                  {loading ? (
                    <>
                      <svg style={{ width: 13, height: 13, animation: 'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.2 }} />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in…
                    </>
                  ) : 'Sign in'}
                </button>

                <button type="button" onClick={() => { setShowForm(false); setError(null); }}
                  style={{ background: 'none', border: 'none', color: muted, fontSize: 12, cursor: 'pointer', textAlign: 'center', padding: 0, fontFamily: 'inherit' }}>
                  ← Back
                </button>
              </form>
            )}
          </div>

        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
