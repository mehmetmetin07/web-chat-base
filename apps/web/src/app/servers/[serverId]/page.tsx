"use client";

import { use } from "react";
import { DashboardLayout } from "@/components/templates/DashboardLayout";

export default function ServerPage({
    params
}: {
    params: Promise<{ serverId: string }>
}) {
    const { serverId } = use(params);

    return (
        <DashboardLayout initialServerId={serverId}>
            <div className="flex h-full items-center justify-center bg-white">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome!</h2>
                    <p className="text-gray-500">Select a channel to start chatting</p>
                </div>
            </div>
        </DashboardLayout>
    );
}
