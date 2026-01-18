"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type UploadResult = {
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
};

export function useFileUpload(serverId: string | null) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const uploadFile = async (file: File): Promise<UploadResult | null> => {
        setUploading(true);
        setError(null);
        setProgress(0);
        if (!await validateFile(file, [])) {
            setUploading(false);
            return null;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error("Not authenticated");
            }

            const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
            // Use 'dm' prefix if no serverId
            const pathPrefix = serverId ? `${serverId}/${user.id}` : `dm/${user.id}`;
            const fileName = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { data, error: uploadError } = await supabase.storage
                .from("chat-files")
                .upload(fileName, file, {
                    cacheControl: "3600",
                    upsert: false,
                });

            if (uploadError) {
                throw uploadError;
            }

            const { data: urlData } = supabase.storage
                .from("chat-files")
                .getPublicUrl(data.path);

            setProgress(100);
            setUploading(false);

            return {
                url: urlData.publicUrl,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
            };
        } catch (err: any) {
            setError(err.message || "Upload failed");
            setUploading(false);
            return null;
        }
    };

    const validateFile = async (file: File, allowedTypes: string[]): Promise<boolean> => {
        const fileExt = file.name.split(".").pop()?.toLowerCase() || "";

        if (allowedTypes.length > 0 && !allowedTypes.includes(fileExt)) {
            setError(`File type .${fileExt} is not allowed. Allowed: ${allowedTypes.join(", ")}`);
            return false;
        }

        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            setError("File size must be less than 50MB");
            return false;
        }

        return true;
    };

    return { uploadFile, validateFile, uploading, error, progress, setError };
}
