import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
    LabelList
} from "recharts";

// data = { IT: 4, Maintenance: 7 }, colors = optional { IT: "#2456e5" }
function Breakdown({ title, data, colors }) {
    const rows = Object.entries(data || {}).map(([name, value]) => ({ name, value }));
    const total = rows.reduce((sum, row) => sum + row.value, 0);

    return (
        <section className="panel">
            <h2>{title}</h2>

            {total === 0 ? (
                <p className="muted" style={{ margin: 0 }}>No issues yet.</p>
            ) : (
                <div style={{ width: "100%", height: rows.length * 44 + 20 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={rows}
                            layout="vertical"
                            margin={{ top: 4, right: 28, bottom: 4, left: 0 }}
                        >
                            <XAxis type="number" allowDecimals={false} hide />
                            <YAxis
                                type="category"
                                dataKey="name"
                                width={92}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip cursor={{ fill: "#eef1f7" }} />
                            <Bar dataKey="value" barSize={18} radius={[0, 4, 4, 0]}>
                                {rows.map((row) => (
                                    <Cell key={row.name} fill={colors?.[row.name] || "#2456e5"} />
                                ))}
                                <LabelList dataKey="value" position="right" />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </section>
    );
}

export default Breakdown; 