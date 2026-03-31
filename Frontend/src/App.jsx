import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import GroupsPage from "./pages/GroupsPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import { authClient } from "./lib/authClient";
import { getAuthToken } from "./lib/session";

const ProtectedRoute = ({ children, hasToken }) => {
  return hasToken ? children : <Navigate to="/login" replace />;
};

function useCurrentUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      return;
    }

    (async () => {
      try {
        const data = await authClient.me();
        if (active) setUser(data?.user ?? null);
      } catch (_error) {
        if (active) setUser(null);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return user;
}

const App = () => {
  const [authToken, setAuthTokenState] = useState(getAuthToken());
  const user = useCurrentUser();
  const hasToken = Boolean(authToken);

  useEffect(() => {
    const syncToken = () => setAuthTokenState(getAuthToken());
    window.addEventListener("ekub-auth-changed", syncToken);
    window.addEventListener("storage", syncToken);
    return () => {
      window.removeEventListener("ekub-auth-changed", syncToken);
      window.removeEventListener("storage", syncToken);
    };
  }, []);

  return (
    <AppLayout user={user || (hasToken ? {} : null)}>
      <Routes>
        <Route
          path="/"
          element={
            hasToken ? <Navigate to="/dashboard" replace /> : <LandingPage />
          }
        />
        <Route
          path="/login"
          element={hasToken ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="/signup"
          element={hasToken ? <Navigate to="/dashboard" replace /> : <SignupPage />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute hasToken={hasToken}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups"
          element={
            <ProtectedRoute hasToken={hasToken}>
              <GroupsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AppLayout>
  );
};

export default App;
