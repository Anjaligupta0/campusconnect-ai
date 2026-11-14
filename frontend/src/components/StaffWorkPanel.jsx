import { useState } from "react";
import { api } from "../api";
import IssueDetails from "./IssueDetails";

const STATUSES = ["Pending", "In Progress", "Resolved", "Closed"];

// Controls staff use on one issue: assign, change status, add resolution note.
function StaffWorkPanel({ issue, staff, onChange }) {
    const [status, setStatus] = useState(issue.status);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null); // { type: "ok" | "error", text }
    const [open, setOpen] = useState(false);

    const assigneeId = String(issue.assignedTo?._id || issue.assignedTo || "");
    const dirty = status !== issue.status;
    const needsNote = status === "Resolved" && issue.status !== "Resolved";

    const saveStatus = async () => {
        if (needsNote && !note.trim()) {
            setMsg({ type: "error", text: "Add a resolution note before resolving this issue." });
            return;
        }

        setBusy(true);
        setMsg(null);
        const { ok, data } = await api(`/api/issues/${issue._id}/status`, {
            method: "PATCH",
            body: { status, resolutionNote: note.trim() }
        });
        setBusy(false);

        if (!ok) {
            setMsg({ type: "error", text: data.message || "Could not update the status." });
            return;
        }

        onChange(issue._id, {
            status: data.issue?.status || status,
            resolutionNote: data.issue?.resolutionNote ?? issue.resolutionNote
        });
        setNote("");
        setMsg({ type: "ok", text: `Status set to ${status}. The student has been notified.` });
    };

    const assign = async (staffId) => {
        if (!staffId || staffId === assigneeId) return;

        setBusy(true);
        setMsg(null);
        const { ok, data } = await api(`/api/issues/${issue._id}/assign`, {
            method: "PATCH",
            body: { staffId }
        });
        setBusy(false);

        if (!ok) {
            setMsg({ type: "error", text: data.message || "Could not assign the issue." });
            return;
        }

        const member = staff.find((s) => s._id === staffId);
        const assignedTo =
            data.issue?.assignedTo && typeof data.issue.assignedTo === "object"
                ? data.issue.assignedTo
                : member;
        onChange(issue._id, { assignedTo });
        setMsg({ type: "ok", text: `Assigned to ${member?.name || "the staff member"}.` });
    };

    return (
        <div className="work">
            <p className="work__desc">{issue.description}</p>

            <dl className="ticket__meta">
                <div>
                    <dt>Reported by</dt>
                    <dd>{issue.reportedBy?.name || "Unknown"}</dd>
                </div>
                <div>
                    <dt>Assigned to</dt>
                    <dd>{issue.assignedTo?.name || "Nobody yet"}</dd>
                </div>
            </dl>

            <div className="work__controls">
                <div className="field field--inline">
                    <label htmlFor={`assign-${issue._id}`}>Assign to</label>
                    <select
                        id={`assign-${issue._id}`}
                        value={assigneeId}
                        disabled={busy}
                        onChange={(e) => assign(e.target.value)}
                    >
                        <option value="" disabled>Choose staff</option>
                        {staff.map((member) => (
                            <option key={member._id} value={member._id}>
                                {member.name}
                                {member.department ? `, ${member.department}` : ""}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="field field--inline">
                    <label htmlFor={`status-${issue._id}`}>Status</label>
                    <select
                        id={`status-${issue._id}`}
                        value={status}
                        disabled={busy}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                </div>

                {dirty && (
                    <button onClick={saveStatus} disabled={busy}>
                        {busy ? "Saving..." : "Save status"}
                    </button>
                )}
            </div>

            {needsNote && (
                <div className="field">
                    <label htmlFor={`note-${issue._id}`}>Resolution note</label>
                    <textarea
                        id={`note-${issue._id}`}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="What was done to fix it?"
                        maxLength={1000}
                    />
                    <span className="hint">The student will see this note.</span>
                </div>
            )}

            {msg && (
                <div
                    className={`alert alert--${msg.type}`}
                    role={msg.type === "error" ? "alert" : "status"}
                >
                    {msg.text}
                </div>
            )}

            <button
                className="btn--ghost btn--small"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                {open ? "Hide details" : "Show history and comments"}
            </button>
            {open && <IssueDetails issue={issue} />}
        </div>
    );
}

export default StaffWorkPanel; 