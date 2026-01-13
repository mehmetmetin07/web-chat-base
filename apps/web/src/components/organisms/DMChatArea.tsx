"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { useDM } from "@/hooks/useDM";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type User = Database["public"]["Tables"]["users"]["Row"];

function MessageSkeleton() {
    return (
        <div className="flex flex-col gap-4 animate-pulse">
            <div className="flex items-start gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-200" />
                <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                    <div className="h-16 w-3/4 bg-gray-200 rounded" />
                </div>
            </div>
            <div className="flex items-start gap-2 justify-end">
                <div className="flex-1 flex flex-col items-end">
                    <div className="h-12 w-2/3 bg-gray-200 rounded" />
                </div>
            </div>
        </div>
    );
}

export function DMChatArea({ userId }: { userId: string }) {
    const { messages, loading, sendMessage, currentUserId } = useDM(userId);
    const [newMessage, setNewMessage] = useState("");
    const [otherUser, setOtherUser] = useState<User | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (userId) {
            supabase
                .from("users")
                .select("*")
                .eq("id", userId)
                .single()
                .then(({ data }) => setOtherUser(data));
        }
    }, [userId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim()) return;
        await sendMessage(newMessage);
        setNewMessage("");
    };

    return (
        <div className="flex h-full flex-1 flex-col bg-white">
            <div className="flex h-14 items-center justify-between border-b px-4">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                        {otherUser?.email?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="font-medium">
                        {otherUser?.full_name || otherUser?.email?.split("@")[0] || "Loading..."}
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
                <div className="flex flex-col gap-4">
                    {loading ? (
                        <MessageSkeleton />
                    ) : messages.length === 0 ? (
                        <div className="text-center text-sm text-gray-500 py-8">
                            No messages yet. Say hi!
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${msg.sender_id === currentUserId ? "items-end" : "items-start"
                                    }`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${msg.sender_id === currentUserId
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
                        placeholder={`Message ${otherUser?.full_name || otherUser?.email?.split("@")[0] || ""}...`}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        className="flex-1"
                    />
                    <Button onClick={handleSend} disabled={!newMessage.trim()}>
                        Send
                    </Button>
                </div>
            </div>
        </div>
    );
}
