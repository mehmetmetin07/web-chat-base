"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type VoiceState = Database["public"]["Tables"]["voice_states"]["Row"] & {
    users: Database["public"]["Tables"]["users"]["Row"] | null;
};

export function useVoiceState(channelId: string | null, serverId: string | null) {
    const [participants, setParticipants] = useState<VoiceState[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [myState, setMyState] = useState<VoiceState | null>(null);

    // Initial Fetch & Subscription
    useEffect(() => {
        if (!channelId) {
            setParticipants([]);
            setMyState(null);
            return;
        }

        const fetchParticipants = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("voice_states")
                .select("*, users(*)")
                .eq("channel_id", channelId);

            if (data) {
                setParticipants(data as VoiceState[]);
            }
            setLoading(false);
        };

        fetchParticipants();

        const channel = supabase
            .channel(`voice_states:${channelId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "voice_states",
                    filter: `channel_id=eq.${channelId}`,
                },
                async (payload) => {
                    // Refresh all on any change simplified, or handle events optimistically
                    // For simplicity and accuracy with joins, re-fetch or careful merge
                    // Let's do simple optimistic merge
                    if (payload.eventType === "INSERT") {
                        const { data } = await supabase.from("users").select("*").eq("id", payload.new.user_id).single();
                        const newState = { ...payload.new, users: data } as VoiceState;
                        setParticipants(prev => [...prev, newState]);
                    } else if (payload.eventType === "DELETE") {
                        setParticipants(prev => prev.filter(p => p.id !== payload.old.id));
                    } else if (payload.eventType === "UPDATE") {
                        setParticipants(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [channelId]);

    // Check my own state
    useEffect(() => {
        const checkMyState = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && participants.length > 0) {
                const mine = participants.find(p => p.user_id === user.id);
                setMyState(mine || null);
            } else {
                setMyState(null);
            }
        };
        checkMyState();
    }, [participants]);


    const joinChannel = useCallback(async (muted = false, deafened = false) => {
        if (!channelId || !serverId) return;
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if already joined another channel in this server?
        // Discord allows one voice channel per user globally usually, or per server.
        // We should cleanup old states first just in case.
        // But triggers or RLS can handle it.
        // Let's just insert.

        const { error } = await supabase.from("voice_states").insert({
            channel_id: channelId,
            server_id: serverId,
            user_id: user.id,
            muted,
            deafened,
            session_id: crypto.randomUUID() // Placeholder for WebRTC session
        });

        if (error) {
            console.error("Join error:", error);
            setError(error.message);
        }
        setLoading(false);
    }, [channelId, serverId]);

    const leaveChannel = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Delete by user_id and channel_id (or just user_id if we want to be safe)
        // If we are in this channel:
        if (channelId) {
            await supabase.from("voice_states").delete().match({ channel_id: channelId, user_id: user.id });
            setMyState(null);
        }
    }, [channelId]);

    const toggleMute = useCallback(async (isMuted: boolean) => {
        if (!myState) return;
        await supabase.from("voice_states").update({ muted: isMuted }).eq("id", myState.id);
    }, [myState]);

    return {
        participants,
        loading,
        error,
        joinChannel,
        leaveChannel,
        toggleMute,
        myState,
        isConnected: !!myState
    };
}
