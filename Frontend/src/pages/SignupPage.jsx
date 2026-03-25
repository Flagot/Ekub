import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authClient } from "../lib/authClient";
import { setAuthToken } from "../lib/session";

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authClient.register({ name, email, password });
      if (data?.token) {
        setAuthToken(data.token);
      }
      navigate(redirectTo, { replace: true });
    } catch (submitError) {
      const apiMessage = submitError?.response?.data?.message;
      setError(apiMessage || "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  const isJoining = redirectTo === "/groups";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col gap-10 py-8 lg:flex-row lg:items-center lg:gap-16 lg:py-12">
      <div className="flex-1 lg:max-w-md">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary-700">
          Join the circle
        </p>
        <h1 className="mt-2 font-display text-3xl text-stone-900 sm:text-4xl">
          Create your account
        </h1>
        <p className="mt-4 text-stone-600 leading-relaxed">
          {isJoining
            ? "Sign up to browse public Ekubs, send join requests, and coordinate contributions with your group."
            : "One account to create Ekubs, invite members, and track payouts across all your groups."}
        </p>
      </div>

      <div className="card-surface flex-1 p-8 shadow-elevated lg:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Full name
            </label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
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
              minLength={8}
              autoComplete="new-password"
            />
            <p className="mt-1.5 text-xs text-stone-500">At least 8 characters</p>
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
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-stone-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-primary-700 hover:text-primary-800 hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
