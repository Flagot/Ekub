import { useEffect, useState } from "react";
import { authClient } from "../lib/authClient";

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

export default DashboardPage;
