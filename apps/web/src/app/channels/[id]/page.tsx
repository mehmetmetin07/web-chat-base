import { ChatArea } from "@/components/organisms/ChatArea";
import { DashboardLayout } from "@/components/templates/DashboardLayout";

export default function ChannelPage({ params }: { params: { id: string } }) {
    return (
        <DashboardLayout>
            <ChatArea channelId={params.id} />
        </DashboardLayout>
    );
}
