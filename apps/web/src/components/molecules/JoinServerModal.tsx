"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";

interface JoinServerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (inviteCode: string) => Promise<boolean>;
}

export function JoinServerModal({ isOpen, onClose, onSubmit }: JoinServerModalProps) {
    const [inviteCode, setInviteCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCode.trim()) return;

        setLoading(true);
        setError(null);

        const success = await onSubmit(inviteCode.trim());

        if (success) {
            setInviteCode("");
            onClose();
        } else {
            setError("Invalid invite code or you are already a member");
        }

        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h2 className="text-xl font-bold text-center mb-2">Join a Server</h2>
                <p className="text-sm text-gray-500 text-center mb-6">
                    Enter an invite code to join an existing server
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
                            Invite Code
                        </label>
                        <Input
                            placeholder="abc123xy"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            autoFocus
                        />
                        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Back
                        </Button>
                        <Button type="submit" disabled={!inviteCode.trim() || loading}>
                            {loading ? "Joining..." : "Join Server"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
