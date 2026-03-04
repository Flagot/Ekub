import { Link, Navigate, Route, Routes } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("ekub_token");
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
          <Link to="/login">Login</Link>
          <Link to="/signup">Sign up</Link>
        </nav>
      </div>
    </header>
    <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
  </div>
);

const LandingPage = () => (
  <section className="rounded-2xl border bg-white p-8 shadow-soft">
    <h1 className="font-display text-3xl text-slate-900">Build your savings circle</h1>
    <p className="mt-3 max-w-2xl text-slate-600">
      Start a rotating savings group, invite members, and track payouts over each
      contribution cycle.
    </p>
  </section>
);

const LoginPage = () => (
  <section className="card max-w-md">
    <h2 className="text-xl font-semibold text-slate-900">Login</h2>
    <p className="mt-2 text-sm text-slate-600">Auth form wiring comes next.</p>
  </section>
);

const SignupPage = () => (
  <section className="card max-w-md">
    <h2 className="text-xl font-semibold text-slate-900">Create account</h2>
    <p className="mt-2 text-sm text-slate-600">Signup form wiring comes next.</p>
  </section>
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
