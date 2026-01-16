"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hash, Plus, LogOut, Copy, Check, Users, Link as LinkIcon, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useServerChannels } from "@/hooks/useServerChannels";
import { useUsers } from "@/hooks/useUsers";
import { CreateChannelModal } from "@/components/molecules/CreateChannelModal";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";
import { useServerPermissions } from "@/hooks/useServerPermissions";
import { usePresence } from "@/hooks/usePresence";
import { ChannelSettingsModal } from "@/components/molecules/ChannelSettingsModal";

type Server = Database["public"]["Tables"]["servers"]["Row"];

interface SidebarProps {
    className?: string;
    server: Server | null;
}

export function Sidebar({ className, server }: SidebarProps) {
    const pathname = usePathname();
    const activeServerId = server?.id ?? null; // Added activeServerId for clarity and consistency
    const { channels, loading: channelsLoading, createChannel } = useServerChannels(activeServerId);
    const { users, members, loading: usersLoading, currentUserProfile } = useUsers(activeServerId);
    const { can, isOwner } = useServerPermissions(activeServerId || "");
    const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const onlineUsers = usePresence(userId);
    const [channelSettingsId, setChannelSettingsId] = useState<string | null>(null);
    const [channelSettingsName, setChannelSettingsName] = useState<string>("");

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserId(data.user?.id ?? null);
            setUserEmail(data.user?.email ?? null);
        });
    }, []);

    const handleCreateChannel = async (name: string) => {
        if (!userId) return;
        await createChannel(name, userId);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
    };

    const copyInviteLink = () => {
        if (server?.invite_code) {
            const inviteUrl = `${window.location.origin}/invite/${server.invite_code}`;
            navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const copyInviteCode = () => {
        if (server?.invite_code) {
            navigator.clipboard.writeText(server.invite_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!server) {
        return (
            <div className={cn("flex h-full w-60 flex-col items-center justify-center border-r bg-gray-100", className)}>
                <p className="text-sm text-gray-500 text-center px-4">
                    Select a server or create one to get started
                </p>
            </div>
        );
    }

    return (
        <>
            <div className={cn("flex h-full w-60 flex-col border-r bg-gray-100", className)}>
                <div className="flex h-12 items-center justify-between border-b px-4 bg-gray-200">
                    <span className="font-semibold truncate">{server.name}</span>
                    {(activeServerId && (isOwner || can("ADMINISTRATOR") || can("MANAGE_SERVER"))) && (
                        <Link
                            href={`/servers/${server.id}/settings`}
                            className="p-1 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-300"
                        >
                            <Settings className="h-4 w-4" />
                        </Link>
                    )}
                </div>

                <button
                    onClick={() => setShowInvite(!showInvite)}
                    className="flex items-center justify-between px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm border-b"
                >
                    <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Invite People
                    </span>
                    <LinkIcon className="h-4 w-4" />
                </button>

                {showInvite && (
                    <div className="p-3 bg-blue-50 border-b space-y-2">
                        <div className="text-xs text-gray-600">Invite Code:</div>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 bg-white px-2 py-1 rounded text-sm font-mono border">
                                {server.invite_code}
                            </code>
                            <button
                                onClick={copyInviteCode}
                                className="p-2 bg-white rounded border hover:bg-gray-50"
                            >
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </button>
                        </div>
                        <button
                            onClick={copyInviteLink}
                            className="w-full text-xs text-blue-600 hover:underline"
                        >
                            Copy invite link
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-auto py-2">
                    <nav className="px-2 text-sm font-medium">
                        <div className="flex items-center justify-between px-2 mb-1">
                            <span className="text-xs font-semibold uppercase text-gray-500">
                                Text Channels
                            </span>
                            <button
                                onClick={() => setIsCreateChannelOpen(true)}
                                className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                                disabled={!userId}
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                        {channelsLoading ? (
                            <div className="px-2 py-2 text-xs text-gray-400">Loading...</div>
                        ) : channels.length === 0 ? (
                            <div className="px-2 py-2 text-xs text-gray-400">No channels yet</div>
                        ) : (
                            channels.map((channel) => (
                                <div key={channel.id} className="group flex items-center justify-between pr-1">
                                    <Link
                                        href={`/servers/${server.id}/channels/${channel.id}`}
                                        className={cn(
                                            "flex-1 flex items-center gap-2 rounded px-2 py-1.5 text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-900",
                                            pathname.includes(channel.id) && "bg-gray-300 text-gray-900"
                                        )}
                                    >
                                        <Hash className="h-4 w-4 text-gray-500" />
                                        {channel.name}
                                    </Link>
                                    {(isOwner || can("ADMINISTRATOR") || can("MANAGE_CHANNELS")) && (
                                        <button
                                            onClick={() => {
                                                setChannelSettingsId(channel.id);
                                                setChannelSettingsName(channel.name);
                                            }}
                                            className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Settings className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}

                        <div className="flex items-center justify-between px-2 mt-4 mb-1">
                            <span className="text-xs font-semibold uppercase text-gray-500">
                                Members ({members?.length || 0})
                            </span>
                        </div>
                        {usersLoading ? (
                            <div className="px-2 py-2 text-xs text-gray-400">Loading...</div>
                        ) : (
                            <>
                                {currentUserProfile && (
                                    <div className="flex items-center gap-3 rounded px-2 py-2 text-gray-700 mb-2">
                                        {currentUserProfile.avatar_url ? (
                                            <img
                                                src={currentUserProfile.avatar_url}
                                                alt={currentUserProfile.full_name || ""}
                                                className="h-8 w-8 rounded-full object-cover shadow-sm"
                                            />
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium shadow-sm">
                                                {(currentUserProfile.full_name?.[0] || currentUserProfile.email?.charAt(0) || "?").toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="truncate text-sm font-medium">{currentUserProfile.full_name || currentUserProfile.email?.split("@")[0]}</span>
                                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">You</span>
                                        </div>
                                    </div>
                                )}

                                {(() => {
                                    // Group members by role
                                    const groupedMembers: Record<string, typeof members> = {};
                                    const roleOrder: Record<string, number> = {};
                                    const roleColors: Record<string, string> = {};

                                    members?.forEach(member => {
                                        const roleName = member.highestRole?.name || "Member";
                                        const roleId = member.highestRole?.id || "default";
                                        const position = member.highestRole?.position ?? -1;

                                        if (!groupedMembers[roleName]) {
                                            groupedMembers[roleName] = [];
                                            roleOrder[roleName] = position;
                                            roleColors[roleName] = member.highestRole?.color || "#99aab5";
                                        }
                                        groupedMembers[roleName].push(member);
                                    });

                                    // Sort roles by position (descending)
                                    const sortedRoles = Object.keys(groupedMembers).sort((a, b) => roleOrder[b] - roleOrder[a]);

                                    return sortedRoles.map(role => (
                                        <div key={role} className="mb-4">
                                            <div className="px-2 text-[10px] font-bold uppercase text-gray-400 mb-1">
                                                {role as string} — {groupedMembers[role as string].length}
                                            </div>
                                            {groupedMembers[role as string].map(member => (
                                                <Link
                                                    key={member.id}
                                                    href={`/servers/${server.id}/dm/${member.id}`}
                                                    className="group flex items-center gap-3 rounded px-2 py-2 text-gray-600 transition-all hover:bg-gray-200"
                                                >
                                                    <div className="relative">
                                                        {member.avatar_url ? (
                                                            <img
                                                                src={member.avatar_url}
                                                                alt={member.full_name || ""}
                                                                className="h-8 w-8 rounded-full object-cover shadow-sm group-hover:shadow"
                                                            />
                                                        ) : (
                                                            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium shadow-sm group-hover:shadow">
                                                                {(member.full_name?.[0] || member.email?.charAt(0) || "?").toUpperCase()}
                                                            </div>
                                                        )}
                                                        {/* Online indicator */}
                                                        <div className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white group-hover:border-gray-100 ${onlineUsers.has(member.id) ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                                    </div>
                                                    <span
                                                        className="truncate text-sm font-medium transition-colors"
                                                        style={{ color: member.highestRole?.color || "#374151" }}
                                                    >
                                                        {member.full_name || member.email?.split("@")[0]}
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    ));
                                })()}
                            </>
                        )}
                    </nav>
                </div>

                <div className="border-t p-3 bg-gray-200">
                    {currentUserProfile && (
                        <div className="flex items-center justify-between">
                            <Link
                                href="/profile"
                                className="flex items-center gap-2 hover:opacity-80"
                            >
                                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium overflow-hidden">
                                    {currentUserProfile.avatar_url ? (
                                        <img
                                            src={currentUserProfile.avatar_url}
                                            alt={currentUserProfile.full_name || ""}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        (currentUserProfile.full_name?.[0] || currentUserProfile.email?.charAt(0) || "?").toUpperCase()
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-900 truncate max-w-[100px]">
                                        {currentUserProfile.full_name || currentUserProfile.email?.split("@")[0]}
                                    </span>
                                    <span className="text-xs text-gray-500">Online</span>
                                </div>
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="rounded p-2 text-gray-400 hover:bg-gray-300 hover:text-gray-600"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <CreateChannelModal
                isOpen={isCreateChannelOpen}
                onClose={() => setIsCreateChannelOpen(false)}
                onSubmit={handleCreateChannel}
            />

            {channelSettingsId && (
                <ChannelSettingsModal
                    isOpen={!!channelSettingsId}
                    onClose={() => setChannelSettingsId(null)}
                    channelId={channelSettingsId}
                    channelName={channelSettingsName}
                    serverId={server.id}
                />
            )}
        </>
    );
}
