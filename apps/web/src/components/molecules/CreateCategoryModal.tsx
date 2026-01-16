"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { X, FolderPlus } from "lucide-react";

interface CreateCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string) => Promise<void>;
}

export function CreateCategoryModal({ isOpen, onClose, onSubmit }: CreateCategoryModalProps) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setLoading(true);
        await onSubmit(name.trim());
        setLoading(false);
        setName("");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                    <div className="flex items-center gap-2">
                        <FolderPlus className="h-5 w-5 text-gray-500" />
                        <h2 className="font-semibold text-lg">Create Category</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category Name</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Text Channels, Voice Channels"
                            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
                        {loading ? "Creating..." : "Create"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
