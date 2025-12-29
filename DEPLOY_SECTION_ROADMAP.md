# Deploy Section - Implementation Roadmap

**Project:** NextSight AI Platform
**Section:** Deploy (YAML, Helm, ArgoCD)
**Last Updated:** December 29, 2024
**Branch:** feature/deploy-enhancements

---

## 📊 Current Status

### ✅ Completed Features (v1.5.0)

#### 1. Helm Deploy Real API Integration
- **Status:** ✅ Complete (Commit: 619b551)
- **Features:**
  - Live chart repository browsing
  - Real release management (install, upgrade, rollback)
  - AI values analysis integration
  - Auto-reload after operations
- **Files Modified:**
  - `frontend/src/components/deploy/HelmDeployEnhanced.tsx`
  - Backend Helm API already existed

#### 2. YAML Diff View
- **Status:** ✅ Complete (Commit: 941b656)
- **Features:**
  - Side-by-side comparison (current vs deployed)
  - Color-coded changes (green=added, red=removed)
  - Fetch deployed resources from cluster
  - Line-by-line diff algorithm
- **Files Modified:**
  - `frontend/src/components/deploy/YAMLDeployEnhanced.tsx`

#### 3. ArgoCD Resource Tree Visualization
- **Status:** ✅ Complete (Commit: 45c9a9c)
- **Features:**
  - Hierarchical resource tree (Deployment → ReplicaSet → Pods)
  - Expandable/collapsible nodes
  - Health status badges
  - Parent-child relationships
- **Files Modified:**
  - `frontend/src/components/deploy/ArgoCDDeploy.tsx`

#### 4. Helm Template Preview
- **Status:** ✅ Complete (Commit: 9d3398f)
- **Features:**
  - Render manifests before deployment
  - Live template rendering
  - YAML syntax highlighting
- **Files Modified:**
  - `backend/app/services/helm_service.py` - Added `template()` method
  - `backend/app/api/routes/helm.py` - Added `/charts/template` endpoint
  - `frontend/src/components/deploy/HelmDeployEnhanced.tsx`
  - `frontend/src/services/api.ts`

#### 5. AI-Powered YAML Auto-Fix
- **Status:** ✅ Complete (Commit: cc9c540, 8800661, 8d28a56, 93a4172)
- **Features:**
  - One-click AI corrections
  - Issue count badge
  - Preserves structure while applying targeted fixes
  - Temperature control (0.2) for consistent scores
  - MD5-based caching (5 min TTL)
- **Files Modified:**
  - `backend/app/api/routes/ai.py` - Added `/yaml-autofix` endpoint
  - `frontend/src/components/deploy/YAMLDeployEnhanced.tsx`
  - `frontend/src/services/api.ts`

---

## 🎯 Priority Roadmap

### Phase 1: Quick Wins (1-2 weeks)
**Goal:** High-value, low-effort features

#### P1.1 - Export/Import YAML Files ⚡
- **Priority:** HIGH
- **Effort:** LOW (1-2 days)
- **Impact:** ⭐⭐⭐⭐
- **Description:** Download/upload YAML files, copy to clipboard, share links

**Implementation Plan:**
```typescript
// Frontend: YAMLDeployEnhanced.tsx
const exportToFile = () => {
  const blob = new Blob([yamlContent], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `deployment-${Date.now()}.yaml`;
  a.click();
};

const importFromFile = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => setYamlContent(e.target.result as string);
  reader.readAsText(file);
};

// UI Additions:
<div className="flex gap-2">
  <button onClick={exportToFile}>
    <ArrowDownTrayIcon /> Export
  </button>
  <input type="file" accept=".yaml,.yml" onChange={handleImport} />
  <button onClick={copyToClipboard}>
    <ClipboardIcon /> Copy
  </button>
</div>
```

**Files to Modify:**
- `frontend/src/components/deploy/YAMLDeployEnhanced.tsx`

**Testing:**
- Export YAML → verify file download
- Import YAML → verify content loads
- Copy to clipboard → paste elsewhere

---

#### P1.2 - Selective Issue Fixing 🔥
- **Priority:** CRITICAL
- **Effort:** MEDIUM (3-4 days)
- **Impact:** ⭐⭐⭐⭐⭐
- **Description:** Let users choose which AI-detected issues to fix

**Implementation Plan:**

**Backend Changes:**
```python
# backend/app/api/routes/ai.py

class SelectiveFixRequest(BaseModel):
    yaml_content: str
    selected_issues: List[int]  # Indices of issues to fix
    all_issues: List[Dict[str, Any]]  # All detected issues

@router.post("/yaml-selective-fix")
async def selective_fix_yaml(request: SelectiveFixRequest):
    """Fix only selected issues in YAML."""
    # Filter to only selected issues
    issues_to_fix = [
        request.all_issues[i]
        for i in request.selected_issues
        if i < len(request.all_issues)
    ]

    # Call AI with only selected issues
    prompt = f"""Fix ONLY these specific issues:
{format_issues(issues_to_fix)}

Original YAML:
{request.yaml_content}

Return fixed YAML."""

    fixed_yaml = generate_ai_response(prompt)
    return {"fixed_yaml": fixed_yaml, "success": True}
```

