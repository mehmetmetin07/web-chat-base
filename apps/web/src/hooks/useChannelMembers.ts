"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type User = Database["public"]["Tables"]["users"]["Row"];

export function useChannelMembers(channelId: string) {
    const [members, setMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMember, setIsMember] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [serverId, setServerId] = useState<string | null>(null);

    useEffect(() => {
        if (!channelId) {
            setLoading(false);
            return;
        }

        const fetchMembers = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                const myId = user?.id;
                setCurrentUserId(myId ?? null);

                const { data: channel } = await supabase
                    .from("groups")
                    .select("server_id")
                    .eq("id", channelId)
                    .single();

                if (!channel?.server_id) {
                    setLoading(false);
                    return;
                }

                setServerId(channel.server_id);

                const { data: serverMembers } = await supabase
                    .from("server_members")
                    .select("user_id, users(*)")
                    .eq("server_id", channel.server_id);

                if (serverMembers) {
                    const users = serverMembers
                        .map((m: any) => m.users)
                        .filter(Boolean);
                    setMembers(users);
                    setIsMember(serverMembers.some((m) => m.user_id === myId));
                }
            } catch (err) {
                setMembers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMembers();
    }, [channelId]);

    const joinChannel = async () => {
        return true;
    };

    const leaveChannel = async () => {
        return false;
    };

    return { members, loading, isMember, joinChannel, leaveChannel, currentUserId, serverId };
}
