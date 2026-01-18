"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Hash, Settings, Volume2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Database } from "@/types/supabase";
import { useVoice } from "@/providers/VoiceProvider";

type Channel = Database["public"]["Tables"]["groups"]["Row"] & { type?: 'text' | 'voice' };

interface SidebarChannelProps {
    channel: Channel;
    isActive: boolean;
    serverId: string;
    canManage: boolean;
    onOpenSettings: (id: string, name: string) => void;
}

export function SidebarChannel({ channel, isActive, serverId, canManage, onOpenSettings }: SidebarChannelProps) {
    const { activeChannelId, joinVoiceChannel } = useVoice();
    const isVoiceActive = channel.type === 'voice' && activeChannelId === channel.id;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: channel.id,
        data: {
            type: "Channel",
            channel,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="group flex items-center justify-between pr-1 mb-0.5"
        >
            {channel.type === 'voice' ? (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        joinVoiceChannel(channel.id, serverId);
                    }}
                    className={cn(
                        "flex-1 flex items-center gap-2 rounded px-2 py-1.5 text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-900 ml-2 text-left",
                        isVoiceActive && "text-green-600 bg-green-50/50 hover:bg-green-100/50"
                    )}
                >
                    <Volume2 className={cn("h-4 w-4", isVoiceActive ? "text-green-600" : "text-gray-500")} />
                    {channel.name}
                </button>
            ) : (
                <Link
                    href={`/servers/${serverId}/channels/${channel.id}`}
                    className={cn(
                        "flex-1 flex items-center gap-2 rounded px-2 py-1.5 text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-900 ml-2",
                        isActive && "bg-gray-300 text-gray-900"
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Hash className="h-4 w-4 text-gray-500" />
                    {channel.name}
                </Link>
            )}
            {canManage && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenSettings(channel.id, channel.name);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Settings className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
}
