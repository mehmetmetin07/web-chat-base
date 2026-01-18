"use client";

import { useVoice } from "@/providers/VoiceProvider";
import { Button } from "@/components/atoms/Button";
import { Mic, MicOff, Headphones, LogOut, Video, VideoOff } from "lucide-react";
import { useEffect, useRef } from "react";

function VideoPlayer({ stream }: { stream: MediaStream }) {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.srcObject = stream;
        }
    }, [stream]);
    return <video ref={ref} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />;
}

interface VoiceRoomProps {
    channelId: string;
    serverId: string;
    channelName: string;
}

export function VoiceRoom({ channelId, serverId, channelName }: VoiceRoomProps) {
    const { participants, isConnected, joinVoiceChannel, leaveVoiceChannel, toggleMute, isMuted, toggleVideo, isVideoEnabled, localStream, remoteStreams, userId: myUserId } = useVoice();

    // Helper to get stream for a participant
    const getStream = (userId: string) => {
        if (userId === myUserId) {
            return localStream;
        }
        return remoteStreams.get(userId);
    };

    // Check if we are connected to THIS channel
    return (
        <div className="flex flex-col h-full bg-gray-800 text-white">
            <div className="p-4 border-b border-gray-700 shadow-sm flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="text-gray-400">🔊</span> {channelName}
                </h2>
                <div className="flex gap-2">
                    {isConnected ? (
                        <Button variant="secondary" onClick={leaveVoiceChannel} className="flex items-center gap-2 border border-red-600 bg-red-600 text-white hover:bg-red-700">
                            <LogOut className="w-4 h-4" /> Disconnect
                        </Button>
                    ) : (
                        <Button variant="primary" onClick={() => joinVoiceChannel(channelId, serverId)} className="bg-green-600 hover:bg-green-700 border-none text-white">
                            Join Voice
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
                {participants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                        <div className="p-6 bg-gray-700 rounded-full">
                            <Headphones className="w-12 h-12" />
                        </div>
                        <p className="text-lg">No one is here yet.</p>
                        {!isConnected && (
                            <Button onClick={() => joinVoiceChannel(channelId, serverId)} variant="primary" className="bg-green-600 hover:bg-green-700 border-none text-white">
                                Join Room
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {participants.map((p) => {
                            const isMe = p.user_id === myUserId;
                            const stream = isMe ? localStream : remoteStreams.get(p.user_id);
                            const hasVideo = stream && stream.getVideoTracks().length > 0;

                            return (
                                <div key={p.id} className="bg-gray-700 rounded-lg p-4 flex flex-col items-center justify-center gap-3 relative shadow-lg ring-1 ring-white/5 transition-all hover:ring-white/10 overflow-hidden aspect-video">
                                    {/* Video Layer */}
                                    {hasVideo ? (
                                        <div className="absolute inset-0 z-0 bg-black">
                                            <VideoPlayer stream={stream!} />
                                        </div>
                                    ) : null}

                                    {/* Avatar Layer - Show if NO video */}
                                    {!hasVideo && (
                                        <div className={`relative z-10 ${p.muted ? 'opacity-75' : ''}`}>
                                            <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center bg-gray-500 text-2xl font-bold text-white overflow-hidden ${p.muted ? 'border-red-500' : 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]'}`}>
                                                {p.users?.avatar_url ? (
                                                    <img
                                                        src={p.users.avatar_url}
                                                        alt={p.users.full_name || ""}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    (p.users?.full_name?.[0] || p.users?.email?.[0] || "?").toUpperCase()
                                                )}
                                            </div>
                                            {p.muted && (
                                                <div className="absolute bottom-0 right-0 bg-red-600 rounded-full p-1.5 border-2 border-gray-700">
                                                    <MicOff className="w-3.5 h-3.5 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="text-center w-full z-10 relative bg-black/50 p-1 rounded backdrop-blur-sm mt-auto">
                                        <h3 className="font-semibold truncate w-full px-2 text-white text-sm text-shadow">
                                            {isMe ? "Me" : (p.users?.full_name || p.users?.email?.split('@')[0])}
                                        </h3>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {isConnected && (
                <div className="p-4 bg-gray-900 border-t border-gray-800 flex justify-center gap-4">
                    <Button
                        variant="secondary"
                        onClick={toggleVideo}
                        className={`rounded-full p-4 h-16 w-16 flex items-center justify-center transition-all ${isVideoEnabled ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                        title={isVideoEnabled ? "Turn Off Camera" : "Turn On Camera"}
                    >
                        {isVideoEnabled ? <Video className="w-8 h-8" /> : <VideoOff className="w-8 h-8" />}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={toggleMute}
                        className={`rounded-full p-4 h-16 w-16 flex items-center justify-center transition-all ${isMuted ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                    >
                        {isMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                    </Button>
                </div>
            )}
        </div>
    );
}
