"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { useChat } from "@/hooks/useChat";
import { useChannelMembers } from "@/hooks/useChannelMembers";
import { supabase } from "@/lib/supabase";
import { Users } from "lucide-react";

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
                    <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
                    <div className="h-12 w-2/3 bg-gray-200 rounded" />
                </div>
            </div>
        </div>
    );
}

export function ChatArea({ channelId }: { channelId: string }) {
    const { messages, loading, sendMessage } = useChat(channelId);
    const { members, isMember, loading: membersLoading } = useChannelMembers(channelId);
    const [newMessage, setNewMessage] = useState("");
    const [userId, setUserId] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [showMembers, setShowMembers] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserId(data.user?.id ?? null);
            setAuthLoading(false);
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

    const isLoading = loading || authLoading || membersLoading;

    return (
        <div className="flex h-full flex-1 flex-col bg-white">
            <div className="flex h-14 items-center justify-between border-b px-4">
                <div className="font-medium"># {channelId.slice(0, 8)}...</div>
                <button
                    onClick={() => setShowMembers(!showMembers)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                    <Users className="h-4 w-4" />
                    {members.length}
                </button>
            </div>

            {showMembers && (
                <div className="border-b p-3 bg-gray-50">
                    <div className="text-xs font-medium text-gray-500 mb-2">Server Members ({members.length})</div>
                    <div className="flex flex-wrap gap-2">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center gap-1 bg-white px-2 py-1 rounded text-xs border">
                                <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                    {member.email?.charAt(0).toUpperCase()}
                                </div>
                                {member.full_name || member.email?.split("@")[0]}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-auto p-4">
                <div className="flex flex-col gap-4">
                    {isLoading ? (
                        <MessageSkeleton />
                    ) : !isMember ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500">You are not a member of this server</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center text-sm text-gray-500 py-8">
                            No messages yet. Start the conversation!
                        </div>
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
                        placeholder={isMember ? "Type a message..." : "Join server to send messages"}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        disabled={isLoading || !userId || !isMember}
                        className="flex-1"
                    />
                    <Button onClick={handleSend} disabled={isLoading || !userId || !newMessage.trim() || !isMember}>
                        Send
                    </Button>
                </div>
            </div>
        </div>
    );
}
