"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

type TypingUser = {
    userId: string;
    username: string;
    timestamp: number;
};

export function useTypingIndicator(channelId: string | null, currentUserId: string | null, currentUsername: string) {
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!channelId || !currentUserId) return;

        const channel = supabase.channel(`typing_${channelId}`);
        channelRef.current = channel;

        channel
            .on("broadcast", { event: "typing" }, ({ payload }) => {
                console.log("[Typing] Received typing event:", payload);
                if (payload.userId === currentUserId) return;

                setTypingUsers((prev) => {
                    const existing = prev.find((u) => u.userId === payload.userId);
                    if (existing) {
                        return prev.map((u) =>
                            u.userId === payload.userId
                                ? { ...u, timestamp: Date.now() }
                                : u
                        );
                    }
                    return [...prev, { ...payload, timestamp: Date.now() }];
                });
            })
            .on("broadcast", { event: "stop_typing" }, ({ payload }) => {
                console.log("[Typing] Received stop_typing event:", payload);
                setTypingUsers((prev) => prev.filter((u) => u.userId !== payload.userId));
            })
            .subscribe((status) => {
                console.log(`[Typing] Subscription status for channel typing_${channelId}:`, status);
            });

        // Clean up stale typing indicators every 3 seconds
        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            setTypingUsers((prev) => prev.filter((u) => now - u.timestamp < 3000));
        }, 1000);

        return () => {
            clearInterval(cleanupInterval);
            supabase.removeChannel(channel);
        };
    }, [channelId, currentUserId]);

    const sendTyping = useCallback(async () => {
        if (!channelRef.current || !currentUserId) {
            console.warn("[Typing] Cannot send typing: channel or userId missing", { channel: !!channelRef.current, userId: currentUserId });
            return;
        }

        const result = await channelRef.current.send({
            type: "broadcast",
            event: "typing",
            payload: { userId: currentUserId, username: currentUsername },
        });

        console.log("[Typing] Sent typing event", result);

        // Clear previous timeout and set new one
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            channelRef.current?.send({
                type: "broadcast",
                event: "stop_typing",
                payload: { userId: currentUserId },
            });
        }, 2500);
    }, [currentUserId, currentUsername]);

    const stopTyping = useCallback(() => {
        if (!channelRef.current || !currentUserId) return;

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        channelRef.current.send({
            type: "broadcast",
            event: "stop_typing",
            payload: { userId: currentUserId },
        });
    }, [currentUserId]);

    return { typingUsers, sendTyping, stopTyping };
}