**Frontend Changes:**
```typescript
// frontend/src/components/deploy/YAMLDeployEnhanced.tsx

interface SelectableIssue extends AIReviewIssue {
  selected: boolean;
  index: number;
}

const [selectableIssues, setSelectableIssues] = useState<SelectableIssue[]>([]);

// When AI review completes:
const issues = aiReview.issues.map((issue, index) => ({
  ...issue,
  selected: false,
  index
}));
setSelectableIssues(issues);

// UI Component:
function IssueSelector() {
  return (
    <div className="space-y-2">
      {selectableIssues.map(issue => (
        <div key={issue.index} className="flex items-start gap-3 p-3 border rounded">
          <input
            type="checkbox"
            checked={issue.selected}
            onChange={() => toggleIssue(issue.index)}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`badge ${getSeverityColor(issue.severity)}`}>
                {issue.severity}
              </span>
              <span className="font-medium">{issue.type}</span>
            </div>
            <p className="text-sm text-gray-600">{issue.message}</p>
            {issue.suggestion && (
              <p className="text-sm text-blue-600 mt-1">
                Fix: {issue.suggestion}
              </p>
            )}
          </div>
        </div>
      ))}
      <button
        onClick={handleSelectiveFix}
        disabled={selectedCount === 0}
      >
        Apply {selectedCount} Selected Fix{selectedCount !== 1 ? 'es' : ''}
      </button>
    </div>
  );
}
```

**Files to Modify:**
- `backend/app/api/routes/ai.py`
- `frontend/src/components/deploy/YAMLDeployEnhanced.tsx`
- `frontend/src/services/api.ts`

**Testing:**
- Load YAML with 5+ issues
- AI Review → see all issues
- Select 2-3 issues
- Apply selective fix → verify only selected issues fixed
- Review again → remaining issues still present

---

#### P1.3 - YAML Syntax Highlighting Improvements
- **Priority:** MEDIUM
- **Effort:** LOW (1 day)
- **Impact:** ⭐⭐⭐
- **Description:** Better syntax highlighting, line numbers, error highlighting

**Implementation:**
```typescript
// Use react-syntax-highlighter with custom theme
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

<SyntaxHighlighter
  language="yaml"
  style={vscDarkPlus}
  showLineNumbers={true}
  wrapLines={true}
  lineProps={(lineNumber) => {
    // Highlight error lines
    const style = { display: 'block' };
    if (errorLines.includes(lineNumber)) {
      style.backgroundColor = '#ff000020';
    }
    return { style };
  }}
>
  {yamlContent}
</SyntaxHighlighter>
```

**Files to Modify:**
- `frontend/src/components/deploy/YAMLDeployEnhanced.tsx`

---

### Phase 2: Core Features (2-3 weeks)
**Goal:** Essential production features

#### P2.1 - YAML Templates Library 🔥
- **Priority:** CRITICAL
- **Effort:** HIGH (5-7 days)
- **Impact:** ⭐⭐⭐⭐⭐
- **Description:** Pre-built, production-ready templates

