"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type Message = Database["public"]["Tables"]["messages"]["Row"] & {
    users: Database["public"]["Tables"]["users"]["Row"] | null;
};

export function useChat(channelId: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!channelId) {
            setLoading(false);
            return;
        }

        const fetchMessages = async () => {
            setError(null);

            const { data, error: fetchError } = await supabase
                .from("messages")
                .select("*, users:sender_id(*)")
                .eq("group_id", channelId)
                .order("created_at", { ascending: true });

            if (fetchError) {
                setError(fetchError.message);
            }

            setMessages((data as any) || []);
            setLoading(false);
        };

        fetchMessages();

        const channel = supabase
            .channel(`room:${channelId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `group_id=eq.${channelId}`,
                },
                async (payload) => {
                    const newMessage = payload.new as Database["public"]["Tables"]["messages"]["Row"];

                    const { data: user } = await supabase
                        .from("users")
                        .select("*")
                        .eq("id", newMessage.sender_id)
                        .single();

                    const messageWithUser = {
                        ...newMessage,
                        users: user,
                    };

                    setMessages((prev) => [...prev, messageWithUser]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [channelId]);

    const sendMessage = async (content: string, senderId: string) => {
        const { error: sendError } = await supabase
            .from("messages")
            .insert({
                content,
                sender_id: senderId,
                group_id: channelId,
                type: "text",
            });

        if (sendError) {
            setError(sendError.message);
        }
    };

    return { messages, loading, error, sendMessage };
}
