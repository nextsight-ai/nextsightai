import {
    HomeIcon,
    ServerStackIcon,
    CpuChipIcon,
    ServerIcon,
    CloudIcon,
    ShieldCheckIcon,
    RocketLaunchIcon,
    CubeIcon,
    PlayIcon,
    ClockIcon,
    GlobeAltIcon,
    SignalIcon,
    ArrowsRightLeftIcon,
    CircleStackIcon,
    DocumentTextIcon,
    FolderIcon,
    BeakerIcon,
    CheckCircleIcon,
    CurrencyDollarIcon,
    ScaleIcon,
    ChatBubbleLeftRightIcon,
    ShieldExclamationIcon,
    LockClosedIcon,
    PhotoIcon,
    LinkIcon,
    ArrowPathIcon,
    Cog6ToothIcon,
    UserCircleIcon,
    UserGroupIcon,
    CubeTransparentIcon,
    Square3Stack3DIcon,
} from '@heroicons/react/24/outline';
import { featureFlagService } from '../services/featureFlags';

export interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    children?: {
        name: string;
        href: string;
        icon: React.ComponentType<{ className?: string }>;
        badge?: string;
    }[];
    badge?: string;
    badgeColor?: string;
    statusDot?: boolean;
    requiredFeature?: string; // Key from FeatureFlags
    adminOnly?: boolean;
}

export interface NavSection {
    title: string;
    items: NavItem[];
}

