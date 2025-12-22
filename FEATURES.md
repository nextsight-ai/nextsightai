# ✨ NextSight AI - Complete Feature Guide

> The most comprehensive, AI-first Kubernetes management platform. Free forever.

---

## 🎯 Feature Categories

- [🤖 AI-Powered Features](#-ai-powered-features) - Intelligence that actually helps
- [🚀 Deployment Tools](#-deployment--gitops-tools) - Ship faster, break less
- [👨‍💻 Developer Tools](#-developer-tools) - Make Kubernetes accessible
- [📊 Monitoring & Observability](#-monitoring--observability) - See everything, miss nothing
- [🔒 Security Features](#-security-features) - Sleep better at night
- [🔗 Integrations](#-integrations) - Connect everything
- [⚙️ Management Tools](#-management-tools) - Control at scale

---

## 🤖 AI-Powered Features

### 1. AI Chat Assistant

**What it does:**
Ask questions about your cluster in natural language and get intelligent, actionable responses.

**Key Features:**
- 🌐 Multi-provider support (Groq, Google Gemini, Claude)
- 🧠 Context-aware responses with real cluster data
- 📊 Automatic data fetching from Kubernetes, security, metrics
- 💬 Natural language interface - ask like you're talking to a colleague
- 🎯 Actionable recommendations with kubectl commands

**Use Cases:**
```
You: "Why is my nginx pod crashing?"
AI: "Your nginx pod is in CrashLoopBackOff because it's missing the required
     config map 'nginx-config'. Here's how to fix it:

     kubectl create configmap nginx-config --from-file=nginx.conf
     kubectl rollout restart deployment/nginx"
```

**How to Access:** Available on every page via the floating AI chat button

---

### 2. Proactive AI Insights

**What it does:**
AI automatically analyzes your cluster and surfaces issues before they become incidents.

**Key Features:**
- 🔍 Auto-detection of failed/crashing pods
- ⚠️ Degraded deployment identification
- 🛡️ Security risk detection from security dashboard
- 💰 Resource optimization opportunities
- 📈 Cluster health scoring with trends

**Example Insights:**
- "3 pods are crash-looping in production namespace"
- "Deployment 'api-server' has been degraded for 15 minutes"
- "Found 12 containers running as root - security risk"
- "5 deployments are over-provisioned and wasting resources"

**How to Access:** `/optimization` or click the AI insights counter in navigation

**API Endpoint:** `GET /api/v1/ai/insights/proactive`

---

### 3. AI Runbook Generator

**What it does:**
Generate detailed incident response runbooks automatically for common Kubernetes issues.

**Supported Incident Types:**
- 🔴 `pod_crash` - Pod crash loops
- 🔴 `deployment_failed` - Failed deployments
- 🔴 `node_not_ready` - Node failures
- 🔴 `oom_killed` - Out of memory killed
- 🔴 `network_issue` - Network connectivity problems

**Runbook Includes:**
- Step-by-step investigation commands
- Expected outputs for verification
- Fix commands with explanations
- Escalation paths if fixes don't work

**API Endpoint:** `POST /api/v1/ai/runbook/generate`

---

### 4. AI Workload Analysis

**What it does:**
Deep analysis of individual workloads with actionable fix suggestions.

**Analysis Includes:**
- 🏥 Health scoring (0-100)
- 📋 Categorized issues (security, performance, reliability, best_practices)
- 🎯 Severity levels (high, medium, low)
- 🔧 Auto-fixable vs manual fixes
- 📝 YAML patches and kubectl commands

**Example Output:**
```yaml
Health Score: 65/100

Issues Found:
1. [HIGH] Missing liveness probe
   Category: reliability
   Fix: kubectl patch deployment nginx --type merge -p '...'
   Auto-fixable: Yes

2. [MEDIUM] Running as root
   Category: security
   Fix: Add securityContext with runAsNonRoot: true
   Auto-fixable: Yes
```

**How to Access:** Click any workload → "AI Fixes" tab

**API Endpoint:** `POST /api/v1/ai/workloads/analyze`

---

### 5. AI-Powered Security Remediation

**What it does:**
Explains security findings in plain English and provides step-by-step fixes.

**Key Features:**
- 📖 Plain English CVE explanations
- 💼 Business impact assessment
- 🔧 Step-by-step remediation commands
- 📋 YAML configuration examples
- ✅ Best practices to prevent recurrence

**Example:**
```
Finding: CVE-2024-1234 in nginx:1.19

Plain English:
"This vulnerability allows attackers to crash your web server
by sending specially crafted HTTP requests. If exploited,
your website could go offline."

Business Impact:
- Potential downtime affecting customer access
- DoS attacks possible
- Moderate severity

Fix:
1. Update to nginx:1.20 or later
   kubectl set image deployment/nginx nginx=nginx:1.20

2. Or apply this patch...
```

**How to Access:** Security Dashboard → Click any finding → "AI Explain"

**API Endpoint:** `POST /api/v1/ai/security/explain`

---

## 🚀 Deployment & GitOps Tools

### 6. Helm Chart Catalog

**What it does:**
Visual, searchable catalog of Helm charts with one-click deployment.

**Key Features:**
- 🔍 Search across all configured repositories
- 📦 Browse popular charts (nginx, MySQL, PostgreSQL, Redis, etc.)
- 🏷️ Version selection with chart details
- ⚙️ Custom values override
- 📊 Chart metadata and ratings

**Workflow:**
1. Search for chart (e.g., "postgresql")
2. Select version
3. Customize values
4. Deploy with one click

**How to Access:** `/deploy/helm/catalog`

**API Endpoints:**
- `GET /api/v1/helm/search?query=postgresql`
- `GET /api/v1/helm/chart/{repo}/{chart}/versions`

---

### 7. Helm Workspace

**What it does:**
Interactive workspace for installing, upgrading, and managing Helm releases.

**Key Features:**
- 📝 Visual YAML editor with syntax highlighting
- ✅ YAML validation in real-time
- 🔄 Upgrade releases with diff preview
- ⏮️ Rollback to previous revisions
- 📜 View release history and values
- 🗑️ Uninstall releases

**Modes:**
- **Install**: Deploy new Helm chart
- **Upgrade**: Upgrade existing release
- **Values**: Edit release values

**How to Access:** `/deploy/helm/workspace`

**API Endpoints:**
- `POST /api/v1/helm/install`
- `POST /api/v1/helm/upgrade`
- `POST /api/v1/helm/rollback`
- `GET /api/v1/helm/releases/{namespace}/{name}/history`

---

### 8. YAML Deploy with Validation

**What it does:**
Deploy Kubernetes manifests with dry-run validation and deployment summary.

**Key Features:**
- 📝 Syntax-highlighted YAML editor
- ✅ Dry-run validation before apply
- 📊 Deployment summary modal showing:
  - Resource types detected
  - Namespace
  - Resource names
- 🔍 Resource type extraction
- 🎯 Namespace detection and override

**Workflow:**
1. Paste your YAML
2. Click "Validate" (dry-run)
3. Review summary
4. Apply to cluster

**How to Access:** `/deploy/yaml`

**API Endpoint:** `POST /api/v1/kubernetes/apply`

---

### 9. ArgoCD Integration

**What it does:**
GitOps deployment tracking and management through ArgoCD.

**Key Features:**
- 🔄 Sync status monitoring
- 🏥 Application health tracking
- 🔃 Manual sync triggers
- 📊 Deployment history
- ⚙️ Auto-sync configuration

**How to Access:** `/deploy/argocd`

**API Endpoints:**
- `GET /api/v1/argocd/applications`
- `POST /api/v1/argocd/sync`

---

## 👨‍💻 Developer Tools

### 10. kubectl Terminal

**What it does:**
Full kubectl terminal in your browser with safety guards.

**Key Features:**
- 🖥️ Full kubectl access from browser
- 🚫 Dangerous command blocking (rm -rf /, sudo, etc.)
- 📝 Command history
- 🎨 xterm.js terminal with color support
- ⌨️ Tab completion support

**Safety Features:**
- Blocks destructive commands
- Requires confirmation for delete operations
- Command validation

**How to Access:** `/kubernetes/terminal`

**Blocked Commands:**
- `rm -rf /`
- `sudo` commands
- `kubectl delete --all`
- Other destructive operations

---

### 11. Pod Exec Terminal

**What it does:**
Interactive shell access to running pods with full PTY support.

**Key Features:**
- 🖥️ Full PTY-based terminal
- 📏 xterm.js with resize support
- 🔌 WebSocket real-time communication
- 📦 Multi-container pod support
- 🔒 Input validation (RFC 1123)

**Use Cases:**
- Debug running containers
- Execute commands inside pods
- View real-time logs
- Inspect container filesystem

**How to Access:** Click any pod → "Terminal" tab

**WebSocket Endpoint:** `WS /api/v1/ws/pods/{namespace}/{pod}/exec`

---

### 12. Debug Containers

**What it does:**
Debug distroless and minimal containers without built-in shells.

**Key Features:**
- 🐛 Ephemeral container support
- 🖼️ Multiple debug images:
  - `busybox` - Minimal tooling
  - `alpine` - More tools
  - `netshoot` - Network debugging
  - `ubuntu` - Full toolset
- 🔄 Process namespace sharing
- 🎯 Target container selection

**Perfect For:**
- Distroless images (no shell)
- Minimal images (scratch-based)
- Production debugging without image rebuilds

**How to Access:** Click any pod → "Debug" button

**WebSocket Endpoint:** `WS /api/v1/ws/pods/{namespace}/{pod}/debug`

---

### 13. Self-Service Portal

**What it does:**
Empower developers to manage their own deployments without kubectl access.

**Available Actions:**
- ⚖️ **Scale** - Adjust replica count
- 🔄 **Restart** - Rolling restart
- ⏮️ **Rollback** - Revert to previous version

**Key Features:**
- 📝 Action history and audit trail
- ✅ Optional approval workflow
- 📊 Pending actions dashboard
- 🎯 Self-service for developers
- 🔐 RBAC-aware permissions

**Use Cases:**
- Let developers scale their own services
- Quick restarts without DevOps intervention
- Rollback bad deployments quickly

**How to Access:** `/selfservice`

**API Endpoints:**
- `POST /api/v1/selfservice/actions/create`
- `GET /api/v1/selfservice/actions/list`
- `GET /api/v1/selfservice/catalog`

---

## 📊 Monitoring & Observability

### 14. Metrics Explorer

**What it does:**
Explore Prometheus metrics with PromQL query builder and visualization.

**Key Features:**
- 📊 Chart visualization (line charts)
- ⏱️ Time range selector (15m to 7d)
- 📝 PromQL query editor
- 💾 Example queries library:
  - CPU usage by pod
  - Memory usage by pod
  - Node CPU/memory
  - HTTP request rates
  - Pod restart counts
- 📈 Real-time metric updates
- 📋 Table view for raw data

**Example Queries:**
```promql
# CPU usage by pod
sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) by (pod)

# Memory usage by pod
sum(container_memory_usage_bytes{container!=""}) by (pod)

# HTTP request rate
sum(rate(http_requests_total[5m])) by (method, status)
```

**How to Access:** `/prometheus/explorer`

**API Endpoint:** `POST /api/v1/prometheus/query_range`

---

### 15. Alerts Management

**What it does:**
View and manage Prometheus alerts with firing status.

**Key Features:**
- 🔔 Alert rules listing
- 🔥 Firing alerts view
- 📊 Alert history
- ⚙️ Alert rule management
- 🎯 Alert grouping

**Alert States:**
- `firing` - Currently alerting
- `pending` - About to fire
- `inactive` - Normal state

**How to Access:** `/prometheus/alerts`

**API Endpoint:** `GET /api/v1/prometheus/alerts`

---

### 16. Real-time Log Streaming

**What it does:**
Live log streaming from pods with WebSocket support.

**Key Features:**
- 📡 WebSocket-based real-time streaming
- 🔍 Search and filter logs
- ⬇️ Download logs
- 🔄 Auto-scroll to latest
- ❌ Clear logs buffer
- 💓 Connection heartbeat
- 🎯 Container selection (multi-container pods)

**Advanced Features:**
- Tail last N lines
- Timestamp display
- Follow mode
- Line highlighting

**How to Access:** Click any pod → "Logs" tab

**WebSocket Endpoint:** `WS /api/v1/ws/pods/{namespace}/{pod}/logs`

**HTTP Endpoint:** `GET /api/v1/kubernetes/pods/{ns}/{pod}/logs`

---

## 🔒 Security Features

### 17. Security Dashboard

**What it does:**
Comprehensive security analysis with A-F grading system.

**Components:**

#### Security Score & Grade
- 📊 Overall score (0-100)
- 🎓 Letter grade (A-F)
- 📈 Trend tracking
- 🎯 Score breakdown by category

#### Security Findings
Real-time detection of:
- 🚨 Privileged containers
- 👤 Containers running as root
- 📁 Host path mounts
- 🔓 Missing security contexts
- 📦 Sensitive volume mounts

#### RBAC Analysis
- 🔍 Service account risk assessment
- 👑 Cluster-admin binding detection
- 🌟 Wildcard permission identification
- ⚠️ Over-permissioned accounts

#### Network Policy Coverage
- 🛡️ Namespace protection status
- 📊 Pod coverage percentage
- ❌ Unprotected namespaces

**How to Access:** `/security`

**API Endpoint:** `GET /api/v1/security/dashboard`

---

### 18. Trivy Vulnerability Scanner

**What it does:**
Built-in container image vulnerability scanning (no external installation needed).

**Key Features:**
- 🔍 CVE detection with severity levels
- 📊 CVSS scores
- 🔧 Fix version recommendations
- 📈 Vulnerability trend tracking
- 📦 Image scanning cache

**Severity Levels:**
- 🔴 CRITICAL
- 🟠 HIGH
- 🟡 MEDIUM
- 🟢 LOW
- ⚪ UNKNOWN

**Trivy Version:** v0.58.0 (built into Docker image)

**How to Access:** Security Dashboard → Image Scans

**API Endpoints:**
- `POST /api/v1/security/trivy/scan`
- `GET /api/v1/security/trivy/results/{image_id}`

---

### 19. RBAC Analyzer

**What it does:**
Analyze and visualize Kubernetes RBAC permissions.

**Analysis Includes:**
- 🔍 Service account enumeration
- 👥 Role binding analysis
- ⚠️ High-risk permission detection:
  - Cluster-admin bindings
  - Wildcard (`*`) permissions
  - Resource creation rights
  - Secret access
- 📊 Risk scoring

**Risk Indicators:**
- Users with cluster-admin
- Service accounts with wildcards
- Cross-namespace permissions
- API server access

**How to Access:** Security Dashboard → RBAC tab

**API Endpoint:** `GET /api/v1/security/rbac/analysis`

---

## 🔗 Integrations

### 20. Integration Hub

**What it does:**
Connect and manage integrations with external tools and services.

**Supported Integrations:**

#### Source Control
- 🐙 GitHub (OAuth)
- 🦊 GitLab (OAuth)

#### CI/CD
- 🔧 Jenkins pipelines
- 🔄 ArgoCD sync
- ⎈ Helm repositories

#### Monitoring
- 📊 Prometheus/Grafana
- 📝 Loki (logging)

#### Cloud Providers
- ☁️ AWS (cost data)
- 🌐 Azure
- 🔷 GCP

#### Notifications
- 💬 Slack webhooks

**Key Features:**
- ⚙️ Easy OAuth configuration
- 🔌 Connection testing
- 🔄 Status monitoring
- 🎯 Integration health checks
- 📋 Setup wizards

**How to Access:** `/settings/integrations`

**API Endpoints:**
- `GET /api/v1/settings/integrations`
- `POST /api/v1/settings/integrations/{id}/connect`
- `POST /api/v1/settings/integrations/{id}/test`

---

## ⚙️ Management Tools

### 21. Multi-Cluster Management

**What it does:**
Manage unlimited Kubernetes clusters from a single dashboard.

**Key Features:**
- 🔄 Seamless cluster switching
- ➕ Add/remove clusters
- 📊 Cluster status (connected/disconnected/error)
- 📈 Cluster metrics:
  - Kubernetes version
  - Node count
  - Namespace count
  - Pod count
- 🔍 kubeconfig context discovery
- 🔐 Admin-only management (RBAC)

**Cluster Health:**
- ✅ Connected - Cluster is healthy
- ⚠️ Warning - Cluster has issues
- ❌ Error - Cluster unreachable

**How to Access:** `/clusters`

**API Endpoints:**
- `GET /api/v1/clusters`
- `POST /api/v1/clusters/add`
- `DELETE /api/v1/clusters/{id}`
- `POST /api/v1/clusters/{id}/switch`

---

### 22. Resource Optimization

**What it does:**
AI-powered resource optimization with cost analysis.

**Analysis Features:**

#### Over-Provisioning Detection
- Identifies pods using < 30% of requests
- Suggests right-sizing with 30% safety margin
- Shows potential savings

#### Under-Provisioning Detection
- Identifies pods using > 85% of requests
- Warns of potential OOM kills or throttling
- Recommends increases

#### Idle Resource Detection
- Finds resources with < 5% usage
- Suggests removal or consolidation

#### Cost Analysis
- 💰 Per-namespace cost breakdown
- 📊 Per-pod cost estimation
- 📈 30-day cost trends
- 🎯 Top cost consumers
- 📅 Monthly/annual projections

**Optimization Severity:**
- 🔴 CRITICAL - Immediate action needed
- 🟠 HIGH - Should address soon
- 🟡 MEDIUM - Nice to have
- 🟢 LOW - Minor optimization

**How to Access:** `/optimization`

**API Endpoint:** `GET /api/v1/optimization/dashboard`

**Caching:** 60-second Redis TTL for performance

---

### 23. Namespace Management

**What it does:**
Comprehensive namespace administration and resource quotas.

**Key Features:**
- 📋 List all namespaces
- ➕ Create new namespaces
- 🗑️ Delete namespaces
- 📊 Resource quotas per namespace
- 🎯 Label management
- 📈 Usage statistics

**Per-Namespace Metrics:**
- Pod count
- Service count
- ConfigMap/Secret count
- CPU/Memory usage
- Resource quotas

**How to Access:** `/namespaces`

**API Endpoints:**
- `GET /api/v1/kubernetes/namespaces`
- `POST /api/v1/kubernetes/namespaces/create`
- `DELETE /api/v1/kubernetes/namespaces/{name}`

---

### 24. Event Timeline

**What it does:**
Unified timeline of all cluster events and activities.

**Event Types:**
- 🔄 Deployments
- 🚀 Rollouts
- ⚠️ Warnings
- ❌ Errors
- ✅ Successful operations

**Features:**
- 📅 Chronological event list
- 🔍 Filter by type
- 🎯 Filter by namespace
- 📊 Event count statistics
- ⏱️ Real-time updates

**How to Access:** `/events`

**API Endpoint:** `GET /api/v1/kubernetes/events`

---

## 🎓 Advanced Features

### 25. Authentication & RBAC

**What it does:**
Secure access control with JWT authentication and role-based permissions.

**User Roles:**
1. **Admin** - Full access
2. **Developer** - Deploy, view, manage workloads
3. **Operator** - View and restart
4. **Viewer** - Read-only

**OAuth Providers:**
- Google OAuth
- GitHub OAuth
- GitLab OAuth

**Security Features:**
- 🔐 JWT token authentication
- 🔒 Password hashing (pbkdf2_sha256)
- 🎯 Role-based API protection
- 📋 User management UI (admin only)

**Default Test Users:**
```
admin / admin123
developer / developer123
operator / operator123
viewer / viewer123
```

**How to Access:** `/admin/users`

---

### 26. Terminal State Persistence

**What it does:**
Preserves terminal sessions across page navigation.

**Key Features:**
- 💾 Command history saved
- 📜 Output buffer preserved
- 🔄 Reconnection on navigation
- ⚡ Instant restore

**Supported Terminals:**
- kubectl Terminal
- Shell Terminal
- Pod Exec

---

### 27. Dark Mode Support

**What it does:**
Beautiful dark/light theme with system preference detection.

**Features:**
- 🌙 System preference auto-detection
- 💡 Manual toggle
- 🎨 Persistent preference
- 🎯 Optimized for readability

**How to Access:** Click theme toggle in navigation

---

## 🔧 Coming Soon (Roadmap)

Based on [ROADMAP.md](ROADMAP.md), here's what's coming:

### v1.5.0 (Q1 2025)
- 💰 Full Cost Management Dashboard
- 🔔 Advanced Alerting & Notifications
- 📊 Custom Dashboards
- 🔄 CI/CD Pipeline Management

### v1.6.0 (Q2 2025)
- 🤝 GitOps Workflow Automation
- 🔍 Advanced Log Aggregation
- 🎯 Resource Recommendations
- 📈 Capacity Planning

### v2.0.0 (Q3 2025)
- 🏢 Multi-tenancy
- 🔐 Advanced SSO
- 📊 FinOps Integration
- 🎨 Custom Plugins

---

## 📚 Learn More

- [Quick Start Guide](README.md#quick-start)
- [API Documentation](README.md#api-reference)
- [Helm Installation](README.md#helm-installation)
- [Contributing Guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Roadmap](ROADMAP.md)

---

## 💡 Feature Requests

Have an idea for a new feature? [Open an issue](../../issues) and let's discuss!

---

<div align="center">

**Built with ❤️ for the Kubernetes community**

[⭐ Star on GitHub](../../stargazers) • [🐛 Report Bug](../../issues) • [💬 Discussions](../../discussions)

</div>
