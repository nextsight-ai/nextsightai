import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, ArrowPathIcon, ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { kubernetesApi } from '../../services/api';
import type { Pod, PodLogs } from '../../types';

const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };

interface PodLogsViewerLinearProps {
  pod: Pod;
  onClose: () => void;
}

export default function PodLogsViewerLinear({ pod, onClose }: PodLogsViewerLinearProps) {
  const [logs, setLogs] = useState<PodLogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContainer, setSelectedContainer] = useState(pod.containers[0] || '');
  const [tailLines, setTailLines] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTimestamps, setShowTimestamps] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    fetchLogs();
  }, [selectedContainer, tailLines, showTimestamps]);

  async function fetchLogs() {
    setLoading(true);
    setError(null);
    try {
      const response = await kubernetesApi.getPodLogs(pod.namespace, pod.name, {
        container: selectedContainer || undefined,
        tailLines,
        timestamps: showTimestamps,
      });
      setLogs(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  }

  function downloadLogs() {
    if (!logs?.logs) return;
    const blob = new Blob([logs.logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pod.namespace}-${pod.name}-${selectedContainer}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function scrollToBottom() {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  const filteredLogs = logs?.logs
    ? logs.logs.split('\n').filter((line) => !searchTerm || line.toLowerCase().includes(searchTerm.toLowerCase())).join('\n')
    : '';

  return createPortal(
    <div
      style={{
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
        padding: 40,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0a0a0a',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          width: '100%',
          maxWidth: 1400,
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 4, color: '#ffffff' }}>
              Pod Logs: {pod.name}
            </h2>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
              Namespace: {pod.namespace} · Status: {pod.status}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <XMarkIcon style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Controls */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Container Selector */}
          {pod.containers.length > 1 && (
            <select
              value={selectedContainer}
              onChange={(e) => setSelectedContainer(e.target.value)}
              style={{
                background: '#0a0a0a',
                border: '1px solid rgba(255,255,255,0.04)',
                color: '#ffffff',
                fontSize: 11,
                padding: '6px 10px',
                borderRadius: 4,
                ...mono,
              }}
            >
              {pod.containers.map((container) => (
                <option key={container} value={container}>
                  {container}
                </option>
              ))}
            </select>
          )}

          {/* Tail Lines */}
          <select
            value={tailLines}
            onChange={(e) => setTailLines(Number(e.target.value))}
            style={{
              background: '#0a0a0a',
              border: '1px solid rgba(255,255,255,0.04)',
              color: '#ffffff',
              fontSize: 11,
              padding: '6px 10px',
              borderRadius: 4,
            }}
          >
            <option value={50}>50 lines</option>
            <option value={100}>100 lines</option>
            <option value={500}>500 lines</option>
            <option value={1000}>1000 lines</option>
            <option value={5000}>5000 lines</option>
          </select>

          {/* Timestamps */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#ffffff', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showTimestamps}
              onChange={(e) => setShowTimestamps(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Timestamps
          </label>

          {/* Search */}
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <MagnifyingGlassIcon style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: '#0a0a0a',
                border: '1px solid rgba(255,255,255,0.04)',
                color: '#ffffff',
                fontSize: 11,
                padding: '6px 10px 6px 28px',
                borderRadius: 4,
                width: 200,
              }}
            />
          </div>

          {/* Actions */}
          <button
            onClick={fetchLogs}
            disabled={loading}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.04)',
              color: '#ffffff',
              cursor: loading ? 'wait' : 'pointer',
              fontSize: 11,
              padding: '6px 10px',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <ArrowPathIcon style={{ width: 12, height: 12 }} />
            Refresh
          </button>

          <button
            onClick={downloadLogs}
            disabled={!logs?.logs}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.04)',
              color: '#ffffff',
              cursor: !logs?.logs ? 'not-allowed' : 'pointer',
              fontSize: 11,
              padding: '6px 10px',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: !logs?.logs ? 0.5 : 1,
            }}
          >
            <ArrowDownTrayIcon style={{ width: 12, height: 12 }} />
            Download
          </button>

          <button
            onClick={scrollToBottom}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.04)',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: 11,
              padding: '6px 10px',
              borderRadius: 4,
            }}
          >
            ↓ Bottom
          </button>
        </div>

        {/* Logs Display */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px 24px',
            background: '#000',
          }}
        >
          {loading && (
            <div style={{ color: '#9ca3af', fontSize: 12 }}>Loading logs...</div>
          )}

          {error && (
            <div
              style={{
                padding: 12,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 4,
                color: '#ef4444',
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}

          {!loading && !error && filteredLogs && (
            <pre
              style={{
                margin: 0,
                fontSize: 11,
                lineHeight: 1.6,
                color: '#e0e0e0',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                ...mono,
              }}
            >
              {filteredLogs}
            </pre>
          )}

          {!loading && !error && !filteredLogs && (
            <div style={{ color: '#9ca3af', fontSize: 12 }}>No logs available</div>
          )}

          <div ref={logsEndRef} />
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: 10, color: '#9ca3af' }}>
          {logs && `${logs.logs.split('\n').length} lines · ${searchTerm ? `Filtered: ${filteredLogs.split('\n').length} lines` : ''}`}
        </div>
      </div>
    </div>,
    document.body
  );
}
