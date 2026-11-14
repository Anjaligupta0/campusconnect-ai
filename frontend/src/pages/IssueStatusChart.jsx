import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend
} from "recharts";

const STATUS_COLORS = {
    Pending: "#d99100",
    "In Progress": "#2456e5",
    Resolved: "#168a5c",
    Closed: "#8a94ab"
};

function IssueStatusChart({ issues }) {
    const data = Object.keys(STATUS_COLORS).map((status) => ({
        name: status,
        value: issues.filter((issue) => issue.status === status).length
    }));

    return (
        <section className="panel">
            <h2>Status mix</h2>

            {issues.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                    Nothing to chart yet.
                </p>
            ) : (
                <div style={{ width: "100%", height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={52}
                                outerRadius={88}
                                paddingAngle={2}
                            >
                                {data.map((entry) => (
                                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}
        </section>
    );
}

export default IssueStatusChart; 