import { useEffect, useState } from "react";
import { api, formatDateTime } from "../api";

function ActivityTimeline({ issueId }) {
    const [items, setItems] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        (async () => {
            const { ok, data } = await api(`/api/issues/${issueId}/activity`);
            if (!active) return;
            if (ok) setItems(data.activities || []);
            else setError(data.message || "Could not load the history.");
        })();

        return () => {
            active = false;
        };
    }, [issueId]);

    if (error) return <div className="alert alert--error" role="alert">{error}</div>;
    if (!items) return <p className="muted">Loading history...</p>;
    if (items.length === 0) return <p className="muted">No updates yet.</p>;

    return (
        <ol className="timeline">
            {items.map((item) => (
                <li key={item._id}>
                    <p>{item.details}</p>
                    <span>
                        {item.user?.name || "Someone"}
                        {item.user?.role ? `, ${item.user.role}` : ""} on{" "}
                        {formatDateTime(item.createdAt)}
                    </span>
                </li>
            ))}
        </ol>
    );
}

export default ActivityTimeline; 