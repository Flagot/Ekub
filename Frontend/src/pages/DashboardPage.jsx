import { useEffect, useState } from "react";
import { authClient } from "../lib/authClient";
import { groupClient } from "../lib/groupClient";

const DashboardPage = () => {
  const [state, setState] = useState({
    isLoading: true,
    user: null,
    dashboard: { activeEkubs: 0, upcomingPayments: [] },
    error: "",
  });

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const [meData, dashboardData] = await Promise.all([
          authClient.me(),
          groupClient.dashboard(),
        ]);
        if (!isMounted) return;
        setState({
          isLoading: false,
          user: meData.user,
          dashboard: dashboardData,
          error: "",
        });
      } catch (_error) {
        if (!isMounted) return;
        setState({
          isLoading: false,
          user: null,
          dashboard: { activeEkubs: 0, upcomingPayments: [] },
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
    <section className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your active groups and upcoming payment activity.
        </p>
      </div>

      {state.isLoading ? (
        <p className="mt-2 text-sm text-slate-600">Loading account...</p>
      ) : null}
      {state.error ? <p className="mt-2 text-sm text-red-600">{state.error}</p> : null}
      {state.user ? (
        <div className="grid gap-4 md:grid-cols-3">
          <article className="card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Account</p>
            <p className="mt-2 text-sm text-slate-700">
              Welcome back, <span className="font-semibold">{state.user.name}</span>.
            </p>
          </article>
          <article className="card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Active Ekubs</p>
            <p className="mt-2 font-display text-4xl text-primary-800">
              {state.dashboard.activeEkubs ?? 0}
            </p>
          </article>
          <article className="card md:col-span-1">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Upcoming Payments
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {(state.dashboard.upcomingPayments || []).length} scheduled item(s)
            </p>
          </article>
        </div>
      ) : null}

      <div className="card">
        <h3 className="text-lg font-semibold text-slate-900">Upcoming payments</h3>
        <div className="mt-3 space-y-3">
          {(state.dashboard.upcomingPayments || []).map((payment) => (
            <article
              key={`${payment.groupId}-${payment.dueDate}`}
              className="rounded-xl border border-stone-200 bg-white p-3"
            >
              <p className="font-medium text-stone-900">{payment.groupName}</p>
              <p className="mt-1 text-sm text-stone-600">
                {payment.amount} birr ·{" "}
                {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : "-"}
              </p>
            </article>
          ))}
          {(state.dashboard.upcomingPayments || []).length === 0 && (
            <p className="text-sm text-slate-600">No upcoming payments.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default DashboardPage;
