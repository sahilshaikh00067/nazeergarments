
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  api,
  saveTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const response = await api.get("/auth/me/");
    setUser(response.data.user);
    return response.data.user;
  }, []);

  // Restore login session on page refresh
  useEffect(() => {
    let active = true;

    const initialize = async () => {
      try {
        if (getAccessToken() || getRefreshToken()) {
          const response = await api.get("/auth/me/");

          if (active) {
            setUser(response.data.user);
          }
        }
      } catch {
        clearTokens();

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const handleExpired = () => {
      if (active) {
        setUser(null);
      }
    };

    window.addEventListener(
      "zg-auth-expired",
      handleExpired
    );

    initialize();

    return () => {
      active = false;

      window.removeEventListener(
        "zg-auth-expired",
        handleExpired
      );
    };
  }, []);

  // Login
  const login = async (email, password) => {
    const response = await api.post("/auth/login/", {
      email,
      password,
    });

    saveTokens(
      response.data.access,
      response.data.refresh
    );

    setUser(response.data.user);

    return response.data.user;
  };

  // Registration
  const register = async (formData) => {
    const response = await api.post(
      "/auth/register/",
      formData
    );

    saveTokens(
      response.data.access,
      response.data.refresh
    );

    setUser(response.data.user);

    return response.data.user;
  };

  // Logout
  const logout = async () => {
    const refresh = getRefreshToken();

    try {
      if (refresh) {
        await api.post("/auth/logout/", {
          refresh,
        });
      }
    } finally {
      clearTokens();
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    refreshUser: fetchUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
