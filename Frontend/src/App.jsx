import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import { authClient } from "./lib/authClient";
import { groupClient } from "./lib/groupClient";
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

const GroupsPage = () => {
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    name: "",
    contributionAmount: "",
    maxMembers: "",
    frequency: "monthly",
  });

  const loadGroups = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await groupClient.listMine();
      setGroups(data.groups || []);
    } catch (_error) {
      setError("Could not load groups right now.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const amount = Number(form.contributionAmount);
    const memberLimit = Number(form.maxMembers);
    if (!form.name.trim()) {
      setError("Group name is required.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 1) {
      setError("Contribution amount must be at least 1.");
      return;
    }
    if (!Number.isFinite(memberLimit) || memberLimit < 2) {
      setError("Max members must be at least 2.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await groupClient.create({
        name: form.name.trim(),
        contributionAmount: amount,
        maxMembers: memberLimit,
        frequency: form.frequency,
      });
      setForm({
        name: "",
        contributionAmount: "",
        maxMembers: "",
        frequency: "monthly",
      });
      setSuccess("Group created successfully.");
      await loadGroups();
    } catch (submitError) {
      setError(submitError?.response?.data?.message || "Failed to create group.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-semibold text-slate-900">My Groups</h2>
        <p className="mt-1 text-sm text-slate-600">
          Create a new Ekub group and track all groups you belong to.
        </p>
      </div>

      <form className="card grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Group name</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Contribution amount
          </span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            name="contributionAmount"
            type="number"
            min="1"
            value={form.contributionAmount}
            onChange={handleChange}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Max members</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            name="maxMembers"
            type="number"
            min="2"
            value={form.maxMembers}
            onChange={handleChange}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Frequency</span>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            name="frequency"
            value={form.frequency}
            onChange={handleChange}
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button
            className="rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700 disabled:opacity-70"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Group"}
          </button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? <p className="text-sm text-slate-600">Loading groups...</p> : null}
        {!isLoading && groups.length === 0 ? (
          <p className="card text-sm text-slate-600">No groups yet. Create your first one.</p>
        ) : null}
        {groups.map((group) => (
          <article className="card" key={group._id}>
            <h3 className="text-lg font-semibold text-slate-900">{group.name}</h3>
            <p className="mt-2 text-sm text-slate-600">
              Contribution: {group.contributionAmount} | Members: {group.members?.length}/
              {group.maxMembers}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
              {group.frequency} - {group.status}
            </p>
          </article>
        ))}
      </div>
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
