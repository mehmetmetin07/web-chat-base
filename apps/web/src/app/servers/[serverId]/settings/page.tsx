"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Crown, Shield, User, UserX, Ban, Undo2, AlertTriangle, FileType, MessageSquare } from "lucide-react";
import { Database } from "@/types/supabase";

type ServerMember = {
    id: string;
    user_id: string;
    role: string;
    users: Database["public"]["Tables"]["users"]["Row"];
};

type BannedUser = {
    id: string;
    user_id: string;
    reason: string | null;
    users: Database["public"]["Tables"]["users"]["Row"];
};

type ServerSettings = {
    id: string;
    server_id: string;
    banned_words: string[];
    allowed_file_types: string[];
    spam_threshold: number;
    spam_window_seconds: number;
    spam_action: string;
    link_filter: boolean;
    invite_filter: boolean;
};

const FILE_TYPE_OPTIONS = [
    { value: "jpg", label: "JPG" },
    { value: "jpeg", label: "JPEG" },
    { value: "png", label: "PNG" },
    { value: "gif", label: "GIF" },
    { value: "webp", label: "WebP" },
    { value: "pdf", label: "PDF" },
    { value: "txt", label: "TXT" },
    { value: "doc", label: "DOC" },
    { value: "docx", label: "DOCX" },
    { value: "mp4", label: "MP4" },
    { value: "mp3", label: "MP3" },
    { value: "zip", label: "ZIP" },
];

