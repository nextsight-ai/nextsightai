import { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  UserIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  EyeIcon,
  ClockIcon,
  EnvelopeIcon,
  IdentificationIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { authApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import PermissionsInfo from '../common/PermissionsInfo';
import { UserTableSkeleton, ConnectionError, EmptyState, PermissionDenied } from '../common/LoadingStates';
import type { User, UserRole } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';

interface CreateUserData {
  username: string;
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
}

interface EditUserData {
  email?: string;
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

const PERMISSION_MATRIX = {
  columns: [
    { key: 'view', label: 'View', icon: 'eye' },
    { key: 'create', label: 'Create', icon: 'plus' },
    { key: 'edit', label: 'Edit', icon: 'pencil' },
    { key: 'delete', label: 'Delete', icon: 'trash' },
    { key: 'execute', label: 'Execute', icon: 'terminal' },
    { key: 'special', label: 'Special', icon: 'star' },
  ],
  rows: [
    {
      category: 'Kubernetes',
      prefix: 'k8s',
      color: '#3b82f6',
      permissions: {
        view: 'k8s.view',
        create: 'k8s.create',
        edit: 'k8s.edit',
        delete: 'k8s.delete',
        execute: 'k8s.exec',
        special: 'k8s.logs',
      },
      specialLabel: 'Logs',
    },
    {
      category: 'GitOps (ArgoCD)',
      prefix: 'argocd',
      color: '#f97316',
      permissions: {
        view: 'argocd.view',
        create: 'argocd.create',
        edit: 'argocd.sync',
        delete: 'argocd.delete',
        execute: null,
        special: 'argocd.rollback',
      },
      specialLabel: 'Rollback',
    },
    {
      category: 'Helm',
      prefix: 'helm',
      color: '#a855f7',
      permissions: {
        view: 'helm.view',
        create: 'helm.install',
        edit: 'helm.upgrade',
        delete: 'helm.uninstall',
        execute: null,
        special: null,
      },
      specialLabel: null,
    },
    {
      category: 'Security',
      prefix: 'security',
      color: '#ef4444',
      permissions: {
        view: 'security.view',
        create: null,
        edit: 'security.config',
        delete: null,
        execute: 'security.scan',
        special: null,
      },
      specialLabel: null,
    },
    {
      category: 'Admin',
      prefix: 'admin',
      color: '#6b7280',
      permissions: {
        view: 'admin.audit',
        create: 'admin.users',
        edit: 'admin.roles',
        delete: null,
        execute: null,
        special: 'admin.clusters',
      },
      specialLabel: 'Clusters',
    },
  ],
};

const PERMISSION_CATEGORIES = [
  {
    name: 'Kubernetes',
    permissions: [
      { key: 'k8s.view', label: 'View Resources' },
      { key: 'k8s.create', label: 'Create Resources' },
      { key: 'k8s.edit', label: 'Edit Resources' },
      { key: 'k8s.delete', label: 'Delete Resources' },
      { key: 'k8s.exec', label: 'Execute Commands' },
      { key: 'k8s.logs', label: 'View Logs' },
    ],
  },
  {
    name: 'GitOps',
    permissions: [
      { key: 'argocd.view', label: 'View Apps' },
      { key: 'argocd.sync', label: 'Sync Apps' },
      { key: 'argocd.create', label: 'Create Apps' },
      { key: 'argocd.delete', label: 'Delete Apps' },
      { key: 'argocd.rollback', label: 'Rollback' },
    ],
  },
  {
    name: 'Helm',
    permissions: [
      { key: 'helm.view', label: 'View Releases' },
      { key: 'helm.install', label: 'Install' },
      { key: 'helm.upgrade', label: 'Upgrade' },
      { key: 'helm.uninstall', label: 'Uninstall' },
    ],
  },
  {
    name: 'Security',
    permissions: [
      { key: 'security.view', label: 'View Scans' },
      { key: 'security.scan', label: 'Run Scans' },
      { key: 'security.config', label: 'Configure' },
    ],
  },
  {
    name: 'Admin',
    permissions: [
      { key: 'admin.users', label: 'User Management' },
      { key: 'admin.roles', label: 'Role Management' },
      { key: 'admin.clusters', label: 'Cluster Management' },
      { key: 'admin.audit', label: 'Audit Logs' },
    ],
  },
];

const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['*'],
  developer: [
    'k8s.view', 'k8s.create', 'k8s.edit', 'k8s.delete', 'k8s.exec', 'k8s.logs',
    'argocd.view', 'argocd.sync', 'argocd.create', 'argocd.rollback',
    'helm.view', 'helm.install', 'helm.upgrade',
    'security.view', 'security.scan',
  ],
  operator: [
    'k8s.view', 'k8s.edit', 'k8s.exec', 'k8s.logs',
    'argocd.view', 'argocd.sync', 'argocd.rollback',
    'helm.view', 'helm.upgrade',
    'security.view',
  ],
  viewer: ['k8s.view', 'k8s.logs', 'argocd.view', 'helm.view', 'security.view'],
};

const ROLES: { value: UserRole; label: string; color: string; description: string }[] = [
  { value: 'admin', label: 'Admin', color: 'red', description: 'Full system access' },
  { value: 'developer', label: 'Developer', color: 'blue', description: 'Deploy and manage applications' },
  { value: 'operator', label: 'Operator', color: 'yellow', description: 'Monitor and operate systems' },
  { value: 'viewer', label: 'Viewer', color: 'gray', description: 'Read-only access' },
];

function getRoleBadgeStyle(role: UserRole, t: ReturnType<typeof getThemeColors>): React.CSSProperties {
  if (role === 'admin') return { background: t.badgeColors.red.bg, color: t.badgeColors.red.text };
  if (role === 'developer') return { background: t.badgeColors.blue.bg, color: t.badgeColors.blue.text };
  if (role === 'operator') return { background: t.badgeColors.amber.bg, color: t.badgeColors.amber.text };
  return { background: t.cardBorder, color: t.textSub };
}

// Modal Component
function Modal({
  title,
  children,
  onClose,
  size = 'md',
  t,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  t: ReturnType<typeof getThemeColors>;
}) {
  const sizeMap = { sm: 480, md: 560, lg: 680, xl: 900 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />
      <div style={{ position: 'relative', width: '100%', maxWidth: sizeMap[size], background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 16, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ padding: 4, background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <XMarkIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Error Alert
function ErrorAlert({ message, t }: { message: string; t: ReturnType<typeof getThemeColors> }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: 8, background: t.errorBg, border: `1px solid ${t.error}33`, color: t.error, fontSize: 13, marginBottom: 16 }}>
      {message}
    </div>
  );
}

export default function UserManagement() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);
  const { user: currentUser, hasRole } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [createForm, setCreateForm] = useState<CreateUserData>({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'viewer',
  });
  const [editForm, setEditForm] = useState<EditUserData>({});
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);
  const [createUseCustomPermissions, setCreateUseCustomPermissions] = useState(false);
  const [createUserPermissions, setCreateUserPermissions] = useState<string[]>([]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authApi.listUsers();
      setUsers(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load users');
      logger.error('Error fetching users', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    try {
      const response = await authApi.createUser(createForm);
      const newUserId = response.data.id;
      if (createUseCustomPermissions && createUserPermissions.length > 0) {
        try {
          await authApi.setUserPermissions(newUserId, {
            use_custom_permissions: true,
            permissions: createUserPermissions,
          });
          toast.success('User Created', `${createForm.username} created with custom permissions`);
        } catch {
          toast.warning('Partial Success', `${createForm.username} created, but failed to set permissions`);
        }
      } else {
        toast.success('User Created', `${createForm.username} has been created successfully`);
      }
      setShowCreateModal(false);
      setCreateForm({ username: '', email: '', full_name: '', password: '', role: 'viewer' });
      setCreateUseCustomPermissions(false);
      setCreateUserPermissions([]);
      fetchUsers();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create user';
      setFormError(errorMsg);
      toast.error('Creation Failed', errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError(null);
    setFormLoading(true);
    const username = selectedUser.username;
    try {
      await authApi.updateUser(selectedUser.id, editForm);
      setShowEditModal(false);
      setSelectedUser(null);
      setEditForm({});
      toast.success('User Updated', `${username}'s profile has been updated`);
      fetchUsers();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update user';
      setFormError(errorMsg);
      toast.error('Update Failed', errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setFormError(null);
    setFormLoading(true);
    const username = selectedUser.username;
    try {
      await authApi.deleteUser(selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
      toast.success('User Deleted', `${username} has been removed`);
      fetchUsers();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete user';
      setFormError(errorMsg);
      toast.error('Deletion Failed', errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError(null);
    setFormLoading(true);
    const username = selectedUser.username;
    try {
      await authApi.resetUserPassword(selectedUser.id, { new_password: newPassword });
      setShowResetPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
      toast.success('Password Reset', `${username}'s password has been reset`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to reset password';
      setFormError(errorMsg);
      toast.error('Reset Failed', errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    setFormLoading(true);
    setFormError(null);
    const username = selectedUser.username;
    try {
      await authApi.setUserPermissions(selectedUser.id, {
        use_custom_permissions: useCustomPermissions,
        permissions: useCustomPermissions ? userPermissions : [],
      });
      if (useCustomPermissions) {
        toast.success('Permissions Updated', `Custom permissions saved for ${username}`);
      } else {
        toast.info('Permissions Reset', `${username} now uses role-based permissions`);
      }
      await fetchUsers();
      setShowPermissionsModal(false);
      setSelectedUser(null);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save permissions';
      setFormError(errorMsg);
      toast.error('Save Failed', errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({ email: user.email || '', full_name: user.full_name || '', role: user.role, is_active: user.is_active });
    setFormError(null);
    setShowEditModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setFormError(null);
    setShowDeleteModal(true);
  };

  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setFormError(null);
    setShowResetPasswordModal(true);
  };

  const openProfileModal = (user: User) => {
    setSelectedUser(user);
    setShowProfileModal(true);
  };

  const openPermissionsModal = async (user: User) => {
    setSelectedUser(user);
    setFormError(null);
    setFormLoading(true);
    try {
      const response = await authApi.getUserPermissions(user.id);
      setUseCustomPermissions(response.data.use_custom_permissions);
      setUserPermissions(response.data.permissions);
      setShowPermissionsModal(true);
    } catch {
      const hasCustom = user.use_custom_permissions || false;
      setUseCustomPermissions(hasCustom);
      setUserPermissions(
        hasCustom && user.custom_permissions
          ? user.custom_permissions
          : DEFAULT_ROLE_PERMISSIONS[user.role] || []
      );
      setShowPermissionsModal(true);
    } finally {
      setFormLoading(false);
    }
  };

  const togglePermission = (permission: string) => {
    setUserPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const toggleCreatePermission = (permission: string) => {
    setCreateUserPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 6,
    padding: '7px 10px',
    color: t.text,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  };

  const thStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 500,
    color: t.textSub,
    textTransform: 'uppercase',
    letterSpacing: 1,
    padding: '10px 14px',
    textAlign: 'left',
  };

  const primaryBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: t.info,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  };

  const secondaryBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: 'transparent',
    color: t.text,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  };

  if (!hasRole('admin')) {
    return (
      <div style={{ padding: 24 }}>
        <PermissionDenied resource="User Management" requiredRole="Administrator" />
      </div>
    );
  }

  return (
    <div style={{ color: t.text }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1400, margin: '0 auto' }}>
        {/* Current Admin Profile Card */}
        {currentUser && (
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: t.infoBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: t.info }}>
                    {currentUser.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: t.text }}>
                      {currentUser.full_name || currentUser.username}
                    </span>
                    <span style={{ ...getRoleBadgeStyle(currentUser.role, t), padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                      {currentUser.role.toUpperCase()}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: t.successBg, color: t.success }}>
                      Logged In
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: t.textSub }}>@{currentUser.username}</div>
                  {currentUser.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                      <EnvelopeIcon style={{ width: 12, height: 12 }} />
                      {currentUser.email}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: 'User ID', value: `${currentUser.id.slice(0, 8)}...` },
                  { label: 'Permissions', value: currentUser.role === 'admin' ? 'Full Access' : currentUser.use_custom_permissions ? 'Custom' : 'Role-based' },
                  { label: 'Total Users', value: String(users.length) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '8px 12px', background: t.mainBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: t.text, fontFamily: label === 'User ID' ? "'SF Mono', monospace" : undefined }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <UserIcon style={{ width: 22, height: 22, color: t.info }} />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: t.text, margin: 0 }}>User Management</h1>
            </div>
            <div style={{ fontSize: 13, color: t.textSub }}>Manage users, roles, and permissions</div>
          </div>
          <button
            onClick={() => { setFormError(null); setShowCreateModal(true); }}
            style={primaryBtnStyle}
          >
            <PlusIcon style={{ width: 16, height: 16 }} />
            Add User
          </button>
        </div>

        {/* Filters */}
        <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <MagnifyingGlassIcon style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: t.textMuted }} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 32 }}
            />
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{ ...selectStyle, minWidth: 140 }}
          >
            <option value="all">All Roles</option>
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </div>

        {/* Error Banner */}
        {error && (
          <ConnectionError service="User Management API" onRetry={fetchUsers} retrying={loading} />
        )}

        {/* Users Table */}
        {loading ? (
          <UserTableSkeleton />
        ) : (
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, overflow: 'hidden' }}>
            {filteredUsers.length === 0 ? (
              <EmptyState
                title="No users found"
                message={searchQuery || selectedRole !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Get started by creating the first user'
                }
                icon={<UserIcon style={{ width: 28, height: 28 }} />}
                action={searchQuery || selectedRole !== 'all' ? {
                  label: 'Clear Filters',
                  onClick: () => { setSearchQuery(''); setSelectedRole('all'); }
                } : {
                  label: 'Add User',
                  onClick: () => setShowCreateModal(true)
                }}
              />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: t.mainBg, borderBottom: `1px solid ${t.cardBorder}` }}>
                      <th style={thStyle}>User</th>
                      <th style={thStyle}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          Role
                          <PermissionsInfo iconOnly buttonClassName="text-gray-400 hover:text-primary-500" />
                        </span>
                      </th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Last Login</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, idx) => (
                      <tr
                        key={user.id}
                        style={{ borderBottom: idx < filteredUsers.length - 1 ? `1px solid ${t.cardBorder}` : 'none' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = t.mainBg; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button
                              onClick={() => openProfileModal(user)}
                              style={{ width: 36, height: 36, borderRadius: '50%', background: t.infoBg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                            >
                              <span style={{ fontSize: 14, fontWeight: 600, color: t.info }}>
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            </button>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button
                                  onClick={() => openProfileModal(user)}
                                  style={{ fontSize: 13, fontWeight: 500, color: t.text, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                  {user.username}
                                </button>
                                {user.id === currentUser?.id && (
                                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: t.infoBg, color: t.info }}>You</span>
                                )}
                                {user.use_custom_permissions && (
                                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: t.badgeColors.purple.bg, color: t.badgeColors.purple.text }}>Custom</span>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: t.textSub }}>{user.email || user.full_name || 'No email'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ ...getRoleBadgeStyle(user.role, t), padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
                            {ROLES.find((r) => r.value === user.role)?.label || user.role}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {user.is_active ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: t.success, fontSize: 13 }}>
                              <CheckCircleIcon style={{ width: 15, height: 15 }} />
                              Active
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: t.error, fontSize: 13 }}>
                              <XCircleIcon style={{ width: 15, height: 15 }} />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: t.textSub }}>
                          {user.last_login
                            ? new Date(user.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : 'Never'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                            {[
                              { icon: EyeIcon, color: t.info, title: 'View profile', onClick: () => openProfileModal(user), disabled: false },
                              { icon: AdjustmentsHorizontalIcon, color: t.badgeColors.purple.text, title: 'Manage permissions', onClick: () => openPermissionsModal(user), disabled: false },
                              { icon: PencilSquareIcon, color: t.info, title: 'Edit user', onClick: () => openEditModal(user), disabled: false },
                              { icon: KeyIcon, color: t.warning, title: 'Reset password', onClick: () => openResetPasswordModal(user), disabled: user.id === currentUser?.id },
                              { icon: TrashIcon, color: t.error, title: 'Delete user', onClick: () => openDeleteModal(user), disabled: user.id === currentUser?.id },
                            ].map(({ icon: Icon, color, title, onClick, disabled }) => (
                              <button
                                key={title}
                                onClick={onClick}
                                disabled={disabled}
                                title={title}
                                style={{ padding: 7, background: 'transparent', border: 'none', color: disabled ? t.textMuted : color, cursor: disabled ? 'not-allowed' : 'pointer', borderRadius: 6, opacity: disabled ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Icon style={{ width: 16, height: 16 }} />
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* View Profile Modal */}
      {showProfileModal && selectedUser && (
        <Modal title="User Profile" onClose={() => setShowProfileModal(false)} size="lg" t={t}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Profile Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, background: t.mainBg, borderRadius: 10 }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: t.infoBg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${t.info}` }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: t.info }}>{selectedUser.username.charAt(0).toUpperCase()}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: t.text }}>{selectedUser.full_name || selectedUser.username}</span>
                  <span style={{ ...getRoleBadgeStyle(selectedUser.role, t), padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
                    {ROLES.find((r) => r.value === selectedUser.role)?.label}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: t.textSub }}>@{selectedUser.username}</div>
              </div>
              <div>
                {selectedUser.is_active ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: t.successBg, color: t.success, borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                    <span style={{ width: 6, height: 6, background: t.success, borderRadius: '50%' }} />
                    Active
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: t.errorBg, color: t.error, borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                    <span style={{ width: 6, height: 6, background: t.error, borderRadius: '50%' }} />
                    Inactive
                  </span>
                )}
              </div>
            </div>

            {/* Profile Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { Icon: IdentificationIcon, label: 'User ID', value: selectedUser.id, mono: true },
                { Icon: EnvelopeIcon, label: 'Email', value: selectedUser.email || 'Not provided', mono: false },
                {
                  Icon: ClockIcon, label: 'Member Since',
                  value: selectedUser.created_at
                    ? new Date(selectedUser.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    : 'Unknown',
                  mono: false,
                },
                {
                  Icon: ClockIcon, label: 'Last Login',
                  value: selectedUser.last_login
                    ? new Date(selectedUser.last_login).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Never',
                  mono: false,
                },
              ].map(({ Icon, label, value, mono }) => (
                <div key={label} style={{ padding: 12, background: t.mainBg, borderRadius: 8, border: `1px solid ${t.cardBorder}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Icon style={{ width: 13, height: 13, color: t.textSub }} />
                    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 500, color: t.textSub }}>{label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: t.text, fontFamily: mono ? "'SF Mono', monospace" : undefined, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Permissions Summary */}
            <div style={{ padding: 14, background: t.mainBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheckIcon style={{ width: 14, height: 14, color: t.textSub }} />
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 500, color: t.textSub }}>Permissions</span>
                </div>
                {selectedUser.use_custom_permissions && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 3, background: t.badgeColors.purple.bg, color: t.badgeColors.purple.text }}>Custom Permissions</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: t.text, marginBottom: 8 }}>
                {selectedUser.role === 'admin'
                  ? 'Full system access with all permissions'
                  : `${(selectedUser.custom_permissions || DEFAULT_ROLE_PERMISSIONS[selectedUser.role] || []).length} permissions granted`}
              </div>
              <button
                onClick={() => { setShowProfileModal(false); openPermissionsModal(selectedUser); }}
                style={{ fontSize: 13, color: t.info, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                View & Edit Permissions
              </button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 12, borderTop: `1px solid ${t.cardBorder}` }}>
              <button
                onClick={() => { setShowProfileModal(false); openEditModal(selectedUser); }}
                style={{ ...secondaryBtnStyle, color: t.info }}
              >
                Edit Profile
              </button>
              <button onClick={() => setShowProfileModal(false)} style={secondaryBtnStyle}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <Modal title={`Permission Matrix: ${selectedUser.username}`} onClose={() => setShowPermissionsModal(false)} size="xl" t={t}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {formError && <ErrorAlert message={formError} t={t} />}

            {/* User Info Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: t.mainBg, borderRadius: 8, border: `1px solid ${t.cardBorder}` }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: t.infoBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: t.info }}>{selectedUser.username.charAt(0).toUpperCase()}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: t.text }}>{selectedUser.full_name || selectedUser.username}</div>
                <div style={{ fontSize: 11, color: t.textSub }}>
                  Role:{' '}
                  <span style={{ ...getRoleBadgeStyle(selectedUser.role, t), padding: '1px 6px', borderRadius: 3, fontSize: 10 }}>
                    {ROLES.find(r => r.value === selectedUser.role)?.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Custom vs Role Toggle */}
            <div style={{ padding: 14, background: t.mainBg, borderRadius: 8, border: `2px dashed ${t.cardBorder}` }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, color: t.text, fontSize: 13 }}>
                    <AdjustmentsHorizontalIcon style={{ width: 16, height: 16, color: t.badgeColors.purple.text }} />
                    Enable Custom Permissions
                  </div>
                  <div style={{ fontSize: 12, color: t.textSub, marginTop: 4 }}>
                    Override role defaults and assign granular permissions per category
                  </div>
                </div>
                <div
                  style={{ width: 44, height: 24, borderRadius: 12, background: useCustomPermissions ? t.badgeColors.purple.text : t.cardBorder, position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
                  onClick={() => {
                    const next = !useCustomPermissions;
                    setUseCustomPermissions(next);
                    if (!next) setUserPermissions(DEFAULT_ROLE_PERMISSIONS[selectedUser.role] || []);
                  }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: useCustomPermissions ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                </div>
              </label>
            </div>

            {!useCustomPermissions && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: t.infoBg, border: `1px solid ${t.info}33`, borderRadius: 8 }}>
                <ShieldCheckIcon style={{ width: 16, height: 16, color: t.info, flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: t.info }}>
                  Using default <strong>{ROLES.find(r => r.value === selectedUser.role)?.label}</strong> role permissions.
                  Enable custom permissions above to modify individual access.
                </div>
              </div>
            )}

            {/* Matrix Permission Grid */}
            <div style={{ border: `1px solid ${t.cardBorder}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: t.mainBg, borderBottom: `1px solid ${t.cardBorder}` }}>
                      <th style={{ ...thStyle, borderRight: `1px solid ${t.cardBorder}`, minWidth: 130, position: 'sticky', left: 0, background: t.mainBg, zIndex: 10 }}>Category</th>
                      {PERMISSION_MATRIX.columns.map((col) => (
                        <th key={col.key} style={{ ...thStyle, textAlign: 'center', minWidth: 72 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            {col.key === 'view' && <EyeIcon style={{ width: 13, height: 13 }} />}
                            {col.key === 'create' && <PlusIcon style={{ width: 13, height: 13 }} />}
                            {col.key === 'edit' && <PencilSquareIcon style={{ width: 13, height: 13 }} />}
                            {col.key === 'delete' && <TrashIcon style={{ width: 13, height: 13 }} />}
                            {col.key === 'execute' && <KeyIcon style={{ width: 13, height: 13 }} />}
                            {col.key === 'special' && <ShieldCheckIcon style={{ width: 13, height: 13 }} />}
                            <span>{col.label}</span>
                          </div>
                        </th>
                      ))}
                      <th style={{ ...thStyle, textAlign: 'center', minWidth: 52 }}>All</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_MATRIX.rows.map((row, rowIndex) => {
                      const rowPermKeys = Object.values(row.permissions).filter(Boolean) as string[];
                      const allRowChecked = rowPermKeys.every(p => userPermissions.includes('*') || userPermissions.includes(p));
                      const someRowChecked = rowPermKeys.some(p => userPermissions.includes('*') || userPermissions.includes(p));
                      const rowBg = rowIndex % 2 === 0 ? t.cardBg : t.mainBg;

                      return (
                        <tr key={row.category} style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                          <td style={{ padding: '10px 14px', borderRight: `1px solid ${t.cardBorder}`, position: 'sticky', left: 0, background: rowBg, zIndex: 5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{row.category}</span>
                            </div>
                          </td>
                          {PERMISSION_MATRIX.columns.map((col) => {
                            const permKey = row.permissions[col.key as keyof typeof row.permissions];
                            const isChecked = permKey ? (userPermissions.includes('*') || userPermissions.includes(permKey)) : false;
                            const isDisabled = !useCustomPermissions || userPermissions.includes('*') || !permKey;
                            const tooltipLabel = col.key === 'special' && row.specialLabel ? row.specialLabel : null;

                            return (
                              <td key={col.key} style={{ padding: '10px 6px', textAlign: 'center', background: rowBg }}>
                                {permKey ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div
                                      onClick={() => !isDisabled && permKey && togglePermission(permKey)}
                                      style={{ width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.5 : 1, background: isChecked ? t.success : t.cardBorder, color: isChecked ? '#fff' : t.textMuted, transition: 'background 0.15s' }}
                                    >
                                      {isChecked ? <CheckCircleIcon style={{ width: 14, height: 14 }} /> : <XCircleIcon style={{ width: 14, height: 14 }} />}
                                    </div>
                                    {tooltipLabel && <span style={{ fontSize: 9, color: t.textMuted, marginTop: 2 }}>{tooltipLabel}</span>}
                                  </div>
                                ) : (
                                  <span style={{ color: t.textMuted, fontSize: 14 }}>—</span>
                                )}
                              </td>
                            );
                          })}
                          <td style={{ padding: '10px 6px', textAlign: 'center', background: rowBg }}>
                            <div
                              onClick={() => {
                                if (!useCustomPermissions || userPermissions.includes('*')) return;
                                if (allRowChecked) {
                                  setUserPermissions(prev => prev.filter(p => !rowPermKeys.includes(p)));
                                } else {
                                  setUserPermissions(prev => [...new Set([...prev, ...rowPermKeys])]);
                                }
                              }}
                              style={{ width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (!useCustomPermissions || userPermissions.includes('*')) ? 'not-allowed' : 'pointer', opacity: (!useCustomPermissions || userPermissions.includes('*')) ? 0.5 : 1, margin: '0 auto', background: allRowChecked ? t.badgeColors.purple.text : someRowChecked ? t.badgeColors.purple.bg : t.cardBorder, color: allRowChecked ? '#fff' : someRowChecked ? t.badgeColors.purple.text : t.textMuted, transition: 'background 0.15s' }}
                            >
                              {allRowChecked ? <CheckCircleIcon style={{ width: 14, height: 14 }} /> : someRowChecked ? <div style={{ width: 8, height: 8, background: 'currentColor', borderRadius: 2 }} /> : <XCircleIcon style={{ width: 14, height: 14 }} />}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div style={{ padding: '8px 14px', background: t.mainBg, borderTop: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { label: 'Granted', bg: t.success, color: '#fff', Icon: CheckCircleIcon },
                  { label: 'Denied', bg: t.cardBorder, color: t.textMuted, Icon: XCircleIcon },
                  { label: 'Row All', bg: t.badgeColors.purple.text, color: '#fff', Icon: CheckCircleIcon },
                ].map(({ label, bg, color, Icon }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: t.textSub }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon style={{ width: 10, height: 10, color }} />
                    </div>
                    <span>{label}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: t.textSub }}>
                  <span style={{ color: t.textMuted }}>—</span>
                  <span>N/A</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            {useCustomPermissions && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { label: 'Grant All', onClick: () => { const all = PERMISSION_CATEGORIES.flatMap(c => c.permissions.map(p => p.key)); setUserPermissions(all); }, color: t.success, bg: t.successBg },
                  { label: 'Revoke All', onClick: () => setUserPermissions([]), color: t.error, bg: t.errorBg },
                  { label: `Reset to ${ROLES.find(r => r.value === selectedUser.role)?.label} Default`, onClick: () => setUserPermissions(DEFAULT_ROLE_PERMISSIONS[selectedUser.role] || []), color: t.info, bg: t.infoBg },
                  { label: 'View Only', onClick: () => { const view = PERMISSION_MATRIX.rows.map(r => r.permissions.view).filter(Boolean) as string[]; setUserPermissions(view); }, color: t.textSub, bg: t.mainBg },
                ].map(({ label, onClick, color, bg }) => (
                  <button key={label} onClick={onClick} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 5, background: bg, color, border: `1px solid ${color}33`, cursor: 'pointer', fontWeight: 500 }}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Permission Summary */}
            <div style={{ padding: '10px 14px', background: t.mainBg, borderRadius: 6, border: `1px solid ${t.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: t.textSub }}>{useCustomPermissions ? 'Custom' : 'Role-based'} permissions:</span>
              <span style={{ fontWeight: 600, color: t.text }}>
                {userPermissions.includes('*') ? 'Full Access' : `${userPermissions.length} permissions`}
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 12, borderTop: `1px solid ${t.cardBorder}` }}>
              <button onClick={() => setShowPermissionsModal(false)} disabled={formLoading} style={{ ...secondaryBtnStyle, opacity: formLoading ? 0.5 : 1 }}>Cancel</button>
              <button
                onClick={handleSavePermissions}
                disabled={formLoading}
                style={{ ...primaryBtnStyle, opacity: formLoading ? 0.5 : 1 }}
              >
                <ShieldCheckIcon style={{ width: 15, height: 15 }} />
                {formLoading ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <Modal title="Create New User" onClose={() => setShowCreateModal(false)} size="xl" t={t}>
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {formError && <ErrorAlert message={formError} t={t} />}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'Username *', field: 'username', type: 'text', required: true, placeholder: 'Enter username', minLength: 3 },
                { label: 'Email', field: 'email', type: 'email', required: false, placeholder: 'Enter email' },
                { label: 'Full Name', field: 'full_name', type: 'text', required: false, placeholder: 'Enter full name' },
                { label: 'Password *', field: 'password', type: 'password', required: true, placeholder: 'Enter password', minLength: 8 },
              ].map(({ label, field, type, required, placeholder, minLength }) => (
                <div key={field}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 6 }}>{label}</div>
                  <input
                    type={type}
                    required={required}
                    minLength={minLength}
                    value={(createForm as any)[field]}
                    onChange={(e) => setCreateForm({ ...createForm, [field]: e.target.value })}
                    placeholder={placeholder}
                    style={inputStyle}
                  />
                  {field === 'password' && <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>Min 8 chars, uppercase, lowercase, digit, special char</div>}
                </div>
              ))}
            </div>

            {/* Role Selection */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 6 }}>Role *</div>
              <select
                value={createForm.role}
                onChange={(e) => {
                  const newRole = e.target.value as UserRole;
                  setCreateForm({ ...createForm, role: newRole });
                  if (!createUseCustomPermissions) setCreateUserPermissions(DEFAULT_ROLE_PERMISSIONS[newRole] || []);
                }}
                style={selectStyle}
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>{role.label} - {role.description}</option>
                ))}
              </select>
            </div>

            {/* Permission Section */}
            <div style={{ borderTop: `1px solid ${t.cardBorder}`, paddingTop: 14 }}>
              <div style={{ padding: 12, background: t.mainBg, borderRadius: 8, border: `2px dashed ${t.cardBorder}`, marginBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, color: t.text, fontSize: 13 }}>
                      <AdjustmentsHorizontalIcon style={{ width: 16, height: 16, color: t.badgeColors.purple.text }} />
                      Set Custom Permissions
                    </div>
                    <div style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>
                      Override default {ROLES.find(r => r.value === createForm.role)?.label} role permissions
                    </div>
                  </div>
                  <div
                    style={{ width: 38, height: 22, borderRadius: 11, background: createUseCustomPermissions ? t.badgeColors.purple.text : t.cardBorder, position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
                    onClick={() => {
                      const next = !createUseCustomPermissions;
                      setCreateUseCustomPermissions(next);
                      if (!next) {
                        setCreateUserPermissions([]);
                      } else {
                        setCreateUserPermissions(DEFAULT_ROLE_PERMISSIONS[createForm.role] || []);
                      }
                    }}
                  >
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: createUseCustomPermissions ? 19 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                  </div>
                </label>
              </div>

              {createUseCustomPermissions && (
                <>
                  <div style={{ border: `1px solid ${t.cardBorder}`, borderRadius: 8, overflow: 'hidden', maxHeight: 260, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                        <tr style={{ background: t.mainBg, borderBottom: `1px solid ${t.cardBorder}` }}>
                          <th style={{ ...thStyle, borderRight: `1px solid ${t.cardBorder}`, position: 'sticky', left: 0, background: t.mainBg, zIndex: 10 }}>Category</th>
                          {PERMISSION_MATRIX.columns.map((col) => (
                            <th key={col.key} style={{ ...thStyle, textAlign: 'center', minWidth: 56 }}>{col.label}</th>
                          ))}
                          <th style={{ ...thStyle, textAlign: 'center' }}>All</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PERMISSION_MATRIX.rows.map((row, rowIndex) => {
                          const rowPermKeys = Object.values(row.permissions).filter(Boolean) as string[];
                          const allRowChecked = rowPermKeys.every(p => createUserPermissions.includes(p));
                          const someRowChecked = rowPermKeys.some(p => createUserPermissions.includes(p));
                          const rowBg = rowIndex % 2 === 0 ? t.cardBg : t.mainBg;

                          return (
                            <tr key={row.category} style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                              <td style={{ padding: '8px 12px', borderRight: `1px solid ${t.cardBorder}`, position: 'sticky', left: 0, background: rowBg, zIndex: 5 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                                  <span style={{ fontSize: 11, fontWeight: 500, color: t.text, whiteSpace: 'nowrap' }}>{row.category}</span>
                                </div>
                              </td>
                              {PERMISSION_MATRIX.columns.map((col) => {
                                const permKey = row.permissions[col.key as keyof typeof row.permissions];
                                const isChecked = permKey ? createUserPermissions.includes(permKey) : false;
                                return (
                                  <td key={col.key} style={{ padding: '8px 4px', textAlign: 'center', background: rowBg }}>
                                    {permKey ? (
                                      <div
                                        onClick={() => permKey && toggleCreatePermission(permKey)}
                                        style={{ width: 20, height: 20, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: isChecked ? t.success : t.cardBorder, color: isChecked ? '#fff' : t.textMuted }}
                                      >
                                        {isChecked ? <CheckCircleIcon style={{ width: 12, height: 12 }} /> : <XCircleIcon style={{ width: 12, height: 12 }} />}
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: 12, color: t.textMuted }}>—</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td style={{ padding: '8px 4px', textAlign: 'center', background: rowBg }}>
                                <div
                                  onClick={() => {
                                    if (allRowChecked) {
                                      setCreateUserPermissions(prev => prev.filter(p => !rowPermKeys.includes(p)));
                                    } else {
                                      setCreateUserPermissions(prev => [...new Set([...prev, ...rowPermKeys])]);
                                    }
                                  }}
                                  style={{ width: 20, height: 20, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '0 auto', background: allRowChecked ? t.badgeColors.purple.text : someRowChecked ? t.badgeColors.purple.bg : t.cardBorder, color: allRowChecked ? '#fff' : someRowChecked ? t.badgeColors.purple.text : t.textMuted }}
                                >
                                  {allRowChecked ? <CheckCircleIcon style={{ width: 12, height: 12 }} /> : someRowChecked ? <div style={{ width: 6, height: 6, background: 'currentColor', borderRadius: 1 }} /> : <XCircleIcon style={{ width: 12, height: 12 }} />}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' }}>
                    {[
                      { label: 'Grant All', onClick: () => { const all = PERMISSION_CATEGORIES.flatMap(c => c.permissions.map(p => p.key)); setCreateUserPermissions(all); }, color: t.success, bg: t.successBg },
                      { label: 'Revoke All', onClick: () => setCreateUserPermissions([]), color: t.error, bg: t.errorBg },
                      { label: 'Role Default', onClick: () => setCreateUserPermissions(DEFAULT_ROLE_PERMISSIONS[createForm.role] || []), color: t.info, bg: t.infoBg },
                      { label: 'View Only', onClick: () => { const view = PERMISSION_MATRIX.rows.map(r => r.permissions.view).filter(Boolean) as string[]; setCreateUserPermissions(view); }, color: t.textSub, bg: t.mainBg },
                    ].map(({ label, onClick, color, bg }) => (
                      <button type="button" key={label} onClick={onClick} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, background: bg, color, border: `1px solid ${color}33`, cursor: 'pointer' }}>
                        {label}
                      </button>
                    ))}
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: t.textSub }}>{createUserPermissions.length} permissions selected</span>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 12, borderTop: `1px solid ${t.cardBorder}` }}>
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); setCreateUseCustomPermissions(false); setCreateUserPermissions([]); }}
                style={secondaryBtnStyle}
              >
                Cancel
              </button>
              <button type="submit" disabled={formLoading} style={{ ...primaryBtnStyle, opacity: formLoading ? 0.5 : 1 }}>
                <PlusIcon style={{ width: 15, height: 15 }} />
                {formLoading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <Modal title={`Edit User: ${selectedUser.username}`} onClose={() => setShowEditModal(false)} t={t}>
          <form onSubmit={handleEditUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {formError && <ErrorAlert message={formError} t={t} />}
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 6 }}>Email</div>
              <input
                type="email"
                value={editForm.email || ''}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="Enter email"
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 6 }}>Full Name</div>
              <input
                type="text"
                value={editForm.full_name || ''}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder="Enter full name"
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 6 }}>Role</div>
              <select
                value={editForm.role || selectedUser.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                disabled={selectedUser.id === currentUser?.id}
                style={{ ...selectStyle, opacity: selectedUser.id === currentUser?.id ? 0.5 : 1 }}
              >
                {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
              {selectedUser.id === currentUser?.id && (
                <div style={{ marginTop: 4, fontSize: 11, color: t.warning }}>You cannot change your own role</div>
              )}
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={editForm.is_active ?? selectedUser.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  disabled={selectedUser.id === currentUser?.id}
                  style={{ width: 15, height: 15, cursor: selectedUser.id === currentUser?.id ? 'not-allowed' : 'pointer' }}
                />
                <span style={{ fontSize: 13, fontWeight: 500, color: t.text }}>Active Account</span>
              </label>
              {selectedUser.id === currentUser?.id && (
                <div style={{ marginTop: 4, fontSize: 11, color: t.warning }}>You cannot deactivate your own account</div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 12 }}>
              <button type="button" onClick={() => setShowEditModal(false)} style={secondaryBtnStyle}>Cancel</button>
              <button type="submit" disabled={formLoading} style={{ ...primaryBtnStyle, opacity: formLoading ? 0.5 : 1 }}>
                {formLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <Modal title="Delete User" onClose={() => setShowDeleteModal(false)} t={t}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {formError && <ErrorAlert message={formError} t={t} />}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, background: t.errorBg, border: `1px solid ${t.error}33`, borderRadius: 8 }}>
              <ExclamationTriangleIcon style={{ width: 32, height: 32, color: t.error, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: t.text, marginBottom: 4 }}>Are you sure you want to delete this user?</div>
                <div style={{ fontSize: 13, color: t.error }}>
                  User <strong>{selectedUser.username}</strong> will be permanently deleted. This action cannot be undone.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setShowDeleteModal(false)} style={secondaryBtnStyle}>Cancel</button>
              <button
                onClick={handleDeleteUser}
                disabled={formLoading}
                style={{ ...primaryBtnStyle, background: t.error, opacity: formLoading ? 0.5 : 1 }}
              >
                {formLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <Modal title={`Reset Password: ${selectedUser.username}`} onClose={() => setShowResetPasswordModal(false)} t={t}>
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {formError && <ErrorAlert message={formError} t={t} />}
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 6 }}>New Password *</div>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                style={inputStyle}
              />
              <div style={{ marginTop: 4, fontSize: 11, color: t.textMuted }}>Min 8 chars, uppercase, lowercase, digit, special char (!@#$%^&*)</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 12 }}>
              <button type="button" onClick={() => setShowResetPasswordModal(false)} style={secondaryBtnStyle}>Cancel</button>
              <button
                type="submit"
                disabled={formLoading}
                style={{ ...primaryBtnStyle, background: t.warning, opacity: formLoading ? 0.5 : 1 }}
              >
                {formLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
