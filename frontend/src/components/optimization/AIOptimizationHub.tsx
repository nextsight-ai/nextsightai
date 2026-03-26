import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  SparklesIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  BoltIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';
import type { ThemeColors } from '../../styles/linear-design';
import K8sHeader from '../kubernetes/K8sHeader';
import { optimizationApi } from '../../services/api';
import { logger } from '../../utils/logger';
import type { AIOptimizationAnalysisResponse, OptimizationDashboardResponse } from '../../types';
import PerformanceRiskPanel from './PerformanceRiskPanel';
import ReliabilityOptimizationDashboard from './ReliabilityOptimizationDashboard';
import ResourceOptimizationDashboard from './ResourceOptimizationDashboard';

type FocusArea = 'efficiency' | 'performance' | 'reliability';

const focusTabs = [
  { id: 'efficiency' as FocusArea, label: 'Resource Efficiency', icon: ChartBarIcon, description: 'Right-size workloads' },
  { id: 'performance' as FocusArea, label: 'Performance Risk', icon: ExclamationTriangleIcon, description: 'Prevent throttling & OOM' },
  { id: 'reliability' as FocusArea, label: 'Reliability Risk', icon: ShieldCheckIcon, description: 'Improve stability' },
];

function getPriorityColors(priority: string, t: ThemeColors) {
  switch (priority.toLowerCase()) {
    case 'high':   return t.badgeColors.red;
    case 'medium': return t.badgeColors.amber;
    case 'low':    return t.badgeColors.green;
    default:       return t.badgeColors.blue;
  }
}

