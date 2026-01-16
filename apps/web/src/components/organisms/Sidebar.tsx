"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hash, Plus, LogOut, Copy, Check, Users, Link as LinkIcon, Settings, ChevronDown, ChevronRight, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useServerChannels } from "@/hooks/useServerChannels";
import { useUsers } from "@/hooks/useUsers";
import { useChannelCategories } from "@/hooks/useChannelCategories";
import { CreateChannelModal } from "@/components/molecules/CreateChannelModal";
import { CreateCategoryModal } from "@/components/molecules/CreateCategoryModal";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";
import { useServerPermissions } from "@/hooks/useServerPermissions";
import { usePresence } from "@/hooks/usePresence";
import { ChannelSettingsModal } from "@/components/molecules/ChannelSettingsModal";
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SidebarChannel } from "@/components/molecules/SidebarChannel";
import { SidebarCategory } from "@/components/molecules/SidebarCategory";

type Server = Database["public"]["Tables"]["servers"]["Row"];

// Manual type definition since types are not regenerated yet
type Channel = {
    id: string;
    server_id: string;
    name: string;
    category_id: string | null;
    created_at: string;
    description: string | null;
    owner_id: string;
    image_url: string | null;
};

// Manual type definition since types are not regenerated yet
type Category = {
    id: string;
    server_id: string | null;
    name: string;
    position: number;
    is_collapsed: boolean;
    created_at: string;
};

interface SidebarProps {
    className?: string;
    server: Server | null;
}

import { MemberContextMenu } from "@/components/molecules/MemberContextMenu";
import { useRoles } from "@/hooks/useRoles";

// ... (keep existing imports)

