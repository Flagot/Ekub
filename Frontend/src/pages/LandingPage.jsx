import { Link } from "react-router-dom";

const LandingPage = () => (
  <section className="rounded-2xl border bg-white p-8 shadow-soft">
    <h1 className="font-display text-3xl text-slate-900">Build your savings circle</h1>
    <p className="mt-3 max-w-2xl text-slate-600">
      Start a rotating savings group, invite members, and track payouts over each
      contribution cycle.
    </p>
    <div className="mt-6 flex gap-3">
      <Link
        className="rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700"
        to="/signup"
      >
        Get started
      </Link>
      <Link
        className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
        to="/login"
      >
        I already have an account
      </Link>
    </div>
  </section>
);

export default LandingPage;
