import { useEffect, useState } from "react";
import { api, formatDateTime } from "../api";

function RecentActivity({ limit = 8 }) {
    const [items, setItems] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        (async () => {
            const { ok, data } = await api(`/api/issues/activity/recent?limit=${limit}`);
            if (!active) return;
            if (ok) setItems(data.activities || []);
            else setError(data.message || "Could not load recent activity.");
        })();

        return () => {
            active = false;
        };
    }, [limit]);

    return (
        <section className="panel">
            <h2>Recent campus activity</h2>

            {error ? (
                <div className="alert alert--error" role="alert">{error}</div>
            ) : !items ? (
                <p className="muted" style={{ margin: 0 }}>Loading...</p>
            ) : items.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>No activity yet.</p>
            ) : (
                <ol className="timeline">
                    {items.map((item) => (
                        <li key={item._id}>
                            <p>{item.details}</p>
                            <span>
                                {item.user?.name || "Someone"} on {formatDateTime(item.createdAt)}
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}

export default RecentActivity; 