export function Sidebar({ className, server }: SidebarProps) {
    const pathname = usePathname();
    const activeServerId = server?.id ?? null;
    const { channels, loading: channelsLoading, createChannel, updateChannel } = useServerChannels(activeServerId);
    const { users, members, loading: usersLoading, currentUserProfile } = useUsers(activeServerId);
    const { categories, createCategory, toggleCollapsed } = useChannelCategories(activeServerId);
    const { can, isOwner } = useServerPermissions(activeServerId || "");
    const { roles, assignRoleToMember, removeRoleFromMember, kickMember, banMember } = useRoles(activeServerId || "");
    const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const onlineUsers = usePresence(userId);
    const [channelSettingsId, setChannelSettingsId] = useState<string | null>(null);
    const [channelSettingsName, setChannelSettingsName] = useState<string>("");
    const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; member: any } | null>(null);

    // DnD State
    const [activeDragItem, setActiveDragItem] = useState<{ id: string; type: "Channel" | "Category"; data: any } | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const sortedCategories = useMemo(() =>
        [...categories].sort((a, b) => (a.position || 0) - (b.position || 0)),
        [categories]
    );

    // Group channels
    const channelsByCategory = useMemo(() => {
        const groups: Record<string, Channel[]> = {};
        const uncategorized: Channel[] = [];

        channels.forEach(channel => {
            // Manual cast since types are mismatching
            const c = channel as unknown as Channel;
            if (c.category_id) {
                if (!groups[c.category_id]) groups[c.category_id] = [];
                groups[c.category_id].push(c);
            } else {
                uncategorized.push(c);
            }
        });

        return { groups, uncategorized };
    }, [channels]);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const type = active.data.current?.type;
        const data = active.data.current?.channel || active.data.current?.category;

        if (type && data) {
            setActiveDragItem({ id: active.id as string, type, data });
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;
        if (active.id === over.id) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;
        const activeItem = active.data.current?.channel || active.data.current?.category;

        if (!can("MANAGE_CHANNELS") && !isOwner && !can("ADMINISTRATOR")) return;

        // Moving Category
        if (activeType === "Category" && overType === "Category") {
            const oldIndex = sortedCategories.findIndex((c) => c.id === active.id);
            const newIndex = sortedCategories.findIndex((c) => c.id === over.id);

            const newCategories = arrayMove(sortedCategories, oldIndex, newIndex);

            // Optimistic blocking
            await Promise.all(newCategories.map((cat, index) =>
                supabase.from("channel_categories").update({ position: index }).eq("id", cat.id)
            ));
        }

        // Moving Channel
        if (activeType === "Channel") {
            // Channel dropped over another Channel
            if (overType === "Channel") {
                const overChannel = over.data.current?.channel;
                if (overChannel) {
                    const targetCategoryId = overChannel.category_id;

                    if (activeItem.category_id !== targetCategoryId) {
                        await updateChannel(active.id as string, { category_id: targetCategoryId });
                    }
                }
            }

            // Channel dropped over a Category (move to that category)
            if (overType === "Category") {
                const targetCategoryId = over.id as string;
                if (activeItem.category_id !== targetCategoryId) {
                    await updateChannel(active.id as string, { category_id: targetCategoryId });
                }
            }
        }
    };

    const canManage = isOwner || can("ADMINISTRATOR") || can("MANAGE_CHANNELS");

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

                {(isOwner || can("ADMINISTRATOR") || can("MANAGE_SERVER")) && (
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
                )}

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
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <nav className="px-2 text-sm font-medium">
                            <div className="flex items-center justify-between px-2 mb-1">
                                <span className="text-xs font-semibold uppercase text-gray-500">
                                    Channels
                                </span>
                                <div className="flex items-center gap-1">
                                    {(isOwner || can("ADMINISTRATOR") || can("MANAGE_CHANNELS")) && (
                                        <button
                                            onClick={() => setIsCreateCategoryOpen(true)}
                                            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                                            title="Create Category"
                                        >
                                            <FolderPlus className="h-4 w-4" />
                                        </button>
                                    )}
                                    {(isOwner || can("ADMINISTRATOR") || can("MANAGE_CHANNELS")) && (
                                        <button
                                            onClick={() => setIsCreateChannelOpen(true)}
                                            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                                            disabled={!userId}
                                            title="Create Channel"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {channelsLoading ? (
                                <div className="px-2 py-2 text-xs text-gray-400">Loading...</div>
                            ) : (
                                <>
                                    <div className="space-y-1">
                                        <SortableContext
                                            items={sortedCategories.map(c => c.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {sortedCategories.map((category) => (
                                                <SidebarCategory
                                                    key={category.id}
                                                    category={category}
                                                    isCollapsed={!!category.is_collapsed}
                                                    onToggle={toggleCollapsed}
                                                >
                                                    <div className="mt-0.5 ml-2 border-l pl-2 border-gray-200 min-h-[2px]">
                                                        <SortableContext
                                                            items={channelsByCategory.groups[category.id]?.map(c => c.id) || []}
                                                            strategy={verticalListSortingStrategy}
                                                        >
                                                            {channelsByCategory.groups[category.id]?.map((channel) => (
                                                                <SidebarChannel
                                                                    key={channel.id}
                                                                    channel={channel}
                                                                    isActive={pathname.includes(channel.id)}
                                                                    serverId={server?.id || ""}
                                                                    canManage={canManage}
                                                                    onOpenSettings={(id, name) => {
                                                                        setChannelSettingsId(id);
                                                                        setChannelSettingsName(name);
                                                                    }}
                                                                />
                                                            ))}
                                                        </SortableContext>
                                                    </div>
                                                </SidebarCategory>
                                            ))}
                                        </SortableContext>

                                        {/* Uncategorized Channels */}
                                        {channelsByCategory.uncategorized.length > 0 && (
                                            <div className="mt-4">
                                                <div className="px-2 mb-1 text-xs font-semibold uppercase text-gray-400">Uncategorized</div>
                                                <SortableContext
                                                    items={channelsByCategory.uncategorized.map(c => c.id)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    {channelsByCategory.uncategorized.map((channel) => (
                                                        <SidebarChannel
                                                            key={channel.id}
                                                            channel={channel}
                                                            isActive={pathname.includes(channel.id)}
                                                            serverId={server?.id || ""}
                                                            canManage={canManage}
                                                            onOpenSettings={(id, name) => {
                                                                setChannelSettingsId(id);
                                                                setChannelSettingsName(name);
                                                            }}
                                                        />
                                                    ))}
                                                </SortableContext>
                                            </div>
                                        )}
                                    </div>

                                    <DragOverlay>
                                        {activeDragItem ? (
                                            activeDragItem.type === "Category" ? (
                                                <div className="p-2 bg-white shadow rounded border opacity-80 cursor-grabbing w-full">
                                                    <div className="flex items-center gap-1 font-semibold text-gray-700">
                                                        <ChevronDown className="h-3 w-3" />
                                                        {activeDragItem.data.name}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-2 bg-white shadow rounded border opacity-80 cursor-grabbing flex items-center gap-2 w-full">
                                                    <Hash className="h-4 w-4 text-gray-500" />
                                                    {activeDragItem.data.name}
                                                </div>
                                            )
                                        ) : null}
                                    </DragOverlay>
                                </>
                            )}
                        </nav>

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
                                                    onContextMenu={(e) => {
                                                        e.preventDefault();
                                                        setContextMenu({ x: e.clientX, y: e.clientY, member });
                                                    }}
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
                    </DndContext>
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

            <CreateCategoryModal
                isOpen={isCreateCategoryOpen}
                onClose={() => setIsCreateCategoryOpen(false)}
                onSubmit={async (name) => { await createCategory(name); }}
            />

            {contextMenu && (
                <MemberContextMenu
                    position={{ x: contextMenu.x, y: contextMenu.y }}
                    onClose={() => setContextMenu(null)}
                    member={contextMenu.member}
                    roles={roles}
                    canManageRoles={isOwner || can("ADMINISTRATOR") || can("MANAGE_ROLES")}
                    canKick={isOwner || can("ADMINISTRATOR") || can("KICK_MEMBERS")}
                    canBan={isOwner || can("ADMINISTRATOR") || can("BAN_MEMBERS")}
                    onAssignRole={async (roleId) => {
                        await assignRoleToMember(contextMenu.member.id, roleId);
                    }}
                    onRemoveRole={async (roleId) => {
                        await removeRoleFromMember(contextMenu.member.id, roleId);
                    }}
                    onKick={async () => {
                        if (confirm(`Are you sure you want to kick ${contextMenu.member.full_name}?`)) {
                            await kickMember(contextMenu.member.id);
                            setContextMenu(null);
                        }
                    }}
                    onBan={async () => {
                        if (confirm(`Are you sure you want to ban ${contextMenu.member.full_name}?`)) {
                            await banMember(contextMenu.member.id);
                            setContextMenu(null);
                        }
                    }}
                />
            )}
        </>
    );
}
