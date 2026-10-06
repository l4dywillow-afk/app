import { Shield, Skull } from "lucide-react";

const STATUS_COLOR = {
    Online: "#00FF66",
    Idle: "#FFB300",
    Offline: "#8C8C8C",
};

const STATE_COLOR = {
    Okay: "#00FF66",
    Hospital: "#FF3333",
    Jail: "#FFB300",
    Traveling: "#00E5FF",
    Abroad: "#00E5FF",
    Federal: "#FF3333",
};

export default function FactionPanel({ side, data, loading }) {
    const isMine = side === "mine";
    const accent = isMine ? "#00FF66" : "#FF3333";
    const Icon = isMine ? Shield : Skull;
    const label = isMine ? "FRIENDLY" : "HOSTILE";

    return (
        <div
            data-testid={`faction-panel-${side}`}
            className="border border-[#2F3336] bg-[#0A0A0A] flex flex-col"
        >
            {/* HEADER */}
            <div
                className="flex items-center justify-between gap-3 px-4 py-3 border-b"
                style={{ borderColor: accent, backgroundColor: `${accent}08` }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 border flex items-center justify-center"
                        style={{ borderColor: accent }}
                    >
                        <Icon className="w-4 h-4" style={{ color: accent }} />
                    </div>
                    <div>
                        <p
                            className="text-[10px] uppercase tracking-[0.3em]"
                            style={{ color: accent }}
                        >
                            {label}
                        </p>
                        <h3 className="font-display font-bold text-lg uppercase tracking-wider text-[#E0E6ED] leading-none mt-1">
                            {data?.faction_name || "—"}
                            {data?.tag && (
                                <span className="ml-2 text-[11px] text-[#8A94A6] font-mono tracking-wider">
                                    {data.tag}
                                </span>
                            )}
                        </h3>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#8A94A6]">
                        Respect
                    </p>
                    <p className="font-display font-bold text-base text-[#E0E6ED] tabular-nums">
                        {(data?.respect || 0).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* KPI STRIP */}
            <div className="grid grid-cols-4 border-b border-[#2F3336]">
                <Kpi label="Online" value={data?.online_count} color="#00FF66" />
                <Kpi label="Idle" value={data?.idle_count} color="#FFB300" />
                <Kpi label="Hospital" value={data?.hospital_count} color="#FF3333" />
                <Kpi label="Chain" value={`${data?.chain_current ?? 0}`} sub={data?.chain_max ? `/${data.chain_max}` : ""} color="#00E5FF" />
            </div>

            {/* MEMBER TABLE */}
            <div className="flex-1 min-h-[380px] max-h-[480px] overflow-y-auto">
                <table className="w-full text-xs font-mono">
                    <thead className="sticky top-0 bg-[#0A0A0A] border-b border-[#2F3336] z-10">
                        <tr className="text-[10px] uppercase tracking-[0.2em] text-[#8A94A6]">
                            <th className="text-left px-3 py-2 font-medium">Operative</th>
                            <th className="text-left px-2 py-2 font-medium">Lvl</th>
                            <th className="text-left px-2 py-2 font-medium">State</th>
                            <th className="text-left px-2 py-2 font-medium">Signal</th>
                            <th className="text-right px-3 py-2 font-medium">Last</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && !data && (
                            <tr>
                                <td colSpan={5} className="px-3 py-8 text-center text-[#8A94A6]">
                                    acquiring signal...
                                </td>
                            </tr>
                        )}
                        {data?.members?.map((m, i) => (
                            <tr
                                key={m.id}
                                data-testid={`member-row-${side}-${i}`}
                                className={`border-b border-[#1a1a1a] hover:bg-[#00E5FF]/5 transition-colors duration-150 ${
                                    i % 2 === 0 ? "bg-black/40" : "bg-transparent"
                                }`}
                            >
                                <td className="px-3 py-2 text-[#E0E6ED] whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                            style={{
                                                backgroundColor:
                                                    STATUS_COLOR[m.online_status] || "#8C8C8C",
                                                boxShadow:
                                                    m.online_status === "Online"
                                                        ? "0 0 6px rgba(0,255,102,0.7)"
                                                        : "none",
                                            }}
                                        />
                                        <span className="truncate max-w-[140px]">{m.name}</span>
                                    </div>
                                </td>
                                <td className="px-2 py-2 text-[#8A94A6] tabular-nums">
                                    {m.level}
                                </td>
                                <td className="px-2 py-2">
                                    <span
                                        className="text-[10px] uppercase tracking-[0.15em] font-medium"
                                        style={{ color: STATE_COLOR[m.status_state] || "#E0E6ED" }}
                                    >
                                        {m.status_state}
                                    </span>
                                </td>
                                <td className="px-2 py-2">
                                    <span
                                        className="text-[10px] uppercase tracking-[0.15em]"
                                        style={{ color: STATUS_COLOR[m.online_status] || "#8C8C8C" }}
                                    >
                                        {m.online_status}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-right text-[#8A94A6] tabular-nums">
                                    {m.last_action_relative}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Kpi({ label, value, sub, color }) {
    return (
        <div className="px-3 py-3 border-r last:border-r-0 border-[#2F3336]">
            <p className="text-[9px] uppercase tracking-[0.25em] text-[#8A94A6]">
                {label}
            </p>
            <p className="font-display font-bold text-2xl leading-none mt-1 tabular-nums" style={{ color }}>
                {value ?? 0}
                {sub && <span className="text-xs text-[#4B5563] ml-1">{sub}</span>}
            </p>
        </div>
    );
}