**Template Structure:**
```typescript
// frontend/src/data/yaml-templates.ts

interface YAMLTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  yaml: string;
  variables?: Record<string, TemplateVariable>;
}

interface TemplateVariable {
  name: string;
  description: string;
  default: string;
  type: 'string' | 'number' | 'boolean';
  validation?: string; // regex pattern
}

const templates: YAMLTemplate[] = [
  {
    id: 'nginx-secure',
    name: 'Nginx Deployment (Production-Ready)',
    category: 'Web Applications',
    description: 'Secure, HA-ready Nginx deployment with health checks, resource limits, and security contexts',
    difficulty: 'intermediate',
    tags: ['nginx', 'web', 'production', 'secure'],
    variables: {
      appName: {
        name: 'Application Name',
        description: 'Name for the deployment',
        default: 'my-nginx',
        type: 'string',
        validation: '^[a-z0-9-]+$'
      },
      replicas: {
        name: 'Replica Count',
        description: 'Number of pods',
        default: '3',
        type: 'number'
      }
    },
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{appName}}
  labels:
    app: {{appName}}
    tier: frontend
spec:
  replicas: {{replicas}}
  selector:
    matchLabels:
      app: {{appName}}
  template:
    metadata:
      labels:
        app: {{appName}}
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      containers:
      - name: nginx
        image: nginx:1.24-alpine
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5`
  },
  // More templates...
];
```

**UI Component:**
```typescript
function TemplateSelector() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<YAMLTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});

  const categories = ['Web Applications', 'Databases', 'Jobs', 'Security'];

  const filteredTemplates = templates.filter(t =>
    (selectedCategory === 'all' || t.category === selectedCategory) &&
    (searchQuery === '' ||
     t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     t.tags.some(tag => tag.includes(searchQuery.toLowerCase())))
  );

  const applyTemplate = () => {
    let yaml = selectedTemplate.yaml;

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      yaml = yaml.replaceAll(`{{${key}}}`, value);
    });

    setYamlContent(yaml);
    addLog('info', `Template '${selectedTemplate.name}' applied`);
  };

  return (
    <Modal open={showTemplates}>
      <div className="flex h-[600px]">
        {/* Left: Categories */}
        <div className="w-48 border-r p-4">
          <button
            className={selectedCategory === 'all' ? 'active' : ''}
            onClick={() => setSelectedCategory('all')}
          >
            All Templates
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              className={selectedCategory === cat ? 'active' : ''}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Middle: Template List */}
        <div className="flex-1 p-4 overflow-y-auto">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
          />
          <div className="space-y-2">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className="border p-3 rounded hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedTemplate(template)}
              >
                <h3 className="font-semibold">{template.name}</h3>
                <p className="text-sm text-gray-600">{template.description}</p>
                <div className="flex gap-2 mt-2">
                  <span className="badge">{template.difficulty}</span>
                  {template.tags.map(tag => (
                    <span key={tag} className="badge-sm">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Preview & Variables */}
        {selectedTemplate && (
          <div className="w-96 border-l p-4 overflow-y-auto">
            <h3 className="font-bold mb-4">{selectedTemplate.name}</h3>

            {/* Variables Form */}
            {selectedTemplate.variables && (
              <div className="mb-4 space-y-3">
                <h4 className="font-semibold">Configure Template</h4>
                {Object.entries(selectedTemplate.variables).map(([key, variable]) => (
                  <div key={key}>
                    <label className="text-sm font-medium">{variable.name}</label>
                    <p className="text-xs text-gray-500">{variable.description}</p>
                    <input
                      type={variable.type}
                      defaultValue={variable.default}
                      onChange={(e) => setVariables({...variables, [key]: e.target.value})}
                      className="w-full mt-1"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* YAML Preview */}
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Preview</h4>
              <pre className="text-xs bg-gray-900 text-white p-3 rounded overflow-auto max-h-64">
                {selectedTemplate.yaml}
              </pre>
            </div>

            <button onClick={applyTemplate} className="w-full">
              Use This Template
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
```

**Template Categories to Create:**
1. **Web Applications:**
   - Nginx (Production-Ready)
   - Node.js + Redis
   - React SPA with CDN
   - Django + PostgreSQL

2. **Databases:**
   - PostgreSQL StatefulSet
   - MongoDB Replica Set
   - Redis Cluster
   - MySQL with PVC

3. **Jobs & Processing:**
   - CronJob (Backup)
   - Batch Job (Data Processing)
   - Queue Worker

4. **Security:**
   - Network Policy (Default Deny)
   - Pod Security Policy
   - Service Account with RBAC

5. **Monitoring:**
   - Prometheus ServiceMonitor
   - Grafana Dashboard

**Files to Create/Modify:**
- `frontend/src/data/yaml-templates.ts` (NEW)
- `frontend/src/components/deploy/TemplateSelector.tsx` (NEW)
- `frontend/src/components/deploy/YAMLDeployEnhanced.tsx`

**Testing:**
- Browse templates by category
- Search for templates
- Select template → fill variables → apply
- Verify YAML populates correctly

---

#### P2.2 - Deployment History & Rollback 🔥
- **Priority:** CRITICAL
- **Effort:** HIGH (5-6 days)
- **Impact:** ⭐⭐⭐⭐⭐
- **Description:** Track all deployments with one-click rollback

**Database Schema:**
```sql
-- backend/app/models/deployment_history.py

CREATE TABLE deployment_history (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    namespace VARCHAR(255),
    yaml_content TEXT NOT NULL,
    yaml_hash VARCHAR(64) NOT NULL,  -- MD5 of YAML for deduplication
    resource_count INTEGER,
    resources JSONB,  -- Array of {kind, name, namespace, action}
    deployment_status VARCHAR(50),  -- success, failed, partial
    error_message TEXT,
    duration_ms INTEGER,
    deployed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_user_deployed (user_id, deployed_at DESC),
    INDEX idx_namespace (namespace),
    INDEX idx_yaml_hash (yaml_hash)
);

CREATE TABLE deployment_snapshots (
    id UUID PRIMARY KEY,
    deployment_id UUID REFERENCES deployment_history(id),
    resource_kind VARCHAR(100),
    resource_name VARCHAR(255),
    resource_namespace VARCHAR(255),
    manifest_before TEXT,  -- YAML before deployment
    manifest_after TEXT,   -- YAML after deployment
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Backend API:**
```python
# backend/app/api/routes/deployment_history.py

from fastapi import APIRouter, Depends
from app.core.auth import get_current_user

router = APIRouter(prefix="/deployment-history")

@router.get("/")
async def list_deployments(
    namespace: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user = Depends(get_current_user)
):
    """List deployment history."""
    query = db.query(DeploymentHistory).filter_by(user_id=current_user.id)

    if namespace:
        query = query.filter_by(namespace=namespace)

    deployments = query.order_by(
        DeploymentHistory.deployed_at.desc()
    ).limit(limit).offset(offset).all()

    return {
        "deployments": [d.to_dict() for d in deployments],
        "total": query.count()
    }

@router.get("/{deployment_id}")
async def get_deployment(
    deployment_id: str,
    current_user = Depends(get_current_user)
):
    """Get deployment details."""
    deployment = db.query(DeploymentHistory).filter_by(
        id=deployment_id,
        user_id=current_user.id
    ).first()

    if not deployment:
        raise HTTPException(404, "Deployment not found")

    # Include snapshots
    snapshots = db.query(DeploymentSnapshots).filter_by(
        deployment_id=deployment_id
    ).all()

    return {
        "deployment": deployment.to_dict(),
        "snapshots": [s.to_dict() for s in snapshots]
    }

@router.post("/{deployment_id}/rollback")
async def rollback_deployment(
    deployment_id: str,
    current_user = Depends(get_current_user)
):
    """Rollback to a previous deployment."""
    deployment = db.query(DeploymentHistory).filter_by(
        id=deployment_id,
        user_id=current_user.id
    ).first()

    if not deployment:
        raise HTTPException(404, "Deployment not found")

    # Get snapshots to restore
    snapshots = db.query(DeploymentSnapshots).filter_by(
        deployment_id=deployment_id
    ).all()

    # Apply previous manifests
    results = []
    for snapshot in snapshots:
        result = await kubernetes_service.apply_yaml(
            yaml_content=snapshot.manifest_before,
            namespace=snapshot.resource_namespace
        )
        results.append(result)

    # Create new deployment history entry
    new_deployment = DeploymentHistory(
        user_id=current_user.id,
        namespace=deployment.namespace,
        yaml_content=deployment.yaml_content,
        resources=deployment.resources,
        deployment_status="success",
        duration_ms=sum(r.duration for r in results)
    )
    db.add(new_deployment)
    db.commit()

    return {
        "success": True,
        "message": f"Rolled back to deployment from {deployment.deployed_at}",
        "new_deployment_id": str(new_deployment.id)
    }

@router.delete("/{deployment_id}")
async def delete_deployment_history(
    deployment_id: str,
    current_user = Depends(get_current_user)
):
    """Delete deployment from history."""
    deployment = db.query(DeploymentHistory).filter_by(
        id=deployment_id,
        user_id=current_user.id
    ).delete()

    db.commit()
    return {"success": True}
```

**Modify YAML Apply to Save History:**
```python
# backend/app/api/routes/kubernetes.py

@router.post("/apply", response_model=YAMLApplyResponse)
async def apply_yaml(request: YAMLApplyRequest, current_user = Depends(get_current_user)):
    """Apply YAML with history tracking."""

    # Apply YAML
    result = await kubernetes_service.apply_yaml(
        yaml_content=request.yaml_content,
        namespace=request.namespace,
        dry_run=request.dry_run
    )

    # If not dry-run and successful, save to history
    if not request.dry_run and result['success']:
        # Fetch current state of resources (before snapshots)
        snapshots = []
        for resource in result['resources']:
            try:
                current_manifest = await kubernetes_service.get_resource_yaml(
                    kind=resource['kind'],
                    name=resource['name'],
                    namespace=resource.get('namespace')
                )
                snapshots.append({
                    'resource_kind': resource['kind'],
                    'resource_name': resource['name'],
                    'resource_namespace': resource.get('namespace'),
                    'manifest_before': current_manifest,
                    'manifest_after': request.yaml_content  # Simplified
                })
            except:
                pass  # Resource might not exist yet

        # Save deployment history
        yaml_hash = hashlib.md5(request.yaml_content.encode()).hexdigest()
        deployment = DeploymentHistory(
            user_id=current_user.id,
            namespace=request.namespace,
            yaml_content=request.yaml_content,
            yaml_hash=yaml_hash,
            resource_count=len(result['resources']),
            resources=result['resources'],
            deployment_status='success' if result['success'] else 'failed',
            error_message=result.get('message') if not result['success'] else None,
            duration_ms=result.get('duration_ms', 0)
        )
        db.add(deployment)
        db.flush()

        # Save snapshots
        for snapshot_data in snapshots:
            snapshot = DeploymentSnapshots(
                deployment_id=deployment.id,
                **snapshot_data
            )
            db.add(snapshot)

        db.commit()
        result['deployment_id'] = str(deployment.id)

    return result
```

**Frontend UI:**
```typescript
// frontend/src/components/deploy/DeploymentHistory.tsx

function DeploymentHistory() {
  const [deployments, setDeployments] = useState<DeploymentHistoryEntry[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [selectedNamespace]);

  const loadHistory = async () => {
    const response = await api.get('/deployment-history', {
      params: { namespace: selectedNamespace }
    });
    setDeployments(response.data.deployments);
  };

  const handleRollback = async (deploymentId: string) => {
    if (!confirm('Are you sure you want to rollback to this deployment?')) return;

    setLoading(true);
    try {
      await api.post(`/deployment-history/${deploymentId}/rollback`);
      addLog('success', '✓ Rolled back successfully');
      loadHistory();
    } catch (error) {
      addLog('error', `✗ Rollback failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="deployment-history">
      <h3>Deployment History</h3>

      <div className="timeline">
        {deployments.map((deployment, idx) => (
          <div key={deployment.id} className="timeline-item">
            <div className="timeline-marker">
              {idx === 0 ? (
                <CheckCircleIcon className="text-green-500" />
              ) : (
                <div className="circle" />
              )}
            </div>

            <div className="timeline-content">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">
                    Deployment #{deployments.length - idx}
                    {idx === 0 && <span className="badge ml-2">Current</span>}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(deployment.deployed_at))} ago
                  </p>
                  <p className="text-sm">
                    {deployment.resource_count} resource{deployment.resource_count !== 1 ? 's' : ''}
                    {' • '}
                    {deployment.duration_ms}ms
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedDeployment(deployment.id)}
                    className="btn-sm"
                  >
                    <EyeIcon className="h-4 w-4" />
                    View
                  </button>

                  {idx !== 0 && (
                    <button
                      onClick={() => handleRollback(deployment.id)}
                      disabled={loading}
                      className="btn-sm btn-warning"
                    >
                      <ArrowUturnLeftIcon className="h-4 w-4" />
                      Rollback
                    </button>
                  )}
                </div>
              </div>

              {/* Resources List */}
              <div className="mt-2 space-y-1">
                {deployment.resources.slice(0, 3).map((resource, i) => (
                  <div key={i} className="text-xs text-gray-600">
                    {resource.action} {resource.kind}/{resource.name}
                  </div>
                ))}
                {deployment.resources.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{deployment.resources.length - 3} more...
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedDeployment && (
        <DeploymentDetailModal
          deploymentId={selectedDeployment}
          onClose={() => setSelectedDeployment(null)}
        />
      )}
    </div>
  );
}
```

**Files to Create/Modify:**
- `backend/app/models/deployment_history.py` (NEW)
- `backend/app/api/routes/deployment_history.py` (NEW)
- `backend/app/api/routes/kubernetes.py` (MODIFY apply_yaml)
- `frontend/src/components/deploy/DeploymentHistory.tsx` (NEW)
- `frontend/src/components/deploy/YAMLDeployEnhanced.tsx` (ADD history panel)
- `backend/alembic/versions/xxx_deployment_history.py` (NEW migration)

**Testing:**
- Deploy YAML → verify history entry created
- View deployment history → see timeline
- Click "View" → see details and YAML
- Rollback → verify resources restored
- Deploy again → history count increases

---

#### P2.3 - Resource Dependency Detection
- **Priority:** HIGH
- **Effort:** MEDIUM (3-4 days)
- **Impact:** ⭐⭐⭐⭐
- **Description:** Warn about missing dependencies before deployment

**Implementation:**
```python
# backend/app/services/dependency_checker.py

class DependencyChecker:
    """Check for missing resource dependencies."""

    async def check_dependencies(self, yaml_content: str, namespace: str) -> Dict[str, Any]:
        """
        Parse YAML and check for missing dependencies.

        Returns:
        {
          "missing": [
            {
              "type": "ConfigMap",
              "name": "app-config",
              "referenced_by": "Deployment/my-app",
              "reference_type": "configMapRef"
            }
          ],
          "warnings": [],
          "suggestions": []
        }
        """
        parsed = yaml.safe_load_all(yaml_content)
        missing = []

        for doc in parsed:
            if not doc:
                continue

            kind = doc.get('kind')
            name = doc['metadata']['name']

            # Check ConfigMap references
            if kind in ['Deployment', 'StatefulSet', 'DaemonSet']:
                containers = doc.get('spec', {}).get('template', {}).get('spec', {}).get('containers', [])

                for container in containers:
                    # Check envFrom
                    for env_from in container.get('envFrom', []):
                        if 'configMapRef' in env_from:
                            cm_name = env_from['configMapRef']['name']
                            if not await self._configmap_exists(cm_name, namespace):
                                missing.append({
                                    'type': 'ConfigMap',
                                    'name': cm_name,
                                    'referenced_by': f'{kind}/{name}',
                                    'reference_type': 'envFrom.configMapRef'
                                })

                        if 'secretRef' in env_from:
                            secret_name = env_from['secretRef']['name']
                            if not await self._secret_exists(secret_name, namespace):
                                missing.append({
                                    'type': 'Secret',
                                    'name': secret_name,
                                    'referenced_by': f'{kind}/{name}',
                                    'reference_type': 'envFrom.secretRef'
                                })

                    # Check volume mounts
                    for volume in doc.get('spec', {}).get('template', {}).get('spec', {}).get('volumes', []):
                        if 'configMap' in volume:
                            cm_name = volume['configMap']['name']
                            if not await self._configmap_exists(cm_name, namespace):
                                missing.append({
                                    'type': 'ConfigMap',
                                    'name': cm_name,
                                    'referenced_by': f'{kind}/{name}',
                                    'reference_type': 'volume.configMap'
                                })

                        if 'secret' in volume:
                            secret_name = volume['secret']['secretName']
                            if not await self._secret_exists(secret_name, namespace):
                                missing.append({
                                    'type': 'Secret',
                                    'name': secret_name,
                                    'referenced_by': f'{kind}/{name}',
                                    'reference_type': 'volume.secret'
                                })

                        if 'persistentVolumeClaim' in volume:
                            pvc_name = volume['persistentVolumeClaim']['claimName']
                            if not await self._pvc_exists(pvc_name, namespace):
                                missing.append({
                                    'type': 'PersistentVolumeClaim',
                                    'name': pvc_name,
                                    'referenced_by': f'{kind}/{name}',
                                    'reference_type': 'volume.persistentVolumeClaim'
                                })

        return {
            'missing': missing,
            'has_issues': len(missing) > 0
        }

    async def _configmap_exists(self, name: str, namespace: str) -> bool:
        try:
            await kubernetes_service.get_configmap(name, namespace)
            return True
        except:
            return False

    async def _secret_exists(self, name: str, namespace: str) -> bool:
        try:
            await kubernetes_service.get_secret(name, namespace)
            return True
        except:
            return False

    async def _pvc_exists(self, name: str, namespace: str) -> bool:
        try:
            await kubernetes_service.get_pvc(name, namespace)
            return True
        except:
            return False

# Add to kubernetes routes
@router.post("/check-dependencies")
async def check_dependencies(request: YAMLApplyRequest):
    """Check for missing dependencies."""
    checker = DependencyChecker()
    result = await checker.check_dependencies(
        request.yaml_content,
        request.namespace or 'default'
    )
    return result
```

**Frontend Integration:**
```typescript
// Before validation/deployment
const checkDependencies = async () => {
  const response = await kubernetesApi.checkDependencies({
    yaml_content: yamlContent,
    namespace: selectedNamespace
  });

  if (response.data.has_issues) {
    setDependencyWarnings(response.data.missing);
    setShowDependencyModal(true);
    return false;
  }

  return true;
};

// Modify handleApply
const handleApply = async (dryRun: boolean) => {
  // Check dependencies first
  const depsOk = await checkDependencies();
  if (!depsOk && !dryRun) {
    // Show warning, user can proceed anyway
    return;
  }

  // Continue with deployment...
};

// UI Component
function DependencyWarningModal({ warnings, onProceed, onCancel }) {
  return (
    <Modal>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
          <h3 className="text-lg font-bold">Missing Dependencies Detected</h3>
        </div>

        <p className="mb-4">
          Your deployment references {warnings.length} resource{warnings.length !== 1 ? 's' : ''}
          {' '}that don't exist in the cluster:
        </p>

        <div className="space-y-2 mb-6">
          {warnings.map((warning, idx) => (
            <div key={idx} className="border-l-4 border-yellow-500 bg-yellow-50 p-3">
              <div className="font-semibold text-sm">
                {warning.type}: {warning.name}
              </div>
              <div className="text-xs text-gray-600">
                Referenced by {warning.referenced_by} ({warning.reference_type})
              </div>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-6">
          <p className="text-sm">
            💡 <strong>Suggestions:</strong>
          </p>
          <ul className="text-sm mt-2 space-y-1">
            <li>• Create these resources before deploying</li>
            <li>• Or include them in your YAML manifest</li>
            <li>• Or remove the references if not needed</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn-secondary">
            Cancel & Fix
          </button>
          <button onClick={onProceed} className="flex-1 btn-warning">
            Proceed Anyway
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

**Files to Create/Modify:**
- `backend/app/services/dependency_checker.py` (NEW)
- `backend/app/api/routes/kubernetes.py` (ADD endpoint)
- `frontend/src/components/deploy/DependencyWarningModal.tsx` (NEW)
- `frontend/src/components/deploy/YAMLDeployEnhanced.tsx`

---

### Phase 3: Advanced Features (3-4 weeks)
**Goal:** Differentiating, advanced capabilities

#### P3.1 - Cost Estimation Before Deploy 💰
- **Priority:** HIGH
- **Effort:** HIGH (5-6 days)
- **Impact:** ⭐⭐⭐⭐⭐
- **Description:** Show estimated monthly cost before deploying

**Implementation:**
```python
# backend/app/services/cost_estimator.py

class CostEstimator:
    """Estimate cost of Kubernetes resources."""

    # Pricing (example - AWS EKS us-east-1)
    PRICING = {
        'cpu_per_core_hour': 0.0416,      # ~$30/month per core
        'memory_per_gb_hour': 0.0104,     # ~$7.5/month per GB
        'loadbalancer_per_hour': 0.025,   # ~$18/month
        'ebs_gp3_per_gb_month': 0.08,     # Per GB storage
        'ebs_io2_per_gb_month': 0.125,
    }

    def estimate_deployment_cost(self, yaml_content: str) -> Dict[str, Any]:
        """Estimate cost for deployment."""
        parsed = yaml.safe_load_all(yaml_content)

        total_cost = 0
        breakdown = []

        for doc in parsed:
            if not doc:
                continue

            kind = doc.get('kind')

            if kind in ['Deployment', 'StatefulSet', 'DaemonSet']:
                cost = self._estimate_workload_cost(doc)
                breakdown.append(cost)
                total_cost += cost['monthly_cost']

            elif kind == 'Service':
                cost = self._estimate_service_cost(doc)
                if cost:
                    breakdown.append(cost)
                    total_cost += cost['monthly_cost']

            elif kind == 'PersistentVolumeClaim':
                cost = self._estimate_pvc_cost(doc)
                breakdown.append(cost)
                total_cost += cost['monthly_cost']

        # Compare with similar deployments
        comparison = self._compare_with_similar(total_cost)

        return {
            'total_monthly_cost': round(total_cost, 2),
            'breakdown': breakdown,
            'comparison': comparison,
            'recommendations': self._get_cost_recommendations(breakdown)
        }

    def _estimate_workload_cost(self, doc: dict) -> dict:
        """Estimate cost for a workload (Deployment/StatefulSet)."""
        spec = doc['spec']
        replicas = spec.get('replicas', 1)

        containers = spec['template']['spec']['containers']

        cpu_cost = 0
        memory_cost = 0

        for container in containers:
            resources = container.get('resources', {})
            requests = resources.get('requests', {})

            # CPU cost
            cpu = requests.get('cpu', '100m')
            cpu_cores = self._parse_cpu(cpu)
            cpu_cost += cpu_cores * self.PRICING['cpu_per_core_hour'] * 730  # hours/month

            # Memory cost
            memory = requests.get('memory', '128Mi')
            memory_gb = self._parse_memory_gb(memory)
            memory_cost += memory_gb * self.PRICING['memory_per_gb_hour'] * 730

        total_cost = (cpu_cost + memory_cost) * replicas

        return {
            'resource': f"{doc['kind']}/{doc['metadata']['name']}",
            'replicas': replicas,
            'cpu_cost_per_month': round(cpu_cost * replicas, 2),
            'memory_cost_per_month': round(memory_cost * replicas, 2),
            'monthly_cost': round(total_cost, 2),
            'breakdown': {
                'cpu_cores': cpu_cores * replicas,
                'memory_gb': memory_gb * replicas
            }
        }

    def _estimate_service_cost(self, doc: dict) -> Optional[dict]:
        """Estimate cost for a Service (LoadBalancer)."""
        service_type = doc['spec'].get('type', 'ClusterIP')

        if service_type == 'LoadBalancer':
            return {
                'resource': f"Service/{doc['metadata']['name']}",
                'type': 'LoadBalancer',
                'monthly_cost': round(self.PRICING['loadbalancer_per_hour'] * 730, 2)
            }

        return None

    def _estimate_pvc_cost(self, doc: dict) -> dict:
        """Estimate cost for PersistentVolumeClaim."""
        resources = doc['spec'].get('resources', {})
        requests = resources.get('requests', {})
        storage = requests.get('storage', '1Gi')

        storage_gb = self._parse_memory_gb(storage)
        storage_class = doc['spec'].get('storageClassName', 'gp3')

        if 'io2' in storage_class or 'io1' in storage_class:
            price = self.PRICING['ebs_io2_per_gb_month']
        else:
            price = self.PRICING['ebs_gp3_per_gb_month']

        return {
            'resource': f"PVC/{doc['metadata']['name']}",
            'storage_gb': storage_gb,
            'storage_class': storage_class,
            'monthly_cost': round(storage_gb * price, 2)
        }

    def _parse_cpu(self, cpu: str) -> float:
        """Parse CPU string to cores (e.g., '100m' -> 0.1, '2' -> 2.0)."""
        if cpu.endswith('m'):
            return float(cpu[:-1]) / 1000
        return float(cpu)

    def _parse_memory_gb(self, memory: str) -> float:
        """Parse memory string to GB."""
        if memory.endswith('Mi'):
            return float(memory[:-2]) / 1024
        elif memory.endswith('Gi'):
            return float(memory[:-2])
        elif memory.endswith('Ki'):
            return float(memory[:-2]) / (1024 * 1024)
        return float(memory) / (1024 * 1024 * 1024)  # Assume bytes

    def _compare_with_similar(self, cost: float) -> dict:
        """Compare with average cost of similar deployments."""
        # TODO: Query from deployment_history table
        avg_cost = 45.0  # Example average

        diff_pct = ((cost - avg_cost) / avg_cost) * 100

        return {
            'average_cost': avg_cost,
            'difference_percent': round(diff_pct, 1),
            'is_expensive': diff_pct > 20
        }

    def _get_cost_recommendations(self, breakdown: List[dict]) -> List[str]:
        """Get cost optimization recommendations."""
        recommendations = []

        for item in breakdown:
            # Check for LoadBalancer
            if item.get('type') == 'LoadBalancer':
                recommendations.append(
                    "Consider using ClusterIP + Ingress instead of LoadBalancer to save ~$18/month"
                )

            # Check for over-provisioning
            if 'breakdown' in item:
                cpu = item['breakdown'].get('cpu_cores', 0)
                if cpu > 4:
                    recommendations.append(
                        f"High CPU allocation ({cpu} cores) - consider if all cores are needed"
                    )

        return recommendations

# Add endpoint
@router.post("/estimate-cost")
async def estimate_cost(request: YAMLApplyRequest):
    """Estimate deployment cost."""
    estimator = CostEstimator()
    result = estimator.estimate_deployment_cost(request.yaml_content)
    return result
```

**Frontend Component:**
```typescript
function CostEstimationPanel({ yamlContent }: { yamlContent: string }) {
  const [estimation, setEstimation] = useState<CostEstimation | null>(null);
  const [loading, setLoading] = useState(false);

  const estimateCost = async () => {
    setLoading(true);
    try {
      const response = await kubernetesApi.estimateCost({
        yaml_content: yamlContent
      });
      setEstimation(response.data);
    } catch (error) {
      console.error('Cost estimation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (yamlContent) {
      estimateCost();
    }
  }, [yamlContent]);

  if (loading) {
    return <div>Calculating cost...</div>;
  }

  if (!estimation) {
    return null;
  }

  return (
    <div className="cost-panel bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
      <div className="flex items-center gap-2 mb-3">
        <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
        <h4 className="font-semibold">Estimated Monthly Cost</h4>
      </div>

      <div className="text-3xl font-bold text-green-600 mb-4">
        ${estimation.total_monthly_cost.toFixed(2)}
        <span className="text-sm text-gray-500 font-normal ml-2">/month</span>
      </div>

      {/* Comparison */}
      {estimation.comparison && (
        <div className={`mb-4 p-3 rounded ${
          estimation.comparison.is_expensive
            ? 'bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300'
            : 'bg-green-100 dark:bg-green-900/20 border border-green-300'
        }`}>
          <div className="flex items-center gap-2">
            {estimation.comparison.is_expensive ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
            ) : (
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            )}
            <span className="text-sm">
              {estimation.comparison.difference_percent > 0 ? '+' : ''}
              {estimation.comparison.difference_percent}% vs average
              (${estimation.comparison.average_cost}/mo)
            </span>
          </div>
        </div>
      )}

      {/* Breakdown */}
      <div className="space-y-2 mb-4">
        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Cost Breakdown:
        </h5>
        {estimation.breakdown.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {item.resource}
              {item.replicas && ` × ${item.replicas}`}
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              ${item.monthly_cost.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {estimation.recommendations && estimation.recommendations.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
          <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
            💡 Cost Optimization Tips:
          </h5>
          <ul className="space-y-1">
            {estimation.recommendations.map((rec, idx) => (
              <li key={idx} className="text-xs text-blue-800 dark:text-blue-400">
                • {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

**Files to Create/Modify:**
- `backend/app/services/cost_estimator.py` (NEW)
- `backend/app/api/routes/kubernetes.py` (ADD endpoint)
- `frontend/src/components/deploy/CostEstimationPanel.tsx` (NEW)
- `frontend/src/components/deploy/YAMLDeployEnhanced.tsx` (ADD panel)

---

#### P3.2 - Multi-Environment Deploy
- **Priority:** MEDIUM
- **Effort:** VERY HIGH (7-10 days)
- **Impact:** ⭐⭐⭐⭐⭐
- **Description:** Deploy to multiple environments with overrides

**Skipping detailed implementation for brevity - see P3.1 for pattern**

---

#### P3.3 - GitOps Integration
- **Priority:** MEDIUM
- **Effort:** VERY HIGH (7-10 days)
- **Impact:** ⭐⭐⭐⭐⭐
- **Description:** Commit deployments to Git repositories

**Skipping detailed implementation for brevity**

---

### Phase 4: Polish & UX (1-2 weeks)
**Goal:** Improve user experience and performance

#### P4.1 - Performance Optimizations
- Code splitting for deploy components
- Lazy load Monaco editor
- Virtual scrolling for long YAML files
- WebSocket for real-time deployment status

#### P4.2 - Keyboard Shortcuts
- `Ctrl+Enter` - Deploy
- `Ctrl+Shift+V` - Validate
- `Ctrl+K` - AI Review
- `Ctrl+Shift+F` - Auto-Fix
- `Ctrl+D` - Diff View

#### P4.3 - Accessibility
- ARIA labels
- Keyboard navigation
- Screen reader support
- High contrast mode

#### P4.4 - Documentation
- In-app help tooltips
- Video tutorials
- Best practices guide
- Template documentation

---

## 📊 Implementation Priority Matrix

| Feature | Priority | Effort | Impact | When |
|---------|----------|--------|--------|------|
| Export/Import YAML | HIGH | LOW | ⭐⭐⭐⭐ | Phase 1 (Week 1) |
| Selective Fix | CRITICAL | MEDIUM | ⭐⭐⭐⭐⭐ | Phase 1 (Week 1-2) |
| YAML Templates | CRITICAL | HIGH | ⭐⭐⭐⭐⭐ | Phase 2 (Week 3-4) |
| Deployment History | CRITICAL | HIGH | ⭐⭐⭐⭐⭐ | Phase 2 (Week 3-4) |
| Dependency Check | HIGH | MEDIUM | ⭐⭐⭐⭐ | Phase 2 (Week 4-5) |
| Cost Estimation | HIGH | HIGH | ⭐⭐⭐⭐⭐ | Phase 3 (Week 6-7) |
| Multi-Env Deploy | MEDIUM | VERY HIGH | ⭐⭐⭐⭐⭐ | Phase 3 (Week 8-9) |
| GitOps Integration | MEDIUM | VERY HIGH | ⭐⭐⭐⭐⭐ | Phase 3 (Week 9-10) |
| Performance | LOW | MEDIUM | ⭐⭐⭐ | Phase 4 |
| Accessibility | LOW | MEDIUM | ⭐⭐⭐ | Phase 4 |

---

## 🧪 Testing Strategy

### Unit Tests
- AI response parsing
- YAML diff algorithm
- Cost calculation logic
- Dependency detection

### Integration Tests
- Backend API endpoints
- Database operations
- Kubernetes API interactions

### E2E Tests (Cypress)
```typescript
describe('YAML Deploy Flow', () => {
  it('should deploy with AI auto-fix', () => {
    cy.visit('/deploy/yaml');
    cy.get('[data-testid="yaml-editor"]').type(badYaml);
    cy.get('[data-testid="ai-review-btn"]').click();
    cy.wait('@aiReview');
    cy.get('[data-testid="ai-score"]').should('contain', '/100');
    cy.get('[data-testid="auto-fix-btn"]').click();
    cy.wait('@autoFix');
    cy.get('[data-testid="deploy-btn"]').click();
    cy.wait('@deploy');
    cy.get('[data-testid="success-message"]').should('be.visible');
  });
});
```

---

## 📝 Documentation Requirements

### User Documentation
- **Quick Start Guide** - 5-minute video
- **Feature Documentation** - Each feature explained
- **Best Practices** - Deployment patterns
- **Troubleshooting** - Common issues

### Developer Documentation
- **Architecture Diagrams** - Component relationships
- **API Documentation** - All endpoints
- **Database Schema** - ER diagrams
- **Contributing Guide** - How to add features

---

## 🚀 Deployment Checklist

Before releasing each phase:

- [ ] All tests passing (unit, integration, E2E)
- [ ] Code reviewed by at least 1 other developer
- [ ] Documentation updated
- [ ] Database migrations tested
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] User acceptance testing
- [ ] Rollback plan documented

---

## 📈 Success Metrics

Track these metrics to measure success:

### User Engagement
- Daily active users in Deploy section
- Average time spent per deployment
- Feature adoption rates

### Quality Metrics
- Deployment success rate (target: >95%)
- Average deployment time
- Rollback frequency

### AI Metrics
- AI Review usage rate
- Auto-Fix acceptance rate
- Average score improvement after auto-fix

### Cost Metrics
- Average cost per deployment
- Cost savings from recommendations
- User satisfaction with cost estimates

---

## 🔄 Maintenance Plan

### Weekly
- Review error logs
- Monitor API performance
- Check AI service usage

### Monthly
- Update YAML templates
- Review user feedback
- Optimize slow queries

### Quarterly
- Security audit
- Dependency updates
- Feature usage analysis
- Roadmap review

---

## 🎯 Next Steps

**Immediate (This Week):**
1. Review this roadmap with team
2. Prioritize Phase 1 features
3. Set up project tracking (Jira/Linear)
4. Begin Export/Import implementation

**Next Sprint:**
1. Complete Phase 1 features
2. User testing of selective fix
3. Gather feedback
4. Plan Phase 2 sprint

---

**Document Version:** 1.0
**Last Updated:** December 29, 2024
**Maintained By:** Development Team
**Status:** 🟢 Active Development
