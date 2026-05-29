'use client';

import React, { useEffect, useState } from 'react';
import { Shield, RefreshCw, Key, LogOut, Trash2, Sparkles, User, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface DeviceSession {
  deviceInfo: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

export default function SecuritySettingsPage() {
  const { user, token, logout, updateProfile } = useAuth();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  const fetchSessions = async () => {
    if (!token) return;
    try {
      setLoadingSessions(true);
      const res = await fetch(`${API_URL}/auth/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSessions();
    }
  }, [token]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }

    try {
      setSubmittingPassword(true);
      setPasswordError(null);
      setPasswordSuccess(null);
      await updateProfile(user?.fullName, newPassword);
      setPasswordSuccess('Password changed successfully across all nodes.');
      setNewPassword('');
      setConfirmPassword('');
      setOldPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password. Ensure formatting matches security policies.');
    } finally {
      setSubmittingPassword(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!token) return;
    if (!confirm('Log out from all other device sessions? Current session will remain active.')) return;
    try {
      const res = await fetch(`${API_URL}/auth/logout-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Successfully logged out other device sessions.');
        fetchSessions();
      }
    } catch (err) {
      alert('Failed to revoke sessions.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    try {
      setDeletingAccount(true);
      const res = await fetch(`${API_URL}/auth/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Your user account, watchlist configurations, drawings, and portfolio holdings have been permanently deleted.');
        logout();
      } else {
        throw new Error('Transaction failed');
      }
    } catch {
      alert('Failed to execute permanent account deletion.');
    } finally {
      setDeletingAccount(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm">
          <Shield className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-pulse" />
          <h3 className="text-sm font-black mb-2 text-slate-900 dark:text-white">Authentication Required</h3>
          <p className="text-[11px] text-slate-400 font-semibold mb-4 leading-normal">Authenticate session credentials first to configure account cockpit settings.</p>
          <Link href="/login" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Cockpit Header */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-500" /> Security Command & Device Center
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              Manage active terminal sessions, update access passwords, and govern account lifecycles.
            </p>
          </div>
          <button
            onClick={fetchSessions}
            disabled={loadingSessions}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loadingSessions ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Sessions & Devices */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg space-y-4">
              <h2 className="text-sm font-extrabold flex items-center gap-2 text-slate-850 dark:text-slate-100 uppercase tracking-wider">
                🛡️ Active Device Terminals ({sessions.length})
              </h2>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                Review verified hardware connections holding access tokens to compile or query this account. Revoke session hashes on suspicious links immediately.
              </p>

              {loadingSessions ? (
                <div className="py-8 text-center text-xs text-slate-400 font-bold animate-pulse">Querying active sessions...</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {sessions.map((s, idx) => (
                    <div key={idx} className="py-3.5 flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate block max-w-[200px]">
                            {s.deviceInfo}
                          </span>
                          {s.isCurrent && (
                            <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 font-black rounded-full text-[8px] uppercase tracking-wider">
                              Current Node
                            </span>
                          )}
                        </div>
                        <div className="flex gap-3 text-[10px] text-slate-400 font-bold">
                          <span>IP: {s.ipAddress}</span>
                          <span>•</span>
                          <span>Last seen: {new Date(s.lastActive).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sessions.length > 1 && (
                <button
                  onClick={handleLogoutAll}
                  className="w-full py-2.5 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-xl text-xs font-black transition-all"
                >
                  Terminate All Other Device Sessions
                </button>
              )}
            </div>

            {/* Account Lifecycle / Delete Account */}
            <div className="bg-red-500/[0.02] border border-red-500/25 p-6 rounded-3xl shadow-lg space-y-4">
              <h2 className="text-sm font-extrabold flex items-center gap-2 text-red-500 uppercase tracking-wider">
                ⚠️ Account Lifecycle & Deletion
              </h2>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                Permanently deletes your portfolio configurations, saved templates, indicators, and access certificates. This operation is non-reversible and cascaded immediately across all MongoDB database shards.
              </p>

              {showDeleteConfirm ? (
                <div className="bg-red-500/10 p-4 border border-red-500/20 rounded-2xl space-y-3">
                  <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle className="w-4 h-4" /> Permanent account termination! Are you sure?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deletingAccount}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow"
                    >
                      {deletingAccount ? 'Purging records...' : 'Confirm Purge Account'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl text-slate-500 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2.5 bg-red-650 hover:bg-red-750 text-white rounded-xl text-xs font-black shadow-md transition-transform hover:scale-[1.02]"
                >
                  Decommission User Account
                </button>
              )}
            </div>
          </div>

          {/* Access Password Change Sidebar */}
          <div className="space-y-6">
            <form onSubmit={handlePasswordChange} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-405 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                <Key className="w-4 h-4 text-blue-500 animate-pulse" /> Update Password
              </h3>
              
              {passwordError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold px-3 py-2 rounded-xl">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-bold px-3 py-2 rounded-xl animate-in slide-in-from-top">
                  {passwordSuccess}
                </div>
              )}

              <div className="space-y-3 text-xs font-bold text-slate-400">
                <div>
                  <label className="block uppercase mb-1">New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block uppercase mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingPassword}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-xs font-extrabold transition-all hover:scale-[1.02] shadow"
              >
                {submittingPassword ? 'Validating Entropy...' : 'Save Password'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