export default function ServerSettingsPage({
    params,
}: {
    params: Promise<{ serverId: string }>;
}) {
    const { serverId } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [server, setServer] = useState<any>(null);
    const [members, setMembers] = useState<ServerMember[]>([]);
    const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
    const [settings, setSettings] = useState<ServerSettings | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isOwner, setIsOwner] = useState(false);
    const [serverName, setServerName] = useState("");
    const [serverRules, setServerRules] = useState("");
    const [bannedWordsText, setBannedWordsText] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<"general" | "members" | "bans" | "automod">("general");

    useEffect(() => {
        const loadSettings = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            setCurrentUserId(user.id);

            const { data: serverData } = await supabase
                .from("servers")
                .select("*")
                .eq("id", serverId)
                .single();

            if (serverData) {
                setServer(serverData);
                setServerName(serverData.name);
                setServerRules(serverData.description || "");
                setIsOwner(serverData.owner_id === user.id);
            }

            const { data: membersData } = await supabase
                .from("server_members")
                .select("*, users(*)")
                .eq("server_id", serverId);

            if (membersData) {
                setMembers(membersData as any);
            }

            const { data: bansData } = await supabase
                .from("server_bans")
                .select("*, users(*)")
                .eq("server_id", serverId);

            if (bansData) {
                setBannedUsers(bansData as any);
            }

            const { data: settingsData } = await supabase
                .from("server_settings")
                .select("*")
                .eq("server_id", serverId)
                .single();

            if (settingsData) {
                setSettings(settingsData as any);
                setBannedWordsText((settingsData.banned_words || []).join(", "));
            }

            setLoading(false);
        };

        loadSettings();
    }, [serverId, router]);

    const handleSaveServer = async () => {
        if (!isOwner || !server) return;
        setSaving(true);
        setMessage(null);

        const { error } = await supabase
            .from("servers")
            .update({ name: serverName, description: serverRules })
            .eq("id", server.id);

        if (error) {
            setMessage({ type: "error", text: error.message });
        } else {
            setMessage({ type: "success", text: "Server settings saved!" });
        }
        setSaving(false);
    };

    const handleSaveAutoMod = async () => {
        if (!isOwner || !settings) return;
        setSaving(true);
        setMessage(null);

        const bannedWords = bannedWordsText
            .split(",")
            .map((w) => w.trim().toLowerCase())
            .filter((w) => w.length > 0);

        const { error } = await supabase
            .from("server_settings")
            .update({
                banned_words: bannedWords,
                allowed_file_types: settings.allowed_file_types,
                spam_threshold: settings.spam_threshold,
                spam_window_seconds: settings.spam_window_seconds,
                spam_action: settings.spam_action,
                link_filter: settings.link_filter,
                invite_filter: settings.invite_filter,
            })
            .eq("id", settings.id);

        if (error) {
            setMessage({ type: "error", text: error.message });
        } else {
            setMessage({ type: "success", text: "Auto-moderation settings saved!" });
        }
        setSaving(false);
    };

    const handleRoleChange = async (memberId: string, userId: string, newRole: string) => {
        if (!isOwner || userId === currentUserId) return;

        const { error } = await supabase
            .from("server_members")
            .update({ role: newRole })
            .eq("id", memberId);

        if (!error) {
            setMembers((prev) =>
                prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
            );
        }
    };

    const handleKick = async (memberId: string, userId: string) => {
        if (!isOwner || userId === currentUserId) return;

        const { error } = await supabase
            .from("server_members")
            .delete()
            .eq("id", memberId);

        if (!error) {
            setMembers((prev) => prev.filter((m) => m.id !== memberId));
        }
    };

    const handleBan = async (memberId: string, userId: string, reason: string = "") => {
        if (!isOwner || userId === currentUserId) return;

        const member = members.find((m) => m.id === memberId);
        if (!member) return;

        await supabase.from("server_members").delete().eq("id", memberId);

        const { data } = await supabase
            .from("server_bans")
            .insert({
                server_id: serverId,
                user_id: userId,
                banned_by: currentUserId,
                reason: reason || null,
            })
            .select("*, users(*)")
            .single();

        if (data) {
            setMembers((prev) => prev.filter((m) => m.id !== memberId));
            setBannedUsers((prev) => [...prev, data as any]);
        }
    };

    const handleUnban = async (banId: string) => {
        if (!isOwner) return;

        const { error } = await supabase.from("server_bans").delete().eq("id", banId);

        if (!error) {
            setBannedUsers((prev) => prev.filter((b) => b.id !== banId));
        }
    };

    const toggleFileType = (type: string) => {
        if (!settings) return;
        const current = settings.allowed_file_types || [];
        const updated = current.includes(type)
            ? current.filter((t) => t !== type)
            : [...current, type];
        setSettings({ ...settings, allowed_file_types: updated });
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "owner":
                return <Crown className="h-4 w-4 text-yellow-500" />;
            case "admin":
                return <Shield className="h-4 w-4 text-blue-500" />;
            case "moderator":
                return <Shield className="h-4 w-4 text-green-500" />;
            default:
                return <User className="h-4 w-4 text-gray-400" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!isOwner) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
                    <p className="text-gray-500 mb-4">Only server owners can access settings</p>
                    <Button onClick={() => router.back()}>Go Back</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto px-4 py-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>

                <h1 className="text-2xl font-bold text-gray-900 mb-6">Server Settings</h1>

                <div className="flex gap-2 mb-6 flex-wrap">
                    <button
                        onClick={() => setActiveTab("general")}
                        className={`px-4 py-2 rounded ${activeTab === "general" ? "bg-blue-600 text-white" : "bg-white border"}`}
                    >
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab("automod")}
                        className={`px-4 py-2 rounded flex items-center gap-2 ${activeTab === "automod" ? "bg-blue-600 text-white" : "bg-white border"}`}
                    >
                        <AlertTriangle className="h-4 w-4" />
                        Auto-Mod
                    </button>
                    <button
                        onClick={() => setActiveTab("members")}
                        className={`px-4 py-2 rounded ${activeTab === "members" ? "bg-blue-600 text-white" : "bg-white border"}`}
                    >
                        Members ({members.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("bans")}
                        className={`px-4 py-2 rounded ${activeTab === "bans" ? "bg-blue-600 text-white" : "bg-white border"}`}
                    >
                        Bans ({bannedUsers.length})
                    </button>
                </div>

                {activeTab === "general" && (
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Server Name</label>
                                <Input value={serverName} onChange={(e) => setServerName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Invite Code</label>
                                <code className="block bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                                    {server?.invite_code}
                                </code>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Server Rules</label>
                                <textarea
                                    value={serverRules}
                                    onChange={(e) => setServerRules(e.target.value)}
                                    className="w-full h-32 px-3 py-2 border rounded-md resize-none"
                                    placeholder="Enter server rules..."
                                />
                            </div>
                        </div>
                        {message && activeTab === "general" && (
                            <div className={`mt-4 p-3 rounded ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                {message.text}
                            </div>
                        )}
                        <div className="mt-4">
                            <Button onClick={handleSaveServer} disabled={saving}>
                                {saving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                )}

                {activeTab === "automod" && settings && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-sm border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Banned Words
                            </h2>
                            <textarea
                                value={bannedWordsText}
                                onChange={(e) => setBannedWordsText(e.target.value)}
                                className="w-full h-24 px-3 py-2 border rounded-md resize-none"
                                placeholder="Enter banned words separated by comma: word1, word2, word3"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Messages containing these words will be blocked
                            </p>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <FileType className="h-5 w-5" />
                                Allowed File Types
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {FILE_TYPE_OPTIONS.map((type) => (
                                    <label
                                        key={type.value}
                                        className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer ${settings.allowed_file_types?.includes(type.value)
                                                ? "bg-blue-50 border-blue-500 text-blue-700"
                                                : "bg-gray-50"
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={settings.allowed_file_types?.includes(type.value)}
                                            onChange={() => toggleFileType(type.value)}
                                            className="sr-only"
                                        />
                                        .{type.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Spam Protection</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Max messages in window
                                    </label>
                                    <Input
                                        type="number"
                                        value={settings.spam_threshold}
                                        onChange={(e) => setSettings({ ...settings, spam_threshold: parseInt(e.target.value) || 5 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Window (seconds)
                                    </label>
                                    <Input
                                        type="number"
                                        value={settings.spam_window_seconds}
                                        onChange={(e) => setSettings({ ...settings, spam_window_seconds: parseInt(e.target.value) || 10 })}
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Action on spam
                                </label>
                                <select
                                    value={settings.spam_action}
                                    onChange={(e) => setSettings({ ...settings, spam_action: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                >
                                    <option value="warn">Warn</option>
                                    <option value="mute">Mute</option>
                                    <option value="kick">Kick</option>
                                    <option value="ban">Ban</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Link Filters</h2>
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.link_filter}
                                        onChange={(e) => setSettings({ ...settings, link_filter: e.target.checked })}
                                        className="h-4 w-4"
                                    />
                                    <span>Block all external links</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.invite_filter}
                                        onChange={(e) => setSettings({ ...settings, invite_filter: e.target.checked })}
                                        className="h-4 w-4"
                                    />
                                    <span>Block Discord/Server invite links</span>
                                </label>
                            </div>
                        </div>

                        {message && activeTab === "automod" && (
                            <div className={`p-3 rounded ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                {message.text}
                            </div>
                        )}
                        <Button onClick={handleSaveAutoMod} disabled={saving}>
                            {saving ? "Saving..." : "Save Auto-Mod Settings"}
                        </Button>
                    </div>
                )}

                {activeTab === "members" && (
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Members</h2>
                        <div className="space-y-3">
                            {members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                                            {member.users?.email?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">
                                                    {member.users?.username || member.users?.full_name || member.users?.email?.split("@")[0]}
                                                </span>
                                                {getRoleIcon(member.role)}
                                            </div>
                                            <span className="text-sm text-gray-500">{member.users?.email}</span>
                                        </div>
                                    </div>
                                    {member.user_id !== currentUserId && (
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={member.role}
                                                onChange={(e) => handleRoleChange(member.id, member.user_id, e.target.value)}
                                                className="text-sm border rounded px-2 py-1"
                                            >
                                                <option value="member">Member</option>
                                                <option value="moderator">Moderator</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            <button onClick={() => handleKick(member.id, member.user_id)} className="p-2 text-orange-500 hover:bg-orange-50 rounded" title="Kick">
                                                <UserX className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleBan(member.id, member.user_id)} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Ban">
                                                <Ban className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "bans" && (
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Banned Users</h2>
                        {bannedUsers.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No banned users</p>
                        ) : (
                            <div className="space-y-3">
                                {bannedUsers.map((ban) => (
                                    <div key={ban.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center text-white font-medium">
                                                {ban.users?.email?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-900">
                                                    {ban.users?.username || ban.users?.full_name || ban.users?.email?.split("@")[0]}
                                                </span>
                                                {ban.reason && <p className="text-sm text-gray-500">Reason: {ban.reason}</p>}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleUnban(ban.id)}
                                            className="flex items-center gap-1 px-3 py-1 text-green-600 hover:bg-green-50 rounded border border-green-200"
                                        >
                                            <Undo2 className="h-4 w-4" />
                                            Unban
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
