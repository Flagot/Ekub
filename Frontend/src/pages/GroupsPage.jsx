import { useEffect, useState } from "react";
import { groupClient } from "../lib/groupClient";

const GroupsPage = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [detailError, setDetailError] = useState("");
  const [isDetailLoading, setIsDetailLoading] = useState(false);
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

  const handleSelectGroup = async (groupId) => {
    setDetailError("");
    setIsDetailLoading(true);
    try {
      const data = await groupClient.getById(groupId);
      setSelectedGroup(data.group || null);
    } catch (_error) {
      setDetailError("Could not load group details.");
      setSelectedGroup(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
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
          <article
            className="card cursor-pointer transition hover:border-primary-300"
            key={group._id}
            onClick={() => handleSelectGroup(group._id)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                handleSelectGroup(group._id);
              }
            }}
          >
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
      </div>

      <aside className="card h-fit lg:sticky lg:top-6">
        <h3 className="text-lg font-semibold text-slate-900">Group Detail</h3>
        {!selectedGroup && !isDetailLoading && !detailError ? (
          <p className="mt-2 text-sm text-slate-600">
            Select a group card to see member and owner details.
          </p>
        ) : null}
        {isDetailLoading ? <p className="mt-2 text-sm text-slate-600">Loading detail...</p> : null}
        {detailError ? <p className="mt-2 text-sm text-red-600">{detailError}</p> : null}
        {selectedGroup ? (
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p>
              <span className="font-medium text-slate-900">Name:</span> {selectedGroup.name}
            </p>
            <p>
              <span className="font-medium text-slate-900">Owner:</span>{" "}
              {selectedGroup.createdBy?.name || selectedGroup.createdBy?.email || "Unknown"}
            </p>
            <p>
              <span className="font-medium text-slate-900">Status:</span>{" "}
              {selectedGroup.status}
            </p>
            <p>
              <span className="font-medium text-slate-900">Members:</span>{" "}
              {selectedGroup.members?.length || 0}/{selectedGroup.maxMembers}
            </p>
            <div>
              <p className="font-medium text-slate-900">Member List</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {(selectedGroup.members || []).map((member) => (
                  <li key={member._id}>
                    {member.user?.name || member.user?.email || "Unknown member"} - {member.role}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </aside>
    </section>
  );
};

export default GroupsPage;
