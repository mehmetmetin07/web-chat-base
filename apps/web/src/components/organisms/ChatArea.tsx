"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { useChat } from "@/hooks/useChat";
import { supabase } from "@/lib/supabase";

export function ChatArea({ channelId = "general" }: { channelId?: string }) {
    const { messages, loading, sendMessage } = useChat(channelId);
    const [newMessage, setNewMessage] = useState("");
    const [userId, setUserId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserId(data.user?.id ?? null);
        });
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim() || !userId) return;
        await sendMessage(newMessage, userId);
        setNewMessage("");
    };

    return (
        <div className="flex h-full flex-1 flex-col bg-white">
            <div className="flex h-14 items-center justify-between border-b px-4">
                <div className="font-medium"># {channelId}</div>
            </div>
            <div className="flex-1 overflow-auto p-4">
                <div className="flex flex-col gap-4">
                    {loading ? (
                        <div className="text-center text-sm text-gray-500">Loading messages...</div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${msg.sender_id === userId ? "items-end" : "items-start"
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-gray-600">
                                        {msg.users?.full_name || msg.users?.email || "Unknown"}
                                    </span>
                                </div>
                                <div
                                    className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${msg.sender_id === userId
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-100 text-gray-900"
                                        }`}
                                >
                                    {msg.content}
                                </div>
                                <span className="text-xs text-gray-400 mt-1">
                                    {new Date(msg.created_at).toLocaleTimeString()}
                                </span>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="p-4">
                <div className="flex gap-2">
                    <Input
                        placeholder={`Message # ${channelId}`}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        disabled={!userId}
                        className="flex-1"
                    />
                    <Button onClick={handleSend} disabled={!userId || !newMessage.trim()}>
                        Send
                    </Button>
                </div>
                {!userId && (
                    <p className="mt-2 text-xs text-red-500 text-center">
                        You must be logged in to send messages.
                    </p>
                )}
            </div>
        </div>
    );
}
