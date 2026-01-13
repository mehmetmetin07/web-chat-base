"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";

interface CreateChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string) => void;
}

export function CreateChannelModal({ isOpen, onClose, onSubmit }: CreateChannelModalProps) {
    const [channelName, setChannelName] = useState("");

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!channelName.trim()) return;
        onSubmit(channelName.trim());
        setChannelName("");
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
