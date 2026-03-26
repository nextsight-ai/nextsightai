import { useState, useEffect } from 'react';
import { Skeleton, SkeletonCard } from '../common/Skeleton';
import { ShieldCheckIcon, ShieldExclamationIcon, ExclamationTriangleIcon, ArrowPathIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useCluster } from '../../contexts/ClusterContext';
import { useSecurityDashboard } from '../../hooks/useSecurityData';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';

const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };

interface SecurityScore {
  score: number;
  grade: string;
  total_findings: number;
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
}

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
    error: queryError,
    refresh: refreshSecurityData,
  } = useSecurityDashboard(activeCluster?.id);

  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<SecurityFinding | null>(null);

  const score = data?.security_score;
  const findings = data?.findings || [];
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
      <div style={{ minHeight: '100vh', background: t.mainBg, color: t.text }}>
        {/* Header skeleton */}
        <header style={{ padding: '16px 32px', borderBottom: `1px solid ${t.cardBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Skeleton width={180} height={16} style={{ marginBottom: 6 }} />
              <Skeleton width={280} height={9} />
            </div>
            <Skeleton width={60} height={9} />
          </div>
        </header>
        <div style={{ padding: '24px 32px' }}>
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
    <div style={{ minHeight: '100vh', background: t.mainBg, color: t.text }}>
      {/* Header */}
      <header style={{ padding: '16px 32px', borderBottom: `1px solid ${t.cardBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: -0.5, marginBottom: 2 }}>
              Security Dashboard
            </h1>
            <p style={{ color: t.textMuted, fontSize: 11, margin: 0 }}>
              Cluster security posture and vulnerability scanning
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => refreshSecurityData()}
              disabled={loading}
              style={{
                background: 'transparent',
                border: 'none',
                color: t.textMuted,
                cursor: loading ? 'wait' : 'pointer',
                fontSize: 11,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ArrowPathIcon style={{ width: 12, height: 12 }} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>

            <button
              onClick={startScan}
              disabled={scanning}
              style={{
                background: scanning ? 'rgba(59, 130, 246, 0.5)' : '#3b82f6',
                border: 'none',
                color: '#fafafa',
                cursor: scanning ? 'wait' : 'pointer',
                fontSize: 11,
                padding: '6px 12px',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {scanning ? 'Scanning...' : 'Start Scan'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '24px 32px' }}>
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
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 24 }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1.5, color: getGradeColor(score.grade), ...mono }}>
                  {score.grade}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Security Grade
                </div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 2, ...mono }}>
                  Score: {score.score}/100
                </div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1.5, color: '#ef4444', ...mono }}>
                  {score.critical_issues}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Critical Issues
                </div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1.5, color: '#f59e0b', ...mono }}>
                  {score.high_issues}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  High Issues
                </div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1.5, color: '#eab308', ...mono }}>
                  {score.medium_issues}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Medium Issues
                </div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1.5, color: '#3b82f6', ...mono }}>
                  {score.low_issues}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Low Issues
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Vulnerability Summary */}
        {vulnerabilities && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 10, fontWeight: 500, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Container Vulnerabilities
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 20 }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1.5, color: '#ef4444', ...mono }}>
                  {vulnerabilities.critical}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Critical</div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1.5, color: '#f59e0b', ...mono }}>
                  {vulnerabilities.high}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>High</div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1.5, color: '#eab308', ...mono }}>
                  {vulnerabilities.medium}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Medium</div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1.5, color: '#3b82f6', ...mono }}>
                  {vulnerabilities.low}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Low</div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1.5, color: '#8b5cf6', ...mono }}>
                  {vulnerabilities.total}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</div>
              </div>
            </div>
          </section>
        )}

        {/* Security Findings */}
        <section>
          <h2 style={{ fontSize: 10, fontWeight: 500, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Security Findings · {findings.length} {findings.length === 1 ? 'issue' : 'issues'}
          </h2>

          <div>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 100px 120px 150px',
              gap: 12,
              paddingBottom: 8,
              borderBottom: `1px solid ${t.cardBorder}`,
              fontSize: 10,
              fontWeight: 500,
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
              <div style={{ padding: '48px 0', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
                <ShieldCheckIcon style={{ width: 48, height: 48, margin: '0 auto 12px', color: '#22c55e', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No security findings</p>
                <p style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>Your cluster security posture is good</p>
              </div>
            ) : (
              findings.slice(0, 20).map((finding, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedFinding(finding)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 100px 120px 150px',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: i < Math.min(findings.length, 20) - 1 ? `1px solid ${t.cardBorder}` : 'none',
                    fontSize: 11,
                    color: t.text,
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {finding.title}
                  </div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {finding.resource_name}
                  </div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {finding.namespace}
                  </div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {finding.type}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: getSeverityColor(finding.severity),
                      boxShadow: finding.severity.toLowerCase() === 'critical' ? '0 0 6px #ef4444' : 'none',
                    }} />
                    <span style={{ color: getSeverityColor(finding.severity) }}>
                      {finding.severity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {findings.length > 20 && (
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: t.textMuted }}>
                Showing 20 of {findings.length} findings
              </div>
            </div>
          )}
        </section>

        {/* Selected Finding Detail */}
        {selectedFinding && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedFinding(null)}
          >
            <div style={{
              background: t.cardBg,
              border: `1px solid ${t.sidebarBorder}`,
              borderRadius: 8,
              padding: 24,
              maxWidth: 600,
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{selectedFinding.title}</h3>
                  <span style={{
                    padding: '4px 8px',
                    fontSize: 10,
                    color: getSeverityColor(selectedFinding.severity),
                    border: `1px solid ${getSeverityColor(selectedFinding.severity)}33`,
                    background: `${getSeverityColor(selectedFinding.severity)}11`,
                    borderRadius: 4,
                    ...mono,
                  }}>
                    {selectedFinding.severity}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: t.textMuted }}>
                  {selectedFinding.resource_type} · {selectedFinding.resource_name} · {selectedFinding.namespace}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</div>
                <div style={{ fontSize: 12, color: t.text, lineHeight: 1.6 }}>{selectedFinding.description}</div>
              </div>

              {selectedFinding.recommendation && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recommendation</div>
                  <div style={{ fontSize: 12, color: '#22c55e', lineHeight: 1.6 }}>{selectedFinding.recommendation}</div>
                </div>
              )}

              <button
                onClick={() => setSelectedFinding(null)}
                style={{
                  background: t.textMuted,
                  border: 'none',
                  color: t.text,
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: '8px 16px',
                  borderRadius: 4,
                  marginTop: 8,
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
