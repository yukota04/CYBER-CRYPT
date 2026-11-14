import React, { useState, useEffect, useCallback } from 'react';
import { Language, t } from '../game/i18n';
import { X, Activity, Server, Cpu, HardDrive, Send, AlertTriangle } from 'lucide-react';

interface AdminDashboardModalProps {
  onClose: () => void;
  userRole: string;
  userToken: string;
  onUpdateRole: (role: 'player' | 'moderator' | 'admin') => void;
  language: Language;
}

interface Metrics {
  uptimeSeconds: number;
  activeConnections: number;
  matchmakingQueueSize: number;
  activeMatchesCount: number;
  totalCloudSaves: number;
  heapUsedMb: string;
  heapTotalMb: string;
  avgLatencyMs: number;
  databaseThroughput: string;
  connectedFleet: { platform: string; count: number }[];
}

interface AuditLog {
  id: string;
  timestamp: number;
  username: string;
  action: string;
  ip: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  onClose,
  userRole,
  userToken,
  onUpdateRole,
  language
}) => {
  const [tab, setTab] = useState<'metrics' | 'audit' | 'dispatcher'>('metrics');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDetails, setAlertDetails] = useState('');
  const [alertRecipient, setAlertRecipient] = useState('security-team@cybercrypt.io');
  const [dispatchStatus, setDispatchStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const fetchTelemetry = useCallback(() => {
    if (!userToken) return;
    fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${userToken}` } })
      .then(res => res.json())
      .then(data => { if (data.metrics) setMetrics(data.metrics); })
      .catch(() => {});

    fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${userToken}` } })
      .then(res => res.json())
      .then(data => { if (data.logs) setLogs(data.logs); })
      .catch(() => {});
  }, [userToken]);

  useEffect(() => {
    fetchTelemetry();
    const timer = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(timer);
  }, [fetchTelemetry, userRole]);

  const handleRoleChange = (newRole: 'player' | 'moderator' | 'admin') => {
    onUpdateRole(newRole);
    fetch('/api/admin/switch-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ role: newRole })
    })
      .then(res => res.json())
      .then(() => fetchTelemetry())
      .catch(() => {});
  };

  const handleDispatchAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim()) return;
    setDispatchStatus(null);

    fetch('/api/admin/dispatch-alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        title: alertTitle,
        details: alertDetails,
        recipient: alertRecipient
      })
    })
      .then(async res => {
        const data = await res.json();
        if (res.ok && data.success) {
          setDispatchStatus({ ok: true, msg: `Automated email transmitted to ${alertRecipient}` });
          setAlertTitle('');
          setAlertDetails('');
          fetchTelemetry();
        } else {
          setDispatchStatus({ ok: false, msg: data.error || 'Dispatch failed' });
        }
      })
      .catch(() => setDispatchStatus({ ok: false, msg: 'Network error dispatching alert' }));
  };

  const totalFleetCount = metrics?.connectedFleet
    ? metrics.connectedFleet.reduce((acc, item) => acc + item.count, 0)
    : metrics?.activeConnections || 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-4xl bg-[#080512] border border-red-500/50 rounded-lg shadow-[0_0_40px_rgba(255,0,85,0.25)] p-5 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-red-500/30">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-400" />
            <h2 className="text-base font-bold text-white tracking-wider">
              {t('adminTitle', language)}
            </h2>
            <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-400 text-[9px] font-bold">
              ● {t('liveStreamBadge', language)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* RBAC Role Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-[11px]">
              <span className="text-slate-300">{t('selectRole', language)}:</span>
              <select
                value={userRole}
                onChange={e => handleRoleChange(e.target.value as 'player' | 'moderator' | 'admin')}
                className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer uppercase"
              >
                <option value="admin" className="bg-slate-900 text-red-400">Admin</option>
                <option value="moderator" className="bg-slate-900 text-amber-400">Moderator</option>
                <option value="player" className="bg-slate-900 text-slate-300">Player</option>
              </select>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 min-w-[44px] h-10 sm:h-11 px-3 sm:px-3.5 rounded-lg bg-rose-950/90 hover:bg-rose-600 text-rose-100 hover:text-white border-2 border-rose-400/85 shadow-[0_0_14px_rgba(244,63,94,0.45)] font-bold text-xs uppercase tracking-wider transition cursor-pointer flex-shrink-0"
              aria-label="Close Admin Dashboard"
            >
              <X className="w-5 h-5 stroke-[2.75]" />
              <span>{t('closeBtn', language)}</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-2 my-4 border-b border-slate-800 pb-2">
          <button
            onClick={() => setTab('metrics')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              tab === 'metrics' ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {t('telemetryTab', language)}
          </button>
          <button
            onClick={() => setTab('audit')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              tab === 'audit' ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {t('auditTab', language)} ({logs.length})
          </button>
          <button
            onClick={() => setTab('dispatcher')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              tab === 'dispatcher' ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {t('dispatcherTab', language)}
          </button>
        </div>

        {/* Tab 1: System Telemetry */}
        {tab === 'metrics' && (
          <div className="flex flex-col gap-5">
            {/* 4 Metric Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded bg-[#0d0822] border border-cyan-500/20">
                <div className="flex items-center justify-between text-slate-300 text-[10px]">
                  <span>{t('uptime', language)}</span>
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-xl font-bold text-white mt-1 tabular-nums">
                  {metrics ? `${Math.floor(metrics.uptimeSeconds / 60)}m ${metrics.uptimeSeconds % 60}s` : '...'}
                </div>
                <div className="text-[10px] text-emerald-400 mt-1">● 99.99% Availability</div>
              </div>

              <div className="p-3 rounded bg-[#0d0822] border border-pink-500/20">
                <div className="flex items-center justify-between text-slate-300 text-[10px]">
                  <span>{t('heapMem', language)}</span>
                  <Cpu className="w-3.5 h-3.5 text-pink-400" />
                </div>
                <div className="text-xl font-bold text-white mt-1 tabular-nums">
                  {metrics ? `${metrics.heapUsedMb} MB` : '...'}
                </div>
                <div className="text-[10px] text-slate-300 mt-1">
                  {metrics ? `Allocated: ${metrics.heapTotalMb} MB` : 'Limit: 512 MB Node Pool'}
                </div>
              </div>

              <div className="p-3 rounded bg-[#0d0822] border border-amber-500/20">
                <div className="flex items-center justify-between text-slate-300 text-[10px]">
                  <span>{t('throughput', language)}</span>
                  <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xl font-bold text-white mt-1 tabular-nums">
                  {metrics?.databaseThroughput || '...'}
                </div>
                <div className="text-[10px] text-emerald-400 mt-1">
                  Latency: {metrics?.avgLatencyMs ?? 1.4}ms (p99)
                </div>
              </div>

              <div className="p-3 rounded bg-[#0d0822] border border-purple-500/20">
                <div className="flex items-center justify-between text-slate-300 text-[10px]">
                  <span>{t('activeFleet', language)}</span>
                  <Server className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-xl font-bold text-white mt-1 tabular-nums">
                  {totalFleetCount} Devices
                </div>
                <div className="text-xs text-purple-300 mt-1">Cross-Platform Sync</div>
              </div>
            </div>

            {/* Connected Device Fleet Breakdown */}
            <div className="p-4 rounded-lg bg-[#0d0822] border border-slate-800">
              <h3 className="text-xs font-bold text-cyan-400 mb-3 uppercase tracking-wider">
                {t('fleetBreakdown', language)}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {(metrics?.connectedFleet || []).map((dev, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-200">{dev.platform}</span>
                    <span className="font-bold text-cyan-300 tabular-nums">{dev.count} sessions</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Audit Logs */}
        {tab === 'audit' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-300 text-[10px] uppercase">
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3">Severity</th>
                  <th className="py-2 px-3">Operative</th>
                  <th className="py-2 px-3">Action</th>
                  <th className="py-2 px-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                      No security audit events recorded.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => {
                    let badge = 'bg-slate-800 text-slate-300 border-slate-700';
                    if (log.severity === 'critical') badge = 'bg-red-950 text-red-300 border-red-500 animate-pulse';
                    else if (log.severity === 'high') badge = 'bg-pink-950 text-pink-300 border-pink-500';
                    else if (log.severity === 'medium') badge = 'bg-amber-950 text-amber-300 border-amber-500';

                    return (
                      <tr key={log.id} className="border-b border-slate-900/60 hover:bg-slate-900/40">
                        <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border ${badge}`}>
                            {log.severity}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-white font-bold">{log.username}</td>
                        <td className="py-2 px-3 text-cyan-400 font-mono">{log.action}</td>
                        <td className="py-2 px-3 text-slate-300 truncate max-w-xs">{log.details}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Security Alert Dispatcher */}
        {tab === 'dispatcher' && (
          <form onSubmit={handleDispatchAlert} className="flex flex-col gap-3 p-4 rounded-lg bg-[#0d0822] border border-red-500/20">
            <div className="flex items-center gap-2 text-red-400 font-bold text-xs mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>{t('dispatcherTab', language)}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Dispatch high-priority automated alerts directly to administrator emails and registered on-call devices during security incidents.
            </p>

            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">{t('recipientEmail', language)}</label>
              <input
                type="email"
                value={alertRecipient}
                onChange={e => setAlertRecipient(e.target.value)}
                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-red-400"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">{t('incidentTitle', language)}</label>
              <input
                type="text"
                value={alertTitle}
                onChange={e => setAlertTitle(e.target.value)}
                placeholder="e.g. Critical Brute-Force Rate Limit Breached on Node 4"
                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-red-400"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">{t('incidentDetails', language)}</label>
              <textarea
                value={alertDetails}
                onChange={e => setAlertDetails(e.target.value)}
                rows={3}
                placeholder="Include IP addresses, impacted operative matrices, and mitigation steps..."
                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-red-400"
              />
            </div>

            <button
              type="submit"
              className="mt-2 py-2.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 tracking-wider transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {t('dispatchAlertBtn', language)}
            </button>

            {dispatchStatus && (
              <div className={`text-xs text-center font-bold mt-2 ${dispatchStatus.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {dispatchStatus.ok ? '✓' : '⚠'} {dispatchStatus.msg}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

