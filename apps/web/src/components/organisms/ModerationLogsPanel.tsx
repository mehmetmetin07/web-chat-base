"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Ban, UserX, VolumeX, Volume2, AlertTriangle, Undo2 } from "lucide-react";

type ModerationLog = {
    id: string;
    action: string;
    reason: string | null;
    duration_minutes: number | null;
    created_at: string;
    moderator: { full_name: string | null; email: string } | null;
    target: { full_name: string | null; email: string } | null;
};

const actionIcons: Record<string, React.ReactNode> = {
    kick: <UserX className="h-4 w-4 text-orange-500" />,
    ban: <Ban className="h-4 w-4 text-red-500" />,
    unban: <Undo2 className="h-4 w-4 text-green-500" />,
    mute: <VolumeX className="h-4 w-4 text-purple-500" />,
    unmute: <Volume2 className="h-4 w-4 text-green-500" />,
    warn: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
    timeout: <VolumeX className="h-4 w-4 text-purple-500" />,
};

const actionColors: Record<string, string> = {
    kick: "bg-orange-50 border-orange-200",
    ban: "bg-red-50 border-red-200",
    unban: "bg-green-50 border-green-200",
    mute: "bg-purple-50 border-purple-200",
    unmute: "bg-green-50 border-green-200",
    warn: "bg-yellow-50 border-yellow-200",
    timeout: "bg-purple-50 border-purple-200",
};

export function ModerationLogsPanel({ serverId }: { serverId: string }) {
    const [logs, setLogs] = useState<ModerationLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            const { data } = await supabase
                .from("moderation_logs")
                .select(`
                    id,
                    action,
                    reason,
                    duration_minutes,
                    created_at,
                    moderator:moderator_id(full_name, email),
                    target:target_user_id(full_name, email)
                `)
                .eq("server_id", serverId)
                .order("created_at", { ascending: false })
                .limit(50);

            if (data) {
                setLogs(data as any);
            }
            setLoading(false);
        };

        fetchLogs();
    }, [serverId]);

    if (loading) {
        return <div className="text-center py-8 text-gray-500">Loading logs...</div>;
    }

    if (logs.length === 0) {
        return <div className="text-center py-8 text-gray-500">No moderation actions recorded yet.</div>;
    }

    return (
        <div className="space-y-2 max-h-96 overflow-auto">
            {logs.map((log) => (
                <div
                    key={log.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${actionColors[log.action] || "bg-gray-50 border-gray-200"}`}
                >
                    <div className="mt-0.5">{actionIcons[log.action]}</div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-gray-900">
                                {log.moderator?.full_name || log.moderator?.email?.split("@")[0] || "Unknown"}
                            </span>
                            <span className="text-gray-500">{log.action}</span>
                            <span className="font-medium text-gray-900">
                                {log.target?.full_name || log.target?.email?.split("@")[0] || "Unknown"}
                            </span>
                        </div>
                        {log.reason && (
                            <p className="text-xs text-gray-600 mt-1">Reason: {log.reason}</p>
                        )}
                        {log.duration_minutes && (
                            <p className="text-xs text-gray-600">Duration: {log.duration_minutes} minutes</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(log.created_at).toLocaleString()}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
