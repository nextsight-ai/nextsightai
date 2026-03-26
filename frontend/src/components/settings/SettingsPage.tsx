import { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  Cog6ToothIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  BellIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { settingsApi, UserSettingsResponse } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../styles/linear-design';


export default function SettingsPage() {
  const { theme } = useTheme();
  const t = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data states
  const [, setUserSettings] = useState<UserSettingsResponse | null>(null);

  // Local settings state (for editing before save)
  const [notifications, setNotifications] = useState({
    email: true,
    slack: false,
    inApp: true,
    deployments: true,
    alerts: true,
    security: true,
  });
  const [generalSettings, setGeneralSettings] = useState({
    defaultNamespace: 'default',
    autoRefresh: true,
    refreshInterval: 30,
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
  });

  // Fetch data based on active tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Only themes and general tabs remain - both use user settings
      const settingsRes = await settingsApi.getUserSettings();
      setUserSettings(settingsRes.data);

      setNotifications(settingsRes.data.notifications);
      setGeneralSettings({
        defaultNamespace: settingsRes.data.default_namespace,
        autoRefresh: settingsRes.data.auto_refresh,
        refreshInterval: settingsRes.data.refresh_interval_seconds,
        timezone: settingsRes.data.timezone,
        dateFormat: settingsRes.data.date_format,
      });
    } catch (err) {
      logger.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save settings
  const saveSettings = async () => {
    setSaving(true);
    try {
      await settingsApi.updateUserSettings({

        notifications,
        default_namespace: generalSettings.defaultNamespace,
        auto_refresh: generalSettings.autoRefresh,
        refresh_interval_seconds: generalSettings.refreshInterval,
        timezone: generalSettings.timezone,
        date_format: generalSettings.dateFormat,
      });
    } catch (err) {
      logger.error('Failed to save settings', err);
    } finally {
      setSaving(false);
    }
  };

  // Reset settings
  const resetSettings = async () => {
    if (!confirm('Are you sure you want to reset all settings to default values?')) return;
    try {
      const response = await settingsApi.resetUserSettings();
      setUserSettings(response.data);
      setNotifications(response.data.notifications);
      setGeneralSettings({
        defaultNamespace: response.data.default_namespace,
        autoRefresh: response.data.auto_refresh,
        refreshInterval: response.data.refresh_interval_seconds,
        timezone: response.data.timezone,
        dateFormat: response.data.date_format,
      });
    } catch (err) {
      logger.error('Failed to reset settings', err);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 6,
    padding: '6px 10px',
    color: t.text,
    fontSize: 13,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const sectionCardStyle: React.CSSProperties = {
    background: t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
  };

  const sectionTitleStyle: React.CSSProperties = {
    margin: '0 0 16px 0',
    fontSize: 12,
    fontWeight: 600,
    color: t.text,
    paddingBottom: 12,
    borderBottom: `1px solid ${t.cardBorder}`,
  };

  return (
    <div style={{ color: t.text }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Cog6ToothIcon style={{ width: 18, height: 18, color: t.textSub }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: t.text }}>Settings</h1>
            <p style={{ margin: 0, fontSize: 12, color: t.textSub }}>Manage preferences</p>
          </div>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          style={{
            padding: '7px 16px',
            background: t.info,
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontSize: 13,
            fontWeight: 500,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div style={{ width: 28, height: 28, border: `3px solid ${t.cardBorder}`, borderTop: `3px solid ${t.info}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div>
          {/* Notifications */}
          <div style={sectionCardStyle}>
            <h3 style={sectionTitleStyle}>Notifications</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <EnvelopeIcon style={{ width: 17, height: 17, color: t.textMuted }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: t.text }}>Email Notifications</p>
                    <p style={{ margin: 0, fontSize: 11, color: t.textMuted }}>Receive updates via email</p>
                  </div>
                </div>
                <button onClick={() => setNotifications(prev => ({ ...prev, email: !prev.email }))} style={{ position: 'relative', width: 40, height: 22, borderRadius: 9999, border: 'none', background: notifications.email ? t.info : t.cardBorder, cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                  <span style={{ position: 'absolute', top: 2, left: notifications.email ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <BellIcon style={{ width: 17, height: 17, color: t.textMuted }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: t.text }}>In-App Notifications</p>
                    <p style={{ margin: 0, fontSize: 11, color: t.textMuted }}>Show notifications in the app</p>
                  </div>
                </div>
                <button onClick={() => setNotifications(prev => ({ ...prev, inApp: !prev.inApp }))} style={{ position: 'relative', width: 40, height: 22, borderRadius: 9999, border: 'none', background: notifications.inApp ? t.info : t.cardBorder, cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                  <span style={{ position: 'absolute', top: 2, left: notifications.inApp ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </button>
              </div>
            </div>
          </div>

          {/* General */}
          <div>
                <div style={sectionCardStyle}>
                  <h3 style={sectionTitleStyle}>Default Settings</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: t.textMuted, marginBottom: 6 }}>
                        Default Namespace
                      </label>
                      <select
                        value={generalSettings.defaultNamespace}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, defaultNamespace: e.target.value }))}
                        style={inputStyle}
                      >
                        <option value="default">default</option>
                        <option value="production">production</option>
                        <option value="staging">staging</option>
                        <option value="development">development</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: t.textMuted, marginBottom: 6 }}>
                        Timezone
                      </label>
                      <select
                        value={generalSettings.timezone}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, timezone: e.target.value }))}
                        style={inputStyle}
                      >
                        <optgroup label="Universal">
                          <option value="UTC">UTC (Coordinated Universal Time)</option>
                        </optgroup>
                        <optgroup label="Americas">
                          <option value="America/New_York">Eastern Time (US &amp; Canada)</option>
                          <option value="America/Chicago">Central Time (US &amp; Canada)</option>
                          <option value="America/Denver">Mountain Time (US &amp; Canada)</option>
                          <option value="America/Los_Angeles">Pacific Time (US &amp; Canada)</option>
                          <option value="America/Anchorage">Alaska</option>
                          <option value="Pacific/Honolulu">Hawaii</option>
                          <option value="America/Toronto">Toronto</option>
                          <option value="America/Mexico_City">Mexico City</option>
                          <option value="America/Sao_Paulo">Sao Paulo</option>
                          <option value="America/Buenos_Aires">Buenos Aires</option>
                        </optgroup>
                        <optgroup label="Europe">
                          <option value="Europe/London">London</option>
                          <option value="Europe/Paris">Paris</option>
                          <option value="Europe/Berlin">Berlin</option>
                          <option value="Europe/Amsterdam">Amsterdam</option>
                          <option value="Europe/Madrid">Madrid</option>
                          <option value="Europe/Rome">Rome</option>
                          <option value="Europe/Moscow">Moscow</option>
                        </optgroup>
                        <optgroup label="Asia">
                          <option value="Asia/Dubai">Dubai</option>
                          <option value="Asia/Kolkata">India (IST)</option>
                          <option value="Asia/Singapore">Singapore</option>
                          <option value="Asia/Hong_Kong">Hong Kong</option>
                          <option value="Asia/Shanghai">China (CST)</option>
                          <option value="Asia/Tokyo">Tokyo</option>
                          <option value="Asia/Seoul">Seoul</option>
                          <option value="Asia/Bangkok">Bangkok</option>
                          <option value="Asia/Jakarta">Jakarta</option>
                        </optgroup>
                        <optgroup label="Pacific &amp; Oceania">
                          <option value="Australia/Sydney">Sydney</option>
                          <option value="Australia/Melbourne">Melbourne</option>
                          <option value="Australia/Perth">Perth</option>
                          <option value="Pacific/Auckland">Auckland</option>
                        </optgroup>
                        <optgroup label="Africa &amp; Middle East">
                          <option value="Africa/Cairo">Cairo</option>
                          <option value="Africa/Johannesburg">Johannesburg</option>
                          <option value="Africa/Lagos">Lagos</option>
                          <option value="Asia/Jerusalem">Jerusalem</option>
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: t.textMuted, marginBottom: 6 }}>
                        Date Format
                      </label>
                      <select
                        value={generalSettings.dateFormat}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, dateFormat: e.target.value }))}
                        style={inputStyle}
                      >
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: t.textMuted, marginBottom: 6 }}>
                        Auto-Refresh Interval
                      </label>
                      <select
                        value={generalSettings.refreshInterval}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) }))}
                        style={inputStyle}
                      >
                        <option value="15">15 seconds</option>
                        <option value="30">30 seconds</option>
                        <option value="60">1 minute</option>
                        <option value="300">5 minutes</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={sectionCardStyle}>
                  <h3 style={sectionTitleStyle}>Data &amp; Storage</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Clear Cache */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        borderRadius: 8,
                        background: t.mainBg,
                        border: `1px solid ${t.cardBorder}`,
                      }}
                    >
                      <div>
                        <p style={{ margin: '0 0 3px 0', fontSize: 13, fontWeight: 500, color: t.text }}>Clear Local Cache</p>
                        <p style={{ margin: 0, fontSize: 11, color: t.textMuted }}>Remove cached data and refresh from server</p>
                      </div>
                      <button
                        onClick={() => {
                          localStorage.clear();
                          window.location.reload();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 14px',
                          borderRadius: 8,
                          border: `1px solid ${t.cardBorder}`,
                          background: 'transparent',
                          color: t.textSub,
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        <ArrowPathIcon style={{ width: 14, height: 14 }} />
                        Clear Cache
                      </button>
                    </div>
                    {/* Danger Zone */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        borderRadius: 8,
                        background: t.errorBg,
                        border: `1px solid ${t.error}33`,
                      }}
                    >
                      <div>
                        <p style={{ margin: '0 0 3px 0', fontSize: 13, fontWeight: 500, color: t.error }}>Danger Zone</p>
                        <p style={{ margin: 0, fontSize: 11, color: t.error, opacity: 0.8 }}>Reset all settings to default values</p>
                      </div>
                      <button
                        onClick={resetSettings}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 14px',
                          borderRadius: 8,
                          border: `1px solid ${t.error}66`,
                          background: 'transparent',
                          color: t.error,
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        <ExclamationTriangleIcon style={{ width: 14, height: 14 }} />
                        Reset Settings
                      </button>
                    </div>
                  </div>
                </div>
          </div>
        </div>
      )}
    </div>
  );
}
