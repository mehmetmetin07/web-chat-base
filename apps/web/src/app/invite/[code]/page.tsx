"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useServers } from "@/hooks/useServers";

export default function InvitePage({
    params
}: {
    params: Promise<{ code: string }>
}) {
    const { code } = use(params);
    const router = useRouter();
    const { joinServer, currentUserId } = useServers();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Joining server...");

    useEffect(() => {
        const handleJoin = async () => {
            if (!currentUserId) {
                router.push(`/login?redirect=/invite/${code}`);
                return;
            }

            const server = await joinServer(code);

            if (server) {
                setStatus("success");
                setMessage(`Joined "${server.name}"! Redirecting...`);
                setTimeout(() => {
                    router.push(`/servers/${server.id}`);
                }, 1500);
            } else {
                setStatus("error");
                setMessage("Invalid invite code or you are already a member.");
            }
        };

        if (currentUserId !== null) {
            handleJoin();
        }
    }, [code, currentUserId, joinServer, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="bg-gray-800 rounded-lg p-8 text-center max-w-sm">
                {status === "loading" && (
                    <>
                        <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gray-700 animate-pulse" />
                        <p className="text-white text-lg">{message}</p>
                    </>
                )}
                {status === "success" && (
                    <>
                        <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center">
                            <span className="text-2xl">✓</span>
                        </div>
                        <p className="text-white text-lg">{message}</p>
                    </>
                )}
                {status === "error" && (
                    <>
                        <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-red-500 flex items-center justify-center">
                            <span className="text-2xl">✗</span>
                        </div>
                        <p className="text-white text-lg mb-4">{message}</p>
                        <button
                            onClick={() => router.push("/")}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Go Home
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
