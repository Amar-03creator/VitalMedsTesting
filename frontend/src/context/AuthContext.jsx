import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signIn, signUp, signOut, getCurrentUser, fetchAuthSession, confirmSignUp } from 'aws-amplify/auth';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const cognitoUser = await getCurrentUser();
      const session     = await fetchAuthSession();
      const token       = session?.tokens?.idToken?.toString();
      const payload     = session?.tokens?.idToken?.payload;

      const userData = {
        id:       cognitoUser.userId,
        email:    payload?.email,
        name:     payload?.name || payload?.['custom:name'],
        role:     payload?.['custom:role'] || 'client',
        company:  payload?.['custom:company'],
        token,
      };

      setUser(userData);
      if (token) localStorage.setItem('vitalmeds_token', token);
    } catch {
      setUser(null);
      localStorage.removeItem('vitalmeds_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
    // Refresh token every 50 minutes
    const interval = setInterval(loadUser, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadUser]);

  const login = async (email, password) => {
    try {
      await signIn({ username: email, password });
      await loadUser();
      toast.success('Welcome back!');
      return { success: true };
    } catch (err) {
      const msg = err.message || 'Login failed. Please try again.';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const register = async (formData) => {
    try {
      await signUp({
        username: formData.email,
        password: formData.password,
        options: {
          userAttributes: {
            email:               formData.email,
            name:                formData.fullName,
            'custom:role':       'client',
            'custom:company':    formData.companyName || '',
            'custom:gst':        formData.gstNumber   || '',
            phone_number:        formData.phone        || '',
          },
        },
      });
      toast.success('Registration successful! Please verify your email.');
      return { success: true };
    } catch (err) {
      const msg = err.message || 'Registration failed.';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const confirmRegistration = async (email, code) => {
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      toast.success('Email verified! You can now log in.');
      return { success: true };
    } catch (err) {
      const msg = err.message || 'Verification failed.';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await signOut();
    } finally {
      setUser(null);
      localStorage.removeItem('vitalmeds_token');
      toast.success('Logged out successfully.');
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin:  user?.role === 'admin',
    isClient: user?.role === 'client',
    login,
    register,
    confirmRegistration,
    logout,
    refreshUser: loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
