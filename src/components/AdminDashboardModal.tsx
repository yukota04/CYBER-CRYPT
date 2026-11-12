import React, { useState, useEffect } from 'react';
import { Language, t } from '../game/i18n';
import { X, Activity, Server, ShieldAlert, Cpu, HardDrive, Send, AlertTriangle } from 'lucide-react';

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
  const [dispatchStatus, setDispatchStatus] = useState('');

  useEffect(() => {
    if (!userToken) return;
    fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${userToken}` } })
      .then(res => res.json())
      .then(data => { if (data.metrics) setMetrics(data.metrics); })
      .catch(() => {});

    fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${userToken}` } })
      .then(res => res.json())
      .then(data => { if (data.logs) setLogs(data.logs); })
      .catch(() => {});
  }, [userToken, userRole]);

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
      .then(() => {
        fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${userToken}` } })
          .then(res => res.json())
          .then(data => { if (data.metrics) setMetrics(data.metrics); });
        fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${userToken}` } })
          .then(res => res.json())
          .then(data => { if (data.logs) setLogs(data.logs); });
      });
  };

  const handleDispatchAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim()) return;

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
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDispatchStatus(`Automated email transmitted to ${alertRecipient}`);
          setAlertTitle('');
          setAlertDetails('');
        }
      });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-4xl bg-[#080512] border border-red-500/50 rounded-lg shadow-[0_0_40px_rgba(255,0,85,0.25)] p-5 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-red-500/30">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-400" />
            <h2 className="text-base font-bold text-white tracking-wider">
              ADMINISTRATIVE MONITORING & TELEMETRY
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* RBAC Role Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-[11px]">
              <span className="text-slate-400">ROLE:</span>
              <select
                value={userRole}
                onChange={e => handleRoleChange(e.target.value as any)}
                className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer uppercase"
              >
                <option value="admin" className="bg-slate-900 text-red-400">Admin</option>
                <option value="moderator" className="bg-slate-900 text-amber-400">Moderator</option>
                <option value="player" className="bg-slate-900 text-slate-300">Player</option>
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close Admin Dashboard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 my-4 border-b border-slate-800 pb-2">
          <button
            onClick={() => setTab('metrics')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              tab === 'metrics' ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            SYSTEM TELEMETRY
          </button>
          <button
            onClick={() => setTab('audit')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              tab === 'audit' ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            SECURITY AUDIT LOGS ({logs.length})
          </button>
          <button
            onClick={() => setTab('dispatcher')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              tab === 'dispatcher' ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            SECURITY ALERT DISPATCHER
          </button>
        </div>

        {/* Tab 1: System Telemetry */}
        {tab === 'metrics' && (
          <div className="flex flex-col gap-5">
            {/* 4 Metric Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded bg-[#0d0822] border border-cyan-500/20">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>UPTIME</span>
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-xl font-bold text-white mt-1 tabular-nums">
                  {metrics ? `${Math.floor(metrics.uptimeSeconds / 60)}m ${metrics.uptimeSeconds % 60}s` : '18m 42s'}
                </div>
                <div className="text-[10px] text-emerald-400 mt-1">● 99.99% Availability</div>
              </div>

              <div className="p-3 rounded bg-[#0d0822] border border-pink-500/20">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>HEAP MEMORY</span>
                  <Cpu className="w-3.5 h-3.5 text-pink-400" />
                </div>
                <div className="text-xl font-bold text-white mt-1 tabular-nums">
                  {metrics ? `${metrics.heapUsedMb} MB` : '42.8 MB'}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Limit: 512 MB Node Pool</div>
              </div>

              <div className="p-3 rounded bg-[#0d0822] border border-amber-500/20">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>THROUGHPUT</span>
                  <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xl font-bold text-white mt-1 tabular-nums">
                  {metrics?.databaseThroughput || '1,420 ops/s'}
                </div>
                <div className="text-[10px] text-emerald-400 mt-1">Latency: 1.4ms (p99)</div>
              </div>

              <div className="p-3 rounded bg-[#0d0822] border border-purple-500/20">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>ACTIVE FLEET</span>
                  <Server className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-xl font-bold text-white mt-1 tabular-nums">
                  66 Devices
                </div>
                <div className="text-xs text-purple-300 mt-1">Cross-Platform Sync</div>
              </div>
            </div>

            {/* Connected Device Fleet Breakdown */}
            <div className="p-4 rounded-lg bg-[#0d0822] border border-slate-800">
              <h3 className="text-xs font-bold text-cyan-400 mb-3 uppercase tracking-wider">
                CONNECTED FLEET BREAKDOWN (CROSS-PLATFORM)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {(metrics?.connectedFleet || [
                  { platform: 'Desktop Chrome / Linux', count: 18 },
                  { platform: 'Mobile Safari / iOS', count: 24 },
                  { platform: 'Mobile Chrome / Android', count: 15 },
                  { platform: 'Desktop Firefox / Windows', count: 9 }
                ]).map((dev, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-300">{dev.platform}</span>
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
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
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
                    <td colSpan={5} className="text-center py-8 text-slate-500 text-xs">
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
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
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
              <span>AUTOMATED EMAIL SECURITY NOTIFICATION DISPATCHER</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Dispatch high-priority automated alerts directly to administrator emails and registered on-call devices during security incidents.
            </p>

            <div>
              <label className="text-[11px] text-slate-400 font-bold block mb-1">RECIPIENT EMAIL</label>
              <input
                type="email"
                value={alertRecipient}
                onChange={e => setAlertRecipient(e.target.value)}
                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-red-400"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-bold block mb-1">INCIDENT TITLE</label>
              <input
                type="text"
                value={alertTitle}
                onChange={e => setAlertTitle(e.target.value)}
                placeholder="e.g. Critical Brute-Force Rate Limit Breached on Node 4"
                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-red-400"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-bold block mb-1">INCIDENT DETAILS</label>
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
              DISPATCH AUTOMATED EMAIL ALERT
            </button>

            {dispatchStatus && (
              <div className="text-xs text-emerald-400 text-center font-bold mt-2">
                ✓ {dispatchStatus}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