export default function AIOptimizationHub() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFocus = (searchParams.get('focus') as FocusArea) || 'efficiency';

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIOptimizationAnalysisResponse | null>(null);
  const [dashboardData, setDashboardData] = useState<OptimizationDashboardResponse | null>(null);
  const [appliedActions, setAppliedActions] = useState<Set<number>>(new Set());

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (dashboardData) analyzeWithAI(activeFocus); }, [activeFocus]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const dashRes = await optimizationApi.getDashboard();
      setDashboardData(dashRes.data);
      await analyzeWithAI(activeFocus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load optimization data');
    } finally {
      setLoading(false);
    }
  };

  const analyzeWithAI = async (focus: FocusArea) => {
    setAnalyzing(true);
    try {
      const timeoutId = setTimeout(() => {
        logger.info('AI analysis taking longer than expected - may take 30-60 seconds');
      }, 5000);
      const res = await optimizationApi.getAIAnalysis({ focus_area: focus });
      clearTimeout(timeoutId);
      if (res.data.success) {
        setAiAnalysis(res.data);
        setAppliedActions(new Set());
      } else {
        setError('AI analysis failed - using cached or fallback data');
      }
    } catch (err) {
      logger.error('AI analysis error', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFocusChange = (focus: FocusArea) => setSearchParams({ focus });
  const handleApplyAction = (index: number) => setAppliedActions(prev => new Set([...prev, index]));
  const handleRefresh = () => loadData();

  const card: React.CSSProperties = {
    background: t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 12,
    padding: 20,
  };

  if (loading) {
    return (
      <div style={{ margin: '-28px -32px', height: 'calc(100vh - 68px)', color: t.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <K8sHeader title="AI Optimizer" subtitle="AI-powered cluster optimization recommendations" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <ArrowPathIcon style={{ width: 32, height: 32, color: t.textMuted, margin: '0 auto 12px' }} />
            <div style={{ fontSize: 13, color: t.textSub }}>Loading optimization data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div style={{ margin: '-28px -32px', height: 'calc(100vh - 68px)', color: t.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <K8sHeader title="AI Optimizer" subtitle="AI-powered cluster optimization recommendations" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div style={{ ...card, textAlign: 'center', padding: 40 }}>
            <ExclamationCircleIcon style={{ width: 40, height: 40, color: t.error, margin: '0 auto 12px' }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 6 }}>Failed to load optimization data</div>
            <div style={{ fontSize: 13, color: t.textSub, marginBottom: 16 }}>{error}</div>
            <button onClick={handleRefresh} style={{ padding: '8px 20px', background: t.error, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: '-28px -32px', height: 'calc(100vh - 68px)', color: t.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <K8sHeader
        title="AI Optimizer"
        subtitle="AI-powered cluster optimization recommendations"
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.12)', fontSize: 10, color: '#a78bfa', fontWeight: 500 }}>
              <SparklesIcon style={{ width: 10, height: 10 }} />
              AI-Powered
            </div>
            <button onClick={handleRefresh} disabled={analyzing} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', fontSize: 11, fontWeight: 500, background: 'none', border: `1px solid ${t.cardBorder}`, borderRadius: 6, cursor: analyzing ? 'not-allowed' : 'pointer', color: t.textSub, opacity: analyzing ? 0.6 : 1 }}>
              <ArrowPathIcon style={{ width: 12, height: 12 }} />
              {analyzing ? 'Analyzing...' : 'Refresh'}
            </button>
          </div>
        }
      />

      {/* Focus tabs */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 8, padding: '10px 32px', borderBottom: `1px solid ${t.cardBorder}` }}>
        {focusTabs.map((tab) => {
          const active = activeFocus === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleFocusChange(tab.id)}
              disabled={analyzing}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                border: `1px solid ${active ? '#8b5cf6' : t.cardBorder}`,
                background: active ? 'rgba(139,92,246,0.15)' : 'transparent',
                color: active ? '#a78bfa' : t.textSub,
                cursor: analyzing ? 'not-allowed' : 'pointer',
                opacity: analyzing ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              <tab.icon style={{ width: 14, height: 14 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {analyzing ? (
          <div style={{ ...card, margin: 24, textAlign: 'center', padding: 48 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <SparklesIcon style={{ width: 28, height: 28, color: '#8b5cf6' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 6 }}>AI is analyzing your cluster...</div>
            <div style={{ fontSize: 13, color: t.textSub, marginBottom: 8 }}>
              Examining resource usage patterns and generating {activeFocus} recommendations
            </div>
            <div style={{ fontSize: 11, color: '#a78bfa' }}>
              First analysis takes 30-60s · Future analyses are instant (10-min cache)
            </div>
          </div>
        ) : activeFocus === 'efficiency' && dashboardData ? (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 32px' }}>
            <ResourceOptimizationDashboard dashboardData={dashboardData} />
          </div>
        ) : activeFocus === 'performance' && dashboardData ? (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 32px' }}>
            <PerformanceRiskPanel dashboardData={dashboardData} />
          </div>
        ) : activeFocus === 'reliability' && dashboardData ? (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 32px' }}>
            <ReliabilityOptimizationDashboard dashboardData={dashboardData} isAnalyzing={analyzing} />
          </div>
        ) : aiAnalysis ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Disclaimer */}
            <div style={{ padding: '10px 14px', borderRadius: 8, background: t.warningBg, border: `1px solid ${t.warning}33`, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <ExclamationCircleIcon style={{ width: 14, height: 14, color: t.warning, flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 11, color: t.warning }}>
                Recommendations based on recent usage patterns. Always validate in staging before production. Cost estimates are approximate.
              </span>
            </div>

            {/* AI Summary */}
            <div style={{ ...card }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SparklesIcon style={{ width: 16, height: 16, color: '#8b5cf6' }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>AI Analysis Summary</span>
              </div>
              <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.7 }}>
                <ReactMarkdown>{aiAnalysis.analysis}</ReactMarkdown>
              </div>
            </div>

            {/* Key Findings */}
            {aiAnalysis.key_findings && aiAnalysis.key_findings.length > 0 && (
              <div style={{ ...card }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <ChartBarIcon style={{ width: 16, height: 16, color: t.info }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Key Findings</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {aiAnalysis.key_findings.map((finding, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: t.mainBg, borderRadius: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: t.infoBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <LightBulbIcon style={{ width: 12, height: 12, color: t.info }} />
                      </div>
                      <span style={{ fontSize: 12, color: t.textSub, lineHeight: 1.5 }}>{finding}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Priority Actions */}
            {aiAnalysis.priority_actions && aiAnalysis.priority_actions.length > 0 && (
              <div style={{ ...card }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <BoltIcon style={{ width: 16, height: 16, color: t.warning }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Priority Actions</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {aiAnalysis.priority_actions.map((action, index) => {
                    const isApplied = appliedActions.has(index);
                    const prio = getPriorityColors(action.priority, t);
                    return (
                      <div
                        key={index}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                          padding: '10px 14px', borderRadius: 8,
                          background: isApplied ? t.successBg : t.mainBg,
                          border: `1px solid ${isApplied ? t.success + '33' : t.cardBorder}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                          <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 600, background: prio.bg, color: prio.text }}>
                            {action.priority}
                          </span>
                          <span style={{ fontSize: 12, color: isApplied ? t.success : t.textSub, textDecoration: isApplied ? 'line-through' : 'none' }}>
                            {action.action}
                          </span>
                        </div>
                        {!isApplied ? (
                          <button
                            onClick={() => handleApplyAction(index)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, background: t.successBg, color: t.success, border: 'none', fontSize: 11, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
                          >
                            <CheckCircleIcon style={{ width: 12, height: 12 }} />
                            Mark Done
                          </button>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: t.success }}>
                            <CheckCircleIcon style={{ width: 12, height: 12 }} />
                            Completed
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Impact */}
            {aiAnalysis.estimated_monthly_impact > 0 && (
              <div style={{ ...card, background: t.infoBg, borderColor: t.info + '33' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: t.infoBg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${t.info}33` }}>
                      <ArrowTrendingUpIcon style={{ width: 20, height: 20, color: t.info }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Resource Efficiency Impact</div>
                      <div style={{ fontSize: 11, color: t.textSub }}>Potential waste reduction from right-sizing</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: t.info, fontFamily: "'SF Mono', monospace" }}>
                      ~${aiAnalysis.estimated_monthly_impact.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 10, color: t.textMuted }}>per month (est., non-billing)</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <div style={{ ...card, textAlign: 'center', padding: 48 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: t.mainBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <SparklesIcon style={{ width: 28, height: 28, color: t.textMuted }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 6 }}>No AI Analysis Available</div>
              <div style={{ fontSize: 13, color: t.textSub, marginBottom: 16 }}>Click "Refresh" to generate AI-powered optimization recommendations</div>
              <button
                onClick={() => analyzeWithAI(activeFocus)}
                style={{ padding: '8px 20px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
              >
                Generate Analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
