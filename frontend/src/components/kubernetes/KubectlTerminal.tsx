import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { kubernetesApi } from '../../services/api';
import { useTerminal } from '../../contexts/TerminalContext';
import {
  CommandLineIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';
import K8sHeader from './K8sHeader';

type TerminalMode = 'kubectl' | 'shell';

const KUBECTL_QUICK_COMMANDS = [
  { label: 'Get Pods', command: 'get pods -A' },
  { label: 'Get Nodes', command: 'get nodes' },
  { label: 'Get Services', command: 'get svc -A' },
  { label: 'Get Deployments', command: 'get deployments -A' },
  { label: 'Get Namespaces', command: 'get namespaces' },
  { label: 'Get Events', command: 'get events -A --sort-by=.lastTimestamp' },
  { label: 'Cluster Info', command: 'cluster-info' },
  { label: 'Get ConfigMaps', command: 'get configmaps -A' },
  { label: 'Get Secrets', command: 'get secrets -A' },
  { label: 'Top Nodes', command: 'top nodes' },
  { label: 'Top Pods', command: 'top pods -A' },
  { label: 'API Resources', command: 'api-resources' },
];

const SHELL_QUICK_COMMANDS = [
  { label: 'List Files', command: 'ls -la' },
  { label: 'Current Dir', command: 'pwd' },
  { label: 'Disk Usage', command: 'df -h' },
  { label: 'Memory Info', command: 'free -h' },
  { label: 'System Info', command: 'uname -a' },
  { label: 'Process List', command: 'ps aux | head -20' },
  { label: 'Network Info', command: 'ifconfig || ip addr' },
  { label: 'Environment', command: 'env | sort' },
  { label: 'Helm List', command: 'helm list -A' },
  { label: 'Docker PS', command: 'docker ps' },
  { label: 'Git Status', command: 'git status 2>/dev/null || echo "Not a git repo"' },
  { label: 'Curl Test', command: 'curl -s https://httpbin.org/get | head -10' },
];

export default function KubectlTerminal() {
  const {
    state: { mode, history, commandHistory, workingDirectory },
    setMode,
    addHistoryEntry,
    addCommandToHistory,
    setWorkingDirectory,
    clearHistory,
  } = useTerminal();

  const [command, setCommand] = useState('');
  const [executing, setExecuting] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim() || executing) return;

    const trimmedCmd = cmd.trim();

    // Handle clear command
    if (trimmedCmd === 'clear') {
      clearHistory();
      setCommand('');
      return;
    }

    // Handle help command
    if (trimmedCmd === 'help') {
      const helpContent = mode === 'kubectl'
        ? `Available kubectl commands:
  get <resource>     - List resources (pods, nodes, svc, deployments, etc.)
  describe <resource> <name> - Show details of a resource
  logs <pod>         - Print pod logs
  explain <resource> - Documentation for a resource
  top nodes/pods     - Display resource usage
  api-resources      - List available API resources
  version            - Show kubectl version
  clear              - Clear terminal
  help               - Show this help

Note: Some dangerous commands are blocked for security.`
        : `Available shell commands:
  Any standard shell command is supported, including:
  ls, cat, pwd, cd, grep, find, curl, wget, etc.

  Special commands:
  clear              - Clear terminal
  help               - Show this help

  Installed tools available:
  kubectl, helm, docker, git, curl, wget, etc.

Note: Some dangerous commands are blocked for security.`;

      addHistoryEntry({
        type: 'input',
        content: mode === 'kubectl' ? `$ kubectl ${trimmedCmd}` : `$ ${trimmedCmd}`,
        timestamp: new Date(),
      });
      addHistoryEntry({
        type: 'info',
        content: helpContent,
        timestamp: new Date(),
      });
      setCommand('');
      return;
    }

    // Handle cd command in shell mode
    if (mode === 'shell' && trimmedCmd.startsWith('cd ')) {
      const newDir = trimmedCmd.substring(3).trim();
      setWorkingDirectory(newDir || '~');
      addHistoryEntry({
        type: 'input',
        content: `$ ${trimmedCmd}`,
        timestamp: new Date(),
      });
      addHistoryEntry({
        type: 'info',
        content: `Changed directory to: ${newDir || '~'}`,
        timestamp: new Date(),
      });
      setCommand('');
      return;
    }

    // Add to history display
    addHistoryEntry({
      type: 'input',
      content: mode === 'kubectl' ? `$ kubectl ${trimmedCmd}` : `$ ${trimmedCmd}`,
      timestamp: new Date(),
    });

    // Add to command history for navigation
    addCommandToHistory(trimmedCmd);
    setHistoryIndex(-1);
    setCommand('');
    setExecuting(true);

    try {
      if (mode === 'kubectl') {
        const response = await kubernetesApi.executeKubectl({
          command: trimmedCmd,
          timeout: 60,
        });

        if (response.data.success) {
          if (response.data.stdout) {
            addHistoryEntry({
              type: 'output',
              content: response.data.stdout,
              timestamp: new Date(),
              executionTime: response.data.execution_time,
            });
          } else {
            addHistoryEntry({
              type: 'info',
              content: 'Command executed successfully (no output)',
              timestamp: new Date(),
              executionTime: response.data.execution_time,
            });
          }
        } else {
          addHistoryEntry({
            type: 'error',
            content: response.data.stderr || 'Command failed',
            timestamp: new Date(),
            executionTime: response.data.execution_time,
          });
        }
      } else {
        // Shell mode
        const response = await kubernetesApi.executeShell({
          command: trimmedCmd,
          timeout: 60,
          working_directory: workingDirectory,
        });

        // Update working directory from response
        if (response.data.working_directory) {
          setWorkingDirectory(response.data.working_directory);
        }

        if (response.data.success) {
          if (response.data.stdout) {
            addHistoryEntry({
              type: 'output',
              content: response.data.stdout,
              timestamp: new Date(),
              executionTime: response.data.execution_time,
              workingDirectory: response.data.working_directory,
            });
          } else {
            addHistoryEntry({
              type: 'info',
              content: 'Command executed successfully (no output)',
              timestamp: new Date(),
              executionTime: response.data.execution_time,
            });
          }
        } else {
          addHistoryEntry({
            type: 'error',
            content: response.data.stderr || 'Command failed',
            timestamp: new Date(),
            executionTime: response.data.execution_time,
          });
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute command';
      addHistoryEntry({
        type: 'error',
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
      });
    } finally {
      setExecuting(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(command);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      clearHistory();
    }
  };

  const handleClearTerminal = () => {
    clearHistory();
  };

  const runQuickCommand = (cmd: string) => {
    setCommand(cmd);
    executeCommand(cmd);
  };

  const toggleMode = (newMode: TerminalMode) => {
    setMode(newMode);
    addHistoryEntry({
      type: 'info',
      content: `Switched to ${newMode === 'kubectl' ? 'Kubectl' : 'Shell'} mode`,
      timestamp: new Date(),
    });
  };

  const quickCommands = mode === 'kubectl' ? KUBECTL_QUICK_COMMANDS : SHELL_QUICK_COMMANDS;
  const mono = { fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace" };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-28px -32px', height: 'calc(100vh - 52px)', background: '#0a0a0a', color: '#ffffff', overflow: 'hidden' }}>
      {/* K8s Header */}
      <K8sHeader
        title="Terminal"
        subtitle={mode === 'kubectl' ? 'Execute kubectl commands against your cluster' : 'Execute shell commands on the backend server'}
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Mode Toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: 2 }}>
              <button
                onClick={() => toggleMode('kubectl')}
                style={{
                  background: mode === 'kubectl' ? 'rgba(96,165,250,0.15)' : 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  padding: '6px 12px',
                  color: mode === 'kubectl' ? '#60a5fa' : '#9ca3af',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s',
                  letterSpacing: 0.2,
                }}
              >
                <ServerIcon style={{ width: 14, height: 14 }} />
                Kubectl
              </button>
              <button
                onClick={() => toggleMode('shell')}
                style={{
                  background: mode === 'shell' ? 'rgba(96,165,250,0.15)' : 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  padding: '6px 12px',
                  color: mode === 'shell' ? '#60a5fa' : '#9ca3af',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s',
                  letterSpacing: 0.2,
                }}
              >
                <CommandLineIcon style={{ width: 14, height: 14 }} />
                Shell
              </button>
            </div>
            <button
              onClick={handleClearTerminal}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: 11,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                letterSpacing: 0.2,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#e5e5e5')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
            >
              <TrashIcon style={{ width: 12, height: 12 }} />
              Clear
            </button>
          </div>
        }
      />

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'hidden', padding: '16px 32px', display: 'flex', flexDirection: 'column', minHeight: 0, gap: 12 }}>
        {/* Quick Commands */}
        <section style={{ flexShrink: 0 }}>
          <h3 style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Quick Commands ({mode === 'kubectl' ? 'Kubectl' : 'Shell'})
          </h3>
          <div style={{ display: 'flex', overflowX: 'auto', overflowY: 'hidden', gap: 6, paddingBottom: 4 }}>
            {quickCommands.map((qc) => (
              <button
                key={qc.command}
                onClick={() => runQuickCommand(qc.command)}
                disabled={executing}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: 4,
                  padding: '5px 10px',
                  color: executing ? '#737373' : '#ffffff',
                  fontSize: 10,
                  fontWeight: 500,
                  cursor: executing ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  letterSpacing: 0.2,
                  opacity: executing ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => !executing && (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                onMouseLeave={(e) => !executing && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                {qc.label}
              </button>
            ))}
          </div>
        </section>

        {/* Terminal */}
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f0f0f', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', minHeight: 0 }}>
            {/* Terminal Header */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CommandLineIcon style={{ width: 14, height: 14, color: '#9ca3af' }} />
                <span style={{ ...mono, fontSize: 11, color: '#e5e5e5', letterSpacing: 0.2 }}>
                  {mode === 'kubectl' ? 'kubectl' : 'bash'}
                </span>
                {mode === 'shell' && (
                  <span style={{ ...mono, fontSize: 10, color: '#737373', letterSpacing: 0.2 }}>
                    ({workingDirectory})
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: mode === 'kubectl' ? 'rgba(96,165,250,0.15)' : 'rgba(34,197,94,0.15)',
                  color: mode === 'kubectl' ? '#60a5fa' : '#22c55e',
                  letterSpacing: 0.2,
                }}>
                  {mode === 'kubectl' ? 'K8s Mode' : 'Shell Mode'}
                </span>
                {executing && (
                  <span style={{ fontSize: 10, color: '#eab308', display: 'flex', alignItems: 'center', gap: 4, letterSpacing: 0.2 }}>
                    <div style={{ width: 10, height: 10, border: '2px solid #eab308', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    Executing...
                  </span>
                )}
              </div>
            </div>

            {/* Terminal Content */}
            <div
              ref={terminalRef}
              style={{ flex: 1, overflow: 'auto', padding: 16, ...mono, fontSize: 11, minHeight: 0 }}
              onClick={() => {
                const selection = window.getSelection();
                if (!selection || selection.toString().length === 0) {
                  inputRef.current?.focus();
                }
              }}
            >
              {history.map((entry, index) => (
                <div key={index} style={{ marginBottom: 8 }}>
                  {entry.type === 'input' && (
                    <div style={{ display: 'flex', alignItems: 'start', gap: 8 }}>
                      <span style={{ color: '#22c55e', userSelect: 'none' }}>&gt;</span>
                      <span style={{ color: '#ffffff', letterSpacing: 0.2 }}>{entry.content}</span>
                    </div>
                  )}
                  {entry.type === 'output' && (
                    <div style={{ paddingLeft: 20 }}>
                      <pre style={{ color: '#e5e5e5', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, letterSpacing: 0.2 }}>{entry.content}</pre>
                      {entry.executionTime !== undefined && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 10, color: '#737373' }}>
                          <ClockIcon style={{ width: 12, height: 12 }} />
                          {entry.executionTime}s
                          <CheckCircleIcon style={{ width: 12, height: 12, color: '#22c55e', marginLeft: 8 }} />
                        </div>
                      )}
                    </div>
                  )}
                  {entry.type === 'error' && (
                    <div style={{ paddingLeft: 20 }}>
                      <pre style={{ color: '#ef4444', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, letterSpacing: 0.2 }}>{entry.content}</pre>
                      {entry.executionTime !== undefined && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 10, color: '#737373' }}>
                          <ClockIcon style={{ width: 12, height: 12 }} />
                          {entry.executionTime}s
                          <XCircleIcon style={{ width: 12, height: 12, color: '#ef4444', marginLeft: 8 }} />
                        </div>
                      )}
                    </div>
                  )}
                  {entry.type === 'info' && (
                    <div style={{ paddingLeft: 20 }}>
                      <pre style={{ color: '#60a5fa', whiteSpace: 'pre-wrap', margin: 0, letterSpacing: 0.2 }}>{entry.content}</pre>
                    </div>
                  )}
                </div>
              ))}

              {/* Input Line */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#22c55e', userSelect: 'none' }}>&gt;</span>
                {mode === 'kubectl' && <span style={{ color: '#737373', letterSpacing: 0.2 }}>kubectl</span>}
                {mode === 'shell' && <span style={{ color: '#737373', letterSpacing: 0.2 }}>{workingDirectory}$</span>}
                <input
                  ref={inputRef}
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={executing}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#ffffff',
                    ...mono,
                    fontSize: 11,
                    letterSpacing: 0.2,
                  }}
                  placeholder={executing ? 'Executing...' : 'Enter command...'}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Help Section */}
        <section style={{
          flexShrink: 0,
          padding: 8,
          borderRadius: 4,
          background: mode === 'kubectl' ? 'rgba(234,179,8,0.05)' : 'rgba(96,165,250,0.05)',
          border: `1px solid ${mode === 'kubectl' ? 'rgba(234,179,8,0.2)' : 'rgba(96,165,250,0.2)'}`,
        }}>
          <div style={{ fontSize: 9, color: '#9ca3af', letterSpacing: 0.2 }}>
            <kbd style={{
              padding: '1px 3px',
              borderRadius: 2,
              fontSize: 8,
              ...mono,
              background: mode === 'kubectl' ? 'rgba(234,179,8,0.15)' : 'rgba(96,165,250,0.15)',
              color: mode === 'kubectl' ? '#eab308' : '#60a5fa',
            }}>Enter</kbd> execute • <kbd style={{
              padding: '1px 3px',
              borderRadius: 2,
              fontSize: 8,
              ...mono,
              background: mode === 'kubectl' ? 'rgba(234,179,8,0.15)' : 'rgba(96,165,250,0.15)',
              color: mode === 'kubectl' ? '#eab308' : '#60a5fa',
            }}>↑↓</kbd> history • <kbd style={{
              padding: '1px 3px',
              borderRadius: 2,
              fontSize: 8,
              ...mono,
              background: mode === 'kubectl' ? 'rgba(234,179,8,0.15)' : 'rgba(96,165,250,0.15)',
              color: mode === 'kubectl' ? '#eab308' : '#60a5fa',
            }}>Ctrl+L</kbd> clear • <code style={{
              padding: '1px 3px',
              borderRadius: 2,
              fontSize: 8,
              ...mono,
              background: mode === 'kubectl' ? 'rgba(234,179,8,0.15)' : 'rgba(96,165,250,0.15)',
              color: mode === 'kubectl' ? '#eab308' : '#60a5fa',
            }}>help</code> for more
          </div>
        </section>
      </main>
    </div>
  );
}
