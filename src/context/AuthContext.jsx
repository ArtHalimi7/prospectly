import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('prospectly_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('prospectly_token') || '');
  const [loading, setLoading] = useState(true);

  // Sync token and user with localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('prospectly_token', token);
    } else {
      localStorage.removeItem('prospectly_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('prospectly_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('prospectly_user');
    }
  }, [user]);

  // Check current session validity on mount
  useEffect(() => {
    const verifyUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          // Token expired or invalid
          setToken('');
          setUser(null);
        }
      } catch (err) {
        console.warn('Backend offline or unreachable during auth check.');
      }
      setLoading(false);
    };

    verifyUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to sign in.');
    }
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create account.');
    }
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const updateProfile = async (profileData) => {
    const res = await fetch('http://localhost:5000/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(profileData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update profile.');
    }
    setUser(data.user);
    if (data.token) {
      setToken(data.token);
    }
    return data.user;
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('prospectly_token');
    localStorage.removeItem('prospectly_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        updateProfile,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
