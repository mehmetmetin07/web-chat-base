"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function usePresence(userId: string | null) {
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!userId) {
            setOnlineUsers(new Set());
            return;
        }

        const channel = supabase.channel("global_presence", {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        channel
            .on("presence", { event: "sync" }, () => {
                const newState = channel.presenceState();
                const onlineIds = new Set<string>();

                // Supabase presence state keys are whatever we set as 'key' (userId here),
                // or generated ids if we don't set one. 
                // Since we set key: userId, Object.keys(newState) gives us the userIds directly.
                Object.keys(newState).forEach(id => onlineIds.add(id));
                setOnlineUsers(onlineIds);
            })
            .on("presence", { event: "join" }, ({ key, newPresences }) => {
                setOnlineUsers((prev) => {
                    const next = new Set(prev);
                    next.add(key); // key is userId
                    return next;
                });
            })
            .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
                setOnlineUsers((prev) => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                });
            })
            .subscribe(async (status) => {
                if (status === "SUBSCRIBED") {
                    await channel.track({
                        online_at: new Date().toISOString(),
                        user_id: userId
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    return onlineUsers;
}
