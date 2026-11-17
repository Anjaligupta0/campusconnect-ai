import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import IssueTicket from "../components/IssueTicket";
import { api, formatDateTime, getUser } from "../api";

function StudentDashboard() {
    const user = getUser();
    const firstName = user?.name?.split(" ")[0] || "there";

    const [issues, setIssues] = useState([]);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        const [issueRes, noteRes] = await Promise.all([
            api("/api/issues/my"),
            api("/api/notifications")
        ]);

        if (issueRes.ok) {
            setIssues(issueRes.data.issues || []);
            setError("");
        } else {
            setError(issueRes.data.message || "Could not load your issues.");
        }
        if (noteRes.ok) setNotes(noteRes.data.notifications || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
        window.addEventListener("focus", load);
        return () => window.removeEventListener("focus", load);
    }, [load]);

    const count = (...statuses) =>
        issues.filter((i) => statuses.includes(i.status)).length;
    const resolved = count("Resolved", "Closed");
    const rate = issues.length ? Math.round((resolved / issues.length) * 100) : 0;

    return (
        <Layout
            title={`Hello, ${firstName}`}
            subtitle="Here is where your reported issues stand."
            actions={<Link className="btn" to="/report-issue">Report an issue</Link>}
        >
            {error && <div className="alert alert--error" role="alert">{error}</div>}

            <div className="stats">
                <div className="stat"><b>{count("Pending")}</b><span>Waiting for staff</span></div>
                <div className="stat"><b>{count("In Progress")}</b><span>Being fixed</span></div>
                <div className="stat"><b>{resolved}</b><span>Resolved</span></div>
                <div className="stat"><b>{rate}%</b><span>Resolution rate</span></div>
            </div>

            <div className="split">
                <section>
                    <div className="section-title">
                        <h2>Recent issues</h2>
                        {issues.length > 0 && <Link to="/my-issues">View all</Link>}
                    </div>

                    {loading ? (
                        <p className="muted">Loading your issues...</p>
                    ) : issues.length === 0 ? (
                        <div className="empty">
                            <h3>No issues yet</h3>
                            <p>Spotted something broken on campus? Report it and track the fix here.</p>
                            <Link className="btn" to="/report-issue">Report your first issue</Link>
                        </div>
                    ) : (
                        <div className="stack">
                            {issues.slice(0, 4).map((issue) => (
                                <IssueTicket key={issue._id} issue={issue} />
                            ))}
                        </div>
                    )}
                </section>

                <aside className="panel">
                    <div className="section-title">
                        <h2>Notifications</h2>
                        <Link to="/notifications">See all</Link>
                    </div>

                    {notes.length === 0 ? (
                        <p className="muted" style={{ margin: 0 }}>
                            Nothing yet. Updates on your issues will show up here.
                        </p>
                    ) : (
                        <ul className="notes">
                            {notes.slice(0, 5).map((note) => (
                                <li key={note._id} className={note.isRead ? "" : "is-unread"}>
                                    <span className="notes__dot" aria-hidden="true" />
                                    <div>
                                        <p>{note.message}</p>
                                        <time dateTime={note.createdAt}>
                                            {formatDateTime(note.createdAt)}
                                        </time>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </aside>
            </div>
        </Layout>
    );
}

export default StudentDashboard; 