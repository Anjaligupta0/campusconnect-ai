import { useCallback, useEffect, useState } from "react";
import { api, formatDateTime } from "../api";

function Comments({ issueId }) {
    const [comments, setComments] = useState(null);
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        const { ok, data } = await api(`/api/issues/${issueId}/comments`); 
        if (ok) {
            setComments(data.comments || []);
        } else {
            setError(data.message || "Could not load comments.");
        }
    }, [issueId]); 

    useEffect(() => {
        load();
    }, [load]);

    const send = async (e) => {
        e.preventDefault();
        if (!text.trim() || busy) return;

        setBusy(true);
        setError("");
         const { ok, data } = await api(`/api/issues/${issueId}/comments`, { 
            method: "POST",
            body: { text: text.trim() }
        });
        setBusy(false);

        if (!ok) {
            setError(data.message || "Could not post your comment.");
            return;
        }
        setText("");
        load(); // reload so the author's name is included
    };

    return (
        <div>
            {error && <div className="alert alert--error" role="alert">{error}</div>}

            {!comments ? (
                <p className="muted">Loading comments...</p>
            ) : comments.length === 0 ? (
                <p className="muted">No comments yet.</p>
            ) : (
                <div className="comments">
                    {comments.map((comment) => (
                        <div className="comment" key={comment._id}>
                            <strong>{comment.user?.name || "User"}</strong>
                            {comment.user?.role && comment.user.role !== "student" && (
                                <span className="tag" style={{ marginLeft: "0.5rem" }}>
                                    {comment.user.role === "admin" ? "Admin" : "Staff"}
                                </span>
                            )}
                            <p>{comment.text}</p>
                            <time dateTime={comment.createdAt}>
                                {formatDateTime(comment.createdAt)}
                            </time>
                        </div>
                    ))}
                </div>
            )}

            <form className="comment-form" onSubmit={send}>
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Write a comment"
                    aria-label="Write a comment"
                    maxLength={1000}
                />
                <button type="submit" disabled={busy || !text.trim()}>
                    {busy ? "Posting..." : "Post comment"}
                </button>
            </form>
        </div>
    ); 
}

export default Comments; 