'use client';

import { AlertTriangle, Bell, Check, CheckCheck, PieChart, Settings,Trash2, TrendingUp, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef,useState } from 'react';

import { useAuth } from '@/context/AuthContext';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: 'alert' | 'prediction' | 'portfolio' | 'system';
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  alert: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
  prediction: <TrendingUp className="w-3.5 h-3.5 text-blue-500" />,
  portfolio: <PieChart className="w-3.5 h-3.5 text-emerald-500" />,
  system: <Settings className="w-3.5 h-3.5 text-slate-400" />,
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationCenter() {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/notifications?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silent — notifications are non-critical
    } finally {
      setLoading(false);
    }
  }, [token, API_URL]);

  // Poll every 30 seconds
  useEffect(() => {
    if (!user || !token) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, token, fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    if (!token) return;
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const deleteNotification = async (id: string) => {
    if (!token) return;
    try {
      const was = notifications.find((n) => n._id === id);
      await fetch(`${API_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (was && !was.isRead) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  if (!user) return null;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell trigger */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((v) => !v);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white rounded-xl transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-[0.98]"
        title="Notification Center"
      >
        <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-[9px] font-black text-white bg-red-500 rounded-full flex items-center justify-center shadow-lg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-[100]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-blue-500" />
              Notifications
              {unreadCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[9px] font-black bg-red-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-500/10 transition-all"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 animate-pulse">
                <Bell className="w-6 h-6 mb-2" />
                <span className="text-[10px] font-bold">Loading notifications…</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Bell className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-bold">No notifications yet</p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  When alerts trigger or events occur, they appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`flex items-start gap-3 px-4 py-3 transition-all group hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                    !n.isRead
                      ? 'bg-blue-500/[0.03] border-l-2 border-blue-500'
                      : 'border-l-2 border-transparent'
                  }`}
                >
                  <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                    {TYPE_ICONS[n.type] || TYPE_ICONS.system}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[11px] font-extrabold truncate ${!n.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                        {n.title}
                      </p>
                      <span className="text-[9px] text-slate-400 font-bold shrink-0">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5 leading-relaxed font-medium line-clamp-2">
                      {n.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => markAsRead(n._id)}
                        className="p-1 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-500/10"
                        title="Mark as read"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteNotification(n._id)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-500/10"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
