"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useVoiceState } from "@/hooks/useVoiceState";
import { useWebRTC } from "@/hooks/useWebRTC";

interface VoiceContextType {
    activeChannelId: string | null;
    activeServerId: string | null;
    isConnected: boolean;
    joinVoiceChannel: (channelId: string, serverId: string) => Promise<void>;
    leaveVoiceChannel: () => void;
    toggleMute: () => void;
    isMuted: boolean;
    participants: any[]; // consistent with useVoiceState return
    remoteStreams: Map<string, MediaStream>;
    activeChannelName: string | null; // For UI display
}

const VoiceContext = createContext<VoiceContextType | null>(null);

export function VoiceProvider({ children }: { children: ReactNode }) {
    // Global State
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [activeServerId, setActiveServerId] = useState<string | null>(null);
    const [activeChannelName, setActiveChannelName] = useState<string | null>(null);

    // Hooks lifted up
    // Note: useVoiceState expects (channelId, serverId). We pass the ACTIVE ones.
    const voiceState = useVoiceState(activeChannelId, activeServerId);

    // WebRTC Hook
    const { remoteStreams } = useWebRTC({
        channelId: activeChannelId || "",
        userId: voiceState.myState?.user_id || null,
        isMicMuted: voiceState.myState?.muted || false
    });

    const joinVoiceChannel = useCallback(async (channelId: string, serverId: string) => {
        // If already in a channel, leave it first? useVoiceState's joinChannel handles insert.
        // Ideally we cleanup first.
        if (activeChannelId && activeChannelId !== channelId) {
            await voiceState.leaveChannel();
        }

        setActiveChannelId(channelId);
        setActiveServerId(serverId);

        // We'll perform the actual join in the effect or directly here if useVoiceState exposes it?
        // useVoiceState needs the props to be updated to trigger its internal effect? 
        // No, useVoiceState relies on props.
        // BUT useVoiceState `joinChannel` function calls insert.
        // We need to wait for state update? 
        // Actually, we can just set state, let the hook update, then call join?
        // Better: The hook reacts to channelId change by fetching participants.
        // But WE need to explicitly call "joinChannel" (INSERT) to enter the room.
    }, [activeChannelId, voiceState]);

    // Ref to track if we need to auto-join after state update
    const [pendingJoin, setPendingJoin] = useState(false);

    useEffect(() => {
        if (pendingJoin && activeChannelId && activeServerId) {
            voiceState.joinChannel();
            setPendingJoin(false);
        }
    }, [activeChannelId, activeServerId, pendingJoin, voiceState]);

    const handleJoin = async (channelId: string, serverId: string) => {
        if (activeChannelId === channelId) return; // Already here

        // Leave old
        if (activeChannelId) {
            await voiceState.leaveChannel();
        }

        setActiveChannelId(channelId);
        setActiveServerId(serverId);
        setPendingJoin(true);
        // Name will be fetched or set separately. For now let's hope UI passes it or we fetch it.
    };

    const handleLeave = async () => {
        await voiceState.leaveChannel();
        setActiveChannelId(null);
        setActiveServerId(null);
        setActiveChannelName(null);
    };

    return (
        <VoiceContext.Provider value={{
            activeChannelId,
            activeServerId,
            isConnected: voiceState.isConnected,
            joinVoiceChannel: handleJoin,
            leaveVoiceChannel: handleLeave,
            toggleMute: () => voiceState.toggleMute(!voiceState.myState?.muted),
            isMuted: voiceState.myState?.muted || false,
            participants: voiceState.participants,
            remoteStreams,
            activeChannelName
        }}>
            {children}
            {/* Render Audio Elements Globally */}
            {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
                <GlobalAudioPlayer key={peerId} stream={stream} />
            ))}
        </VoiceContext.Provider>
    );
}

// Helper Audio Component
import { useRef } from "react";
function GlobalAudioPlayer({ stream }: { stream: MediaStream }) {
    const ref = useRef<HTMLAudioElement>(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.srcObject = stream;
        }
    }, [stream]);
    return <audio ref={ref} autoPlay playsInline />;
}

export function useVoice() {
    const context = useContext(VoiceContext);
    if (!context) throw new Error("useVoice must be used within VoiceProvider");
    return context;
}
