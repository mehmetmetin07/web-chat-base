"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type Channel = Database["public"]["Tables"]["groups"]["Row"];

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
                    event: "INSERT",
                    schema: "public",
                    table: "groups",
                    filter: `server_id=eq.${serverId}`,
                },
                (payload) => {
                    setChannels((prev) => [...prev, payload.new as Channel]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [serverId]);

    const createChannel = async (name: string, userId: string) => {
        if (!serverId) return null;

        const { data, error } = await supabase
            .from("groups")
            .insert({
                name,
                server_id: serverId,
                owner_id: userId,
                description: "",
            })
            .select()
            .single();

        if (!error && data) {
            return data;
        }
        return null;
    };

    return { channels, loading, createChannel };
}
