import { useState } from 'react';
import {
  UserCircleIcon,
  KeyIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';

export default function ProfileSettings() {
  const { user, changePassword } = useAuth();
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'Contains uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Contains lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'Contains a number', test: (p: string) => /\d/.test(p) },
    { label: 'Contains special character', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ];

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    const failedRequirement = passwordRequirements.find((req) => !req.test(newPassword));
    if (failedRequirement) {
      setPasswordError(`Password requirement not met: ${failedRequirement.label}`);
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to change password';
      setPasswordError(errorMsg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return { background: t.errorBg, color: t.error, border: `1px solid ${t.error}` };
      case 'developer':
        return { background: t.infoBg, color: t.info, border: `1px solid ${t.info}` };
      case 'operator':
        return { background: t.warningBg, color: t.warning, border: `1px solid ${t.warning}` };
      default:
        return { background: t.cardBg, color: t.textMuted, border: `1px solid ${t.cardBorder}` };
    }
  };

  const inputStyle = {
    background: 'transparent',
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 6,
    padding: '8px 12px',
    color: t.text,
    fontSize: 13,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  const cardStyle = {
    background: t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 12,
    padding: 20,
  };

  return (
    <div style={{ color: t.text }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <UserCircleIcon style={{ width: 22, height: 22, color: t.info }} />
          <h1 style={{ fontSize: 20, fontWeight: 600, color: t.text, margin: 0 }}>Account Settings</h1>
        </div>
        <p style={{ fontSize: 13, color: t.textMuted, margin: 0, paddingLeft: 34 }}>
          Manage your profile and security settings
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'inline-flex', gap: 4, background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: 4, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', border: 'none',
            background: activeTab === 'profile' ? t.info : 'transparent',
            color: activeTab === 'profile' ? '#fff' : t.textSub,
          }}
        >
          <UserCircleIcon style={{ width: 16, height: 16 }} />
          Profile
        </button>
        <button
          onClick={() => setActiveTab('security')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', border: 'none',
            background: activeTab === 'security' ? t.info : 'transparent',
            color: activeTab === 'security' ? '#fff' : t.textSub,
          }}
        >
          <ShieldCheckIcon style={{ width: 16, height: 16 }} />
          Security
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && user && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* User Info Card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
              {/* Avatar */}
              <div style={{
                width: 72, height: 72, borderRadius: 16,
                background: t.infoBg, border: `2px solid ${t.info}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{ color: t.info, fontWeight: 700, fontSize: 28 }}>
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: t.text, margin: 0 }}>
                    {user.full_name || user.username}
                  </h2>
                  <span style={{
                    ...getRoleBadgeStyle(user.role),
                    padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, textTransform: 'capitalize',
                  }}>
                    {user.role}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: t.textMuted, margin: 0 }}>@{user.username}</p>
                {user.email && (
                  <p style={{ fontSize: 13, color: t.textMuted, margin: '4px 0 0' }}>{user.email}</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
              marginTop: 20, paddingTop: 20, borderTop: `1px solid ${t.cardBorder}`,
            }}>
              <div>
                <p style={{ fontSize: 10, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>Status</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: t.success, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.success, display: 'inline-block' }} />
                  Active
                </p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>Role Level</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: t.text, margin: '4px 0 0' }}>
                  {user.role === 'admin' ? '4 (Highest)' : user.role === 'developer' ? '3' : user.role === 'operator' ? '2' : '1'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>Member Since</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: t.text, margin: '4px 0 0' }}>
                  {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>Last Login</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: t.text, margin: '4px 0 0' }}>
                  {user.last_login
                    ? new Date(user.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Just now'}
                </p>
              </div>
            </div>
          </div>

          {/* Role Permissions Info */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <KeyIcon style={{ width: 18, height: 18, color: t.textMuted }} />
              Your Permissions
            </h3>
            <p style={{ fontSize: 13, color: t.textSub, margin: '0 0 16px' }}>
              Based on your <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{user.role}</span> role, you have access to:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {user.role === 'admin' && (
                <PermissionItem label="Full System Access" description="All permissions granted" t={t} />
              )}
              {(user.role === 'admin' || user.role === 'developer') && (
                <>
                  <PermissionItem label="Kubernetes Management" description="Create, edit, delete resources" t={t} />
                  <PermissionItem label="GitOps Deployments" description="Sync and manage ArgoCD apps" t={t} />
                  <PermissionItem label="Helm Operations" description="Install and manage charts" t={t} />
                </>
              )}
              {user.role === 'operator' && (
                <>
                  <PermissionItem label="View & Monitor" description="Access dashboards and metrics" t={t} />
                  <PermissionItem label="Operations" description="Scale, restart, exec into pods" t={t} />
                  <PermissionItem label="Alert Management" description="Configure and manage alerts" t={t} />
                </>
              )}
              {user.role === 'viewer' && (
                <>
                  <PermissionItem label="View Resources" description="Read-only access to all resources" t={t} />
                  <PermissionItem label="View Logs" description="Access container logs" t={t} />
                  <PermissionItem label="View Metrics" description="Access monitoring dashboards" t={t} />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Change Password Card */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <KeyIcon style={{ width: 18, height: 18, color: t.textMuted }} />
              Change Password
            </h3>

            {/* Success Message */}
            {passwordSuccess && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: t.successBg, border: `1px solid ${t.success}`,
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              }}>
                <CheckCircleIcon style={{ width: 18, height: 18, color: t.success, flexShrink: 0 }} />
                <p style={{ fontSize: 13, fontWeight: 500, color: t.success, margin: 0 }}>
                  Password changed successfully!
                </p>
              </div>
            )}

            {/* Error Message */}
            {passwordError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: t.errorBg, border: `1px solid ${t.error}`,
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              }}>
                <ExclamationCircleIcon style={{ width: 18, height: 18, color: t.error, flexShrink: 0 }} />
                <p style={{ fontSize: 13, fontWeight: 500, color: t.error, margin: 0 }}>
                  {passwordError}
                </p>
              </div>
            )}

            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Current Password */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>
                  Current Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{ ...inputStyle, paddingRight: 40 }}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 0,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showCurrentPassword
                      ? <EyeSlashIcon style={{ width: 16, height: 16 }} />
                      : <EyeIcon style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ ...inputStyle, paddingRight: 40 }}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 0,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showNewPassword
                      ? <EyeSlashIcon style={{ width: 16, height: 16 }} />
                      : <EyeIcon style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              {newPassword && (
                <div style={{ padding: '10px 14px', background: t.mainBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 500, color: t.textSub, margin: '0 0 8px' }}>
                    Password Requirements:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                    {passwordRequirements.map((req) => {
                      const passed = req.test(newPassword);
                      return (
                        <div
                          key={req.label}
                          style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: passed ? t.success : t.textMuted }}
                        >
                          {passed
                            ? <CheckCircleIcon style={{ width: 12, height: 12 }} />
                            : <span style={{ width: 12, height: 12, borderRadius: '50%', border: `1px solid currentColor`, display: 'inline-block', flexShrink: 0 }} />}
                          {req.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Confirm Password */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      ...inputStyle,
                      paddingRight: 40,
                      borderColor: confirmPassword && confirmPassword !== newPassword ? t.error : t.cardBorder,
                    }}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 0,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showConfirmPassword
                      ? <EyeSlashIcon style={{ width: 16, height: 16 }} />
                      : <EyeIcon style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p style={{ marginTop: 4, fontSize: 11, color: t.error }}>Passwords do not match</p>
                )}
              </div>

              <div style={{ paddingTop: 8 }}>
                <button
                  type="submit"
                  disabled={passwordLoading || (confirmPassword !== '' && confirmPassword !== newPassword)}
                  style={{
                    padding: '9px 20px', background: t.info, color: '#fff',
                    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    cursor: passwordLoading ? 'not-allowed' : 'pointer',
                    opacity: (passwordLoading || (confirmPassword !== '' && confirmPassword !== newPassword)) ? 0.5 : 1,
                  }}
                >
                  {passwordLoading ? 'Changing Password...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Security Tips */}
          <div style={{ ...cardStyle, background: t.infoBg, borderColor: t.info }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: t.info, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheckIcon style={{ width: 18, height: 18 }} />
              Security Tips
            </h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                "Use a unique password that you don't use elsewhere",
                'Avoid using personal information in your password',
                'Consider using a password manager for secure storage',
                'Change your password regularly for better security',
              ].map((tip) => (
                <li key={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: t.info }}>
                  <CheckCircleIcon style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function PermissionItem({ label, description, t }: { label: string; description: string; t: ReturnType<typeof getThemeColors> }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '10px 12px', background: 'transparent',
      border: `1px solid ${t.cardBorder}`, borderRadius: 8,
    }}>
      <CheckCircleIcon style={{ width: 16, height: 16, color: t.success, marginTop: 2, flexShrink: 0 }} />
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: t.text, margin: 0 }}>{label}</p>
        <p style={{ fontSize: 11, color: t.textMuted, margin: '2px 0 0' }}>{description}</p>
      </div>
    </div>
  );
}
