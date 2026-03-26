import { useState } from 'react';
import { Skeleton, SkeletonCard } from '../common/Skeleton';
import { ShieldCheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import K8sHeader from '../kubernetes/K8sHeader';
import api from '../../services/api';
import { useCluster } from '../../contexts/ClusterContext';
import { useSecurityDashboard } from '../../hooks/useSecurityData';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors, mono } from '../../styles/linear-design';


interface SecurityFinding {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  resource_type: string;
  resource_name: string;
  namespace: string;
  recommendation?: string;
}

export default function SecurityDashboard() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  const { activeCluster } = useCluster();
  const {
    dashboard: data,
    isLoading: loading,
    refresh: refreshSecurityData,
  } = useSecurityDashboard(activeCluster?.id);

  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<SecurityFinding | null>(null);

  const score = data?.security_score;
  const findings = data?.top_findings || [];
  const vulnerabilities = data?.vulnerability_summary;

  const startScan = async () => {
    setScanning(true);
    try {
      await api.post('/api/security/scan');
      setTimeout(() => refreshSecurityData(), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to start scan');
    } finally {
      setScanning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f59e0b';
      case 'medium':
        return '#eab308';
      case 'low':
        return '#3b82f6';
      default:
        return t.textMuted;
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
      case 'B':
        return '#22c55e';
      case 'C':
        return '#eab308';
      case 'D':
      case 'F':
        return '#ef4444';
      default:
        return t.textMuted;
    }
  };

  if (loading && !data) {
    return (
      <div style={{ margin: '-28px -32px', height: 'calc(100vh - 68px)', color: t.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <K8sHeader title="Security" subtitle="Cluster security posture and vulnerability scanning" />
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {/* Stat strip — 4 severity cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16, marginBottom: 28 }}>
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} height={82} />)}
          </div>
          {/* Table card */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.cardBorder}` }}>
              <Skeleton width={140} height={12} />
            </div>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 20px', alignItems: 'center', borderBottom: `1px solid ${t.cardBorder}` }}>
                <Skeleton width={20} height={20} radius={10} />
                <Skeleton width="35%" height={11} />
                <Skeleton width="20%" height={9} />
                <Skeleton width={50} height={18} radius={9} style={{ marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: '-28px -32px', height: 'calc(100vh - 68px)', color: t.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <K8sHeader
        title="Security"
        subtitle="Cluster security posture and vulnerability scanning"
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => refreshSecurityData()} disabled={loading} style={{ background: 'none', border: `1px solid ${t.cardBorder}`, borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: t.textSub, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
              <ArrowPathIcon style={{ width: 13, height: 13 }} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button onClick={startScan} disabled={scanning} style={{ background: scanning ? 'rgba(59,130,246,0.5)' : '#3b82f6', border: 'none', color: '#fff', cursor: scanning ? 'wait' : 'pointer', fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 6 }}>
              {scanning ? 'Scanning...' : 'Start Scan'}
            </button>
          </div>
        }
      />

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {/* Error State */}
        {error && (
          <div style={{
            padding: 12,
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: 12,
            marginBottom: 24,
          }}>
            {error}
          </div>
        )}

        {/* Security Score */}
        {score && (
          <section style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Security Posture
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1.5, color: getGradeColor(score.grade), ...mono }}>
                  {score.grade}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Security Grade</div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3, ...mono }}>Score: {score.score}/100</div>
              </div>
              <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1.5, color: '#ef4444', ...mono }}>
                  {score.critical_issues}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Critical</div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3 }}>issues found</div>
              </div>
              <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1.5, color: '#f59e0b', ...mono }}>
                  {score.high_issues}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>High</div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3 }}>issues found</div>
              </div>
              <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1.5, color: '#eab308', ...mono }}>
                  {score.medium_issues}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Medium</div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3 }}>issues found</div>
              </div>
              <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1.5, color: '#3b82f6', ...mono }}>
                  {score.low_issues}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Low</div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3 }}>issues found</div>
              </div>
            </div>
          </section>
        )}

        {/* Vulnerability Summary */}
        {vulnerabilities && (
          <section style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Container Vulnerabilities
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1.5, color: '#ef4444', ...mono }}>{vulnerabilities.critical}</div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Critical</div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3 }}>CVEs found</div>
              </div>
              <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1.5, color: '#f59e0b', ...mono }}>{vulnerabilities.high}</div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>High</div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3 }}>CVEs found</div>
              </div>
              <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1.5, color: '#eab308', ...mono }}>{vulnerabilities.medium}</div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Medium</div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3 }}>CVEs found</div>
              </div>
              <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1.5, color: '#3b82f6', ...mono }}>{vulnerabilities.low}</div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Low</div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3 }}>CVEs found</div>
              </div>
              <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1.5, color: '#8b5cf6', ...mono }}>{vulnerabilities.total}</div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3 }}>all severities</div>
              </div>
            </div>
          </section>
        )}

        {/* Security Findings */}
        <section>
          <h2 style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Security Findings · {findings.length} {findings.length === 1 ? 'issue' : 'issues'}
          </h2>

          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 100px 120px 140px',
              gap: 12,
              padding: '10px 20px',
              borderBottom: `1px solid ${t.cardBorder}`,
              fontSize: 10,
              fontWeight: 600,
              color: t.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              <div>Title</div>
              <div>Resource</div>
              <div>Namespace</div>
              <div>Type</div>
              <div>Severity</div>
            </div>

            {/* Table Rows */}
            {findings.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
                <ShieldCheckIcon style={{ width: 40, height: 40, margin: '0 auto 10px', color: '#22c55e', opacity: 0.5 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>No security findings</p>
                <p style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>Your cluster security posture is good</p>
              </div>
            ) : (
              findings.slice(0, 20).map((finding, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedFinding(finding)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 100px 120px 140px',
                    gap: 12,
                    padding: '11px 20px',
                    borderBottom: i < Math.min(findings.length, 20) - 1 ? `1px solid ${t.cardBorder}` : 'none',
                    fontSize: 11,
                    color: t.text,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = t.navHoverBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{finding.title}</div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{finding.resource_name}</div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: t.textSub }}>{finding.namespace}</div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: t.textSub }}>{finding.type}</div>
                  <div>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      fontSize: 10,
                      fontWeight: 500,
                      background: `${getSeverityColor(finding.severity)}18`,
                      color: getSeverityColor(finding.severity),
                      border: `1px solid ${getSeverityColor(finding.severity)}30`,
                    }}>
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: getSeverityColor(finding.severity),
                        boxShadow: finding.severity.toLowerCase() === 'critical' ? `0 0 5px ${getSeverityColor(finding.severity)}` : 'none',
                      }} />
                      {finding.severity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {findings.length > 20 && (
            <div style={{ padding: '12px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: t.textMuted }}>Showing 20 of {findings.length} findings</div>
            </div>
          )}
        </section>

        {/* Selected Finding Detail */}
        {selectedFinding && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)' }}
              onClick={() => setSelectedFinding(null)}
            />
            <div style={{ position: 'fixed', inset: 0, zIndex: 51, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
              <div
                style={{
                  width: '100%',
                  maxWidth: 560,
                  background: t.cardBg,
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 14,
                  padding: 24,
                  boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
                  pointerEvents: 'auto',
                  maxHeight: '80vh',
                  overflow: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px 0', color: t.text }}>{selectedFinding.title}</h3>
                    <div style={{ fontSize: 11, color: t.textMuted }}>
                      {selectedFinding.resource_type} · {selectedFinding.resource_name} · {selectedFinding.namespace}
                    </div>
                  </div>
                  <span style={{
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 10px',
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 500,
                    background: `${getSeverityColor(selectedFinding.severity)}18`,
                    color: getSeverityColor(selectedFinding.severity),
                    border: `1px solid ${getSeverityColor(selectedFinding.severity)}30`,
                    ...mono,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: getSeverityColor(selectedFinding.severity) }} />
                    {selectedFinding.severity}
                  </span>
                </div>

                {/* Description */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</div>
                  <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.7, background: t.mainBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8, padding: '10px 14px' }}>
                    {selectedFinding.description}
                  </div>
                </div>

                {/* Recommendation */}
                {selectedFinding.recommendation && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recommendation</div>
                    <div style={{ fontSize: 12, color: '#22c55e', lineHeight: 1.7, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '10px 14px' }}>
                      {selectedFinding.recommendation}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setSelectedFinding(null)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: `1px solid ${t.cardBorder}`,
                    background: 'transparent',
                    color: t.textSub,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
