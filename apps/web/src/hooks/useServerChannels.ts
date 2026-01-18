"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type Channel = Database["public"]["Tables"]["groups"]["Row"] & {
    category_id?: string | null;
    type: 'text' | 'voice';
};

export function useServerChannels(serverId: string | null) {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) {
            setChannels([]);
            setLoading(false);
            return;
        }

        const fetchChannels = async () => {
            try {
                const { data } = await supabase
                    .from("groups")
                    .select("*")
                    .eq("server_id", serverId)
                    .order("name", { ascending: true });

                setChannels(data || []);
            } catch (err) {
                setChannels([]);
            } finally {
                setLoading(false);
            }
        };

        fetchChannels();

        const channel = supabase
            .channel(`server_channels:${serverId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "groups",
                    filter: `server_id=eq.${serverId}`,
                },
                (payload) => {
                    if (payload.eventType === "INSERT") {
                        setChannels((prev) => [...prev, payload.new as Channel]);
                    } else if (payload.eventType === "UPDATE") {
                        setChannels((prev) =>
                            prev.map((channel) =>
                                channel.id === payload.new.id ? (payload.new as Channel) : channel
                            )
                        );
                    } else if (payload.eventType === "DELETE") {
                        setChannels((prev) =>
                            prev.filter((channel) => channel.id !== payload.old.id)
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [serverId]);

    const createChannel = async (name: string, userId: string, type: 'text' | 'voice' = 'text', categoryId: string | null = null) => {
        if (!serverId) return null;

        const { data, error } = await supabase
            .from("groups")
            .insert({
                name,
                server_id: serverId,
                owner_id: userId,
                description: "",
                type,
                category_id: categoryId
            })
            .select()
            .single();

        if (!error && data) {
            return data;
        }
        return null;
    };

    const updateChannel = async (channelId: string, updates: Partial<Channel>) => {
        setChannels((prev) =>
            prev.map((c) => (c.id === channelId ? { ...c, ...updates } : c))
        );
        const { error } = await supabase.from("groups").update(updates).eq("id", channelId);
        if (error) {
            console.error("Error updating channel:", error);
        }
    };

    return { channels, loading, createChannel, updateChannel };
}
