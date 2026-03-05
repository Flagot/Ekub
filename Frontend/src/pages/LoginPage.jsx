import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authClient, setAuthToken } from "../lib/authClient";

const LoginPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const data = await authClient.login(form);
      if (data?.token) {
        setAuthToken(data.token);
      }
      navigate("/dashboard");
    } catch (submitError) {
      const apiMessage = submitError?.response?.data?.message;
      setError(apiMessage || "Login failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card mx-auto max-w-md">
      <h2 className="text-xl font-semibold text-slate-900">Login</h2>
      <p className="mt-1 text-sm text-slate-600">Continue to your Ekub dashboard.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-primary-400 focus:ring-2"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-primary-400 focus:ring-2"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="w-full rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700 disabled:opacity-70"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        New here?{" "}
        <Link className="font-medium text-primary-700 hover:underline" to="/signup">
          Create an account
        </Link>
      </p>
    </section>
  );
};

export default LoginPage;
