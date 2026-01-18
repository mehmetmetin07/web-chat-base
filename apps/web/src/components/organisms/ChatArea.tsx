"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { useChat } from "@/hooks/useChat";
import { useChannelMembers } from "@/hooks/useChannelMembers";
import { useServerSettings } from "@/hooks/useServerSettings";
import { useFileUpload } from "@/hooks/useFileUpload";
import { supabase } from "@/lib/supabase";
import { Users, AlertCircle, Smile, X, Paperclip, File, Image, Download, Loader2 } from "lucide-react";
import { FileMessage } from "@/components/molecules/FileMessage";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { TypingIndicator } from "@/components/molecules/TypingIndicator";
import { ConfirmModal } from "@/components/molecules/ConfirmModal";
import { Trash2, Search } from "lucide-react";
import { useMessageSearch } from "@/hooks/useMessageSearch";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

function MessageSkeleton() {
    return (
        <div className="flex flex-col gap-4 animate-pulse">
            <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                    <div className="h-16 w-3/4 bg-gray-200 rounded" />
                </div>
            </div>
        </div>
    );
}

function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// FileMessage imported from molecules

export function ChatArea({ channelId }: { channelId: string }) {
    const { messages, loading, sendMessage, sendFileMessage, deleteMessage } = useChat(channelId);
    const { members, isMember, loading: membersLoading, serverId } = useChannelMembers(channelId);
    const { checkMessage, settings } = useServerSettings(serverId);
    const { uploadFile, validateFile, uploading, error: uploadError, setError: setUploadError } = useFileUpload(serverId);
    const [newMessage, setNewMessage] = useState("");
    const [userId, setUserId] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [showMembers, setShowMembers] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Search Hook
    const { results: searchResults, isLoading: searchLoading, searchMessages, clearSearch } = useMessageSearch();
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);

    const currentMember = members.find((m) => m.id === userId);
    const currentUsername = currentMember?.full_name || currentMember?.email?.split("@")[0] || "Unknown";
    const { typingUsers, sendTyping } = useTypingIndicator(channelId, userId, currentUsername);

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
        setError(null);

        const modResult = checkMessage(newMessage);
        if (!modResult.allowed) {
            setError(modResult.reason || "Message not allowed");
            return;
        }

        // Parse mentions
        const mentionRegex = /@([a-zA-Z0-9_\.\-]+)/g;
        const matches = newMessage.match(mentionRegex);
        const mentionedUserIds: string[] = [];

        if (matches) {
            matches.forEach(match => {
                const username = match.substring(1).toLowerCase(); // remove @
                const member = members.find(m =>
                    (m.full_name?.toLowerCase().replace(/\s+/g, '') === username) ||
                    (m.email?.split('@')[0].toLowerCase() === username) ||
                    (m.username?.toLowerCase() === username)
                );
                if (member) {
                    mentionedUserIds.push(member.id);
                }
            });
        }

        await sendMessage(newMessage, userId, mentionedUserIds);
        setNewMessage("");
        setShowEmoji(false);
    };

    const handleDelete = (messageId: string) => {
        setMessageToDelete(messageId);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userId) return;

        const allowedTypes = settings?.allowed_file_types || [];
        const isValid = await validateFile(file, allowedTypes);
        if (!isValid) return;

        const result = await uploadFile(file);
        if (result) {
            let fileType = "file";
            if (file.type.startsWith("image/")) fileType = "image";
            else if (file.type.startsWith("video/")) fileType = "video";

            await sendFileMessage(result.url, userId, fileType);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (!file || !userId) continue;

                const allowedTypes = settings?.allowed_file_types || [];
                const isValid = await validateFile(file, allowedTypes);
                if (!isValid) return;

                const result = await uploadFile(file);
                if (result) {
                    let fileType = "file";
                    if (file.type.startsWith("image/")) fileType = "image";
                    else if (file.type.startsWith("video/")) fileType = "video";

                    await sendFileMessage(result.url, userId, fileType);
                }
            }
        }
    };

    const confirmDelete = async () => {
        if (messageToDelete) {
            await deleteMessage(messageToDelete);
            setMessageToDelete(null);
        }
    };


    const onEmojiClick = (emojiData: any) => {
        setNewMessage((prev) => prev + emojiData.emoji);
        inputRef.current?.focus();
    };

    const isLoading = loading || authLoading || membersLoading;
    const displayError = error || uploadError;

    const getUserDisplay = (user: any) => ({
        name: user?.username || user?.full_name || user?.email?.split("@")[0] || "Unknown",
        avatar: user?.avatar_url,
        initial: (user?.username || user?.email || "U").charAt(0).toUpperCase(),
    });

    const getDateDivider = (currentDate: string, prevDate: string | null) => {
        const current = new Date(currentDate).toDateString();
        const prev = prevDate ? new Date(prevDate).toDateString() : null;
        return current !== prev ? formatDate(currentDate) : null;
    };

    return (
        <div className="flex h-full flex-1 flex-col bg-white relative" onPaste={handlePaste}>
            <div className="flex h-14 items-center justify-between border-b px-4">
                <div className="font-medium"># {channelId.slice(0, 8)}...</div>

                <div className="flex items-center gap-3">
                    {/* Search Bar */}
                    <div className="relative">
                        <div className={`flex items-center transition-all ${showSearch ? 'w-64 bg-gray-100 px-2 rounded-md' : 'w-8'}`}>
                            {showSearch && (
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && searchMessages(searchQuery, serverId || undefined, channelId)}
                                    className="border-none bg-transparent h-8 text-sm focus:ring-0 placeholder:text-gray-400"
                                    placeholder={`Search in #${channelId.slice(0, 8)}...`}
                                    autoFocus
                                />
                            )}
                            <button onClick={() => {
                                setShowSearch(!showSearch);
                                if (showSearch) {
                                    setSearchQuery("");
                                    clearSearch();
                                }
                            }} className="p-1 text-gray-500 hover:text-gray-700">
                                {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                            </button>
                        </div>

                        {/* Search Results Popover */}
                        {showSearch && (searchLoading || searchResults.length > 0 || searchQuery) && (
                            <div className="absolute top-10 right-0 w-80 bg-white shadow-xl border rounded-lg z-50 max-h-96 overflow-y-auto">
                                {searchLoading && <div className="p-4 text-center text-gray-500 text-sm flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Searching...</div>}

                                {!searchLoading && searchResults.length === 0 && searchQuery && (
                                    <div className="p-4 text-center text-gray-400 text-sm">No results found.</div>
                                )}

                                {searchResults.map((res) => (
                                    <div key={res.id} className="p-3 border-b hover:bg-gray-50 cursor-pointer flex gap-3 text-left">
                                        <div className="h-8 w-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                                            {res.user_avatar_url ? (
                                                <img src={res.user_avatar_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                                                    {(res.user_full_name?.[0] || "?").toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <span className="font-medium text-xs truncate">{res.user_full_name}</span>
                                                <span className="text-[10px] text-gray-400">{formatTime(res.created_at)}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 line-clamp-2 break-all">{res.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setShowMembers(!showMembers)}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                    >
                        <Users className="h-4 w-4" />
                        {members.length}
                    </button>
                </div>
            </div>

            {showMembers && (
                <div className="border-b p-3 bg-gray-50">
                    <div className="text-xs font-medium text-gray-500 mb-2">Server Members ({members.length})</div>
                    <div className="flex flex-wrap gap-2">
                        {members.map((member) => {
                            const display = getUserDisplay(member);
                            return (
                                <div key={member.id} className="flex items-center gap-1 bg-white px-2 py-1 rounded text-xs border">
                                    {display.avatar ? (
                                        <img src={display.avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
                                    ) : (
                                        <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                            {display.initial}
                                        </div>
                                    )}
                                    {display.name}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-auto p-4">
                <div className="flex flex-col gap-2">
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
                        messages.map((msg, index) => {
                            const user = msg.users;
                            const display = getUserDisplay(user);
                            const isOwn = msg.sender_id === userId;
                            const prevMessage = index > 0 ? messages[index - 1] : null;
                            const showHeader = !prevMessage || prevMessage.sender_id !== msg.sender_id;
                            const dateDivider = getDateDivider(msg.created_at, prevMessage?.created_at || null);
                            const isFile = msg.type === "file" || msg.type === "image" || msg.type === "video";

                            return (
                                <div key={msg.id}>
                                    {dateDivider && (
                                        <div className="flex items-center gap-4 my-4">
                                            <div className="flex-1 h-px bg-gray-200" />
                                            <span className="text-xs text-gray-500 font-medium">{dateDivider}</span>
                                            <div className="flex-1 h-px bg-gray-200" />
                                        </div>
                                    )}
                                    <div className={`flex gap-3 group/message ${isOwn ? "flex-row-reverse" : ""}`}>
                                        {showHeader ? (
                                            display.avatar ? (
                                                <img src={display.avatar} alt={display.name} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                                            ) : (
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${isOwn ? "bg-blue-600" : "bg-gray-500"}`}>
                                                    {display.initial}
                                                </div>
                                            )
                                        ) : (
                                            <div className="w-10 flex-shrink-0" />
                                        )}
                                        <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[70%] group relative`}>
                                            {isOwn && (
                                                <button
                                                    onClick={() => handleDelete(msg.id)}
                                                    className="absolute -top-3 right-0 p-1 bg-white rounded-full shadow-sm border opacity-0 group-hover/message:opacity-100 transition-opacity text-red-500 hover:bg-red-50 z-10"
                                                    title="Delete Message"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            )}
                                            {showHeader && (
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-sm font-medium ${isOwn ? "text-blue-600" : "text-gray-900"}`}>
                                                        {display.name}
                                                    </span>
                                                    <span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span>
                                                </div>
                                            )}
                                            {isFile ? (
                                                <FileMessage content={msg.content} type={msg.type} timestamp={msg.created_at} />
                                            ) : (
                                                <div className={`rounded-lg px-4 py-2 text-sm ${isOwn ? "bg-blue-600 text-white rounded-tr-none" : "bg-gray-100 text-gray-900 rounded-tl-none"}`}>
                                                    {msg.content}
                                                    <div className={`text-[10px] mt-1 text-right ${isOwn ? "text-blue-200" : "text-gray-500"}`}>
                                                        {formatTime(msg.created_at)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {displayError && (
                <div className="mx-4 mb-2 p-2 bg-red-50 border border-red-200 rounded flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {displayError}
                    <button onClick={() => { setError(null); setUploadError(null); }} className="ml-auto">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {showEmoji && (
                <div className="absolute bottom-20 left-4 z-50">
                    <div className="relative">
                        <button
                            onClick={() => setShowEmoji(false)}
                            className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow border z-10"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <EmojiPicker onEmojiClick={onEmojiClick} width={350} height={400} />
                    </div>
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.zip,.mp4,.mp3"
            />

            <div className="px-4">
                <TypingIndicator typingUsers={typingUsers} />
            </div>

            <ConfirmModal
                isOpen={!!messageToDelete}
                onClose={() => setMessageToDelete(null)}
                onConfirm={confirmDelete}
                title="Delete Message"
                message="Are you sure you want to delete this message? This action cannot be undone."
            />

            <div className="p-4 border-t">
                <div className="flex gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || !isMember}
                        className={`p-2 rounded ${uploading ? "text-blue-500" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
                    >
                        {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                    </button>
                    <button
                        onClick={() => setShowEmoji(!showEmoji)}
                        className={`p-2 rounded ${showEmoji ? "bg-blue-100 text-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
                    >
                        <Smile className="h-5 w-5" />
                    </button>
                    <Input
                        ref={inputRef}
                        placeholder={isMember ? "Type a message..." : "Join server to send messages"}
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            setError(null);
                            sendTyping();
                        }}
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
