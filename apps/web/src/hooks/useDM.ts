"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type Message = Database["public"]["Tables"]["messages"]["Row"] & {
    users: Database["public"]["Tables"]["users"]["Row"] | null;
};

export function useDM(otherUserId: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        if (!otherUserId) {
            setLoading(false);
            return;
        }

        const fetchMessages = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const myId = user?.id;
            setCurrentUserId(myId ?? null);

            if (!myId) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from("messages")
                .select("*, users(*)")
                .is("group_id", null)
                .or(`and(sender_id.eq.${myId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${myId})`)
                .order("created_at", { ascending: true });

            if (!error) {
                setMessages((data as any) || []);
            }
            setLoading(false);
        };

        fetchMessages();

        const channel = supabase
            .channel(`dm:${otherUserId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                },
                async (payload) => {
                    const newMessage = payload.new as Database["public"]["Tables"]["messages"]["Row"];

                    if (
                        (newMessage.sender_id === currentUserId && newMessage.receiver_id === otherUserId) ||
                        (newMessage.sender_id === otherUserId && newMessage.receiver_id === currentUserId)
                    ) {
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
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [otherUserId, currentUserId]);

    const sendMessage = async (content: string) => {
        if (!currentUserId) return;

        const { error } = await supabase.from("messages").insert({
            content,
            sender_id: currentUserId,
            receiver_id: otherUserId,
            group_id: null,
            type: "text",
        });

        if (error) {
            console.error("Error sending DM:", error);
        }
    };

    return { messages, loading, sendMessage, currentUserId };
}
