import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import GroupsPage from "./pages/GroupsPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
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
            <Link to="/groups">My Groups</Link>
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
        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <GroupsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  );
};

export default App;
