export default function HeaderStat({ label, value, sub, total, accent, icon: Icon, testid }) {
    return (
        <div
            data-testid={testid}
            className="border-r last:border-r-0 border-[#2F3336] px-6 py-4 bg-black/50 flex items-center justify-between gap-4"
        >
            <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#8A94A6]">{label}</p>
                <div className="flex items-baseline gap-2 mt-1">
                    <span
                        className="font-display font-black text-3xl leading-none tabular-nums"
                        style={{ color: accent }}
                    >
                        {value}
                    </span>
                    {total != null && (
                        <span className="text-[11px] text-[#4B5563] font-mono tabular-nums">
                            / {total}
                        </span>
                    )}
                    {sub && (
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#8A94A6]">
                            {sub}
                        </span>
                    )}
                </div>
            </div>
            {Icon && (
                <div className="w-10 h-10 border flex items-center justify-center" style={{ borderColor: accent }}>
                    <Icon className="w-4 h-4" style={{ color: accent }} />
                </div>
            )}
        </div>
    );
}
