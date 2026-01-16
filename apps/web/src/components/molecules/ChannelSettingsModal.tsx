"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { X, Hash, Shield, Clock, Check, Loader2 } from "lucide-react";
import { useChannelPermissions } from "@/hooks/useChannelPermissions";
import { supabase } from "@/lib/supabase";

interface ChannelSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    channelId: string;
    channelName: string;
    serverId: string;
}

const SLOWMODE_OPTIONS = [
    { value: 0, label: "Off" },
    { value: 5, label: "5s" },
    { value: 10, label: "10s" },
    { value: 30, label: "30s" },
    { value: 60, label: "1m" },
    { value: 300, label: "5m" },
    { value: 600, label: "10m" },
];

export function ChannelSettingsModal({ isOpen, onClose, channelId, channelName, serverId }: ChannelSettingsModalProps) {
    const { roles, loading, updatePermission, getPermissionForRole } = useChannelPermissions(channelId, serverId);
    const [name, setName] = useState(channelName);
    const [activeTab, setActiveTab] = useState<"general" | "permissions">("general");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setName(channelName);
    }, [channelName]);

    if (!isOpen) return null;

    const handleSaveName = async () => {
        if (name.trim() === channelName) return;
        setSaving(true);
        await supabase.from("groups").update({ name: name.trim() }).eq("id", channelId);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleToggle = async (roleId: string, field: "can_send" | "can_attach" | "can_mention", current: boolean) => {
        await updatePermission(roleId, field, !current);
    };

    const handleSlowmode = async (roleId: string, seconds: number) => {
        await updatePermission(roleId, "slowmode_seconds", seconds);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                    <div className="flex items-center gap-2">
                        <Hash className="h-5 w-5 text-gray-500" />
                        <h2 className="font-semibold text-lg">Channel Settings</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex border-b">
                    <button
                        onClick={() => setActiveTab("general")}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "general" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                    >
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab("permissions")}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "permissions" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                    >
                        <span className="flex items-center justify-center gap-1">
                            <Shield className="h-4 w-4" /> Permissions
                        </span>
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    {activeTab === "general" && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Channel Name</label>
                                <div className="flex gap-2">
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Channel name"
                                        className="flex-1"
                                    />
                                    <Button onClick={handleSaveName} disabled={saving || name.trim() === channelName}>
                                        {saved ? <Check className="h-4 w-4" /> : saving ? "Saving..." : "Save"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "permissions" && (
                        <div className="space-y-4">
                            {loading ? (
                                <div className="flex items-center justify-center text-gray-500 py-8 gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Loading permissions...
                                </div>
                            ) : roles.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">No roles found for this server.</div>
                            ) : (
                                roles.map((role) => {
                                    const perm = getPermissionForRole(role.id);
                                    return (
                                        <div key={role.id} className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: role.color || "#99aab5" }}
                                                    />
                                                    <span className="font-medium text-gray-900">{role.name}</span>
                                                </div>
                                                <span className="text-xs text-gray-400">Position: {role.position}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={perm.can_send}
                                                        onChange={() => handleToggle(role.id, "can_send", perm.can_send)}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm text-gray-700">Send Messages</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={perm.can_attach}
                                                        onChange={() => handleToggle(role.id, "can_attach", perm.can_attach)}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm text-gray-700">Attach Files</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={perm.can_mention}
                                                        onChange={() => handleToggle(role.id, "can_mention", perm.can_mention)}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm text-gray-700">Mention Users</span>
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-gray-400" />
                                                    <select
                                                        value={perm.slowmode_seconds}
                                                        onChange={(e) => handleSlowmode(role.id, parseInt(e.target.value))}
                                                        className="text-sm border rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        {SLOWMODE_OPTIONS.map((opt) => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                    <span className="text-xs text-gray-500">Slowmode</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <Button onClick={onClose}>Done</Button>
                </div>
            </div>
        </div>
    );
}
