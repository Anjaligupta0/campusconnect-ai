import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import Breakdown from "../components/Breakdown";
import IssueStatusChart from "./IssueStatusChart";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import { api, getUser } from "../api";

const PRIORITY_COLORS = {
    Urgent: "#c93c3c",
    High: "#d99100",
    Medium: "#2456e5",
    Low: "#8a94ab"
};
const PRIORITY_RANK = { Urgent: 3, High: 2, Medium: 1, Low: 0 };
const ROLES = ["student", "staff", "admin"];
const roleLabel = { student: "Student", staff: "Staff", admin: "Admin" };

const formatDuration = (hours) =>
    hours == null
        ? "No data"
        : hours >= 48
        ? `${Math.round((hours / 24) * 10) / 10} days`
        : `${hours} hours`;

const daysOpen = (date) => {
    const days = Math.floor((Date.now() - new Date(date)) / 86400000);
    return days <= 0 ? "Today" : days === 1 ? "1 day ago" : `${days} days ago`;
};

function AdminDashboard() {
    const me = getUser();

    const [analytics, setAnalytics] = useState(null);
    const [issues, setIssues] = useState([]);
    const [users, setUsers] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("All");
    const [drafts, setDrafts] = useState({});
    const [savingId, setSavingId] = useState("");
    const [roleMsg, setRoleMsg] = useState(null); // { type, text }

    const loadAnalytics = useCallback(async () => {
        const { ok, data } = await api("/api/admin/analytics");
        if (ok) setAnalytics(data.analytics);
    }, []);

    useEffect(() => {
        (async () => {
            const [issueRes, userRes] = await Promise.all([
                api("/api/issues/all"),
                api("/api/admin/users"),
                loadAnalytics()
            ]);

            if (issueRes.ok) setIssues(issueRes.data.issues || []);
            else setError(issueRes.data.message || "Could not load issues.");
            if (userRes.ok) setUsers(userRes.data.users || []);
            setLoading(false);
        })();
    }, [loadAnalytics]);

    const needsAttention = useMemo(
        () =>
            issues
                .filter(
                    (i) =>
                        i.status !== "Resolved" &&
                        i.status !== "Closed" &&
                        (i.priority === "Urgent" || i.priority === "High")
                )
                .sort(
                    (a, b) =>
                        (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0) ||
                        new Date(a.createdAt) - new Date(b.createdAt)
                )
                .slice(0, 6),
        [issues]
    );

    const visibleUsers = useMemo(() => {
        const term = search.trim().toLowerCase();
        return users.filter(
            (u) =>
                (roleFilter === "All" || u.role === roleFilter) &&
                (!term || `${u.name} ${u.email}`.toLowerCase().includes(term))
        );
    }, [users, search, roleFilter]);

    const saveRole = async (user) => {
        const newRole = drafts[user._id] || user.role;
        if (newRole === user.role) return;

        if (
            newRole === "admin" &&
            !window.confirm(`Make ${user.name} an administrator? They will be able to manage all users and issues.`)
        ) {
            return;
        }

        setSavingId(user._id);
        setRoleMsg(null);
        const { ok, data } = await api(`/api/admin/users/${user._id}/role`, {
            method: "PATCH",
            body: { role: newRole }
        });
        setSavingId("");

        if (!ok) {
            setRoleMsg({ type: "error", text: data.message || "Could not change the role." });
            return;
        }

        setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, role: newRole } : u)));
        setDrafts((prev) => {
            const next = { ...prev };
            delete next[user._id];
            return next;
        });
        setRoleMsg({ type: "ok", text: `${user.name} is now ${roleLabel[newRole].toLowerCase()}.` });
        loadAnalytics();
    };

    const a = analytics;

    return (
        <Layout
            title="Admin overview"
            subtitle="How the campus is doing, which issues need a push, and who has access."
            actions={<Link className="btn" to="/staff-dashboard">Open work queue</Link>}
        >
            {error && <div className="alert alert--error" role="alert">{error}</div>}

            <div className="stats">
                <div className="stat"><b>{a ? a.issues.total : "–"}</b><span>Issues reported</span></div>
                <div className="stat"><b>{a ? a.issues.pending + a.issues.inProgress : "–"}</b><span>Still open</span></div>
                <div className="stat"><b>{a ? a.issues.resolved + a.issues.closed : "–"}</b><span>Resolved</span></div>
                <div className="stat"><b>{a ? formatDuration(a.avgResolutionHours) : "–"}</b><span>Average time to resolve</span></div>
            </div>

            <div className="charts">
                <IssueStatusChart issues={issues} />
                <Breakdown title="By type" data={a?.categories} />
                <Breakdown title="By priority" data={a?.priorities} colors={PRIORITY_COLORS} />
            </div>

            <section style={{ marginBottom: "2rem" }}>
                <div className="section-title">
                    <h2>Needs attention</h2>
                    <Link to="/staff-dashboard">Open work queue</Link>
                </div>

                {loading ? (
                    <p className="muted">Loading...</p>
                ) : needsAttention.length === 0 ? (
                    <div className="empty">
                        <h3>Nothing urgent right now</h3>
                        <p>Open urgent and high priority issues will show up here.</p>
                    </div>
                ) : (
                    <ul className="attention">
                        {needsAttention.map((issue) => (
                            <li key={issue._id}>
                                <div className="attention__main">
                                    <strong>{issue.title}</strong>
                                    <span>
                                        {issue.location}, reported {daysOpen(issue.createdAt)}
                                    </span>
                                </div>
                                <PriorityBadge priority={issue.priority} />
                                <StatusBadge status={issue.status} />
                                {issue.assignedTo ? (
                                    <span className="muted">{issue.assignedTo.name || "Assigned"}</span>
                                ) : (
                                    <span className="tag tag--warn">Not assigned</span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section>
                <div className="section-title">
                    <h2>Users and roles</h2>
                    <span className="muted">
                        {a ? `${a.users.students} students, ${a.users.staff} staff` : ""}
                    </span>
                </div>

                <div className="toolbar">
                    <input
                        className="toolbar__search"
                        type="search"
                        placeholder="Search by name or email"
                        aria-label="Search users"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select className="toolbar__select" aria-label="Filter by role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                        <option value="All">Any role</option>
                        {ROLES.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                    </select>
                </div>

                {roleMsg && (
                    <div className={`alert alert--${roleMsg.type}`} role={roleMsg.type === "error" ? "alert" : "status"}>
                        {roleMsg.text}
                    </div>
                )}

                {visibleUsers.length === 0 ? (
                    <div className="empty"><h3>No users match</h3></div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Department</th>
                                    <th>Role</th>
                                    <th><span className="sr-only">Action</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleUsers.map((user) => {
                                    const isMe = String(user._id) === String(me?.id);
                                    const value = drafts[user._id] || user.role;
                                    return (
                                        <tr key={user._id}>
                                            <td>
                                                {user.name}
                                                {isMe && <span className="tag" style={{ marginLeft: "0.5rem" }}>You</span>}
                                            </td>
                                            <td>{user.email}</td>
                                            <td>{user.department || "None"}</td>
                                            <td>
                                                <select
                                                    aria-label={`Role for ${user.name}`}
                                                    value={value}
                                                    disabled={isMe || savingId === user._id}
                                                    onChange={(e) =>
                                                        setDrafts((prev) => ({ ...prev, [user._id]: e.target.value }))
                                                    }
                                                >
                                                    {ROLES.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                {value !== user.role && (
                                                    <button
                                                        className="btn--small"
                                                        disabled={savingId === user._id}
                                                        onClick={() => saveRole(user)}
                                                    >
                                                        {savingId === user._id ? "Saving..." : "Save role"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </Layout>
    );
}

export default AdminDashboard; 