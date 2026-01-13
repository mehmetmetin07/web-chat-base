"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";

interface CreateServerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string) => void;
}

export function CreateServerModal({ isOpen, onClose, onSubmit }: CreateServerModalProps) {
    const [serverName, setServerName] = useState("");

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!serverName.trim()) return;
        onSubmit(serverName.trim());
        setServerName("");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h2 className="text-xl font-bold text-center mb-2">Create Your Server</h2>
                <p className="text-sm text-gray-500 text-center mb-6">
                    Give your new server a personality with a name
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
                            Server Name
                        </label>
                        <Input
                            placeholder="My Awesome Server"
                            value={serverName}
                            onChange={(e) => setServerName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Back
                        </Button>
                        <Button type="submit" disabled={!serverName.trim()}>
                            Create
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
