import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SettingsSheet({ open, onClose, settings, onSave }) {
    const [form, setForm] = useState({
        api_key: "",
        my_faction_id: "",
        enemy_faction_id: "",
        my_faction_name: "",
        enemy_faction_name: "",
        use_mock: true,
    });

    useEffect(() => {
        if (settings) {
            setForm({
                api_key: "",
                my_faction_id: settings.my_faction_id || "",
                enemy_faction_id: settings.enemy_faction_id || "",
                my_faction_name: settings.my_faction_name || "",
                enemy_faction_name: settings.enemy_faction_name || "",
                use_mock: !!settings.use_mock,
            });
        }
    }, [settings, open]);

    if (!open) return null;

    const submit = (e) => {
        e.preventDefault();
        const payload = { ...form };
        if (!payload.api_key) delete payload.api_key;
        onSave(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex" data-testid="settings-sheet">
            <div className="flex-1 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <aside className="w-full max-w-md bg-[#0A0A0A] border-l border-[#2F3336] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#2F3336]">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-[#00E5FF]">
                            Ops Configuration
                        </p>
                        <h2 className="font-display font-bold text-xl uppercase tracking-wider text-[#E0E6ED] mt-1">
                            Signal Sources
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 border border-[#2F3336] hover:border-[#00E5FF] text-[#8A94A6] hover:text-[#00E5FF] flex items-center justify-center transition-colors duration-150"
                        data-testid="close-settings-button"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={submit} className="p-6 space-y-6">
                    <div className="flex items-center justify-between border border-[#2F3336] bg-black px-4 py-3">
                        <div>
                            <Label className="text-[11px] uppercase tracking-[0.2em] text-[#E0E6ED]">
                                Use mock data
                            </Label>
                            <p className="text-[10px] text-[#8A94A6] mt-1 uppercase tracking-wider">
                                Toggle off once you add a Torn API key
                            </p>
                        </div>
                        <Switch
                            checked={form.use_mock}
                            onCheckedChange={(v) => setForm((f) => ({ ...f, use_mock: v }))}
                            data-testid="switch-mock-mode"
                        />
                    </div>

                    <Field label="Torn API Key" hint={settings?.api_key ? `Currently set: ${settings.api_key}` : "Public or Limited key with faction permissions"}>
                        <Input
                            type="password"
                            placeholder="paste new key to replace"
                            value={form.api_key}
                            onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
                            className="rounded-none bg-black border-[#2F3336] font-mono text-sm focus-visible:ring-1 focus-visible:ring-[#00E5FF]"
                            data-testid="input-api-key"
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="My Faction ID">
                            <Input
                                value={form.my_faction_id}
                                onChange={(e) => setForm((f) => ({ ...f, my_faction_id: e.target.value }))}
                                className="rounded-none bg-black border-[#2F3336] font-mono text-sm focus-visible:ring-1 focus-visible:ring-[#00FF66]"
                                data-testid="input-my-faction-id"
                            />
                        </Field>
                        <Field label="My Faction Name">
                            <Input
                                value={form.my_faction_name}
                                onChange={(e) => setForm((f) => ({ ...f, my_faction_name: e.target.value }))}
                                className="rounded-none bg-black border-[#2F3336] font-mono text-sm focus-visible:ring-1 focus-visible:ring-[#00FF66]"
                                data-testid="input-my-faction-name"
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Enemy Faction ID">
                            <Input
                                value={form.enemy_faction_id}
                                onChange={(e) => setForm((f) => ({ ...f, enemy_faction_id: e.target.value }))}
                                className="rounded-none bg-black border-[#2F3336] font-mono text-sm focus-visible:ring-1 focus-visible:ring-[#FF3333]"
                                data-testid="input-enemy-faction-id"
                            />
                        </Field>
                        <Field label="Enemy Faction Name">
                            <Input
                                value={form.enemy_faction_name}
                                onChange={(e) => setForm((f) => ({ ...f, enemy_faction_name: e.target.value }))}
                                className="rounded-none bg-black border-[#2F3336] font-mono text-sm focus-visible:ring-1 focus-visible:ring-[#FF3333]"
                                data-testid="input-enemy-faction-name"
                            />
                        </Field>
                    </div>

                    <div className="border border-dashed border-[#2F3336] p-3 text-[10px] text-[#8A94A6] uppercase tracking-wider leading-relaxed">
                        // The app polls both factions every 30s. Historical snapshots are
                        kept in the Mongo-backed signal buffer and drive the activity timeline.
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="rounded-none border-[#2F3336] bg-black hover:bg-[#121212] text-[#E0E6ED] uppercase tracking-wider text-xs"
                            data-testid="cancel-settings-button"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-none bg-[#00E5FF] hover:bg-[#00FF66] text-black font-display font-bold uppercase tracking-wider"
                            data-testid="save-settings-button"
                        >
                            Commit
                        </Button>
                    </div>
                </form>
            </aside>
        </div>
    );
}

function Field({ label, hint, children }) {
    return (
        <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-[0.25em] text-[#8A94A6]">
                {label}
            </Label>
            {children}
            {hint && (
                <p className="text-[10px] text-[#4B5563] uppercase tracking-wider">
                    {hint}
                </p>
            )}
        </div>
    );
}
