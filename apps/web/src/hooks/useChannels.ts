"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type Channel = Database["public"]["Tables"]["groups"]["Row"];

export function useChannels() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChannels = async () => {
            const { data, error } = await supabase
                .from("groups")
                .select("*")
                .order("name", { ascending: true });

            if (error) {
                console.error("Error fetching channels:", error);
            } else {
                setChannels(data || []);
            }
            setLoading(false);
        };

        fetchChannels();

        // Subscribe to new channels
        const channel = supabase
            .channel("public:groups")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "groups",
                },
                (payload) => {
                    setChannels((prev) => [...prev, payload.new as Channel]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const createChannel = async (name: string, userId: string) => {
        const { error } = await supabase.from("groups").insert({
            name,
            owner_id: userId,
            description: "",
            image_url: ""
        });
        if (error) console.error("Error creating channel:", error);
    };

    return { channels, loading, createChannel };
}
