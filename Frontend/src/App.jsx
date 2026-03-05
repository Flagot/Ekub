import { Link, Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import { clearAuthToken, getAuthToken } from "./lib/authClient";

const ProtectedRoute = ({ children }) => {
  const token = getAuthToken();
  return token ? children : <Navigate to="/login" replace />;
};

const Layout = ({ children }) => (
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
            onClick={clearAuthToken}
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

const DashboardPage = () => (
  <section className="card">
    <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
    <p className="mt-2 text-sm text-slate-600">
      Protected dashboard placeholder for upcoming API integration.
    </p>
  </section>
);

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
