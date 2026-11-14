export function PriorityBadge({ priority }) {
    const value = priority || "Medium";
    return (
        <span className={`pill pill--${value.toLowerCase()}`}>
            {value} priority
        </span>
    );
}

export function StatusBadge({ status }) {
    const value = status || "Pending";
    return (
        <span className={`pill pill--${value.toLowerCase().replace(" ", "-")}`}>
            {value}
        </span>
    );
} 