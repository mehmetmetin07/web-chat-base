"use client";

import { use } from "react";
import { ChatArea } from "@/components/organisms/ChatArea";
import { DashboardLayout } from "@/components/templates/DashboardLayout";

export default function ServerChannelPage({
    params
}: {
    params: Promise<{ serverId: string; channelId: string }>
}) {
    const { serverId, channelId } = use(params);

    return (
        <DashboardLayout initialServerId={serverId}>
            <ChatArea channelId={channelId} />
        </DashboardLayout>
    );
}
