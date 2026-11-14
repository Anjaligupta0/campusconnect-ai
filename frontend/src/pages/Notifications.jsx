import { useCallback, useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api, formatDateTime } from "../api";

// The sidebar badge refreshes whenever the window gets a "focus" event.
const refreshBadge = () => window.dispatchEvent(new Event("focus"));

function Notifications() {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        const { ok, data } = await api("/api/notifications");
        if (ok) {
            setNotes(data.notifications || []);
            setError("");
        } else {
            setError(data.message || "Could not load notifications.");
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const markRead = async (id) => {
        const { ok, data } = await api(`/api/notifications/${id}/read`, {
            method: "PATCH"
        });
        if (!ok) {
            setError(data.message || "Could not mark it as read.");
            return;
        }
        setNotes((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
        refreshBadge();
    };

    const markAllRead = async () => {
        await Promise.all(
            notes
                .filter((n) => !n.isRead)
                .map((n) => api(`/api/notifications/${n._id}/read`, { method: "PATCH" }))
        );
        await load();
        refreshBadge();
    };

    const unread = notes.filter((n) => !n.isRead).length;

    return (
        <Layout
            title="Notifications"
            subtitle={unread ? `${unread} unread` : "You are all caught up."}
            actions={
                unread > 0 && (
                    <button className="btn--ghost" onClick={markAllRead}>
                        Mark all as read
                    </button>
                )
            }
        >
            {error && <div className="alert alert--error" role="alert">{error}</div>}

            {loading ? (
                <p className="muted">Loading notifications...</p>
            ) : notes.length === 0 ? (
                <div className="empty">
                    <h3>No notifications yet</h3>
                    <p>You will see updates here when staff act on your issues.</p>
                </div>
            ) : (
                <section className="panel" style={{ maxWidth: 760 }}>
                    <ul className="notes notes--page">
                        {notes.map((note) => (
                            <li key={note._id} className={note.isRead ? "" : "is-unread"}>
                                <span className="notes__dot" aria-hidden="true" />
                                <div>
                                    <p>{note.message}</p>
                                    {note.issue?.title && (
                                        <p className="muted">Issue: {note.issue.title}</p>
                                    )}
                                    <time dateTime={note.createdAt}>
                                        {formatDateTime(note.createdAt)}
                                    </time>
                                    {!note.isRead && (
                                        <div style={{ marginTop: "0.5rem" }}>
                                            <button className="btn--ghost btn--small" onClick={() => markRead(note._id)}>
                                                Mark as read
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </Layout>
    );
}

export default Notifications; 