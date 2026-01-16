import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { useDM } from "@/hooks/useDM";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";
import { Smile, Paperclip, X } from "lucide-react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { FileMessage } from "../molecules/FileMessage";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { TypingIndicator } from "@/components/molecules/TypingIndicator";
import { ConfirmModal } from "@/components/molecules/ConfirmModal";
import { Trash2 } from "lucide-react";

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
    const { messages, loading, sendMessage, currentUserId, deleteMessage } = useDM(userId);
    const [newMessage, setNewMessage] = useState("");
    const [otherUser, setOtherUser] = useState<User | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Features state
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { uploadFile, uploading: isUploading, error: uploadError } = useFileUpload(null); // Pass null for DM
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (currentUserId) {
            supabase
                .from("users")
                .select("*")
                .eq("id", currentUserId)
                .single()
                .then(({ data }) => setCurrentUser(data));
        }
    }, [currentUserId]);

    const currentUsername = currentUser?.full_name || currentUser?.email?.split("@")[0] || "Unknown";
    const dmChannelId = currentUserId && userId
        ? `dm_${[currentUserId, userId].sort().join('_')}`
        : null;

    const { typingUsers, sendTyping } = useTypingIndicator(dmChannelId, currentUserId, currentUsername);

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
        if ((!newMessage.trim() && !selectedFile) || isUploading) return;

        if (selectedFile) {
            const result = await uploadFile(selectedFile);
            if (result && result.url) {
                const type = result.fileType.startsWith("image/") ? "image" : result.fileType.startsWith("video/") ? "video" : "file";
                await sendMessage(result.url, type as "image" | "video" | "file");
            }
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }

        if (newMessage.trim()) {
            await sendMessage(newMessage, "text");
            setNewMessage("");
        }
        setShowEmojiPicker(false);
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setNewMessage((prev) => prev + emojiData.emoji);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file) {
                    setSelectedFile(file);
                }
            }
        }
    };

    const handleDelete = (messageId: string) => {
        setMessageToDelete(messageId);
    };

    const confirmDelete = async () => {
        if (messageToDelete) {
            await deleteMessage(messageToDelete);
            setMessageToDelete(null);
        }
    };

    return (
        <div className="flex h-full flex-1 flex-col bg-white">
            <div className="flex h-14 items-center justify-between border-b px-4">
                <div className="flex items-center gap-3">
                    {otherUser?.avatar_url ? (
                        <img
                            src={otherUser.avatar_url}
                            alt={otherUser.full_name || "User"}
                            className="h-8 w-8 rounded-full object-cover"
                        />
                    ) : (
                        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                            {otherUser?.email?.charAt(0).toUpperCase() || "?"}
                        </div>
                    )}
                    <div className="font-medium">
                        {otherUser?.full_name || otherUser?.email?.split("@")[0] || "Loading..."}
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-auto p-4 relative" onClick={() => setShowEmojiPicker(false)} onPaste={handlePaste}>
                {uploadError && (
                    <div className="absolute top-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative z-10" role="alert">
                        <strong className="font-bold">Upload Error: </strong>
                        <span className="block sm:inline">{uploadError}</span>
                        <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setSelectedFile(null)}>
                            <X className="h-6 w-6 text-red-500 cursor-pointer" />
                        </span>
                    </div>
                )}
                <div className="flex flex-col gap-1">
                    {loading ? (
                        <MessageSkeleton />
                    ) : messages.length === 0 ? (
                        <div className="text-center text-sm text-gray-500 py-8">
                            No messages yet. Say hi!
                        </div>
                    ) : (
                        messages.map((msg, index) => {
                            const isOwn = msg.sender_id === currentUserId;
                            const prevMsg = messages[index - 1];
                            const isSameSender = prevMsg && prevMsg.sender_id === msg.sender_id;
                            const isNearTime = prevMsg && (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60 * 1000);
                            const showHeader = !isSameSender || !isNearTime;

                            const isFile = msg.type === "file" || msg.type === "image" || msg.type === "video";

                            // Use User profile from message join logic
                            const user = msg.users;
                            const displayName = user?.full_name || user?.email?.split("@")[0] || "Unknown";
                            const avatarUrl = user?.avatar_url;
                            const initial = (user?.full_name?.[0] || user?.email?.charAt(0) || "?").toUpperCase();

                            return (
                                <div
                                    key={msg.id}
                                    className={`group flex items-start gap-4 px-2 py-0.5 mt-2 ${isOwn ? "flex-row-reverse" : ""}`}
                                >
                                    {showHeader ? (
                                        avatarUrl ? (
                                            <img
                                                src={avatarUrl}
                                                alt={displayName}
                                                className="h-10 w-10 rounded-full object-cover mt-0.5 cursor-pointer hover:opacity-80"
                                            />
                                        ) : (
                                            <div className={`h-10 w-10 rounded-full flex flex-shrink-0 items-center justify-center text-white font-medium mt-0.5 cursor-pointer hover:opacity-80 ${isOwn ? "bg-blue-600" : "bg-indigo-500"}`}>
                                                {initial}
                                            </div>
                                        )
                                    ) : (
                                        <div className="w-10 flex-shrink-0 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 text-right select-none pt-2">
                                            {/* Timestamp for grouped messages */}
                                        </div>
                                    )}

                                    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[70%] group relative`}>
                                        {isOwn && (
                                            <button
                                                onClick={() => handleDelete(msg.id)}
                                                className="absolute -top-3 right-0 p-1 bg-white rounded-full shadow-sm border opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50 z-10"
                                                title="Delete Message"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        )}
                                        {showHeader && (
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-sm font-medium cursor-pointer hover:underline ${isOwn ? "text-blue-600" : "text-gray-900"}`}>
                                                    {displayName}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`break-words leading-relaxed ${isFile ? "" : `rounded-lg px-4 py-2 ${isOwn ? "bg-blue-600 text-white rounded-tr-none" : "bg-gray-100 text-gray-900 rounded-tl-none"}`}`}>
                                            {isFile ? (
                                                <FileMessage content={msg.content} type={msg.type} timestamp={msg.created_at} />
                                            ) : (
                                                msg.content
                                            )}
                                        </div>
                                        {!isFile && !showHeader && (
                                            <div className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-gray-50 border-t relative">
                <div className="absolute top-0 left-0 w-full -translate-y-full px-4 pb-2 pointer-events-none">
                    <TypingIndicator typingUsers={typingUsers} />
                </div>
                {selectedFile && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 rounded border border-blue-100 text-sm">
                        <span className="font-medium text-blue-700 truncate max-w-xs">{selectedFile.name}</span>
                        <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="p-1 hover:bg-blue-100 rounded-full">
                            <X className="h-4 w-4 text-blue-500" />
                        </button>
                    </div>
                )}

                {showEmojiPicker && (
                    <div className="absolute bottom-16 right-4 z-50 shadow-xl rounded-lg overflow-hidden border">
                        <EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} />
                    </div>
                )}

                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        title="Upload File"
                    >
                        <Paperclip className="h-5 w-5" />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    <Input
                        placeholder={`Message @${otherUser?.full_name || otherUser?.email?.split("@")[0] || "User"}`}
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            sendTyping();
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        className="flex-1 border-0 focus-visible:ring-0 px-2"
                    />

                    <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-2 rounded-full transition-colors ${showEmojiPicker ? "text-yellow-500 bg-yellow-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                        title="Add Emoji"
                    >
                        <Smile className="h-5 w-5" />
                    </button>

                    <Button onClick={handleSend} disabled={(!newMessage.trim() && !selectedFile) || isUploading} className={`${isUploading ? "opacity-70" : ""}`}>
                        {isUploading ? "Sending..." : "Send"}
                    </Button>
                </div>
                <div className="text-[10px] text-gray-400 mt-2 text-center">
                    Files up to 10MB allowed. Images and videos will preview automatically. Paste images with Ctrl+V.
                </div>
            </div>

            <ConfirmModal
                isOpen={!!messageToDelete}
                onClose={() => setMessageToDelete(null)}
                onConfirm={confirmDelete}
                title="Delete Message"
                message="Are you sure you want to delete this message? This action cannot be undone."
            />
        </div>
    );
}
