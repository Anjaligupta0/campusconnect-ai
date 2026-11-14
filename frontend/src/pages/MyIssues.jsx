import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import IssueTicket from "../components/IssueTicket";
import IssueDetails from "../components/IssueDetails";
import { api } from "../api";

const STATUSES = ["Pending", "In Progress", "Resolved", "Closed"];
const PRIORITIES = ["Urgent", "High", "Medium", "Low"];
const CATEGORIES = ["IT", "Maintenance", "Library", "Hostel", "Other"];

function MyIssues() {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [open, setOpen] = useState({});

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All");
    const [priority, setPriority] = useState("All");
    const [category, setCategory] = useState("All");

    useEffect(() => {
        (async () => {
            const { ok, data } = await api("/api/issues/my");
            if (ok) setIssues(data.issues || []);
            else setError(data.message || "Could not load your issues.");
            setLoading(false);
        })();
    }, []);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return issues.filter(
            (issue) =>
                (!term ||
                    [issue.title, issue.description, issue.location]
                        .join(" ")
                        .toLowerCase()
                        .includes(term)) &&
                (status === "All" || issue.status === status) &&
                (priority === "All" || issue.priority === priority) &&
                (category === "All" || issue.category === category)
        );
    }, [issues, search, status, priority, category]);

    const clearFilters = () => {
        setSearch("");
        setStatus("All");
        setPriority("All");
        setCategory("All");
    };

    const toggle = (id) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

    return (
        <Layout
            title="My issues"
            subtitle="Everything you have reported, with its history and comments."
            actions={<Link className="btn" to="/report-issue">Report an issue</Link>}
        >
            {error && <div className="alert alert--error" role="alert">{error}</div>}

            {issues.length > 0 && (
                <>
                    <div className="toolbar">
                        <input
                            className="toolbar__search"
                            type="search"
                            placeholder="Search by title, details or place"
                            aria-label="Search issues"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <select className="toolbar__select" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="All">Any status</option>
                            {STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                        <select className="toolbar__select" aria-label="Filter by priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                            <option value="All">Any priority</option>
                            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                        </select>
                        <select className="toolbar__select" aria-label="Filter by type" value={category} onChange={(e) => setCategory(e.target.value)}>
                            <option value="All">Any type</option>
                            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <p className="toolbar__count">
                        Showing {filtered.length} of {issues.length}
                    </p>
                </>
            )}

            {loading ? (
                <p className="muted">Loading your issues...</p>
            ) : issues.length === 0 && !error ? (
                <div className="empty">
                    <h3>You have not reported anything yet</h3>
                    <p>When you do, you can follow each issue from report to fix here.</p>
                    <Link className="btn" to="/report-issue">Report an issue</Link>
                </div>
            ) : filtered.length === 0 && issues.length > 0 ? (
                <div className="empty">
                    <h3>No issues match these filters</h3>
                    <button className="btn--ghost" onClick={clearFilters}>Clear filters</button>
                </div>
            ) : (
                <div className="stack">
                    {filtered.map((issue) => (
                        <IssueTicket key={issue._id} issue={issue}>
                            <button
                                className="btn--ghost btn--small"
                                aria-expanded={!!open[issue._id]}
                                onClick={() => toggle(issue._id)}
                            >
                                {open[issue._id] ? "Hide details" : "Show details, history and comments"}
                            </button>
                            {open[issue._id] && <IssueDetails issue={issue} />}
                        </IssueTicket>
                    ))}
                </div>
            )}
        </Layout>
    );
}

export default MyIssues; 