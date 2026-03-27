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

const ProtectedRoute = ({ children }) => {
  const token = getAuthToken();
  return token ? children : <Navigate to="/login" replace />;
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
  const user = useCurrentUser();
  const hasToken = Boolean(getAuthToken());

  return (
    <AppLayout user={user || (hasToken ? {} : null)}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <GroupsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AppLayout>
  );
};

export default App;
