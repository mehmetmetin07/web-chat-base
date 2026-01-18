import { use, useEffect, useState } from "react";
import { ChatArea } from "@/components/organisms/ChatArea";
import { DashboardLayout } from "@/components/templates/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { VoiceRoom } from "@/components/organisms/VoiceRoom";

type Channel = {
    id: string;
    name: string;
    type: 'text' | 'voice';
};

export default function ServerChannelPage({
    params
}: {
    params: Promise<{ serverId: string; channelId: string }>
}) {
    const { serverId, channelId } = use(params);
    const [channel, setChannel] = useState<Channel | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChannel = async () => {
            const { data } = await supabase
                .from("groups")
                .select("id, name, type")
                .eq("id", channelId)
                .single();

            if (data) {
                setChannel(data as Channel);
            }
            setLoading(false);
        };
        fetchChannel();
    }, [channelId]);

    return (
        <DashboardLayout initialServerId={serverId}>
            {loading ? (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : channel?.type === 'voice' ? (
                <VoiceRoom channelId={channelId} serverId={serverId} channelName={channel.name} />
            ) : (
                <ChatArea channelId={channelId} />
            )}
        </DashboardLayout>
    );
}
