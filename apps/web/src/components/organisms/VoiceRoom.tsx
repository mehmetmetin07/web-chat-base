"use client";

import { useVoiceState } from "@/hooks/useVoiceState";
import { Button } from "@/components/atoms/Button";
import { Mic, MicOff, Headphones, LogOut } from "lucide-react";

interface VoiceRoomProps {
    channelId: string;
    serverId: string;
    channelName: string;
}

export function VoiceRoom({ channelId, serverId, channelName }: VoiceRoomProps) {
    const { participants, isConnected, joinChannel, leaveChannel, toggleMute, myState } = useVoiceState(channelId, serverId);

    return (
        <div className="flex flex-col h-full bg-gray-800 text-white">
            <div className="p-4 border-b border-gray-700 shadow-sm flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="text-gray-400">🔊</span> {channelName}
                </h2>
                <div className="flex gap-2">
                    {isConnected ? (
                        <Button variant="danger" onClick={leaveChannel} className="flex items-center gap-2 border-red-600 text-red-100 hover:bg-red-900/50">
                            <LogOut className="w-4 h-4" /> Disconnect
                        </Button>
                    ) : (
                        <Button variant="primary" onClick={() => joinChannel()} className="bg-green-600 hover:bg-green-700 border-none text-white">
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
                            <Button onClick={() => joinChannel()} variant="primary" className="bg-green-600 hover:bg-green-700 border-none text-white">
                                Join Room
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {participants.map((p) => (
                            <div key={p.id} className="bg-gray-700 rounded-lg p-4 flex flex-col items-center justify-center gap-3 relative shadow-lg ring-1 ring-white/5 transition-all hover:ring-white/10">
                                <div className={`relative ${p.muted ? 'opacity-75' : ''}`}>
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
                                <div className="text-center w-full">
                                    <h3 className="font-semibold truncate w-full px-2">{p.users?.full_name || p.users?.email?.split('@')[0]}</h3>
                                    <p className="text-xs text-gray-400 mt-1">{p.muted ? "Muted" : "Connected"}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isConnected && (
                <div className="p-4 bg-gray-900 border-t border-gray-800 flex justify-center gap-4">
                    <Button
                        variant="secondary"
                        onClick={() => toggleMute(!myState?.muted)}
                        className={`rounded-full p-4 h-16 w-16 flex items-center justify-center transition-all ${myState?.muted ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                    >
                        {myState?.muted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                    </Button>
                </div>
            )}
        </div>
    );
}