// Navigation sections configuration
export const getNavigationSections = (): NavSection[] => {
    const sections: NavSection[] = [
        {
            title: 'OVERVIEW',
            items: [
                { name: 'Dashboard', href: '/', icon: HomeIcon },
            ]
        },
        {
            title: 'KUBERNETES',
            items: [
                { name: 'Cluster Overview', href: '/cluster-overview', icon: CloudIcon },
                { name: 'Nodes', href: '/kubernetes/nodes', icon: ServerIcon },
                { name: 'Namespaces', href: '/namespaces', icon: FolderIcon },
                {
                    name: 'Workloads',
                    href: '/kubernetes',
                    icon: CubeTransparentIcon,
                    children: [
                        { name: 'Deployments', href: '/kubernetes?tab=deployments', icon: ServerStackIcon },
                        { name: 'StatefulSets', href: '/kubernetes?tab=statefulsets', icon: Square3Stack3DIcon },
                        { name: 'DaemonSets', href: '/kubernetes?tab=daemonsets', icon: CpuChipIcon },
                        { name: 'Pods', href: '/kubernetes?tab=pods', icon: CubeIcon, badge: 'live' },
                        { name: 'Jobs', href: '/kubernetes?tab=jobs', icon: PlayIcon },
                        { name: 'CronJobs', href: '/kubernetes?tab=cronjobs', icon: ClockIcon },
                    ]
                },
                {
                    name: 'Networking',
                    href: '/networking',
                    icon: GlobeAltIcon,
                    children: [
                        { name: 'Services', href: '/networking?tab=services', icon: SignalIcon },
                        { name: 'Ingress', href: '/networking?tab=ingress', icon: ArrowsRightLeftIcon },
                        { name: 'Network Policies', href: '/networking?tab=policies', icon: ShieldCheckIcon },
                    ]
                },
                {
                    name: 'Storage',
                    href: '/storage',
                    icon: CircleStackIcon,
                    children: [
                        { name: 'Persistent Volumes', href: '/storage?tab=pv', icon: CircleStackIcon },
                        { name: 'PV Claims', href: '/storage?tab=pvc', icon: DocumentTextIcon },
                        { name: 'Storage Classes', href: '/storage?tab=classes', icon: FolderIcon },
                    ]
                },
            ]
        },
        {
            title: 'DEPLOY',
            items: [
                { name: 'GitOps', href: '/deploy', icon: RocketLaunchIcon },
                { name: 'Helm Releases', href: '/deploy?tab=helm', icon: CubeIcon },
            ]
        },
        {
            title: 'PIPELINES',
            items: ([
                { name: 'Pipeline Builder', href: '/pipelines/builder', icon: BeakerIcon, badge: 'New', badgeColor: 'blue', requiredFeature: 'enablePipelines' },
                { name: 'Templates', href: '/pipelines/templates', icon: DocumentTextIcon, requiredFeature: 'enablePipelines' },
                { name: 'Runs', href: '/pipelines/runs', icon: PlayIcon, statusDot: true, requiredFeature: 'enablePipelines' },
                { name: 'Approvals', href: '/pipelines/approvals', icon: CheckCircleIcon, requiredFeature: 'enablePipelines' },
            ] as NavItem[]).filter(item => !item.requiredFeature || featureFlagService.isEnabled(item.requiredFeature as any))
        },
        {
            title: 'AI OPTIMIZER',
            items: ([
                { name: 'Resource Optimizer', href: '/optimization?tab=resource', icon: CpuChipIcon, badge: 'AI', badgeColor: 'purple' },
                { name: 'Cost Optimizer', href: '/optimization?tab=cost', icon: CurrencyDollarIcon, badge: 'AI', badgeColor: 'purple' },
                { name: 'Scaling Advisor', href: '/optimization?tab=scaling', icon: ScaleIcon, badge: 'AI', badgeColor: 'purple' },
                { name: 'Security Advisor', href: '/optimization?tab=security', icon: ShieldCheckIcon, badge: 'AI', badgeColor: 'purple' },
                { name: 'AI ChatOps', href: '#ai-chat', icon: ChatBubbleLeftRightIcon, badge: 'Beta', badgeColor: 'blue' },
            ] as NavItem[]).filter(item => !item.requiredFeature || featureFlagService.isEnabled(item.requiredFeature as any))
        },
        {
            title: 'SECURITY CENTER',
            items: [
                { name: 'Security Dashboard', href: '/security', icon: ShieldExclamationIcon },
                { name: 'RBAC Analyzer', href: '/security?tab=rbac', icon: LockClosedIcon },
                { name: 'Image Scanning', href: '/security?tab=scanning', icon: PhotoIcon },
                { name: 'Policy Engine', href: '/security?tab=policies', icon: DocumentTextIcon },
            ]
        },
        {
            title: 'MONITORING',
            items: [
                { name: 'Metrics Dashboard', href: '/monitoring', icon: SignalIcon },
                { name: 'Alerts', href: '/monitoring/alerts', icon: ShieldExclamationIcon, badge: '3', badgeColor: 'red' },
                { name: 'Events', href: '/events', icon: DocumentTextIcon },
                { name: 'Logs', href: '/monitoring/logs', icon: DocumentTextIcon },
            ]
        },
        {
            title: 'COST ANALYZER',
            items: ([
                { name: 'Cost Dashboard', href: '/cost', icon: CurrencyDollarIcon, requiredFeature: 'enableCostAnalysis' },
                { name: 'Reports', href: '/cost/reports', icon: DocumentTextIcon, requiredFeature: 'enableCostAnalysis' },
            ] as NavItem[]).filter(item => !item.requiredFeature || featureFlagService.isEnabled(item.requiredFeature as any))
        },
        {
            title: 'INTEGRATIONS',
            items: ([
                { name: 'All Integrations', href: '/settings/integrations', icon: LinkIcon },
                { name: 'Prometheus', href: '/integrations/prometheus', icon: SignalIcon },
                { name: 'ArgoCD', href: '/integrations/argocd', icon: ArrowPathIcon, requiredFeature: 'enableArgoCd' },
            ] as NavItem[]).filter(item => !item.requiredFeature || featureFlagService.isEnabled(item.requiredFeature as any))
        },
        {
            title: 'SETTINGS',
            items: [
                { name: 'General Settings', href: '/settings', icon: Cog6ToothIcon },
                { name: 'Profile', href: '/profile', icon: UserCircleIcon },
                { name: 'Cluster Connections', href: '/clusters', icon: CloudIcon },
                { name: 'User Management', href: '/admin/users', icon: UserGroupIcon, adminOnly: true },
                { name: 'API Keys', href: '/admin/api-keys', icon: LockClosedIcon },
            ]
        },
    ];

    // Filter out empty sections
    return sections.filter(section => section.items.length > 0);
};
