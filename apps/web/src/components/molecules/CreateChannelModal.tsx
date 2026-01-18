"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";

import { Hash, Volume2 } from "lucide-react";

interface CreateChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, type: 'text' | 'voice') => void;
}

export function CreateChannelModal({ isOpen, onClose, onSubmit }: CreateChannelModalProps) {
    const [channelName, setChannelName] = useState("");
    const [channelType, setChannelType] = useState<'text' | 'voice'>('text');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!channelName.trim()) return;
        onSubmit(channelName.trim(), channelType);
        setChannelName("");
        setChannelType("text");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />
            <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h2 className="text-lg font-semibold mb-4">Create New Channel</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Channel Type
                        </label>
                        <div className="space-y-2">
                            <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${channelType === 'text' ? 'bg-gray-100 border-gray-400' : 'hover:bg-gray-50'}`}>
                                <input
                                    type="radio"
                                    name="channelType"
                                    value="text"
                                    checked={channelType === 'text'}
                                    onChange={() => setChannelType('text')}
                                    className="sr-only"
                                />
                                <Hash className="h-5 w-5 text-gray-500 mr-3" />
                                <div>
                                    <div className="font-medium text-gray-900">Text</div>
                                    <div className="text-xs text-gray-500">Post images, GIFs, stickers, opinions, and puns.</div>
                                </div>
                            </label>

                            <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${channelType === 'voice' ? 'bg-gray-100 border-gray-400' : 'hover:bg-gray-50'}`}>
                                <input
                                    type="radio"
                                    name="channelType"
                                    value="voice"
                                    checked={channelType === 'voice'}
                                    onChange={() => setChannelType('voice')}
                                    className="sr-only"
                                />
                                <Volume2 className="h-5 w-5 text-gray-500 mr-3" />
                                <div>
                                    <div className="font-medium text-gray-900">Voice</div>
                                    <div className="text-xs text-gray-500">Hang out together with voice, video, and screen share.</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Channel Name
                        </label>
                        <Input
                            placeholder="e.g. general, random, marketing"
                            value={channelName}
                            onChange={(e) => setChannelName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!channelName.trim()}>
                            Create Channel
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
