import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../apiClient";
import { clearAuthToken } from "../lib/session";

const DEFAULT_CREATE_FORM = {
  name: "",
  contributionAmount: "",
  maxMembers: "",
  frequency: "monthly",
  visibility: "private",
};

export default function AppLayout({ children, user }) {
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);
  const [showCreateEkub, setShowCreateEkub] = useState(false);
  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const isAuthenticated = Boolean(user);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleLogout = () => {
    clearAuthToken();
    navigate("/login");
  };

  const loadNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiClient.get("/notifications");
      setNotifications(res.data || []);
    } catch (_error) {
      setNotifications([]);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!notificationsOpen || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        await apiClient.post("/notifications/read-all");
        if (!cancelled) {
          await loadNotifications();
        }
      } catch (_error) {
        // Notifications are optional for now in Ekub.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notificationsOpen, isAuthenticated]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handleClickOutside = (event) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notificationsOpen]);

  const handleCreateEkub = async (event) => {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      await apiClient.post("/groups", {
        name: createForm.name,
        contributionAmount: Number(createForm.contributionAmount),
        maxMembers: Number(createForm.maxMembers),
        frequency: createForm.frequency,
        visibility: createForm.visibility,
      });
      setShowCreateEkub(false);
      setCreateForm(DEFAULT_CREATE_FORM);
      navigate("/dashboard");
    } catch (_error) {
      // Leave modal open so user can adjust the form.
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-100">
      <header className="sticky top-0 z-30 border-b border-stone-200/90 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link
            to="/"
            className="font-display text-xl tracking-tight text-primary-800 sm:text-2xl"
          >
            Ekub
          </Link>

          <nav className="flex flex-wrap items-center justify-end gap-2 text-sm sm:gap-3">
            {isAuthenticated && (
              <>
                <button
                  type="button"
                  onClick={() => setShowCreateEkub(true)}
                  className="btn-primary order-last sm:order-none py-2 text-xs sm:text-sm"
                >
                  New Ekub
                </button>
                <Link
                  to="/dashboard"
                  className="rounded-lg px-2.5 py-2 font-medium text-stone-700 transition hover:bg-stone-100 hover:text-primary-800"
                >
                  Dashboard
                </Link>
                <Link
                  to="/groups"
                  className="rounded-lg px-2.5 py-2 font-medium text-stone-700 transition hover:bg-stone-100 hover:text-primary-800"
                >
                  Public
                </Link>
                <div className="relative" ref={notificationsRef}>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
                    onClick={() => setNotificationsOpen((prev) => !prev)}
                  >
                    <span>Alerts</span>
                    {unreadCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 z-20 mt-2 max-h-80 w-[min(100vw-2rem,20rem)] overflow-y-auto rounded-2xl border border-stone-200/90 bg-white text-xs shadow-elevated">
                      {notifications.map((n) => (
                        <div
                          key={n._id}
                          className={`border-b px-3 py-2 ${
                            n.isRead ? "bg-white" : "bg-stone-50"
                          }`}
                        >
                          <p className="font-medium">{n.title}</p>
                          <p className="text-stone-600">{n.message}</p>
                          <p className="mt-1 text-[10px] text-stone-400">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                      {notifications.length === 0 && (
                        <div className="px-3 py-4 text-stone-500 text-center">
                          No notifications
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
              >
                Log out
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-white"
                >
                  Log in
                </Link>
                <Link to="/signup" className="btn-primary py-2 text-xs sm:text-sm">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="relative flex-1">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </div>
      </main>

      {showCreateEkub && (
        <div className="modal-backdrop">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="modal-panel">
              <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
                <h2 className="font-display text-xl text-stone-900">New Ekub</h2>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                  onClick={() => setShowCreateEkub(false)}
                >
                  Close
                </button>
              </div>
              <form className="space-y-4" onSubmit={handleCreateEkub}>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Name
                  </label>
                  <input
                    className="input-field"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Contribution amount
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={createForm.contributionAmount}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        contributionAmount: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Max members
                  </label>
                  <input
                    type="number"
                    min="2"
                    className="input-field"
                    value={createForm.maxMembers}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, maxMembers: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Frequency
                  </label>
                  <select
                    className="input-field"
                    value={createForm.frequency}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, frequency: e.target.value })
                    }
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Visibility
                  </label>
                  <select
                    className="input-field"
                    value={createForm.visibility}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, visibility: e.target.value })
                    }
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary w-full"
                >
                  {creating ? "Creating..." : "Create Ekub"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
