import { PriorityBadge } from "./Badges";
import { formatDate } from "../api";

const STEPS = ["Reported", "Assigned", "In progress", "Resolved"];

// Where the issue is on the 4-step rail
export const stageOf = (issue) => {
    if (issue.status === "Resolved" || issue.status === "Closed") return 3;
    if (issue.status === "In Progress") return 2;
    if (issue.assignedTo) return 1;
    return 0;
};

export function ProgressRail({ issue }) {
    const current = stageOf(issue);
    const labels = [...STEPS];
    if (issue.status === "Closed") labels[3] = "Closed";

    return (
        <ol
            className={`rail ${current === 3 ? "rail--done" : ""}`}
            aria-label={`Progress: ${labels[current]}`}
        >
            {labels.map((label, index) => (
                <li
                    key={label}
                    className={
                        index < current
                            ? "is-done"
                            : index === current
                            ? "is-current"
                            : ""
                    }
                    aria-current={index === current ? "step" : undefined}
                >
                    {label}
                </li>
            ))}
        </ol>
    );
}

// children = optional extra content under the ticket (buttons, comments...)
function IssueTicket({ issue, children }) {
    const priority = (issue.priority || "Medium").toLowerCase();
    const shortId = String(issue._id || "").slice(-5).toUpperCase();

    return (
        <article className={`ticket ticket--${priority}`}>
            <div className="ticket__main">
                <div className="ticket__top">
                    <span className="ticket__id">#{shortId}</span>
                    <PriorityBadge priority={issue.priority} />
                    {issue.aiSource === "ai" && (
                        <span className="tag">Sorted by AI</span>
                    )}
                </div>

                <h3 className="ticket__title">{issue.title}</h3>

                {issue.aiSource === "ai" && issue.aiSummary && (
                    <p className="ticket__summary">{issue.aiSummary}</p>
                )}

                <dl className="ticket__meta">
                    <div>
                        <dt>Where</dt>
                        <dd>{issue.location}</dd>
                    </div>
                    <div>
                        <dt>Type</dt>
                        <dd>{issue.category}</dd>
                    </div>
                    <div>
                        <dt>Reported</dt>
                        <dd>{formatDate(issue.createdAt)}</dd>
                    </div>
                </dl>
            </div>

            <ProgressRail issue={issue} />

            {children && <div className="ticket__extra">{children}</div>}
        </article>
    );
}

export default IssueTicket; 