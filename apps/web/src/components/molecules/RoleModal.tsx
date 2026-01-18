"use client";

import { useState, useEffect } from "react";
import { X, Shield, ShieldCheck, Settings, Users, MessageSquare, UserX, Ban, Volume2 } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";

type Permissions = {
    ADMINISTRATOR?: boolean;
    MANAGE_SERVER?: boolean;
    MANAGE_CHANNELS?: boolean;
    MANAGE_ROLES?: boolean;
    KICK_MEMBERS?: boolean;
    BAN_MEMBERS?: boolean;
    MODERATE_MEMBERS?: boolean;
    SEND_MESSAGES?: boolean;
    CREATE_INSTANT_INVITE?: boolean;
};

interface RoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { name: string; color: string; permissions: Permissions }) => void;
    initialData?: { id: string; name: string; color: string; permissions: Permissions };
    mode: "create" | "edit";
}

const PERMISSION_OPTIONS: { key: keyof Permissions; label: string; description: string; icon: React.ReactNode }[] = [
    { key: "ADMINISTRATOR", label: "Administrator", description: "Full access to all settings", icon: <ShieldCheck className="h-4 w-4" /> },
    { key: "MANAGE_SERVER", label: "Manage Server", description: "Edit server name, icon, and rules", icon: <Settings className="h-4 w-4" /> },
    { key: "MANAGE_CHANNELS", label: "Manage Channels", description: "Create, edit, and delete channels", icon: <MessageSquare className="h-4 w-4" /> },
    { key: "MANAGE_ROLES", label: "Manage Roles", description: "Create, edit, and assign roles", icon: <Shield className="h-4 w-4" /> },
    { key: "KICK_MEMBERS", label: "Kick Members", description: "Remove members from the server", icon: <UserX className="h-4 w-4" /> },
    { key: "BAN_MEMBERS", label: "Ban Members", description: "Permanently ban members", icon: <Ban className="h-4 w-4" /> },
    { key: "MODERATE_MEMBERS", label: "Moderate Members", description: "Mute and timeout members", icon: <Volume2 className="h-4 w-4" /> },
    { key: "SEND_MESSAGES", label: "Send Messages", description: "Send messages in channels", icon: <MessageSquare className="h-4 w-4" /> },
    { key: "CREATE_INSTANT_INVITE", label: "Create Invites", description: "Create invite links for the server", icon: <Users className="h-4 w-4" /> },
];

const COLOR_PRESETS = [
    "#e74c3c", "#e91e63", "#9c27b0", "#673ab7",
    "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4",
    "#009688", "#4caf50", "#8bc34a", "#cddc39",
    "#ffeb3b", "#ffc107", "#ff9800", "#ff5722",
    "#795548", "#607d8b", "#99aab5", "#36393f",
];

export function RoleModal({ isOpen, onClose, onSave, initialData, mode }: RoleModalProps) {
    const [name, setName] = useState("");
    const [color, setColor] = useState("#99aab5");
    const [permissions, setPermissions] = useState<Permissions>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && initialData) {
            setName(initialData.name);
            setColor(initialData.color || "#99aab5");
            setPermissions(initialData.permissions || {});
        } else if (isOpen && mode === "create") {
            setName("");
            setColor("#99aab5");
            setPermissions({ SEND_MESSAGES: true, CREATE_INSTANT_INVITE: true });
        }
    }, [isOpen, initialData, mode]);

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        await onSave({ name: name.trim(), color, permissions });
        setSaving(false);
        onClose();
    };

    const togglePermission = (key: keyof Permissions) => {
        if (key === "ADMINISTRATOR") {
            if (!permissions.ADMINISTRATOR) {
                const allPerms: Permissions = {};
                PERMISSION_OPTIONS.forEach((p) => (allPerms[p.key] = true));
                setPermissions(allPerms);
            } else {
                setPermissions({ SEND_MESSAGES: true, CREATE_INSTANT_INVITE: true });
            }
        } else {
            setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">
                        {mode === "create" ? "Create Role" : "Edit Role"}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Role Name</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter role name..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Role Color</label>
                        <div className="flex items-center gap-3 mb-3">
                            <div
                                className="h-12 w-12 rounded-full border-2 shadow-inner"
                                style={{ backgroundColor: color }}
                            />
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="h-9 w-9 p-0.5 rounded border cursor-pointer"
                                />
                                <Input
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="w-24 font-mono text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {COLOR_PRESETS.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? "ring-2 ring-offset-1 ring-blue-500" : ""}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                        <div className="space-y-1 bg-gray-50 rounded-lg p-2">
                            {PERMISSION_OPTIONS.map((perm) => (
                                <label
                                    key={perm.key}
                                    className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-colors ${permissions[perm.key] ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-100"
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={!!permissions[perm.key]}
                                        onChange={() => togglePermission(perm.key)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 font-medium text-sm">
                                            {perm.icon}
                                            {perm.label}
                                        </div>
                                        <div className="text-xs text-gray-500">{perm.description}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !name.trim()}>
                        {saving ? "Saving..." : mode === "create" ? "Create Role" : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
