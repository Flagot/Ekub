import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../apiClient";

export default function LandingPage() {
  const [publicEkubs, setPublicEkubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/public/ekubs");
        setPublicEkubs(res.data || []);
      } catch {
        setPublicEkubs([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleAskToJoin() {
    navigate("/signup?redirect=/groups", { replace: true });
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <section className="relative overflow-hidden border-b border-stone-200/80 bg-gradient-to-br from-primary-50 via-white to-amber-50/40">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 left-1/4 h-48 w-48 rounded-full bg-accent-400/15 blur-2xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-24 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-700">
              Rotating savings, made simple
            </p>
            <h1 className="mt-4 font-display text-4xl leading-[1.1] text-stone-900 sm:text-5xl lg:text-[3.25rem]">
              Save together. <span className="text-primary-700">Payout in turn.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-stone-600">
              Run or join Ekub groups: fixed contributions each cycle, clear
              schedule, fair rotation. Built for families, friends, and
              communities who already trust each other with money.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                to="/signup"
                className="btn-primary px-8 py-3 text-base shadow-soft"
              >
                Get started
              </Link>
              <Link to="/login" className="btn-secondary px-8 py-3 text-base">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:py-16">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl text-stone-900 sm:text-3xl">
              Public Ekubs
            </h2>
            <p className="mt-2 max-w-xl text-stone-600">
              Open groups looking for members. Sign up to request a seat and
              agree on your contribution.
            </p>
          </div>
        </div>

        <div className="mt-10">
          {loading ? (
            <div className="flex items-center gap-3 text-stone-500">
              <span
                className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600"
                aria-hidden
              />
              <span>Loading groups...</span>
            </div>
          ) : publicEkubs.length === 0 ? (
            <div className="card-surface border-dashed p-10 text-center">
              <p className="text-stone-600">
                No public Ekubs yet. Create an account and start your own group.
              </p>
              <Link
                to="/signup"
                className="btn-primary mt-6 inline-flex px-8"
              >
                Create account
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {publicEkubs.map((g) => (
                <article
                  key={g._id}
                  className="card-surface group flex flex-col p-6 transition hover:border-primary-200 hover:shadow-elevated"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl text-stone-900">
                        {g.name}
                      </h3>
                      <p className="mt-1 text-sm capitalize text-stone-500">
                        {g.contributionFrequency} · starts{" "}
                        {g.startDate
                          ? new Date(g.startDate).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary-800">
                      Open
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-stone-600">
                    <span className="font-semibold text-stone-800">
                      {g.contributorCount ?? 0}
                    </span>{" "}
                    contributors · pool{" "}
                    <span className="font-semibold text-primary-700">
                      {g.totalSum ?? 0} birr
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={handleAskToJoin}
                    className="btn-primary mt-6 w-full sm:mt-auto"
                  >
                    Ask to join
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
