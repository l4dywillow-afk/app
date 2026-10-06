import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
    fetchLive,
    fetchHistory,
    fetchSettings,
    saveSettings,
    seedHistory,
    clearHistory,
} from "@/lib/api";
import {
    Activity,
    Crosshair,
    Radio,
    Settings as SettingsIcon,
    ShieldAlert,
    Siren,
    Database,
    Trash2,
    RefreshCw,
} from "lucide-react";
import FactionPanel from "@/components/FactionPanel";
import TimelineChart from "@/components/TimelineChart";
import SettingsSheet from "@/components/SettingsSheet";
import HeaderStat from "@/components/HeaderStat";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 30000;

export default function Dashboard() {
    const [live, setLive] = useState(null);
    const [history, setHistory] = useState([]);
    const [range, setRange] = useState(6);
    const [settings, setSettings] = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [tick, setTick] = useState(POLL_INTERVAL_MS / 1000);
    const [flashKey, setFlashKey] = useState(0);
    const [loading, setLoading] = useState(true);
    const livePaneRef = useRef(null);

    const loadLive = async () => {
        try {
            const data = await fetchLive();
            setLive(data);
            setFlashKey((k) => k + 1);
        } catch (e) {
            toast.error("Failed to pull live faction data", {
                description: e?.response?.data?.detail || e.message,
            });
        }
    };

    const loadHistory = async (h) => {
        try {
            const pts = await fetchHistory(h);
            setHistory(pts);
        } catch (e) {
            console.error(e);
        }
    };

    const loadSettings = async () => {
        try {
            const s = await fetchSettings();
            setSettings(s);
            return s;
        } catch (e) {
            console.error(e);
            return null;
        }
    };

    // Initial boot
    useEffect(() => {
        (async () => {
            setLoading(true);
            const s = await loadSettings();
            await loadLive();
            await loadHistory(range);
            // If we have fewer than ~10 history points on a fresh db, seed some
            if (s) {
                const existing = await fetchHistory(24).catch(() => []);
                if (existing.length < 10) {
                    await seedHistory(24).catch(() => {});
                    await loadHistory(range);
                }
            }
            setLoading(false);
        })();
    }, []);

    // Polling + countdown
    useEffect(() => {
        const timer = setInterval(() => {
            setTick((t) => {
                if (t <= 1) {
                    loadLive();
                    loadHistory(range);
                    return POLL_INTERVAL_MS / 1000;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [range]);

    useEffect(() => {
        loadHistory(range);
    }, [range]);

    const manualRefresh = async () => {
        setTick(POLL_INTERVAL_MS / 1000);
        await loadLive();
        await loadHistory(range);
        toast.success("Signals refreshed");
    };

    const onSaveSettings = async (payload) => {
        const next = await saveSettings(payload);
        setSettings(next);
        toast.success("Settings committed to ops channel");
        setSettingsOpen(false);
        await loadLive();
    };

    const onReseed = async () => {
        await clearHistory();
        await seedHistory(24);
        await loadHistory(range);
        toast.success("History buffer repopulated with 24h of signals");
    };

    const mineActiveNow = live?.mine?.active_count ?? 0;
    const enemyActiveNow = live?.enemy?.active_count ?? 0;
    const activityDelta = mineActiveNow - enemyActiveNow;

    const sourceLabel = live?.source === "torn" ? "TORN LIVE FEED" : "MOCK SIMULATION";
    const sourceColor = live?.source === "torn" ? "text-[#00FF66]" : "text-[#00E5FF]";

    return (
        <div className="relative min-h-screen bg-[#050505] text-[#E0E6ED] font-mono" data-testid="dashboard-root">
            <div className="absolute inset-0 hud-grid opacity-50 pointer-events-none" />
            <div className="relative z-10">
                {/* HEADER */}
                <header className="border-b border-[#2F3336] bg-[#0A0A0A]/80 backdrop-blur-sm">
                    <div className="px-6 py-4 flex items-center justify-between gap-6 flex-wrap">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 border border-[#00E5FF] flex items-center justify-center">
                                <Crosshair className="w-5 h-5 text-[#00E5FF] tactical-glow-cyan" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h1 className="font-display font-black text-2xl uppercase tracking-wider leading-none text-[#E0E6ED]">
                                    FACTION<span className="text-[#00E5FF]">OPS</span>
                                </h1>
                                <p className="text-[10px] uppercase tracking-[0.3em] text-[#8A94A6] mt-1">
                                    Torn Activity Signal Grid
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex items-center gap-2 px-3 py-2 border border-[#2F3336] bg-black">
                                <span className={`w-2 h-2 rounded-full bg-current ${sourceColor} blink`} />
                                <span className={`text-[11px] uppercase tracking-[0.2em] ${sourceColor} font-semibold`} data-testid="source-badge">
                                    {sourceLabel}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 px-3 py-2 border border-[#2F3336] bg-black" data-testid="poll-countdown">
                                <Radio className="w-3.5 h-3.5 text-[#00FF66] tactical-glow-green" />
                                <span className="text-[11px] uppercase tracking-[0.2em] text-[#8A94A6]">next pull</span>
                                <span className="font-display font-bold text-base text-[#00FF66] tabular-nums">
                                    {String(tick).padStart(2, "0")}s
                                </span>
                            </div>

                            <Button
                                variant="outline"
                                onClick={manualRefresh}
                                className="h-9 border-[#2F3336] bg-black hover:bg-[#121212] hover:border-[#00E5FF] text-[#E0E6ED] uppercase tracking-wider text-xs rounded-none"
                                data-testid="refresh-button"
                            >
                                <RefreshCw className="w-3.5 h-3.5 mr-2" />
                                Pull Now
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => setSettingsOpen(true)}
                                className="h-9 border-[#2F3336] bg-black hover:bg-[#121212] hover:border-[#00E5FF] text-[#E0E6ED] uppercase tracking-wider text-xs rounded-none"
                                data-testid="open-settings-button"
                            >
                                <SettingsIcon className="w-3.5 h-3.5 mr-2" />
                                Ops Config
                            </Button>
                        </div>
                    </div>

                    {/* HEADER STATS STRIP */}
                    <div className="border-t border-[#2F3336] grid grid-cols-2 md:grid-cols-4">
                        <HeaderStat
                            label="My Active"
                            value={mineActiveNow}
                            total={live?.mine?.members?.length}
                            accent="#00FF66"
                            icon={Activity}
                            testid="stat-mine-active"
                        />
                        <HeaderStat
                            label="Enemy Active"
                            value={enemyActiveNow}
                            total={live?.enemy?.members?.length}
                            accent="#FF3333"
                            icon={Siren}
                            testid="stat-enemy-active"
                        />
                        <HeaderStat
                            label="Advantage"
                            value={`${activityDelta >= 0 ? "+" : ""}${activityDelta}`}
                            sub={activityDelta >= 0 ? "WE LEAD" : "ENEMY LEADS"}
                            accent={activityDelta >= 0 ? "#00FF66" : "#FF3333"}
                            icon={ShieldAlert}
                            testid="stat-advantage"
                        />
                        <HeaderStat
                            label="Window"
                            value={`${range}h`}
                            sub="Signals Captured"
                            accent="#00E5FF"
                            icon={Database}
                            testid="stat-window"
                        />
                    </div>
                </header>

                {/* MAIN GRID */}
                <main className="px-6 py-6 space-y-6">
                    <section
                        ref={livePaneRef}
                        key={flashKey}
                        className="scan-flash grid grid-cols-1 lg:grid-cols-2 gap-4"
                        data-testid="live-grid"
                    >
                        <FactionPanel
                            side="mine"
                            data={live?.mine}
                            loading={loading}
                        />
                        <FactionPanel
                            side="enemy"
                            data={live?.enemy}
                            loading={loading}
                        />
                    </section>

                    <section>
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.3em] text-[#8A94A6]">
                                    historical signals
                                </p>
                                <h2 className="font-display font-bold text-xl uppercase tracking-wider text-[#E0E6ED]">
                                    Activity Timeline
                                </h2>
                            </div>

                            <div className="flex items-center gap-2">
                                {[1, 6, 24, 72, 168].map((h) => (
                                    <button
                                        key={h}
                                        onClick={() => setRange(h)}
                                        data-testid={`range-${h}h`}
                                        className={`px-3 py-2 text-[11px] uppercase tracking-[0.2em] border transition-colors duration-150 ${
                                            range === h
                                                ? "border-[#00E5FF] bg-[#00E5FF]/10 text-[#00E5FF]"
                                                : "border-[#2F3336] bg-black text-[#8A94A6] hover:border-[#8A94A6] hover:text-[#E0E6ED]"
                                        }`}
                                    >
                                        {h < 24 ? `${h}h` : `${h / 24}d`}
                                    </button>
                                ))}
                                <button
                                    onClick={onReseed}
                                    data-testid="reseed-button"
                                    className="px-3 py-2 text-[11px] uppercase tracking-[0.2em] border border-[#2F3336] bg-black text-[#FFB300] hover:border-[#FFB300] transition-colors duration-150 flex items-center gap-2"
                                    title="Clear + reseed synthetic 24h history"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Reseed
                                </button>
                            </div>
                        </div>

                        <div className="border border-[#2F3336] bg-[#0A0A0A]">
                            <TimelineChart
                                points={history}
                                mineName={live?.mine?.faction_name || "My Faction"}
                                enemyName={live?.enemy?.faction_name || "Enemy"}
                            />
                        </div>
                    </section>
                </main>

                <footer className="border-t border-[#2F3336] px-6 py-3 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-[#4B5563]">
                    <span>// FACTIONOPS • TACTICAL SIGNAL CONSOLE</span>
                    <span>
                        last pull •{" "}
                        {live?.fetched_at
                            ? new Date(live.fetched_at).toLocaleTimeString()
                            : "--:--:--"}
                    </span>
                </footer>
            </div>

            <SettingsSheet
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                settings={settings}
                onSave={onSaveSettings}
            />
        </div>
    );
}
