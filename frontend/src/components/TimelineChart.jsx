import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

const formatTick = (iso) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="border border-[#00E5FF] bg-black/95 px-3 py-2 font-mono">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#8A94A6] mb-1">
                {new Date(label).toLocaleString()}
            </p>
            {payload.map((p) => (
                <div key={p.dataKey} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2" style={{ backgroundColor: p.color }} />
                    <span className="text-[#E0E6ED] uppercase tracking-wider text-[10px]">
                        {p.name}
                    </span>
                    <span className="tabular-nums text-[#E0E6ED] font-bold">
                        {p.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default function TimelineChart({ points, mineName, enemyName }) {
    if (!points || points.length === 0) {
        return (
            <div
                className="h-[320px] flex items-center justify-center text-[#8A94A6] text-xs uppercase tracking-[0.2em]"
                data-testid="timeline-empty"
            >
                // no signals captured in this window
            </div>
        );
    }

    return (
        <div className="h-[320px] p-3" data-testid="timeline-chart">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points}>
                    <CartesianGrid stroke="#1a1a1a" strokeDasharray="2 4" />
                    <XAxis
                        dataKey="timestamp"
                        stroke="#4B5563"
                        tickFormatter={formatTick}
                        tick={{ fontFamily: "JetBrains Mono", fontSize: 10, fill: "#8A94A6" }}
                        tickLine={{ stroke: "#2F3336" }}
                        axisLine={{ stroke: "#2F3336" }}
                        minTickGap={40}
                    />
                    <YAxis
                        stroke="#4B5563"
                        tick={{ fontFamily: "JetBrains Mono", fontSize: 10, fill: "#8A94A6" }}
                        tickLine={{ stroke: "#2F3336" }}
                        axisLine={{ stroke: "#2F3336" }}
                        allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#00E5FF", strokeWidth: 1 }} />
                    <Legend
                        wrapperStyle={{
                            fontFamily: "JetBrains Mono",
                            fontSize: 10,
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            color: "#8A94A6",
                        }}
                    />
                    <Line
                        type="stepAfter"
                        dataKey="mine_active"
                        name={`${mineName} active`}
                        stroke="#00FF66"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                    <Line
                        type="stepAfter"
                        dataKey="enemy_active"
                        name={`${enemyName} active`}
                        stroke="#FF3333"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                    <Line
                        type="stepAfter"
                        dataKey="mine_hospital"
                        name="my hospital"
                        stroke="#00E5FF"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        dot={false}
                        isAnimationActive={false}
                    />
                    <Line
                        type="stepAfter"
                        dataKey="enemy_hospital"
                        name="enemy hospital"
                        stroke="#FFB300"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
