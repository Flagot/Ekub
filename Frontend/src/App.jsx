import React, { useEffect, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import api from "./apiClient";
import { authClient } from "./lib/authClient";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";

function useAuth() {
  const { data: session, isPending, error } = authClient.useSession();
  const user = session?.user ?? null;
  return { user, loading: isPending, error };
}

function Layout({ children, user, onLogout }) {
  const userId = user?.id ?? null;
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);
  const [showCreateEkub, setShowCreateEkub] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    contributionFrequency: "monthly",
    numberOfCycles: 10,
    payoutPerCycle: "",
    minContributionPerPerson: "",
    maxContributionPerPerson: "",
    startDate: new Date().toISOString().slice(0, 10),
    visibility: "private",
  });
  const navigate = useNavigate();

  async function loadNotifications() {
    if (!userId) return;
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data || []);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  useEffect(() => {
    if (!notificationsOpen || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        await api.post("/notifications/read-all");
        if (!cancelled) {
          const res = await api.get("/notifications");
          setNotifications(res.data || []);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notificationsOpen, userId]);

  useEffect(() => {
    if (!notificationsOpen) return;
    function handleClickOutside(e) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target)
      ) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notificationsOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleCreateEkub(e) {
    e.preventDefault();
    try {
      await api.post("/groups", {
        name: createForm.name,
        contributionFrequency: createForm.contributionFrequency,
        numberOfCycles: createForm.numberOfCycles ? Number(createForm.numberOfCycles) : undefined,
        payoutPerCycle: createForm.payoutPerCycle ? Number(createForm.payoutPerCycle) : undefined,
        minContributionPerPerson: createForm.minContributionPerPerson ? Number(createForm.minContributionPerPerson) : undefined,
        maxContributionPerPerson: createForm.maxContributionPerPerson ? Number(createForm.maxContributionPerPerson) : undefined,
        startDate: createForm.startDate,
        visibility: createForm.visibility,
      });
      setShowCreateEkub(false);
      setCreateForm({
        name: "",
        contributionFrequency: "monthly",
        numberOfCycles: 10,
        payoutPerCycle: "",
        minContributionPerPerson: "",
        maxContributionPerPerson: "",
        startDate: new Date().toISOString().slice(0, 10),
        visibility: "private",
      });
      window.dispatchEvent(new CustomEvent("ekub-created"));
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
    }
  }

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
            {user && (
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
                      {notifications.map((n) => {
                        const typeLabel =
                          n.type === "PAYMENT_DUE"
                            ? "Pay due"
                            : n.type === "PAYOUT_RECEIVED"
                            ? "You won"
                            : n.type === "CYCLE_WINNER"
                            ? "Who won"
                            : n.type === "WINNER_CHOSEN"
                            ? "You were chosen"
                            : n.type === "WINNER_ANNOUNCED"
                            ? "Winner chosen"
                            : n.type === "MISSED_PAYMENT"
                            ? "Missed"
                            : n.type === "ADDED_TO_EKUB"
                            ? "Added to Ekub"
                            : n.type === "PAYMENT_SUCCESS"
                            ? "Payment successful"
                            : n.type === "JOIN_REQUEST_REJECTED"
                            ? "Not accepted"
                            : "";
                        const typeClass =
                          n.type === "PAYMENT_DUE"
                            ? "bg-amber-100 text-amber-800"
                            : n.type === "PAYOUT_RECEIVED"
                            ? "bg-green-100 text-green-800"
                            : n.type === "CYCLE_WINNER"
                            ? "bg-blue-100 text-blue-800"
                            : n.type === "WINNER_CHOSEN"
                            ? "bg-green-100 text-green-800"
                            : n.type === "WINNER_ANNOUNCED"
                            ? "bg-blue-100 text-blue-800"
                            : n.type === "MISSED_PAYMENT"
                            ? "bg-red-100 text-red-800"
                            : n.type === "ADDED_TO_EKUB"
                            ? "bg-indigo-100 text-indigo-800"
                            : n.type === "PAYMENT_SUCCESS"
                            ? "bg-green-100 text-green-800"
                            : n.type === "JOIN_REQUEST_REJECTED"
                            ? "bg-red-100 text-red-800"
                            : "bg-stone-100 text-stone-600";
                        return (
                          <div
                            key={n._id}
                            className={`border-b px-3 py-2 ${
                              n.isRead ? "bg-white" : "bg-stone-50"
                            }`}
                          >
                            {typeLabel && (
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${typeClass} mb-1`}
                              >
                                {typeLabel}
                              </span>
                            )}
                            <p className="font-medium">{n.title}</p>
                            <p className="text-stone-600">{n.message}</p>
                            <p className="mt-1 text-[10px] text-stone-400">
                              {new Date(n.createdAt).toLocaleString()}
                            </p>
                          </div>
                        );
                      })}
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
            {user ? (
              <button
                type="button"
                onClick={onLogout}
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
                <Link
                  to="/signup"
                  className="btn-primary py-2 text-xs sm:text-sm"
                >
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
                  placeholder="e.g. Family Ekub"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Frequency
                </label>
                <select
                  className="input-field"
                  value={createForm.contributionFrequency}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      contributionFrequency: e.target.value,
                    })
                  }
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Number of cycles (slots)
                </label>
                <input
                  type="number"
                  min={1}
                  className="input-field"
                  value={createForm.numberOfCycles}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      numberOfCycles: e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  placeholder="e.g. 10"
                />
                <p className="text-xs text-stone-500 mt-1">
                  How many cycles (and slots). One winner or group per cycle. E.g. 10 cycles = 10 slots; each slot pays (payout ÷ 10) per cycle.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Payout per cycle (birr)
                </label>
                <input
                  type="number"
                  min={0}
                  className="input-field"
                  value={createForm.payoutPerCycle}
                  onChange={(e) => setCreateForm({ ...createForm, payoutPerCycle: e.target.value })}
                  placeholder="e.g. 10000"
                />
                <p className="text-xs text-stone-500 mt-1">
                  Total amount the winner(s) get each cycle. Each slot’s contributions must add up to (payout ÷ cycles). E.g. 10k ÷ 10 = 1k per slot; one person at 1k or two at 500 each.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Min per person (birr)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="input-field"
                    value={createForm.minContributionPerPerson}
                    onChange={(e) => setCreateForm({ ...createForm, minContributionPerPerson: e.target.value })}
                    placeholder="e.g. 500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Max per person (birr)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="input-field"
                    value={createForm.maxContributionPerPerson}
                    onChange={(e) => setCreateForm({ ...createForm, maxContributionPerPerson: e.target.value })}
                    placeholder="e.g. 1000"
                  />
                </div>
              </div>
              <p className="text-xs text-stone-500 -mt-1">
                When adding members, each amount must be between min and max. Group members into slots so each slot totals (payout ÷ cycles).
              </p>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Start date
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={createForm.startDate}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, startDate: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Visibility
                </label>
                <div className="mt-2 flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={createForm.visibility === "private"}
                      onChange={() =>
                        setCreateForm({ ...createForm, visibility: "private" })
                      }
                      className="text-primary-600"
                    />
                    <span className="text-sm">Private</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={createForm.visibility === "public"}
                      onChange={() =>
                        setCreateForm({ ...createForm, visibility: "public" })
                      }
                      className="text-primary-600"
                    />
                    <span className="text-sm">Public</span>
                  </label>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Private: only you and members see it; only you can add members.
                  Public: anyone can see and ask to join.
                </p>
              </div>
              <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
                <button
                  type="button"
                  className="btn-secondary px-5"
                  onClick={() => setShowCreateEkub(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-5">
                  Create group
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await api.get("/groups/dashboard");
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    function onEkubCreated() {
      loadDashboard();
    }
    window.addEventListener("ekub-created", onEkubCreated);
    return () => window.removeEventListener("ekub-created", onEkubCreated);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <span
          className="h-10 w-10 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600"
          aria-hidden
        />
        <p className="text-sm font-medium text-stone-500">Loading dashboard…</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="card-surface border-amber-200/80 bg-amber-50/50 p-6 text-center">
        <p className="font-medium text-amber-900">Could not load dashboard.</p>
        <p className="mt-1 text-sm text-amber-800/80">Try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl text-stone-900 sm:text-4xl">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Your active groups and what you owe this cycle.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <div className="card-surface p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Active Ekubs
          </p>
          <p className="mt-3 font-display text-4xl text-primary-800">{data.activeEkubs}</p>
        </div>
        <div className="card-surface p-6 md:col-span-2">
          <p className="text-sm font-semibold text-stone-800">Payments due</p>
          <ul className="mt-3 max-h-52 space-y-3 overflow-y-auto text-sm text-stone-700">
            {(data.upcomingPayments || []).map((p) => {
              const dateLabel = p.dueDate
                ? new Date(p.dueDate).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—";
              return (
                <li
                  key={p._id}
                  className="rounded-xl border border-stone-100 bg-stone-50/80 px-3 py-2.5 last:pb-2"
                >
                  <p className="font-medium text-stone-800">
                    On {dateLabel} pay <span className="font-semibold text-primary-700">{p.amount} birr</span> to <span className="font-semibold">{p.groupName || "Ekub"}</span>
                    {p.cycleNumber != null && (
                      <span className="text-stone-500 font-normal"> (cycle {p.cycleNumber})</span>
                    )}
                  </p>
                </li>
              );
            })}
            {(data.upcomingPayments || []).length === 0 && (
              <li className="text-stone-500 py-1">No payments due. You’re all set.</li>
            )}
          </ul>
        </div>
      </div>

      <GroupsPage
        groups={data.groups ?? []}
        pastGroups={data.pastGroups ?? []}
        loading={false}
        onRefresh={loadDashboard}
        hidePublic
      />
    </div>
  );
}

function GroupsPage({ groups: propsGroups, pastGroups: propsPastGroups, loading: propsLoading, onRefresh, hidePublic }) {
  const [internalGroups, setInternalGroups] = useState([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const groups = propsGroups !== undefined ? propsGroups : internalGroups;
  const loading = propsLoading !== undefined ? propsLoading : internalLoading;
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [scheduleGroup, setScheduleGroup] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contributionFrequency: "monthly",
    numberOfCycles: 10,
    startDate: new Date().toISOString().slice(0, 10),
    visibility: "private",
  });
  const [manageGroup, setManageGroup] = useState(null);
  const [manageDetail, setManageDetail] = useState(null);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addMemberAmount, setAddMemberAmount] = useState("");
  const [addMemberError, setAddMemberError] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [processingPendingId, setProcessingPendingId] = useState(null);
  const [deletingGroupId, setDeletingGroupId] = useState(null);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [publicGroups, setPublicGroups] = useState([]);
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [trackingGroup, setTrackingGroup] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [contributionFilter, setContributionFilter] = useState("all");
  const [cycleFilter, setCycleFilter] = useState(null);
  const [cycleYear, setCycleYear] = useState("");
  const [cycleMonth, setCycleMonth] = useState("");
  const [cycleWeek, setCycleWeek] = useState("");
  const [updatingContributionId, setUpdatingContributionId] = useState(null);
  const [choosingWinner, setChoosingWinner] = useState(false);
  const [chosenWinner, setChosenWinner] = useState(null);
  const [editGroup, setEditGroup] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    contributionFrequency: "monthly",
    numberOfCycles: 10,
    startDate: "",
    visibility: "private",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [payEkubGroup, setPayEkubGroup] = useState(null);
  const [myContributions, setMyContributions] = useState([]);
  const [myContributionsCreatorOnly, setMyContributionsCreatorOnly] = useState(false);
  const [loadingMyContributions, setLoadingMyContributions] = useState(false);
  const [confirmingContributionId, setConfirmingContributionId] = useState(null);
  const [selectedPayContributionId, setSelectedPayContributionId] = useState(null);
  const [payEkubError, setPayEkubError] = useState(null);
  const [winnersGroup, setWinnersGroup] = useState(null);
  const [winnersData, setWinnersData] = useState(null);
  const [loadingWinners, setLoadingWinners] = useState(false);
  const [payingWinnerCycle, setPayingWinnerCycle] = useState(null);
  const [winnersError, setWinnersError] = useState(null);
  const [showStartEkubModal, setShowStartEkubModal] = useState(false);
  const [startEkubSlots, setStartEkubSlots] = useState({});
  const [startingEkub, setStartingEkub] = useState(false);
  const [startEkubError, setStartEkubError] = useState(null);

  async function load() {
    setInternalLoading(true);
    try {
      const res = await api.get("/groups/mine");
      setInternalGroups(res.data);
    } finally {
      setInternalLoading(false);
    }
  }

  const refresh = onRefresh || load;

  async function loadPublic() {
    setLoadingPublic(true);
    try {
      const res = await api.get("/groups/public");
      setPublicGroups(res.data);
    } catch {
      setPublicGroups([]);
    } finally {
      setLoadingPublic(false);
    }
  }

  useEffect(() => {
    if (propsGroups === undefined) load();
  }, []);

  useEffect(() => {
    if (!hidePublic) loadPublic();
  }, [hidePublic]);

  async function openSchedule(group) {
    setScheduleGroup(group);
    setSchedule(null);
    setLoadingSchedule(true);
    try {
      const res = await api.get(`/groups/${group._id}/schedule`);
      setSchedule(res.data);
    } finally {
      setLoadingSchedule(false);
    }
  }

  async function openPayEkub(group) {
    setPayEkubGroup(group);
    setMyContributions([]);
    setMyContributionsCreatorOnly(false);
    setSelectedPayContributionId(null);
    setPayEkubError(null);
    setLoadingMyContributions(true);
    try {
      const res = await api.get(`/groups/${group._id}/my-contributions`);
      const data = res.data;
      const list = Array.isArray(data) ? data : (data?.contributions ?? []);
      setMyContributions(list);
      setMyContributionsCreatorOnly(data?.isCreatorNotMember === true);
      const firstUnpaid = list.find((c) => c.status !== "paid");
      setSelectedPayContributionId(firstUnpaid ? firstUnpaid._id : null);
    } catch {
      setPayEkubError("Could not load contributions.");
    } finally {
      setLoadingMyContributions(false);
    }
  }

  async function openWinners(group) {
    setWinnersGroup(group);
    setWinnersData(null);
    setWinnersError(null);
    setLoadingWinners(true);
    try {
      const res = await api.get(`/groups/${group._id}/winners`);
      setWinnersData(res.data);
    } catch {
      setWinnersGroup(null);
      setWinnersError("Could not load winners.");
    } finally {
      setLoadingWinners(false);
    }
  }

  async function handlePayWinner(cycleNumber) {
    if (!winnersGroup) return;
    setPayingWinnerCycle(cycleNumber);
    setWinnersError(null);
    try {
      await api.post(`/payouts/groups/${winnersGroup._id}/cycles/${cycleNumber}/pay-winner`);
      const res = await api.get(`/groups/${winnersGroup._id}/winners`);
      setWinnersData(res.data);
    } catch (err) {
      setWinnersError(err.response?.data?.message || "Failed to mark winner as paid.");
    } finally {
      setPayingWinnerCycle(null);
    }
  }

  async function handleSelfConfirmPayment(contributionId) {
    if (!payEkubGroup) return;
    setConfirmingContributionId(contributionId);
    setPayEkubError(null);
    try {
      await api.post(`/contributions/${contributionId}/self-confirm`);
      const res = await api.get(`/groups/${payEkubGroup._id}/my-contributions`);
      const data = res.data;
      const list = Array.isArray(data) ? data : (data?.contributions ?? []);
      setMyContributions(list);
      setMyContributionsCreatorOnly(data?.isCreatorNotMember === true);
      const firstUnpaid = list.find((c) => c.status !== "paid");
      setSelectedPayContributionId(firstUnpaid ? firstUnpaid._id : null);
    } catch (err) {
      setPayEkubError(err.response?.data?.message || "Failed to mark as paid. Try again.");
    } finally {
      setConfirmingContributionId(null);
    }
  }

  async function openPaymentTracking(group) {
    setTrackingGroup(group);
    setTrackingData(null);
    setChosenWinner(null);
    setLoadingTracking(true);
    setContributionFilter("all");
    setCycleFilter(null);
    setCycleYear("");
    setCycleMonth("");
    setCycleWeek("");
    try {
      const res = await api.get(`/groups/${group._id}/payment-tracking`);
      setTrackingData(res.data);
    } catch {
      setTrackingGroup(null);
    } finally {
      setLoadingTracking(false);
    }
  }

  async function handleContributionStatusChange(contributionId, newStatus) {
    if (!trackingGroup) return;
    setUpdatingContributionId(contributionId);
    try {
      await api.patch(`/contributions/${contributionId}/status`, {
        status: newStatus,
      });
      const res = await api.get(
        `/groups/${trackingGroup._id}/payment-tracking`
      );
      setTrackingData(res.data);
    } finally {
      setUpdatingContributionId(null);
    }
  }

  async function handleChooseWinner() {
    if (!trackingGroup) return;
    setChoosingWinner(true);
    setChosenWinner(null);
    try {
      const res = await api.post(
        `/payouts/groups/${trackingGroup._id}/choose-winner`
      );
      setChosenWinner(res.data);
      const trackRes = await api.get(
        `/groups/${trackingGroup._id}/payment-tracking`
      );
      setTrackingData(trackRes.data);
    } catch (err) {
      setChosenWinner({
        error: err.response?.data?.message || "Failed to choose winner",
      });
    } finally {
      setChoosingWinner(false);
    }
  }

  /** Short label for Pay Ekub: "Feb 2025", "Feb Week 1", or "Feb 1, 2025" */
  function payCycleLabel(cycleNumber, group) {
    if (!group?.startDate || !group?.contributionFrequency)
      return `Cycle ${cycleNumber}`;
    const start = new Date(group.startDate);
    const freq = group.contributionFrequency;
    const date = new Date(start);
    if (freq === "daily") date.setDate(date.getDate() + (cycleNumber - 1));
    else if (freq === "weekly")
      date.setDate(date.getDate() + 7 * (cycleNumber - 1));
    else if (freq === "monthly")
      date.setMonth(date.getMonth() + (cycleNumber - 1));
    if (freq === "monthly")
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    if (freq === "weekly") {
      const weekOfMonth = Math.ceil(date.getDate() / 7);
      return `${date.toLocaleDateString("en-US", { month: "short" })} Week ${weekOfMonth}`;
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatCycleLabel(cycleNumber, group) {
    if (!group?.startDate || !group?.contributionFrequency)
      return `Cycle ${cycleNumber}`;
    const start = new Date(group.startDate);
    const freq = group.contributionFrequency;
    const date = new Date(start);
    if (freq === "daily") date.setDate(date.getDate() + (cycleNumber - 1));
    else if (freq === "weekly")
      date.setDate(date.getDate() + 7 * (cycleNumber - 1));
    else if (freq === "monthly")
      date.setMonth(date.getMonth() + (cycleNumber - 1));
    if (freq === "monthly")
      return `Cycle ${cycleNumber} (${date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })})`;
    if (freq === "weekly")
      return `Cycle ${cycleNumber} (Week of ${date.toLocaleDateString()})`;
    return `Cycle ${cycleNumber} (${date.toLocaleDateString()})`;
  }

  function getCycleDate(group, cycleNumber) {
    if (!group?.startDate || !group?.contributionFrequency) return null;
    const start = new Date(group.startDate);
    const freq = group.contributionFrequency;
    const date = new Date(start);
    if (freq === "daily") date.setDate(date.getDate() + (cycleNumber - 1));
    else if (freq === "weekly")
      date.setDate(date.getDate() + 7 * (cycleNumber - 1));
    else if (freq === "monthly")
      date.setMonth(date.getMonth() + (cycleNumber - 1));
    return date;
  }

  async function openManage(group) {
    setManageGroup(group);
    setManageDetail(null);
    setAddMemberError("");
    setShowStartEkubModal(false);
    try {
      const res = await api.get(`/groups/${group._id}`);
      setManageDetail(res.data);
      const members = res.data?.members || [];
      const defaultSlots = {};
      members.forEach((m, i) => {
        const id = m.user?._id || m.user;
        if (id) defaultSlots[id] = i + 1;
      });
      setStartEkubSlots(defaultSlots);
    } catch {
      setManageGroup(null);
    }
  }

  async function handleStartEkub(e) {
    e.preventDefault();
    if (!manageGroup || !manageDetail?.members?.length) return;
    setStartEkubError(null);
    setStartingEkub(true);
    try {
      const members = manageDetail.members.filter((m) => m.user && m.status === "active");
      const bySlot = {};
      members.forEach((m) => {
        const id = (m.user?._id || m.user).toString();
        const slot = startEkubSlots[id] ?? 1;
        if (!bySlot[slot]) bySlot[slot] = [];
        bySlot[slot].push(id);
      });
      const payoutOrder = Object.keys(bySlot)
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => (bySlot[k].length === 1 ? bySlot[k][0] : bySlot[k]));
      await api.post(`/groups/${manageGroup._id}/payout-order`, {
        payoutStrategy: "CUSTOM_ORDER",
        payoutOrder,
      });
      setShowStartEkubModal(false);
      const res = await api.get(`/groups/${manageGroup._id}`);
      setManageDetail(res.data);
      refresh();
    } catch (err) {
      setStartEkubError(err.response?.data?.message || "Failed to start Ekub.");
    } finally {
      setStartingEkub(false);
    }
  }

  function openEdit(group) {
    setEditGroup(group);
    setEditForm({
      name: group.name,
      contributionFrequency: group.contributionFrequency || "monthly",
      numberOfCycles: group.numberOfCycles ?? 10,
      payoutPerCycle: group.payoutPerCycle ?? "",
      minContributionPerPerson: group.minContributionPerPerson ?? "",
      maxContributionPerPerson: group.maxContributionPerPerson ?? "",
      startDate: group.startDate
        ? new Date(group.startDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      visibility: group.visibility || "private",
    });
  }

  async function handleUpdateEkub(e) {
    e.preventDefault();
    if (!editGroup) return;
    setSavingEdit(true);
    try {
      await api.patch(`/groups/${editGroup._id}`, editForm);
      setEditGroup(null);
      refresh();
      loadPublic();
      if (manageGroup?._id === editGroup._id) {
        const res = await api.get(`/groups/${editGroup._id}`);
        setManageDetail(res.data);
        setManageGroup((prev) =>
          prev?._id === editGroup._id ? { ...prev, ...res.data } : prev
        );
      }
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    await api.post("/groups", {
      name: form.name,
      contributionFrequency: form.contributionFrequency,
      numberOfCycles: form.numberOfCycles ? Number(form.numberOfCycles) : undefined,
      payoutPerCycle: form.payoutPerCycle ? Number(form.payoutPerCycle) : undefined,
      minContributionPerPerson: form.minContributionPerPerson ? Number(form.minContributionPerPerson) : undefined,
      maxContributionPerPerson: form.maxContributionPerPerson ? Number(form.maxContributionPerPerson) : undefined,
      startDate: form.startDate,
      visibility: form.visibility,
    });
    setShowCreate(false);
    setForm({
      name: "",
      contributionFrequency: "monthly",
      numberOfCycles: 10,
      payoutPerCycle: "",
      minContributionPerPerson: "",
      maxContributionPerPerson: "",
      startDate: new Date().toISOString().slice(0, 10),
      visibility: "private",
    });
    refresh();
    loadPublic();
  }

  async function handleAskToJoin(groupId) {
    setJoiningId(groupId);
    try {
      await api.post(`/groups/${groupId}/join`);
      loadPublic();
      refresh();
    } finally {
      setJoiningId(null);
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();
    if (!manageGroup || !addMemberEmail.trim() || addMemberAmount === "")
      return;
    setAddMemberError("");
    setAddingMember(true);
    try {
      const res = await api.post(`/groups/${manageGroup._id}/members`, {
        email: addMemberEmail.trim().toLowerCase(),
        amount: Number(addMemberAmount),
      });
      setManageDetail({
        ...res.data.group,
        contributorCount: res.data.contributorCount,
        totalSum: res.data.totalSum,
      });
      setAddMemberEmail("");
      setAddMemberAmount("");
      refresh();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to add member";
      setAddMemberError(msg);
    } finally {
      setAddingMember(false);
    }
  }

  async function handleApprovePending(memberId) {
    if (!manageGroup || !manageDetail) return;
    setProcessingPendingId(memberId);
    try {
      await api.post(`/groups/${manageGroup._id}/members/${memberId}/approve`);
      setManageDetail((prev) => ({
        ...prev,
        members: (prev.members || []).map((m) => {
          const id = (m.user?._id || m.user)?.toString();
          return id === memberId ? { ...m, status: "active" } : m;
        }),
      }));
      const res = await api.get(`/groups/${manageGroup._id}`);
      setManageDetail(res.data);
      refresh();
    } finally {
      setProcessingPendingId(null);
    }
  }

  async function handleRejectPending(memberId) {
    if (!manageGroup || !manageDetail) return;
    setProcessingPendingId(memberId);
    try {
      await api.post(`/groups/${manageGroup._id}/members/${memberId}/reject`);
      setManageDetail((prev) => ({
        ...prev,
        members: (prev.members || []).map((m) => {
          const id = (m.user?._id || m.user)?.toString();
          return id === memberId ? { ...m, status: "rejected" } : m;
        }),
      }));
      const res = await api.get(`/groups/${manageGroup._id}`);
      setManageDetail(res.data);
      refresh();
    } finally {
      setProcessingPendingId(null);
    }
  }

  async function handleDeleteEkub(g) {
    if (!window.confirm(`Delete "${g.name}"? This Ekub will be cancelled and removed from your list.`)) return;
    setDeletingGroupId(g._id);
    try {
      await api.delete(`/groups/${g._id}`);
      refresh();
      setManageGroup(null);
      setManageDetail(null);
    } finally {
      setDeletingGroupId(null);
    }
  }

  async function handleRemoveMember(memberId) {
    if (!manageGroup) return;
    const member = (manageDetail?.members || []).find((m) => (m.user?._id || m.user)?.toString() === memberId);
    const name = member?.user?.fullName || member?.user?.email || "this member";
    if (!window.confirm(`Remove ${name} from ${manageGroup.name}?`)) return;
    setRemovingMemberId(memberId);
    try {
      await api.delete(`/groups/${manageGroup._id}/members/${memberId}`);
      const res = await api.get(`/groups/${manageGroup._id}`);
      setManageDetail(res.data);
      refresh();
    } finally {
      setRemovingMemberId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-stone-900 sm:text-4xl">My Ekubs</h1>
          <p className="mt-2 text-stone-600">
            Open a group for details, payouts, and member tools.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="btn-primary shrink-0 self-start sm:self-auto"
        >
          Create Ekub
        </button>
      </div>
      {loading ? (
        <div className="flex items-center gap-3 py-12 text-stone-500">
          <span
            className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600"
            aria-hidden
          />
          Loading your groups…
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {groups.map((g) => {
            const contributorCount = g.members?.length ?? 0;
            const totalSum = (g.members || []).reduce(
              (s, m) => s + (m.amount || 0),
              0
            );
            return (
              <div
                key={g._id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedGroup(g)}
                onKeyDown={(e) => e.key === "Enter" && setSelectedGroup(g)}
                className="card-surface group cursor-pointer p-6 transition hover:border-primary-200 hover:shadow-elevated"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-lg text-primary-900">{g.name}</p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      g.visibility === "public"
                        ? "bg-primary-100 text-primary-800"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {g.visibility || "private"}
                  </span>
                </div>
                <p className="mt-2 text-xs capitalize text-stone-500">
                  {g.contributionFrequency} · from{" "}
                  {g.startDate
                    ? new Date(g.startDate).toLocaleDateString()
                    : "—"}
                </p>
                <p className="mt-4 text-sm text-stone-700">
                  <span className="font-semibold">{contributorCount}</span>{" "}
                  contributor
                  {contributorCount !== 1 ? "s" : ""} ·{" "}
                  <span className="font-semibold text-primary-800">{totalSum} birr</span>{" "}
                  pool
                </p>
                <p className="mt-3 text-xs font-medium text-primary-700 opacity-0 transition group-hover:opacity-100">
                  View details →
                </p>
              </div>
            );
          })}
          {groups.length === 0 && (
            <div className="card-surface border-dashed p-10 text-center md:col-span-2">
              <p className="text-stone-600">You don&apos;t have any Ekubs yet.</p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="btn-primary mt-4"
              >
                Create your first Ekub
              </button>
            </div>
          )}
        </div>
      )}

      {hidePublic && (propsPastGroups?.length ?? 0) > 0 && (
        <div className="mt-8 pt-6 border-t">
          <h2 className="text-lg font-semibold mb-3">Past Ekubs</h2>
          <p className="text-sm text-stone-600 mb-3">
            Ekubs where every member has won and the round is complete.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {(propsPastGroups || []).map((g) => {
              const contributorCount = (g.members || []).filter((m) => (m.status || "active") === "active").length;
              const totalSum = (g.members || [])
                .filter((m) => (m.status || "active") === "active")
                .reduce((s, m) => s + (m.amount || 0), 0);
              return (
                <div key={g._id} className="rounded-lg bg-white p-4 shadow-sm border border-stone-200">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{g.name}</p>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
                      Completed
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1 capitalize">
                    {g.contributionFrequency} · everyone has won
                  </p>
                  <p className="mt-2 text-sm">
                    {contributorCount} member(s) · total {totalSum} birr per cycle
                  </p>
                  <div className="mt-3">
                    <button
                      type="button"
                      className="text-xs text-primary-600 hover:underline font-medium"
                      onClick={() => openWinners(g)}
                    >
                      View who won
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!hidePublic && (
      <div className="mt-8 pt-6 border-t">
        <h2 className="text-lg font-semibold mb-3">Discover public Ekubs</h2>
        <p className="text-sm text-stone-600 mb-3">
          Public Ekubs you can ask to join.
        </p>
        {loadingPublic ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : publicGroups.length === 0 ? (
          <p className="text-sm text-stone-500">No public Ekubs right now.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {publicGroups.map((g) => (
              <div
                key={g._id}
                className="rounded-lg bg-white p-4 shadow-sm border border-stone-200"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{g.name}</p>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-800">
                    public
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-1 capitalize">
                  {g.contributionFrequency} · from{" "}
                  {g.startDate
                    ? new Date(g.startDate).toLocaleDateString()
                    : "—"}
                </p>
                <p className="mt-2 text-sm">
                  {g.contributorCount ?? 0} contributor(s) · total{" "}
                  {g.totalSum ?? 0} birr
                </p>
                <div className="mt-3">
                  {g.isMember ? (
                    <span className="text-xs text-stone-500">
                      You are a member
                    </span>
                  ) : (
                    <button
                      className="text-xs text-primary-600 hover:underline font-medium disabled:opacity-50"
                      onClick={() => handleAskToJoin(g._id)}
                      disabled={joiningId === g._id}
                    >
                      {joiningId === g._id ? "Requesting…" : "Ask to join"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {selectedGroup && (
        <div className="modal-backdrop">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="modal-panel-lg">
            <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="font-display text-xl text-primary-900">{selectedGroup.name}</h2>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                onClick={() => setSelectedGroup(null)}
              >
                Close
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2">
                <span className="text-stone-500">Visibility</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${selectedGroup.visibility === "public" ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-600"}`}>
                  {selectedGroup.visibility || "private"}
                </span>
              </p>
              <p className="text-stone-600 capitalize">
                <span className="text-stone-500">Frequency</span> {selectedGroup.contributionFrequency}
                {selectedGroup.numberOfCycles ? ` · ${selectedGroup.numberOfCycles} cycles` : ""} · started{" "}
                {selectedGroup.startDate ? new Date(selectedGroup.startDate).toLocaleDateString() : "—"}
              </p>
              <p className="text-stone-600">
                {(selectedGroup.members || []).filter((m) => (m.status || "active") === "active").length} contributor(s) · total{" "}
                {(selectedGroup.members || []).filter((m) => (m.status || "active") === "active").reduce((s, m) => s + (m.amount || 0), 0)} birr
              </p>
            </div>
            <div className="mt-5 pt-4 border-t">
              <p className="text-sm font-medium text-stone-700 mb-3">Actions</p>
              <div className="flex flex-wrap gap-2">
                {selectedGroup.isAdmin && (
                  <>
                    <button
                      type="button"
                      className="rounded-md border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50"
                      onClick={() => openEdit(selectedGroup)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-primary-300 bg-primary-50 px-3 py-2 text-sm text-primary-700 hover:bg-primary-100"
                      onClick={() => openManage(selectedGroup)}
                    >
                      Add members
                      {(selectedGroup.members || []).filter((m) => (m.status || "active") === "pending").length > 0 && (
                        <span className="ml-1 font-semibold text-amber-600">
                          ({(selectedGroup.members || []).filter((m) => (m.status || "active") === "pending").length})
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50"
                      onClick={() => openPaymentTracking(selectedGroup)}
                    >
                      Payment tracking
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50"
                      onClick={() => openSchedule(selectedGroup)}
                    >
                      Payout schedule
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                      onClick={() => { handleDeleteEkub(selectedGroup); setSelectedGroup(null); }}
                      disabled={deletingGroupId === selectedGroup._id}
                    >
                      {deletingGroupId === selectedGroup._id ? "Deleting…" : "Delete Ekub"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
                  onClick={() => openPayEkub(selectedGroup)}
                >
                  Pay Ekub
                </button>
                <button
                  type="button"
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50"
                  onClick={() => openWinners(selectedGroup)}
                >
                  View who won
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="modal-backdrop">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="modal-panel">
            <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="font-display text-xl text-stone-900">Create Ekub</h2>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                onClick={() => setShowCreate(false)}
              >
                Close
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Name
                </label>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Family Ekub"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Frequency
                </label>
                <select
                  className="input-field"
                  value={form.contributionFrequency}
                  onChange={(e) =>
                    setForm({ ...form, contributionFrequency: e.target.value })
                  }
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Number of cycles (slots)
                </label>
                <input
                  type="number"
                  min={1}
                  className="input-field"
                  value={form.numberOfCycles}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      numberOfCycles: e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  placeholder="e.g. 10"
                />
                <p className="mt-1.5 text-xs text-stone-500">
                  One winner or group per cycle. Each slot’s total = (payout ÷ cycles).
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Payout per cycle (birr)
                </label>
                <input
                  type="number"
                  min={0}
                  className="input-field"
                  value={form.payoutPerCycle}
                  onChange={(e) => setForm({ ...form, payoutPerCycle: e.target.value })}
                  placeholder="e.g. 10000"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Min per person (birr)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="input-field"
                    value={form.minContributionPerPerson}
                    onChange={(e) => setForm({ ...form, minContributionPerPerson: e.target.value })}
                    placeholder="e.g. 500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Max per person (birr)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="input-field"
                    value={form.maxContributionPerPerson}
                    onChange={(e) => setForm({ ...form, maxContributionPerPerson: e.target.value })}
                    placeholder="e.g. 1000"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Start date
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Visibility
                </label>
                <div className="mt-2 flex gap-6">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="visibility"
                      checked={form.visibility === "private"}
                      onChange={() =>
                        setForm({ ...form, visibility: "private" })
                      }
                      className="text-primary-600"
                    />
                    <span className="text-sm">Private</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="visibility"
                      checked={form.visibility === "public"}
                      onChange={() =>
                        setForm({ ...form, visibility: "public" })
                      }
                      className="text-primary-600"
                    />
                    <span className="text-sm">Public</span>
                  </label>
                </div>
                <p className="mt-1.5 text-xs text-stone-500">
                  Private: only you and members see it; only you can add
                  members. Public: anyone can see and ask to join.
                </p>
              </div>
              <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
                <button
                  type="button"
                  className="btn-secondary px-5"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-5">
                  Create group
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {editGroup && (
        <div className="modal-backdrop">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="modal-panel">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Edit Ekub</h2>
              <button
                className="text-sm text-stone-500"
                onClick={() => setEditGroup(null)}
              >
                Close
              </button>
            </div>
            <form className="space-y-3" onSubmit={handleUpdateEkub}>
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Frequency</label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={editForm.contributionFrequency}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      contributionFrequency: e.target.value,
                    })
                  }
                  disabled={editGroup.status !== "draft"}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                {editGroup.status !== "draft" && (
                  <p className="text-xs text-stone-500 mt-0.5">
                    Cannot change after Ekub has started
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm mb-1">Number of cycles (slots)</label>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={editForm.numberOfCycles}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      numberOfCycles: e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  disabled={editGroup.status !== "draft"}
                  placeholder="e.g. 10"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Payout per cycle (birr)</label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={editForm.payoutPerCycle}
                  onChange={(e) => setEditForm({ ...editForm, payoutPerCycle: e.target.value })}
                  disabled={editGroup.status !== "draft"}
                  placeholder="e.g. 10000"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm mb-1">Min per person (birr)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={editForm.minContributionPerPerson}
                    onChange={(e) => setEditForm({ ...editForm, minContributionPerPerson: e.target.value })}
                    disabled={editGroup.status !== "draft"}
                    placeholder="500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Max per person (birr)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={editForm.maxContributionPerPerson}
                    onChange={(e) => setEditForm({ ...editForm, maxContributionPerPerson: e.target.value })}
                    disabled={editGroup.status !== "draft"}
                    placeholder="1000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Start date</label>
                <input
                  type="date"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={editForm.startDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, startDate: e.target.value })
                  }
                  disabled={editGroup.status !== "draft"}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Visibility</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editVisibility"
                      checked={editForm.visibility === "private"}
                      onChange={() =>
                        setEditForm({ ...editForm, visibility: "private" })
                      }
                      className="text-primary-600"
                    />
                    <span className="text-sm">Private</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editVisibility"
                      checked={editForm.visibility === "public"}
                      onChange={() =>
                        setEditForm({ ...editForm, visibility: "public" })
                      }
                      className="text-primary-600"
                    />
                    <span className="text-sm">Public</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-md border px-3 py-1.5 text-sm"
                  onClick={() => setEditGroup(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {savingEdit ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {manageGroup && (
        <div className="modal-backdrop">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="modal-panel-lg max-h-[90vh]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">{manageGroup.name}</h2>
              <button
                className="text-sm text-stone-500 hover:text-stone-700"
                onClick={() => {
                  setManageGroup(null);
                  setManageDetail(null);
                  setAddMemberEmail("");
                  setAddMemberAmount("");
                  setAddMemberError("");
                }}
              >
                Close
              </button>
            </div>
            {manageDetail ? (
              <>
                <p className="text-sm text-stone-600 capitalize">
                  {manageDetail.contributionFrequency} · started{" "}
                  {manageDetail.startDate
                    ? new Date(manageDetail.startDate).toLocaleDateString()
                    : "—"}
                </p>
                <div className="mt-3 flex gap-4 text-sm">
                  <span className="font-medium">
                    {manageDetail.contributorCount ??
                      manageDetail.members?.length ??
                      0}{" "}
                    contributor(s)
                  </span>
                  <span className="font-medium">
                    {manageDetail.totalSum ?? 0} birr total
                  </span>
                </div>
                {/* Pending join requests – show first so creator sees them */}
                {((manageDetail.members || []).filter((m) => (m.status || "active") === "pending").length > 0 || manageDetail.visibility === "public") && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm font-medium mb-2">Join requests (approve or dismiss)</p>
                    <ul className="border rounded-lg divide-y">
                      {(manageDetail.members || []).filter((m) => (m.status || "active") === "pending").map((m) => {
                        const memberId = (m.user?._id || m.user)?.toString();
                        return (
                          <li
                            key={m._id}
                            className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-sm"
                          >
                            <span>{m.user?.fullName || m.user?.email || "—"}</span>
                            <span className="font-medium">{m.amount != null ? `${m.amount} birr` : "—"}</span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={processingPendingId === memberId}
                                className="rounded-md bg-primary-600 px-2 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                                onClick={() => handleApprovePending(memberId)}
                              >
                                {processingPendingId === memberId ? "…" : "Approve"}
                              </button>
                              <button
                                type="button"
                                disabled={processingPendingId === memberId}
                                className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                                onClick={() => handleRejectPending(memberId)}
                              >
                                Dismiss
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {(manageDetail.members || []).filter((m) => (m.status || "active") === "pending").length === 0 && (
                      <p className="text-sm text-stone-500 py-2">No pending requests.</p>
                    )}
                  </div>
                )}
                <p className="text-sm font-medium mt-4">Members</p>
                <ul className="mt-1 border rounded-lg divide-y max-h-40 overflow-y-auto">
                  {(manageDetail.members || []).filter((m) => (m.status || "active") === "active").map((m, i) => {
                    const memberUserId = (m.user?._id || m.user)?.toString();
                    const isAdminMember = manageDetail.admin && (manageDetail.admin._id || manageDetail.admin).toString() === memberUserId;
                    return (
                      <li
                        key={m._id || i}
                        className="px-3 py-2 flex justify-between items-center gap-2 text-sm"
                      >
                        <span>{m.name || m.user?.fullName || m.user?.email || "—"}</span>
                        <span className="font-medium">
                          {m.amount != null ? `${m.amount} birr` : "—"}
                        </span>
                        {!isAdminMember && manageDetail.isAdmin && (
                          <button
                            type="button"
                            className="text-xs text-red-600 hover:underline disabled:opacity-50 shrink-0"
                            onClick={() => handleRemoveMember(memberUserId)}
                            disabled={removingMemberId === memberUserId}
                          >
                            {removingMemberId === memberUserId ? "…" : "Remove"}
                          </button>
                        )}
                      </li>
                    );
                  })}
                  {(manageDetail.members || []).filter((m) => (m.status || "active") === "active").length === 0 && (
                    <li className="px-3 py-4 text-sm text-stone-500">
                      No members yet. Add one below or approve join requests above.
                    </li>
                  )}
                </ul>
                {manageDetail.status === "draft" &&
                  (manageDetail.members || []).filter((m) => m.user && m.status === "active").length >= 1 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-stone-600 mb-2">
                        When all members are added, start the Ekub and set who gets payout in which order (you can group members into one slot so they win together).
                      </p>
                      <button
                        type="button"
                        className="rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
                        onClick={() => setShowStartEkubModal(true)}
                      >
                        Start Ekub (set payout order)
                      </button>
                    </div>
                  )}
                <form className="mt-4 pt-4 border-t" onSubmit={handleAddMember}>
                  <p className="text-sm font-medium mb-2">
                    Add member (must have an Ekub account)
                  </p>
                  {addMemberError && (
                    <p className="text-sm text-red-600 mb-2">
                      {addMemberError}
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <input
                      type="email"
                      className="rounded-md border px-3 py-2 text-sm flex-1 min-w-[140px]"
                      placeholder="Member's email"
                      value={addMemberEmail}
                      onChange={(e) => {
                        setAddMemberEmail(e.target.value);
                        setAddMemberError("");
                      }}
                      required
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="rounded-md border px-3 py-2 text-sm w-24"
                      placeholder="Amount"
                      value={addMemberAmount}
                      onChange={(e) => setAddMemberAmount(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      disabled={addingMember}
                      className="rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                    >
                      {addingMember ? "Adding…" : "Add"}
                    </button>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    They will get a notification and be linked to this Ekub.
                  </p>
                </form>
              </>
            ) : (
              <p className="text-sm text-stone-500">Loading…</p>
            )}
            </div>
          </div>
        </div>
      )}

      {showStartEkubModal && manageGroup && manageDetail && (
        <div className="modal-backdrop z-[100]">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="modal-panel border-2 border-primary-100">
            <h3 className="text-lg font-bold text-stone-800 mb-2">
              Start Ekub – {manageDetail.name}
            </h3>
            <p className="text-sm text-stone-600 mb-4">
              Assign each member to a payout slot. Members in the <strong>same slot</strong> win together and split the payout (e.g. two people paying 500 each in one slot → when that slot wins, they share the payout).
            </p>
            {manageDetail.numberOfCycles && (
              <p className="text-sm text-primary-700 mb-2">
                This Ekub has <strong>{manageDetail.numberOfCycles} cycles</strong>. You need exactly <strong>{manageDetail.numberOfCycles} slots</strong>.{" "}
                {manageDetail.payoutPerCycle
                  ? `Each slot’s total contribution must equal ${Math.round(manageDetail.payoutPerCycle / manageDetail.numberOfCycles)} birr (payout ÷ cycles). Group members so each slot adds up to that.`
                  : "Each slot can be one person or a group."}
              </p>
            )}
            {startEkubError && (
              <p className="text-sm text-red-600 mb-2">{startEkubError}</p>
            )}
            <form onSubmit={handleStartEkub}>
              <ul className="space-y-2 mb-4">
                {(manageDetail.members || [])
                  .filter((m) => m.user && m.status === "active")
                  .map((m, i) => {
                    const id = (m.user?._id || m.user).toString();
                    const slot = startEkubSlots[id] ?? i + 1;
                    const slotCount = (manageDetail.members || []).filter((x) => x.user && x.status === "active").length;
                    return (
                      <li key={id} className="flex items-center justify-between gap-2 text-sm">
                        <span>
                          {m.name || m.user?.fullName || "—"} ({m.amount != null ? `${m.amount} birr` : "—"})
                        </span>
                        <label className="flex items-center gap-1">
                          Slot
                          <select
                            className="border rounded px-2 py-1 text-sm"
                            value={slot}
                            onChange={(e) =>
                              setStartEkubSlots((prev) => ({ ...prev, [id]: Number(e.target.value) }))
                            }
                          >
                            {Array.from({ length: slotCount }, (_, j) => j + 1).map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </label>
                      </li>
                    );
                  })}
              </ul>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border px-3 py-1.5 text-sm"
                  onClick={() => setShowStartEkubModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={startingEkub}
                  className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {startingEkub ? "Starting…" : "Start Ekub"}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {payEkubGroup && (
        <div
          className="modal-backdrop z-[100]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pay-ekub-title"
        >
          <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="modal-panel-lg max-h-[90vh] border-2 border-primary-100 shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                id="pay-ekub-title"
                className="text-xl font-bold text-stone-800"
              >
                Pay Ekub – {payEkubGroup.name}
              </h2>
              <button
                type="button"
                className="text-stone-500 hover:text-stone-800 text-lg font-medium px-2 py-1 rounded hover:bg-stone-100"
                onClick={() => {
                  setPayEkubGroup(null);
                  setPayEkubError(null);
                }}
                aria-label="Close"
              >
                Close
              </button>
            </div>
            <p className="text-sm text-stone-600 mb-3">
              Your amount per cycle was set when you joined. Choose which cycle (month) you are paying for, then click Pay. Your status for that cycle will be marked paid and you will get a confirmation.
            </p>
            {payEkubError && (
              <p className="text-sm text-red-600 mb-3 font-medium">
                {payEkubError}
              </p>
            )}
            {loadingMyContributions ? (
              <p className="text-sm text-stone-500 py-4">Loading…</p>
            ) : (() => {
              const contributions = myContributions || [];
              const unpaid = contributions.filter(
                (c) => c.status !== "paid"
              );
              if (contributions.length === 0) {
                return (
                  <p className="text-sm text-stone-500 py-4">
                    {myContributionsCreatorOnly
                      ? "You're the creator of this Ekub. To pay as a participant, the creator must add you as a member with a contribution amount first."
                      : "You have no contribution records for this Ekub yet. Contact the manager if you should be able to pay."}
                  </p>
                );
              }
              if (unpaid.length === 0) {
                return (
                  <p className="text-sm text-stone-500 py-4">
                    No unpaid cycles for this Ekub. You're all set.
                  </p>
                );
              }
              const selected = unpaid.find((c) => c._id === selectedPayContributionId) || unpaid[0];
              const dueDate = selected.dueDate ? new Date(selected.dueDate) : null;
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);
              const dueStart = dueDate
                ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
                : null;
              const canPayNow = !dueStart || todayStart.getTime() >= dueStart.getTime();
              return (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Choose cycle (month) to pay
                    </label>
                    <select
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm bg-white"
                      value={selectedPayContributionId || selected._id}
                      onChange={(e) => setSelectedPayContributionId(e.target.value)}
                    >
                      {unpaid.map((c) => (
                        <option key={c._id} value={c._id}>
                          {payCycleLabel(c.cycleNumber, payEkubGroup)} — {c.amount} birr
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50/50 px-4 py-3">
                    <div className="text-sm">
                      <span className="text-stone-700 font-medium">{payCycleLabel(selected.cycleNumber, payEkubGroup)}</span>
                      <span className="text-stone-600"> · {selected.amount} birr</span>
                      {dueStart && (
                        <p className="text-stone-500 text-xs mt-0.5">
                          {canPayNow
                            ? `Payable from ${dueStart.toLocaleDateString()} (you can pay now)`
                            : `You can pay from ${dueStart.toLocaleDateString()} onward`}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 shadow"
                      disabled={confirmingContributionId === selected._id || !canPayNow}
                      onClick={() => handleSelfConfirmPayment(selected._id)}
                      title={!canPayNow ? `Payment opens on ${dueStart ? dueStart.toLocaleDateString() : "the due date"}` : undefined}
                    >
                      {confirmingContributionId === selected._id ? "…" : "Pay"}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
          </div>
        </div>
      )}

      {winnersGroup && (
        <div className="modal-backdrop">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="modal-panel-2xl max-h-[80vh]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">
                Who won – {winnersGroup.name}
              </h2>
              <button
                className="text-sm text-stone-500 hover:text-stone-700"
                onClick={() => {
                  setWinnersGroup(null);
                  setWinnersData(null);
                  setWinnersError(null);
                }}
              >
                Close
              </button>
            </div>
            {winnersError && (
              <p className="text-sm text-red-600 mb-2">{winnersError}</p>
            )}
            {loadingWinners ? (
              <p className="text-sm text-stone-500">Loading…</p>
            ) : winnersData ? (
              winnersData.winners?.length === 0 ? (
                <p className="text-sm text-stone-500">No payouts yet. Choose a winner for the current cycle first.</p>
              ) : (
                <table className="w-full text-xs border">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="border px-2 py-1 text-left">Cycle</th>
                      <th className="border px-2 py-1 text-left">Winner</th>
                      <th className="border px-2 py-1 text-right">Amount</th>
                      <th className="border px-2 py-1 text-left">Status</th>
                      <th className="border px-2 py-1 text-left">Paid at</th>
                      {winnersGroup.isAdmin && <th className="border px-2 py-1 text-left">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {winnersData.winners.map((w, i) => {
                      const isPaid = w.status === "paid";
                      const currentCycle = (winnersData.currentCycleIndex ?? 0) + 1;
                      const isNextToPay = winnersGroup.isAdmin && !isPaid && w.cycleNumber === currentCycle;
                      return (
                        <tr key={`${w.cycleNumber}-${i}`}>
                          <td className="border px-2 py-1">{w.cycleNumber}</td>
                          <td className="border px-2 py-1">{w.memberName}</td>
                          <td className="border px-2 py-1 text-right">{w.amount} birr</td>
                          <td className="border px-2 py-1">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isPaid ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                              {isPaid ? "Paid" : "Pending"}
                            </span>
                          </td>
                          <td className="border px-2 py-1">
                            {w.paidAt ? new Date(w.paidAt).toLocaleDateString() : "—"}
                          </td>
                          {winnersGroup.isAdmin && (
                            <td className="border px-2 py-1">
                              {isNextToPay ? (
                                <button
                                  type="button"
                                  className="rounded bg-primary-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                                  disabled={payingWinnerCycle === w.cycleNumber}
                                  onClick={() => handlePayWinner(w.cycleNumber)}
                                >
                                  {payingWinnerCycle === w.cycleNumber ? "…" : "Pay winner"}
                                </button>
                              ) : (
                                "—"
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : (
              <p className="text-sm text-stone-500">Could not load winners.</p>
            )}
            </div>
          </div>
        </div>
      )}

      {trackingGroup && (
        <div className="modal-backdrop">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="modal-panel-wide max-h-[90vh]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">
                Payment tracking – {trackingGroup.name}
              </h2>
              <button
                className="text-sm text-stone-500 hover:text-stone-700"
                onClick={() => {
                  setTrackingGroup(null);
                  setTrackingData(null);
                }}
              >
                Close
              </button>
            </div>
            {loadingTracking ? (
              <p className="text-sm text-stone-500">Loading…</p>
            ) : trackingData ? (
              (() => {
                const group = trackingData.group || {};
                const fromData = [
                  ...new Set(
                    [
                      ...(trackingData.contributions || []).map(
                        (c) => c.cycleNumber
                      ),
                      ...(trackingData.payoutsReceived || []).map(
                        (p) => p.cycleNumber
                      ),
                      ...(trackingData.payoutsPending || []).map(
                        (p) => p.cycleNumber
                      ),
                    ].filter(Boolean)
                  ),
                ].sort((a, b) => a - b);
                const memberCount = group.memberCount ?? 0;
                const allCycles =
                  fromData.length > 0
                    ? fromData
                    : memberCount > 0
                    ? Array.from({ length: memberCount }, (_, i) => i + 1)
                    : [];
                const cycleOptions = allCycles
                  .map((n) => {
                    const d = getCycleDate(group, n);
                    return d
                      ? {
                          cycleNumber: n,
                          date: d,
                          year: d.getFullYear(),
                          month: d.getMonth(),
                        }
                      : { cycleNumber: n, date: null, year: null, month: null };
                  })
                  .filter((c) => c.year != null);
                const freq = group.contributionFrequency;
                const isMonthly = freq === "monthly";
                const isWeekly = freq === "weekly";
                let effectiveCycleFilter = null;
                if (isMonthly && cycleYear !== "" && cycleMonth !== "") {
                  const match = cycleOptions.find(
                    (c) =>
                      c.year === Number(cycleYear) &&
                      c.month === Number(cycleMonth)
                  );
                  effectiveCycleFilter = match ? match.cycleNumber : null;
                } else if (isWeekly && cycleWeek !== "") {
                  effectiveCycleFilter = Number(cycleWeek);
                } else if (!isMonthly && !isWeekly) {
                  effectiveCycleFilter = cycleFilter;
                }
                const years = [
                  ...new Set(cycleOptions.map((c) => c.year)),
                ].sort((a, b) => a - b);
                const weeksInMonth =
                  isWeekly && cycleYear !== "" && cycleMonth !== ""
                    ? cycleOptions.filter(
                        (c) =>
                          c.year === Number(cycleYear) &&
                          c.month === Number(cycleMonth)
                      )
                    : [];
                const membersList = trackingData.members || [];
                const effectiveCycleForContributions =
                  effectiveCycleFilter ?? allCycles[0] ?? null;
                const contributionsForView = (
                  trackingData.contributions || []
                ).filter(
                  (c) =>
                    effectiveCycleForContributions != null &&
                    c.cycleNumber === effectiveCycleForContributions
                );
                const contributionRows =
                  membersList.length > 0 && effectiveCycleForContributions != null
                    ? membersList.map((member) => {
                        const contrib = contributionsForView.find(
                          (c) =>
                            String(c.member?._id || c.member) ===
                            String(member._id)
                        );
                        const cycleDate = getCycleDate(
                          group,
                          effectiveCycleForContributions
                        );
                        return (
                          contrib || {
                            _id: `placeholder-${member._id}-${effectiveCycleForContributions}`,
                            memberName:
                              member.fullName || member.email || "—",
                            member: { _id: member._id },
                            cycleNumber: effectiveCycleForContributions,
                            amount: member.amount ?? 0,
                            status: "pending",
                            dueDate: cycleDate
                              ? cycleDate.toISOString?.()
                              : null,
                            paidAt: null,
                          }
                        );
                      })
                    : [];
                const paidForView = contributionRows.filter(
                  (c) => c.status === "paid"
                );
                const unpaidForView = contributionRows.filter(
                  (c) => c.status !== "paid"
                );
                const cyclePaidTotal = paidForView.reduce(
                  (s, c) => s + c.amount,
                  0
                );
                const cycleUnpaidTotal = unpaidForView.reduce(
                  (s, c) => s + c.amount,
                  0
                );
                const contributionsFiltered =
                  contributionFilter === "all"
                    ? contributionRows
                    : contributionFilter === "paid"
                    ? paidForView
                    : unpaidForView;
                const payoutsReceivedFiltered = (
                  trackingData.payoutsReceived || []
                ).filter(
                  (p) =>
                    effectiveCycleFilter == null ||
                    p.cycleNumber === effectiveCycleFilter
                );
                const payoutsPendingFiltered = (
                  trackingData.payoutsPending || []
                ).filter(
                  (p) =>
                    effectiveCycleFilter == null ||
                    p.cycleNumber === effectiveCycleFilter
                );
                const MONTH_NAMES = [
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "May",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sep",
                  "Oct",
                  "Nov",
                  "Dec",
                ];
                return (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-3 pb-2 border-b">
                      <span className="text-sm font-medium">Cycle:</span>
                      {allCycles.length === 0 ? (
                        <span className="text-xs text-stone-500">
                          No cycles yet. Add members and start the Ekub (set
                          payout order) to create cycles.
                        </span>
                      ) : isMonthly ? (
                        <>
                          <select
                            className="text-sm border rounded px-2 py-1.5 bg-white"
                            value={cycleYear}
                            onChange={(e) => {
                              setCycleYear(e.target.value);
                              setCycleMonth("");
                            }}
                          >
                            <option value="">All cycles</option>
                            {years.map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </select>
                          <select
                            className="text-sm border rounded px-2 py-1.5 bg-white"
                            value={cycleMonth}
                            onChange={(e) => setCycleMonth(e.target.value)}
                            disabled={cycleYear === ""}
                          >
                            <option value="">Select month</option>
                            {cycleYear !== ""
                              ? [
                                  ...new Set(
                                    cycleOptions
                                      .filter(
                                        (c) => c.year === Number(cycleYear)
                                      )
                                      .map((c) => c.month)
                                  ),
                                ]
                                  .sort((a, b) => a - b)
                                  .map((m) => (
                                    <option key={m} value={m}>
                                      {MONTH_NAMES[m]}
                                    </option>
                                  ))
                              : null}
                          </select>
                        </>
                      ) : isWeekly ? (
                        <>
                          <select
                            className="text-sm border rounded px-2 py-1.5 bg-white"
                            value={cycleYear}
                            onChange={(e) => {
                              setCycleYear(e.target.value);
                              setCycleMonth("");
                              setCycleWeek("");
                            }}
                          >
                            <option value="">All cycles</option>
                            {years.map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </select>
                          <select
                            className="text-sm border rounded px-2 py-1.5 bg-white"
                            value={cycleMonth}
                            onChange={(e) => {
                              setCycleMonth(e.target.value);
                              setCycleWeek("");
                            }}
                            disabled={cycleYear === ""}
                          >
                            <option value="">Select month</option>
                            {cycleYear !== ""
                              ? [
                                  ...new Set(
                                    cycleOptions
                                      .filter(
                                        (c) => c.year === Number(cycleYear)
                                      )
                                      .map((c) => c.month)
                                  ),
                                ]
                                  .sort((a, b) => a - b)
                                  .map((m) => (
                                    <option key={m} value={m}>
                                      {MONTH_NAMES[m]}
                                    </option>
                                  ))
                              : null}
                          </select>
                          <select
                            className="text-sm border rounded px-2 py-1.5 bg-white"
                            value={cycleWeek}
                            onChange={(e) => setCycleWeek(e.target.value)}
                            disabled={cycleYear === "" || cycleMonth === ""}
                          >
                            <option value="">Select week</option>
                            {weeksInMonth.map((w) => (
                              <option key={w.cycleNumber} value={w.cycleNumber}>
                                Week of {w.date.toLocaleDateString()}
                              </option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <select
                          className="text-sm border rounded px-2 py-1.5 bg-white"
                          value={cycleFilter ?? ""}
                          onChange={(e) =>
                            setCycleFilter(
                              e.target.value === ""
                                ? null
                                : Number(e.target.value)
                            )
                          }
                        >
                          <option value="">All cycles</option>
                          {allCycles.map((n) => (
                            <option key={n} value={n}>
                              {formatCycleLabel(n, group)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    {trackingData.isAdmin && (
                      <section className="pb-4 border-b">
                        <h3 className="text-sm font-semibold mb-2">
                          Choose winner for current cycle
                        </h3>
                        <p className="text-xs text-stone-600 mb-2">
                          Randomly pick a winner from members who have not
                          already won. All members will be notified.
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                            onClick={handleChooseWinner}
                            disabled={choosingWinner}
                          >
                            {choosingWinner
                              ? "Choosing…"
                              : "Choose winner (random)"}
                          </button>
                          {chosenWinner?.winner && (
                            <span className="text-sm text-green-700 font-medium">
                              {chosenWinner.winner.label ?? chosenWinner.winner.fullName} was chosen for
                              cycle {chosenWinner.cycleNumber}. All members
                              notified.
                            </span>
                          )}
                          {chosenWinner?.error && (
                            <span className="text-sm text-red-600">
                              {chosenWinner.error}
                            </span>
                          )}
                        </div>
                      </section>
                    )}
                    <section>
                      <h3 className="text-sm font-semibold mb-2">
                        Contributions
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 mb-2">
                        {effectiveCycleForContributions != null && (
                          <span className="text-sm font-medium text-stone-700">
                            Cycle:{" "}
                            {formatCycleLabel(
                              effectiveCycleForContributions,
                              group
                            )}
                          </span>
                        )}
                        <span className="text-sm">
                          Total paid:{" "}
                          <strong>{cyclePaidTotal} birr</strong> (
                          {paidForView.length})
                        </span>
                        <span className="text-sm">
                          Total unpaid:{" "}
                          <strong>{cycleUnpaidTotal} birr</strong> (
                          {unpaidForView.length})
                        </span>
                        <select
                          className="text-sm border rounded px-2 py-1"
                          value={contributionFilter}
                          onChange={(e) =>
                            setContributionFilter(e.target.value)
                          }
                        >
                          <option value="all">All</option>
                          <option value="paid">Paid only</option>
                          <option value="unpaid">Unpaid only</option>
                        </select>
                      </div>
                      <div className="border rounded overflow-x-auto max-h-48 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-stone-50 sticky top-0">
                            <tr>
                              <th className="border px-2 py-1 text-left">
                                Member
                              </th>
                              <th className="border px-2 py-1 text-right">
                                Amount
                              </th>
                              <th className="border px-2 py-1 text-left">
                                Due date
                              </th>
                              <th className="border px-2 py-1 text-left">
                                Status
                              </th>
                              <th className="border px-2 py-1 text-left">
                                Paid at
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {contributionsFiltered.map((c) => (
                              <tr key={c._id}>
                                <td className="border px-2 py-1">
                                  {c.memberName ?? "—"}
                                </td>
                                <td className="border px-2 py-1 text-right">
                                  {c.amount} birr
                                </td>
                                <td className="border px-2 py-1">
                                  {c.dueDate
                                    ? new Date(c.dueDate).toLocaleDateString()
                                    : "—"}
                                </td>
                                <td className="border px-2 py-1">
                                  {trackingData.isAdmin &&
                                  !String(c._id).startsWith("placeholder-") ? (
                                    <select
                                      className="text-xs border rounded px-1 py-0.5 bg-white capitalize"
                                      value={
                                        c.status === "paid" ? "paid" : "unpaid"
                                      }
                                      disabled={
                                        updatingContributionId === c._id
                                      }
                                      onChange={(e) =>
                                        handleContributionStatusChange(
                                          c._id,
                                          e.target.value === "paid"
                                            ? "paid"
                                            : "pending"
                                        )
                                      }
                                    >
                                      <option value="paid">Paid</option>
                                      <option value="unpaid">Unpaid</option>
                                    </select>
                                  ) : (
                                    <span className="capitalize">
                                      {c.status}
                                    </span>
                                  )}
                                </td>
                                <td className="border px-2 py-1">
                                  {c.paidAt
                                    ? new Date(c.paidAt).toLocaleString()
                                    : "—"}
                                </td>
                              </tr>
                            ))}
                            {contributionsFiltered.length === 0 && (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="border px-2 py-3 text-stone-500 text-center"
                                >
                                  {allCycles.length === 0
                                    ? "No members or cycles yet"
                                    : membersList.length === 0
                                    ? "No members yet"
                                    : "Select a cycle above to see who paid"}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>
                    <section>
                      <h3 className="text-sm font-semibold mb-2">
                        Payouts – Who received vs who hasn’t
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-green-700 mb-1">
                            Already received
                          </p>
                          <div className="border rounded overflow-x-auto max-h-40 overflow-y-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-stone-50">
                                <tr>
                                  <th className="border px-2 py-1 text-left">
                                    Cycle
                                  </th>
                                  <th className="border px-2 py-1 text-left">
                                    Member
                                  </th>
                                  <th className="border px-2 py-1 text-right">
                                    Amount
                                  </th>
                                  <th className="border px-2 py-1 text-left">
                                    Paid at
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {payoutsReceivedFiltered.map((p, i) => (
                                  <tr key={`r-${p.cycleNumber}-${i}`}>
                                    <td className="border px-2 py-1">
                                      {p.cycleNumber}
                                    </td>
                                    <td className="border px-2 py-1">
                                      {p.memberName}
                                    </td>
                                    <td className="border px-2 py-1 text-right">
                                      {p.amount} birr
                                    </td>
                                    <td className="border px-2 py-1">
                                      {p.paidAt
                                        ? new Date(
                                            p.paidAt
                                          ).toLocaleDateString()
                                        : "—"}
                                    </td>
                                  </tr>
                                ))}
                                {payoutsReceivedFiltered.length === 0 && (
                                  <tr>
                                    <td
                                      colSpan={4}
                                      className="border px-2 py-2 text-stone-500 text-center"
                                    >
                                      None yet
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-amber-700 mb-1">
                            Not yet received
                          </p>
                          <div className="border rounded overflow-x-auto max-h-40 overflow-y-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-stone-50">
                                <tr>
                                  <th className="border px-2 py-1 text-left">
                                    Cycle
                                  </th>
                                  <th className="border px-2 py-1 text-left">
                                    Member
                                  </th>
                                  <th className="border px-2 py-1 text-right">
                                    Amount
                                  </th>
                                  <th className="border px-2 py-1 text-left">
                                    Status
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {payoutsPendingFiltered.map((p, i) => (
                                  <tr key={`p-${p.cycleNumber}-${i}`}>
                                    <td className="border px-2 py-1">
                                      {p.cycleNumber}
                                    </td>
                                    <td className="border px-2 py-1">
                                      {p.memberName}
                                    </td>
                                    <td className="border px-2 py-1 text-right">
                                      {p.amount} birr
                                    </td>
                                    <td className="border px-2 py-1 capitalize">
                                      {p.status}
                                    </td>
                                  </tr>
                                ))}
                                {payoutsPendingFiltered.length === 0 && (
                                  <tr>
                                    <td
                                      colSpan={4}
                                      className="border px-2 py-2 text-stone-500 text-center"
                                    >
                                      None (all received or no payouts yet)
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-stone-500">
                Could not load payment tracking.
              </p>
            )}
            </div>
          </div>
        </div>
      )}

      {scheduleGroup && (loadingSchedule || schedule !== null) && (
        <div className="modal-backdrop">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="modal-panel-2xl max-h-[80vh]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">
                Payout schedule – {scheduleGroup.name}
              </h2>
              <button
                className="text-sm text-stone-500"
                onClick={() => {
                  setScheduleGroup(null);
                  setSchedule(null);
                }}
              >
                Close
              </button>
            </div>
            {loadingSchedule || !schedule ? (
              <p className="text-sm">Loading schedule…</p>
            ) : (
              <table className="w-full text-xs border">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="border px-2 py-1 text-left">Cycle</th>
                    <th className="border px-2 py-1 text-left">Receiver</th>
                    <th className="border px-2 py-1 text-left">Pool</th>
                    <th className="border px-2 py-1 text-left">Status</th>
                    <th className="border px-2 py-1 text-left">All paid?</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.schedule.map((row) => (
                    <tr key={row.cycleNumber}>
                      <td className="border px-2 py-1">{row.cycleNumber}</td>
                      <td className="border px-2 py-1">
                        {row.receiverNames ?? row.receiver?.fullName ?? "—"}
                      </td>
                      <td className="border px-2 py-1">{row.totalPool}</td>
                      <td className="border px-2 py-1 capitalize">
                        {row.status}
                      </td>
                      <td className="border px-2 py-1">
                        {row.allPaid ? "Yes" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PublicEkubsPage() {
  const [publicGroups, setPublicGroups] = useState([]);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [joinModalGroup, setJoinModalGroup] = useState(null);
  const [joinAmount, setJoinAmount] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [joinError, setJoinError] = useState("");
  const [submittingJoin, setSubmittingJoin] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState(null);

  async function loadPublic() {
    setLoadingPublic(true);
    try {
      const res = await api.get("/groups/public");
      setPublicGroups(res.data);
    } catch {
      setPublicGroups([]);
    } finally {
      setLoadingPublic(false);
    }
  }

  useEffect(() => {
    loadPublic();
  }, []);

  function openJoinModal(g) {
    setJoinModalGroup(g);
    setJoinAmount("");
    setJoinMessage("");
    setJoinError("");
  }

  async function handleSubmitJoinRequest(e) {
    e.preventDefault();
    if (!joinModalGroup || joinAmount === "" || Number(joinAmount) < 0) return;
    setJoinError("");
    setSubmittingJoin(true);
    try {
      await api.post(`/groups/${joinModalGroup._id}/join`, {
        amount: Number(joinAmount),
      });
      setJoinModalGroup(null);
      loadPublic();
    } catch (err) {
      setJoinError(err.response?.data?.message || "Request failed.");
    } finally {
      setSubmittingJoin(false);
    }
  }

  async function handleWithdrawRequest(groupId) {
    setWithdrawingId(groupId);
    try {
      await api.post(`/groups/${groupId}/withdraw-request`);
      loadPublic();
    } finally {
      setWithdrawingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-stone-900 sm:text-4xl">Public Ekubs</h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Browse open groups. Request to join with your contribution amount — the creator approves before you are added.
        </p>
      </div>
      {loadingPublic ? (
        <div className="flex items-center gap-3 text-stone-500">
          <span
            className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600"
            aria-hidden
          />
          Loading…
        </div>
      ) : publicGroups.length === 0 ? (
        <div className="card-surface border-dashed p-10 text-center text-stone-600">
          No public Ekubs right now. Check back later or create your own from the dashboard.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {publicGroups.map((g) => (
            <div
              key={g._id}
              className="card-surface p-6 transition hover:border-primary-200 hover:shadow-elevated"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-lg text-stone-900">{g.name}</p>
                <span className="shrink-0 rounded-full bg-primary-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-800">
                  public
                </span>
              </div>
              <p className="mt-2 text-xs capitalize text-stone-500">
                {g.contributionFrequency} · from{" "}
                {g.startDate
                  ? new Date(g.startDate).toLocaleDateString()
                  : "—"}
              </p>
              <p className="mt-4 text-sm text-stone-700">
                <span className="font-semibold">{g.contributorCount ?? 0}</span>{" "}
                contributors ·{" "}
                <span className="font-semibold text-primary-800">{g.totalSum ?? 0} birr</span>
              </p>
              <div className="mt-5">
                {g.isMember ? (
                  <span className="text-sm font-medium text-stone-500">
                    You are a member
                  </span>
                ) : g.isPending ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-amber-700">
                      Request pending
                    </span>
                    <button
                      type="button"
                      className="text-sm font-semibold text-stone-600 underline decoration-stone-300 underline-offset-2 hover:text-stone-900 disabled:opacity-50"
                      onClick={() => handleWithdrawRequest(g._id)}
                      disabled={withdrawingId === g._id}
                    >
                      {withdrawingId === g._id ? "Withdrawing…" : "Withdraw request"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-primary w-full sm:w-auto"
                    onClick={() => openJoinModal(g)}
                  >
                    Ask to join
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {joinModalGroup && (
        <div className="modal-backdrop">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="modal-panel">
            <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="font-display text-xl text-stone-900">
                Join {joinModalGroup.name}
              </h2>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                onClick={() => {
                  setJoinModalGroup(null);
                  setJoinError("");
                }}
              >
                Close
              </button>
            </div>
            <p className="mb-4 text-sm text-stone-600">
              Enter your contribution amount (birr). The creator will review and approve your request.
            </p>
            <form onSubmit={handleSubmitJoinRequest} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Amount (birr) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="input-field"
                  value={joinAmount}
                  onChange={(e) => {
                    setJoinAmount(e.target.value);
                    setJoinError("");
                  }}
                  placeholder="e.g. 1000"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Message to creator (optional)
                </label>
                <textarea
                  className="input-field min-h-[72px] resize-y"
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  placeholder="Introduce yourself or add a note..."
                />
              </div>
              {joinError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {joinError}
                </p>
              )}
              <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setJoinModalGroup(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingJoin}
                  className="btn-primary disabled:opacity-60"
                >
                  {submittingJoin ? "Sending…" : "Send request"}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      const { error } = await authClient.signOut();
      if (error) {
        setLogoutError(error.message || "Could not log out. Please try again.");
        return;
      }

      await authClient.getSession();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      setLogoutError("Could not log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-100">
        <span
          className="h-12 w-12 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600"
          aria-hidden
        />
        <p className="text-sm font-medium text-stone-500">Loading…</p>
      </div>
    );
  }

  return (
    <>
      {logoutError && (
        <div className="fixed inset-x-0 top-3 z-50 mx-auto w-full max-w-md px-4">
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 shadow-sm">
            {logoutError}
          </p>
        </div>
      )}
      <Layout user={user} onLogout={handleLogout}>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LandingPage />
            )
          }
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/dashboard" replace /> : <SignupPage />}
        />
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups"
          element={
            <ProtectedRoute user={user}>
              <PublicEkubsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      </Layout>
    </>
  );
}
