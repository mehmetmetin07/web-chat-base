"use client";

import { use } from "react";
import { DMChatArea } from "@/components/organisms/DMChatArea";
import { DashboardLayout } from "@/components/templates/DashboardLayout";

export default function ServerDMPage({
    params
}: {
    params: Promise<{ serverId: string; userId: string }>
}) {
    const { serverId, userId } = use(params);

    return (
        <DashboardLayout initialServerId={serverId}>
            <DMChatArea userId={userId} />
        </DashboardLayout>
    );
}
