import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import IssueTicket from "../components/IssueTicket";
import StaffWorkPanel from "../components/StaffWorkPanel";
import IssueStatusChart from "./IssueStatusChart";
import RecentActivity from "./RecentActivity";
import { api, getUser } from "../api";

const PAGE_SIZE = 8;
const STATUSES = ["Pending", "In Progress", "Resolved", "Closed"];
const PRIORITIES = ["Urgent", "High", "Medium", "Low"];
const PRIORITY_RANK = { Urgent: 3, High: 2, Medium: 1, Low: 0 };
const isDone = (issue) => issue.status === "Resolved" || issue.status === "Closed";

function StaffDashboard() {
    const user = getUser();

    const [issues, setIssues] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All");
    const [category, setCategory] = useState("All");
    const [priority, setPriority] = useState("All");
    const [mine, setMine] = useState(false);
    const [sort, setSort] = useState("urgent");
    const [pageState, setPage] = useState(1);

    const load = useCallback(async () => {
        const [issueRes, staffRes] = await Promise.all([
            api("/api/issues/all"),
            api("/api/issues/staff")
        ]);

        if (issueRes.ok) {
            setIssues(issueRes.data.issues || []);
            setError("");
        } else {
            setError(issueRes.data.message || "Could not load issues.");
        }
        if (staffRes.ok) setStaff(staffRes.data.staff || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const patchIssue = (id, patch) =>
        setIssues((prev) => prev.map((i) => (i._id === id ? { ...i, ...patch } : i)));

    const isMine = useCallback(
        (issue) =>
            String(issue.assignedTo?._id || issue.assignedTo || "") === String(user?.id),
        [user?.id]
    );

    const categories = useMemo(
        () => [...new Set(issues.map((i) => i.category).filter(Boolean))],
        [issues]
    );

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();

        const list = issues.filter(
            (issue) =>
                (!mine || isMine(issue)) &&
                (!term ||
                    [issue.title, issue.description, issue.location, issue.reportedBy?.name]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase()
                        .includes(term)) &&
                (status === "All" || issue.status === status) &&
                (category === "All" || issue.category === category) &&
                (priority === "All" || issue.priority === priority)
        );

        const byDate = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

        return list.sort((a, b) => {
            if (sort === "newest") return byDate(a, b);
            // most urgent first, finished issues last
            if (isDone(a) !== isDone(b)) return isDone(a) ? 1 : -1;
            return (PRIORITY_RANK[b.priority] ?? 1) - (PRIORITY_RANK[a.priority] ?? 1) || byDate(a, b);
        });
    }, [issues, search, status, category, priority, mine, sort, isMine]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const page = Math.min(pageState, totalPages);
    const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const count = (...s) => issues.filter((i) => s.includes(i.status)).length;
    const myOpen = issues.filter((i) => isMine(i) && !isDone(i)).length;

    const filterChange = (setter) => (e) => {
        setter(e.target.value);
        setPage(1);
    };

    const clearFilters = () => {
        setSearch("");
        setStatus("All");
        setCategory("All");
        setPriority("All");
        setMine(false);
        setPage(1);
    };

    return (
        <Layout
            title="Work queue"
            subtitle="Every reported issue. Assign it, update its status and tell the student what was done."
        >
            {error && <div className="alert alert--error" role="alert">{error}</div>}

            <div className="stats">
                <div className="stat"><b>{count("Pending")}</b><span>Waiting for staff</span></div>
                <div className="stat"><b>{count("In Progress")}</b><span>Being fixed</span></div>
                <div className="stat"><b>{count("Resolved", "Closed")}</b><span>Resolved</span></div>
                <div className="stat"><b>{myOpen}</b><span>Open and assigned to me</span></div>
            </div>

            <div className="split">
                <section>
                    <div className="toolbar">
                        <input
                            className="toolbar__search"
                            type="search"
                            placeholder="Search title, place, person"
                            aria-label="Search issues"
                            value={search}
                            onChange={filterChange(setSearch)}
                        />
                        <select className="toolbar__select" aria-label="Filter by status" value={status} onChange={filterChange(setStatus)}>
                            <option value="All">Any status</option>
                            {STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                        <select className="toolbar__select" aria-label="Filter by type" value={category} onChange={filterChange(setCategory)}>
                            <option value="All">Any type</option>
                            {categories.map((c) => <option key={c}>{c}</option>)}
                        </select>
                        <select className="toolbar__select" aria-label="Filter by priority" value={priority} onChange={filterChange(setPriority)}>
                            <option value="All">Any priority</option>
                            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                        </select>
                        <select className="toolbar__select" aria-label="Sort order" value={sort} onChange={filterChange(setSort)}>
                            <option value="urgent">Most urgent first</option>
                            <option value="newest">Newest first</option>
                        </select>
                    </div>

                    <div className="toolbar">
                        <button
                            className={`btn--ghost btn--small ${mine ? "is-on" : ""}`}
                            aria-pressed={mine}
                            onClick={() => {
                                setMine((v) => !v);
                                setPage(1);
                            }}
                        >
                            Only issues assigned to me
                        </button>
                        <button className="btn--ghost btn--small" onClick={clearFilters}>
                            Clear filters
                        </button>
                    </div>

                    <p className="toolbar__count">
                        Showing {filtered.length} of {issues.length}
                    </p>

                    {loading ? (
                        <p className="muted">Loading issues...</p>
                    ) : filtered.length === 0 ? (
                        <div className="empty">
                            <h3>{issues.length === 0 ? "No issues reported yet" : "No issues match these filters"}</h3>
                            {issues.length > 0 && (
                                <button className="btn--ghost" onClick={clearFilters}>Clear filters</button>
                            )}
                        </div>
                    ) : (
                        <div className="stack">
                            {visible.map((issue) => (
                                <IssueTicket key={issue._id} issue={issue}>
                                    <StaffWorkPanel issue={issue} staff={staff} onChange={patchIssue} />
                                </IssueTicket>
                            ))}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <nav className="pager" aria-label="Pages">
                            <button className="btn--ghost btn--small" disabled={page === 1} onClick={() => setPage(page - 1)}>
                                Previous
                            </button>
                            <span>Page {page} of {totalPages}</span>
                            <button className="btn--ghost btn--small" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                                Next
                            </button>
                        </nav>
                    )}
                </section>

                <aside className="stack">
                    <IssueStatusChart issues={issues} />
                    <RecentActivity />
                </aside>
            </div>
        </Layout>
    );
}

export default StaffDashboard; 