export interface TemplateVariable {
  name: string;
  description: string;
  default: string;
  type: 'string' | 'number' | 'boolean';
  validation?: string;
}

export interface YAMLTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  yaml: string;
  variables: Record<string, TemplateVariable>;
}

export const templateCategories = [
  'All Templates',
  'Web Applications',
  'Databases',
  'Monitoring',
  'Networking',
  'Storage',
  'CI/CD',
] as const;

export const yamlTemplates: YAMLTemplate[] = [
  {
    id: 'nginx-production',
    name: 'Nginx Deployment (Production)',
    category: 'Web Applications',
    description: 'Production-ready Nginx deployment with health checks, resource limits, and security contexts',
    difficulty: 'intermediate',
    tags: ['nginx', 'web', 'production', 'secure'],
    variables: {
      appName: {
        name: 'Application Name',
        description: 'Name for the deployment',
        default: 'nginx-app',
        type: 'string',
        validation: '^[a-z0-9-]+$',
      },
      replicas: {
        name: 'Replica Count',
        description: 'Number of pods',
        default: '3',
        type: 'number',
      },
      namespace: {
        name: 'Namespace',
        description: 'Target namespace',
        default: 'default',
        type: 'string',
      },
      imageVersion: {
        name: 'Image Version',
        description: 'Nginx image version',
        default: '1.25-alpine',
        type: 'string',
      },
    },
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{appName}}
  namespace: {{namespace}}
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
        tier: frontend
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 101
        fsGroup: 101
      containers:
      - name: nginx
        image: nginx:{{imageVersion}}
        ports:
        - containerPort: 8080
          name: http
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
---
apiVersion: v1
kind: Service
metadata:
  name: {{appName}}-service
  namespace: {{namespace}}
spec:
  selector:
    app: {{appName}}
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP`,
  },
  {
    id: 'redis-statefulset',
    name: 'Redis StatefulSet',
    category: 'Databases',
    description: 'Redis cache with persistent storage and resource limits',
    difficulty: 'intermediate',
    tags: ['redis', 'cache', 'database', 'statefulset'],
    variables: {
      appName: {
        name: 'Application Name',
        description: 'Name for the Redis instance',
        default: 'redis',
        type: 'string',
        validation: '^[a-z0-9-]+$',
      },
      namespace: {
        name: 'Namespace',
        description: 'Target namespace',
        default: 'default',
        type: 'string',
      },
      storageSize: {
        name: 'Storage Size',
        description: 'Persistent volume size',
        default: '5Gi',
        type: 'string',
      },
    },
    yaml: `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: {{appName}}
  namespace: {{namespace}}
spec:
  serviceName: {{appName}}
  replicas: 1
  selector:
    matchLabels:
      app: {{appName}}
  template:
    metadata:
      labels:
        app: {{appName}}
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
          name: redis
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: data
          mountPath: /data
        livenessProbe:
          tcpSocket:
            port: 6379
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: {{storageSize}}
---
apiVersion: v1
kind: Service
metadata:
  name: {{appName}}
  namespace: {{namespace}}
spec:
  selector:
    app: {{appName}}
  ports:
  - port: 6379
    targetPort: 6379
  clusterIP: None`,
  },
  {
    id: 'postgres-statefulset',
    name: 'PostgreSQL Database',
    category: 'Databases',
    description: 'PostgreSQL database with persistent storage and secrets',
    difficulty: 'advanced',
    tags: ['postgresql', 'database', 'statefulset', 'secrets'],
    variables: {
      appName: {
        name: 'Application Name',
        description: 'Name for the PostgreSQL instance',
        default: 'postgres',
        type: 'string',
        validation: '^[a-z0-9-]+$',
      },
      namespace: {
        name: 'Namespace',
        description: 'Target namespace',
        default: 'default',
        type: 'string',
      },
      storageSize: {
        name: 'Storage Size',
        description: 'Persistent volume size',
        default: '10Gi',
        type: 'string',
      },
      dbName: {
        name: 'Database Name',
        description: 'Initial database name',
        default: 'myapp',
        type: 'string',
      },
    },
    yaml: `apiVersion: v1
kind: Secret
metadata:
  name: {{appName}}-secret
  namespace: {{namespace}}
type: Opaque
stringData:
  POSTGRES_DB: {{dbName}}
  POSTGRES_USER: admin
  POSTGRES_PASSWORD: changeme123
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: {{appName}}
  namespace: {{namespace}}
spec:
  serviceName: {{appName}}
  replicas: 1
  selector:
    matchLabels:
      app: {{appName}}
  template:
    metadata:
      labels:
        app: {{appName}}
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        ports:
        - containerPort: 5432
          name: postgres
        envFrom:
        - secretRef:
            name: {{appName}}-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - admin
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - admin
          initialDelaySeconds: 5
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: {{storageSize}}
---
apiVersion: v1
kind: Service
metadata:
  name: {{appName}}
  namespace: {{namespace}}
spec:
  selector:
    app: {{appName}}
  ports:
  - port: 5432
    targetPort: 5432
  clusterIP: None`,
  },
  {
    id: 'nodejs-deployment',
    name: 'Node.js Application',
    category: 'Web Applications',
    description: 'Node.js application deployment with ConfigMap and environment variables',
    difficulty: 'beginner',
    tags: ['nodejs', 'web', 'configmap'],
    variables: {
      appName: {
        name: 'Application Name',
        description: 'Name for the deployment',
        default: 'nodejs-app',
        type: 'string',
        validation: '^[a-z0-9-]+$',
      },
      namespace: {
        name: 'Namespace',
        description: 'Target namespace',
        default: 'default',
        type: 'string',
      },
      replicas: {
        name: 'Replica Count',
        description: 'Number of pods',
        default: '2',
        type: 'number',
      },
      imageRepo: {
        name: 'Image Repository',
        description: 'Docker image repository',
        default: 'node',
        type: 'string',
      },
      imageTag: {
        name: 'Image Tag',
        description: 'Docker image tag',
        default: '20-alpine',
        type: 'string',
      },
    },
    yaml: `apiVersion: v1
kind: ConfigMap
metadata:
  name: {{appName}}-config
  namespace: {{namespace}}
data:
  NODE_ENV: production
  PORT: "3000"
  LOG_LEVEL: info
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{appName}}
  namespace: {{namespace}}
  labels:
    app: {{appName}}
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
      containers:
      - name: nodejs
        image: {{imageRepo}}:{{imageTag}}
        ports:
        - containerPort: 3000
          name: http
        envFrom:
        - configMapRef:
            name: {{appName}}-config
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: {{appName}}-service
  namespace: {{namespace}}
