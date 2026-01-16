"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { X, Hash, Shield, Clock, Check, Loader2, Eye, MessageSquare, Paperclip, Link2, Smile, AtSign, Users, Trash2, Pin, UserPlus } from "lucide-react";
import { useChannelPermissions, PermissionField } from "@/hooks/useChannelPermissions";
import { useChannelCategories } from "@/hooks/useChannelCategories";
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

type PermissionConfig = {
    key: PermissionField;
    label: string;
    icon: React.ReactNode;
    description: string;
};

const PERMISSION_CATEGORIES: { title: string; permissions: PermissionConfig[] }[] = [
    {
        title: "Basic",
        permissions: [
            { key: "can_view", label: "View Channel", icon: <Eye className="h-4 w-4" />, description: "See this channel" },
            { key: "can_send", label: "Send Messages", icon: <MessageSquare className="h-4 w-4" />, description: "Send messages in this channel" },
            { key: "can_read_history", label: "Read History", icon: <Clock className="h-4 w-4" />, description: "View past messages" },
        ],
    },
    {
        title: "Content",
        permissions: [
            { key: "can_attach", label: "Attach Files", icon: <Paperclip className="h-4 w-4" />, description: "Upload files and images" },
            { key: "can_embed_links", label: "Embed Links", icon: <Link2 className="h-4 w-4" />, description: "Show link previews" },
            { key: "can_add_reactions", label: "Add Reactions", icon: <Smile className="h-4 w-4" />, description: "React to messages" },
            { key: "can_use_external_emojis", label: "External Emojis", icon: <Smile className="h-4 w-4" />, description: "Use emojis from other servers" },
        ],
    },
    {
        title: "Interaction",
        permissions: [
            { key: "can_mention", label: "Mention Users", icon: <AtSign className="h-4 w-4" />, description: "Mention specific users" },
            { key: "can_mention_everyone", label: "Mention @everyone", icon: <Users className="h-4 w-4" />, description: "Mention all members" },
            { key: "can_create_invite", label: "Create Invite", icon: <UserPlus className="h-4 w-4" />, description: "Create channel invites" },
        ],
    },
    {
        title: "Moderation",
        permissions: [
            { key: "can_manage", label: "Manage Channel", icon: <Shield className="h-4 w-4" />, description: "Edit channel settings" },
            { key: "can_delete_messages", label: "Delete Messages", icon: <Trash2 className="h-4 w-4" />, description: "Delete others' messages" },
            { key: "can_pin_messages", label: "Pin Messages", icon: <Pin className="h-4 w-4" />, description: "Pin messages to channel" },
        ],
    },
];

export function ChannelSettingsModal({ isOpen, onClose, channelId, channelName, serverId }: ChannelSettingsModalProps) {
    const { roles, loading, updatePermission, getPermissionForRole } = useChannelPermissions(channelId, serverId);
    const { categories } = useChannelCategories(serverId);
    const [name, setName] = useState(channelName);
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"general" | "permissions">("general");
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setName(channelName);
        // Fetch current category
        supabase.from("groups").select("category_id").eq("id", channelId).single()
            .then(({ data }) => {
                if (data) setCategoryId(data.category_id);
            });
    }, [channelName, channelId]);

    useEffect(() => {
        if (roles.length > 0 && !selectedRoleId) {
            setSelectedRoleId(roles[0].id);
        }
    }, [roles, selectedRoleId]);

    if (!isOpen) return null;

    const handleSaveName = async () => {
        setSaving(true);
        // Update both name and category
        await supabase.from("groups")
            .update({
                name: name.trim(),
                category_id: categoryId
            })
            .eq("id", channelId);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleToggle = async (field: PermissionField, current: boolean) => {
        if (!selectedRoleId) return;
        await updatePermission(selectedRoleId, field, !current);
    };

    const handleSlowmode = async (seconds: number) => {
        if (!selectedRoleId) return;
        await updatePermission(selectedRoleId, "slowmode_seconds", seconds);
    };

    const selectedRole = roles.find((r) => r.id === selectedRoleId);
    const perm = selectedRoleId ? getPermissionForRole(selectedRoleId) : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                    <div className="flex items-center gap-2">
                        <Hash className="h-5 w-5 text-gray-500" />
                        <h2 className="font-semibold text-lg">Channel Settings</h2>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">{channelName}</span>
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

                <div className="flex-1 overflow-auto">
                    {activeTab === "general" && (
                        <div className="p-6 space-y-6">
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

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                <div className="flex gap-2">
                                    <select
                                        value={categoryId || ""}
                                        onChange={(e) => setCategoryId(e.target.value || null)}
                                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">No Category</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                    <Button onClick={handleSaveName} disabled={saving}>
                                        {saved ? <Check className="h-4 w-4" /> : saving ? "Saving..." : "Save"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "permissions" && (
                        <div className="flex h-[500px]">
                            {loading ? (
                                <div className="flex-1 flex items-center justify-center text-gray-500 gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Loading permissions...
                                </div>
                            ) : (
                                <>
                                    <div className="w-48 border-r bg-gray-50 p-3 space-y-1 overflow-auto">
                                        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Roles</div>
                                        {roles.map((role) => (
                                            <button
                                                key={role.id}
                                                onClick={() => setSelectedRoleId(role.id)}
                                                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors ${selectedRoleId === role.id ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 text-gray-700"}`}
                                            >
                                                <div
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: role.color || "#99aab5" }}
                                                />
                                                <span className="truncate">{role.name}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex-1 p-6 overflow-auto">
                                        {selectedRole && perm && (
                                            <>
                                                <div className="flex items-center gap-2 mb-6">
                                                    <div
                                                        className="w-4 h-4 rounded-full"
                                                        style={{ backgroundColor: selectedRole.color || "#99aab5" }}
                                                    />
                                                    <h3 className="font-semibold text-lg">{selectedRole.name}</h3>
                                                </div>

                                                {PERMISSION_CATEGORIES.map((category) => (
                                                    <div key={category.title} className="mb-6">
                                                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">{category.title}</h4>
                                                        <div className="space-y-2">
                                                            {category.permissions.map((permission) => (
                                                                <label
                                                                    key={permission.key}
                                                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-gray-500">{permission.icon}</span>
                                                                        <div>
                                                                            <div className="text-sm font-medium text-gray-900">{permission.label}</div>
                                                                            <div className="text-xs text-gray-500">{permission.description}</div>
                                                                        </div>
                                                                    </div>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={perm[permission.key] as boolean}
                                                                        onChange={() => handleToggle(permission.key, perm[permission.key] as boolean)}
                                                                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                    />
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}

                                                <div className="mb-6">
                                                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Rate Limiting</h4>
                                                    <div className="p-3 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <Clock className="h-4 w-4 text-gray-500" />
                                                                <div>
                                                                    <div className="text-sm font-medium text-gray-900">Slowmode</div>
                                                                    <div className="text-xs text-gray-500">Limit how often users can send messages</div>
                                                                </div>
                                                            </div>
                                                            <select
                                                                value={perm.slowmode_seconds}
                                                                onChange={(e) => handleSlowmode(parseInt(e.target.value))}
                                                                className="text-sm border rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                                            >
                                                                {SLOWMODE_OPTIONS.map((opt) => (
                                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
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
