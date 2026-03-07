import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import { authClient } from "./lib/authClient";
import { clearAuthToken, getAuthToken } from "./lib/session";

const ProtectedRoute = ({ children }) => {
  const token = getAuthToken();
  return token ? children : <Navigate to="/login" replace />;
};

const Layout = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuthToken();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <Link className="text-lg font-semibold text-primary-700" to="/">
            Ekub
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign up</Link>
            <button
              className="rounded border border-slate-300 px-2 py-1 text-xs"
              onClick={handleLogout}
              type="button"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
};

const DashboardPage = () => {
  const [state, setState] = useState({
    isLoading: true,
    user: null,
    error: "",
  });

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const data = await authClient.me();
        if (!isMounted) return;
        setState({ isLoading: false, user: data.user, error: "" });
      } catch (_error) {
        if (!isMounted) return;
        setState({
          isLoading: false,
          user: null,
          error: "We could not load your profile. Please login again.",
        });
      }
    };

    loadUser();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="card">
      <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
      {state.isLoading ? (
        <p className="mt-2 text-sm text-slate-600">Loading account...</p>
      ) : null}
      {state.error ? <p className="mt-2 text-sm text-red-600">{state.error}</p> : null}
      {state.user ? (
        <p className="mt-2 text-sm text-slate-700">
          Welcome back, <span className="font-semibold">{state.user.name}</span>.
        </p>
      ) : null}
    </section>
  );
};

const App = () => {
  return (
    <Layout>
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
      </Routes>
    </Layout>
  );
};

export default App;