spec:
  selector:
    app: {{appName}}
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP`,
  },
  {
    id: 'ingress-nginx',
    name: 'Nginx Ingress',
    category: 'Networking',
    description: 'Ingress resource for routing external traffic with TLS support',
    difficulty: 'intermediate',
    tags: ['ingress', 'networking', 'tls', 'routing'],
    variables: {
      ingressName: {
        name: 'Ingress Name',
        description: 'Name for the ingress',
        default: 'my-ingress',
        type: 'string',
        validation: '^[a-z0-9-]+$',
      },
      namespace: {
        name: 'Namespace',
        description: 'Target namespace',
        default: 'default',
        type: 'string',
      },
      hostName: {
        name: 'Hostname',
        description: 'Domain name for the application',
        default: 'app.example.com',
        type: 'string',
      },
      serviceName: {
        name: 'Service Name',
        description: 'Backend service name',
        default: 'my-service',
        type: 'string',
      },
      servicePort: {
        name: 'Service Port',
        description: 'Backend service port',
        default: '80',
        type: 'number',
      },
    },
    yaml: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ingressName}}
  namespace: {{namespace}}
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - {{hostName}}
    secretName: {{ingressName}}-tls
  rules:
  - host: {{hostName}}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: {{serviceName}}
            port:
              number: {{servicePort}}`,
  },
  {
    id: 'cronjob-backup',
    name: 'CronJob for Backups',
    category: 'CI/CD',
    description: 'Scheduled job for automated backups with resource limits',
    difficulty: 'intermediate',
    tags: ['cronjob', 'backup', 'automation', 'scheduled'],
    variables: {
      jobName: {
        name: 'Job Name',
        description: 'Name for the CronJob',
        default: 'backup-job',
        type: 'string',
        validation: '^[a-z0-9-]+$',
      },
      namespace: {
        name: 'Namespace',
        description: 'Target namespace',
        default: 'default',
        type: 'string',
      },
      schedule: {
        name: 'Schedule',
        description: 'Cron schedule expression',
        default: '0 2 * * *',
        type: 'string',
      },
    },
    yaml: `apiVersion: batch/v1
kind: CronJob
metadata:
  name: {{jobName}}
  namespace: {{namespace}}
spec:
  schedule: "{{schedule}}"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            app: {{jobName}}
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: alpine:latest
            command:
            - /bin/sh
            - -c
            - |
              echo "Starting backup at $(date)"
              # Add your backup commands here
              echo "Backup completed at $(date)"
            resources:
              requests:
                memory: "64Mi"
                cpu: "100m"
              limits:
                memory: "128Mi"
                cpu: "200m"`,
  },
  {
    id: 'pvc-storage',
    name: 'Persistent Volume Claim',
    category: 'Storage',
    description: 'PersistentVolumeClaim for application storage',
    difficulty: 'beginner',
    tags: ['storage', 'pvc', 'persistence'],
    variables: {
      pvcName: {
        name: 'PVC Name',
        description: 'Name for the PVC',
        default: 'app-storage',
        type: 'string',
        validation: '^[a-z0-9-]+$',
      },
      namespace: {
        name: 'Namespace',
        description: 'Target namespace',
        default: 'default',
        type: 'string',
      },
      storageSize: {
        name: 'Storage Size',
        description: 'Storage size (e.g., 10Gi)',
        default: '10Gi',
        type: 'string',
      },
      storageClass: {
        name: 'Storage Class',
        description: 'Storage class name',
        default: 'standard',
        type: 'string',
      },
    },
    yaml: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: {{pvcName}}
  namespace: {{namespace}}
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: {{storageClass}}
  resources:
    requests:
      storage: {{storageSize}}`,
  },
  {
    id: 'configmap-app-config',
    name: 'ConfigMap for App Config',
    category: 'Web Applications',
    description: 'ConfigMap with application configuration and environment variables',
    difficulty: 'beginner',
    tags: ['configmap', 'configuration', 'environment'],
    variables: {
      configName: {
        name: 'ConfigMap Name',
        description: 'Name for the ConfigMap',
        default: 'app-config',
        type: 'string',
        validation: '^[a-z0-9-]+$',
      },
      namespace: {
        name: 'Namespace',
        description: 'Target namespace',
        default: 'default',
        type: 'string',
      },
    },
    yaml: `apiVersion: v1
kind: ConfigMap
metadata:
  name: {{configName}}
  namespace: {{namespace}}
data:
  # Environment variables
  APP_ENV: production
  LOG_LEVEL: info
  CACHE_ENABLED: "true"

  # Configuration file
  app.conf: |
    # Application Configuration
    server:
      port: 8080
      timeout: 30s

    database:
      pool_size: 10
      timeout: 5s

    logging:
      level: info
      format: json`,
  },
];
