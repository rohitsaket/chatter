"use client";
import * as React from "react";
import { Room, RoomEvent, Track, type RemoteTrack, type LocalParticipant, type Participant } from "livekit-client";
import { useJoinCall, useConversations } from "@/lib/queries";

/**
 * Real call room. When the server has no LiveKit configuration this shows a
 * truthful error state — calls are never simulated.
 */
export function CallsModule() {
  const conversations = useConversations();
  const join = useJoinCall();
  const [room, setRoom] = React.useState<Room | null>(null);
  const [participants, setParticipants] = React.useState<Participant[]>([]);
  const [muted, setMuted] = React.useState(false);
  const [camOn, setCamOn] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [targetSlug, setTargetSlug] = React.useState<string>("design");

  const groups = (conversations.data ?? []).filter((c) => c.kind === "GROUP");
  const target = (conversations.data ?? []).find((c) => c.slug === targetSlug) ?? groups[0];

  async function start() {
    setError(null);
    const res = await join.mutateAsync(target?.slug ?? "design");
    if (!res.configured) {
      setError(res.reason ?? "Calls are not configured.");
      return;
    }
    const r = new Room();
    await r.connect(res.url!, res.token!);
    await r.localParticipant.setMicrophoneEnabled(true);
    await r.localParticipant.setCameraEnabled(true);
    const refresh = () => setParticipants([r.localParticipant, ...r.remoteParticipants.values()]);
    r.on(RoomEvent.ParticipantConnected, refresh)
      .on(RoomEvent.ParticipantDisconnected, refresh)
      .on(RoomEvent.TrackSubscribed, refresh)
      .on(RoomEvent.TrackUnsubscribed, refresh)
      .on(RoomEvent.Disconnected, () => {
        setRoom(null);
        setParticipants([]);
      });
    refresh();
    setRoom(r);
  }

  async function toggleMute() {
    if (!room) return;
    const next = !muted;
    await room.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  }

  async function toggleCam() {
    if (!room) return;
    const next = !camOn;
    await room.localParticipant.setCameraEnabled(next);
    setCamOn(next);
  }

  function leave() {
    room?.disconnect();
    setRoom(null);
    setParticipants([]);
  }

  return (
    <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "#14121f", color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 22px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 800 }}>
            {target ? `${target.name} Call` : "Calls"} <span style={{ opacity: 0.6, fontSize: 12 }}>▾</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, opacity: 0.7, marginTop: 3 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: room ? "var(--good)" : "var(--warn)" }} />
            {room ? `${participants.length} participant${participants.length === 1 ? "" : "s"} · connected` : "Not in a call"}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <select
            value={targetSlug}
            onChange={(e) => setTargetSlug(e.target.value)}
            style={{ background: "#1e1b2e", color: "#fff", border: "1px solid #2b2740", borderRadius: 10, padding: "6px 10px", fontSize: 12.5 }}
          >
            {(conversations.data ?? []).map((c) => (
              <option key={c.id} value={c.slug ?? c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!room && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
          {error ? (
            <div style={{ maxWidth: 520, textAlign: "center" }}>
              <div style={{ fontSize: 34 }}>🎥</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 10 }}>Calls are not configured</div>
              <div style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.6, marginTop: 8 }}>{error}</div>
              <div style={{ fontSize: 12.5, opacity: 0.55, lineHeight: 1.6, marginTop: 10 }}>
                Set LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET on the API server to enable real voice and video.
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 15, opacity: 0.8 }}>Start a real call for {target?.name ?? "a conversation"}</div>
              <button
                type="button"
                onClick={() => void start()}
                disabled={join.isPending}
                style={{ background: "var(--p600)", color: "#fff", fontSize: 14, fontWeight: 800, border: "none", borderRadius: 12, padding: "13px 26px", cursor: "pointer" }}
              >
                {join.isPending ? "Connecting…" : "📞 Start Call"}
              </button>
            </>
          )}
        </div>
      )}

      {room && (
        <>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, padding: "4px 22px 14px", minHeight: 0 }}>
            {participants.map((p) => (
              <ParticipantTile key={p.sid} p={p} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", padding: "12px 22px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#1e1b2e", border: "1px solid #2b2740", borderRadius: 18, padding: "10px 14px" }}>
              <CallButton icon={muted ? "🎙" : "🎤"} label={muted ? "Unmute" : "Mute"} onClick={() => void toggleMute()} dot={muted} />
              <CallButton icon="🎥" label={camOn ? "Stop Video" : "Start Video"} onClick={() => void toggleCam()} />
              <CallButton
                icon="🖥"
                label="Share Screen"
                onClick={() => void room.localParticipant.setScreenShareEnabled(!room.localParticipant.isScreenShareEnabled)}
              />
              <div
                className="hover-dim"
                onClick={leave}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bad)", borderRadius: 12, padding: "13px 22px", marginLeft: 10, cursor: "pointer", fontWeight: 800, fontSize: 13.5 }}
              >
                📞 End Call
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function CallButton({ icon, label, onClick, dot }: { icon: string; label: string; onClick: () => void; dot?: boolean }) {
  return (
    <div className="hover-wash" onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "6px 13px", borderRadius: 12, cursor: "pointer", position: "relative" }}>
      <span style={{ fontSize: 17 }}>{icon}</span>
      <span style={{ fontSize: 11, opacity: 0.8 }}>{label}</span>
      {dot && <span style={{ position: "absolute", top: 4, right: 8, width: 7, height: 7, borderRadius: "50%", background: "var(--bad)" }} />}
    </div>
  );
}

function ParticipantTile({ p }: { p: Participant }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const isLocal = "publishTracks" in p || (p as LocalParticipant).isLocal;

  React.useEffect(() => {
    const pub = [...p.trackPublications.values()].find((t) => t.kind === Track.Kind.Video && t.track);
    const track = pub?.track as RemoteTrack | undefined;
    const el = videoRef.current;
    if (track && el) {
      track.attach(el);
      return () => {
        track.detach(el);
      };
    }
  }, [p, p.trackPublications.size]);

  const hasVideo = [...p.trackPublications.values()].some((t) => t.kind === Track.Kind.Video && t.track && !t.isMuted);

  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "linear-gradient(150deg,#37455e,#212a3c)", border: `2.5px solid ${p.isSpeaking ? "var(--p500)" : "transparent"}`, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 180 }}>
      <video ref={videoRef} autoPlay playsInline muted={isLocal} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: hasVideo ? "block" : "none" }} />
      {!hasVideo && (
        <div style={{ width: 88, height: 88, borderRadius: "50%", background: "rgba(255,255,255,.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "rgba(255,255,255,.9)" }}>
          {(p.name ?? p.identity).slice(0, 2).toUpperCase()}
        </div>
      )}
      {p.isSpeaking && (
        <div style={{ position: "absolute", top: 10, right: 10, width: 26, height: 26, borderRadius: "50%", background: "var(--p500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🔊</div>
      )}
      <div style={{ position: "absolute", left: 12, bottom: 12, display: "flex", alignItems: "center", gap: 7, background: "rgba(10,9,18,.65)", borderRadius: 9, padding: "6px 11px", fontSize: 12.5, fontWeight: 700, backdropFilter: "blur(4px)" }}>
        {p.name ?? p.identity}
        {isLocal ? " (You)" : ""}
      </div>
    </div>
  );
}
