'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
  role: string;
}

interface UserPreferences {
  theme: 'dark' | 'light';
  timezone: string;
}

interface AuthContextType {
  user: User | null;
  preferences: UserPreferences | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (fullName?: string, password?: string) => Promise<void>;
  updatePreferences: (theme?: 'dark' | 'light', timezone?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
          setToken(storedToken);
          // Verify token and load profile details
          const res = await fetch(`${API_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setPreferences({
              theme: data.preferences.theme,
              timezone: data.preferences.timezone,
            });

            // Enforce theme from pref on load
            const activeTheme = data.preferences.theme;
            document.documentElement.classList.toggle('dark', activeTheme === 'dark');
            localStorage.setItem('theme', activeTheme);
          } else {
            // Token expired or invalid
            localStorage.removeItem('auth_token');
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, [API_URL]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to login');
    }

    const data = await res.json();
    localStorage.setItem('auth_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setPreferences(data.preferences);

    // Apply theme preference
    const activeTheme = data.preferences.theme;
    document.documentElement.classList.toggle('dark', activeTheme === 'dark');
    localStorage.setItem('theme', activeTheme);
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: activeTheme }));

    router.push('/watchlist');
  };

  const register = async (fullName: string, email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Registration failed');
    }

    const data = await res.json();
    localStorage.setItem('auth_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setPreferences({ theme: 'dark', timezone: 'Asia/Kolkata' });

    router.push('/watchlist');
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    setPreferences(null);
    router.push('/');
  };

  const updateProfile = async (fullName?: string, password?: string) => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ fullName, password }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to update profile');
    }

    if (fullName && user) {
      setUser({ ...user, fullName });
    }
  };

  const updatePreferences = async (theme?: 'dark' | 'light', timezone?: string) => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_URL}/auth/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ theme, timezone }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to update preferences');
    }

    const data = await res.json();
    setPreferences({
      theme: data.preferences.theme,
      timezone: data.preferences.timezone,
    });

    if (theme) {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      localStorage.setItem('theme', theme);
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        preferences,
        token,
        loading,
        login,
        register,
        logout,
        updateProfile,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
