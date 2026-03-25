import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authClient } from "../lib/authClient";
import { setAuthToken } from "../lib/session";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authClient.login({ email, password });
      if (data?.token) {
        setAuthToken(data.token);
      }
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      const apiMessage = submitError?.response?.data?.message;
      setError(apiMessage || "Log in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col gap-10 py-8 lg:flex-row lg:items-center lg:gap-16 lg:py-12">
      <div className="flex-1 lg:max-w-md">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary-700">
          Welcome back
        </p>
        <h1 className="mt-2 font-display text-3xl text-stone-900 sm:text-4xl">
          Log in to your Ekubs
        </h1>
        <p className="mt-4 text-stone-600 leading-relaxed">
          Access your dashboard, pay contributions, and see who is up next in
          each group.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-stone-600">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
            Due dates and amounts in one place
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
            Notifications when it is your turn or payment is due
          </li>
        </ul>
      </div>

      <div className="card-surface flex-1 p-8 shadow-elevated lg:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Email
            </label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Password
            </label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-base"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-stone-600">
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            className="font-semibold text-primary-700 hover:text-primary-800 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
