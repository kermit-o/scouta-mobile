import { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert, Animated, Easing, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LiveKitRoom, AudioSession, VideoTrack, useTracks, useLocalParticipant, useConnectionState, isTrackReference } from "@livekit/react-native";
import { Track, ConnectionState, VideoPresets, type LocalVideoTrack, type RoomOptions } from "livekit-client";
import { Ionicons } from "@expo/vector-icons";
import { joinStream, getGiftCatalog, sendGift, sendReaction } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Fonts, LIVEKIT_URL } from "@/lib/constants";

const API = "https://api.scouta.co/api/v1";

interface ChatMsg { username?: string; display_name?: string; message: string; is_agent?: boolean; }
interface GiftItem { id: number; name: string; emoji: string; coin_cost: number; }

// Simulcast + adaptive stream so the server can serve each viewer the layer
// their connection can handle — keeps the stream solid on poor networks.
const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: { pixelDensity: "screen" },
  dynacast: true,
  publishDefaults: {
    simulcast: true,
    videoSimulcastLayers: [VideoPresets.h360, VideoPresets.h180],
    red: true,
    dtx: true,
  },
  videoCaptureDefaults: {
    resolution: VideoPresets.h720.resolution,
  },
};

// A single reaction emoji that floats up and fades, then calls onDone so the
// parent can drop it from state. Pure RN Animated — no extra deps.
function FloatingHeart({ emoji, x, onDone }: { emoji: string; x: number; onDone: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(onDone);
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -220] });
  const opacity = anim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] });
  return (
    <Animated.Text style={{ position: "absolute", bottom: 0, right: x, fontSize: 26, transform: [{ translateY }], opacity }}>
      {emoji}
    </Animated.Text>
  );
}

// Full-screen native video. For the host we show their own (local) camera; for
// viewers we show the host's remote camera. Must live inside <LiveKitRoom>.
function VideoStage({ isHost, facing }: { isHost: boolean; facing: "front" | "back" }) {
  const tracks = useTracks([Track.Source.Camera]);
  const connState = useConnectionState();
  const refs = tracks.filter(isTrackReference);
  const cam = refs.find((t) => (isHost ? t.participant.isLocal : !t.participant.isLocal)) || refs[0];
  return (
    <View style={StyleSheet.absoluteFill}>
      {cam ? (
        <VideoTrack trackRef={cam} style={{ flex: 1 }} objectFit="cover" mirror={isHost && facing === "front"} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
          <ActivityIndicator color={Colors.red} size="large" />
          <Text style={{ color: "rgba(255,255,255,0.4)", fontFamily: Fonts.mono, fontSize: 12, marginTop: 12 }}>
            {connState === ConnectionState.Connecting ? "CONNECTING…" : isHost ? "STARTING CAMERA…" : "WAITING FOR HOST…"}
          </Text>
        </View>
      )}
      {connState === ConnectionState.Reconnecting && (
        <View style={{ position: "absolute", top: 90, left: 0, right: 0, alignItems: "center" }}>
          <View style={{ backgroundColor: "rgba(0,0,0,0.8)", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}>
            <ActivityIndicator color={Colors.gold} size="small" />
            <Text style={{ color: Colors.gold, fontFamily: Fonts.mono, fontSize: 12 }}>Reconnecting…</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const ctrlBtn = {
  width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.55)",
  alignItems: "center" as const, justifyContent: "center" as const,
  borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
};

// Host-only camera/mic controls. Uses the local participant from room context,
// so it must live inside <LiveKitRoom>.
function HostControls({ facing, setFacing }: { facing: "front" | "back"; setFacing: (f: "front" | "back") => void }) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [busy, setBusy] = useState(false);

  const flip = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const pub = localParticipant.getTrackPublication(Track.Source.Camera);
      const vt = pub?.videoTrack as LocalVideoTrack | undefined;
      const next = facing === "front" ? "back" : "front";
      if (vt) {
        await vt.restartTrack({ facingMode: next === "front" ? "user" : "environment" });
        setFacing(next);
      }
    } catch {}
    setBusy(false);
  }, [busy, facing, localParticipant, setFacing]);

  const toggleMic = useCallback(async () => {
    try { await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled); } catch {}
  }, [isMicrophoneEnabled, localParticipant]);

  return (
    <View style={{ position: "absolute", right: 12, top: "32%", gap: 14, alignItems: "center" }}>
      <TouchableOpacity onPress={flip} disabled={busy} style={ctrlBtn}>
        <Ionicons name="camera-reverse" size={24} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity onPress={toggleMic} style={[ctrlBtn, !isMicrophoneEnabled && { backgroundColor: Colors.red }]}>
        <Ionicons name={isMicrophoneEnabled ? "mic" : "mic-off"} size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default function LiveRoomScreen() {
  const { roomName, hostToken, title: titleParam } = useLocalSearchParams<{ roomName: string; hostToken?: string; title?: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<string>("connecting");
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [viewers, setViewers] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [lkToken, setLkToken] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [msg, setMsg] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [giftAnim, setGiftAnim] = useState<{s:string;e:string;n:string}|null>(null);
  const [hearts, setHearts] = useState<{id:number;emoji:string;x:number}[]>([]);
  const wsRef = useRef<WebSocket|null>(null);
  const chatListRef = useRef<FlatList>(null);
  const heartId = useRef(0);

  const showReaction = useCallback((emoji: string) => {
    const id = ++heartId.current;
    const x = 10 + Math.floor(Math.random() * 24);
    setHearts((prev) => [...prev.slice(-24), { id, emoji, x }]);
  }, []);

  // Native audio routing for the call. Start on enter, release on exit.
  useEffect(() => {
    AudioSession.startAudioSession().catch(() => {});
    return () => { AudioSession.stopAudioSession().catch(() => {}); };
  }, []);

  useEffect(() => {
    var ws: WebSocket|null = null;
    var interval: any = null;

    // Chat WS + history + gift catalog + viewer-count polling. Shared by both
    // the host and viewer paths once we have a LiveKit token.
    async function setupRoom() {
      try { var ch = await fetch(API + "/live/" + roomName + "/chat?limit=50"); var cd = await ch.json(); if (cd.messages) setChat(cd.messages); } catch {}
      // WebSocket — pass the auth token so the server derives chat identity
      // from it (anti-impersonation). Without it the connection is read-only.
      var tk = await getToken();
      var wsUrl = API.replace("https://","wss://").replace("http://","ws://") + "/live/" + roomName + "/ws" + (tk ? "?token=" + encodeURIComponent(tk) : "");
      ws = new WebSocket(wsUrl); wsRef.current = ws;
      ws.onmessage = function(e) {
        try {
          var m = JSON.parse(e.data);
          if (m.type === "chat") setChat(function(p) { return p.concat(m).slice(-100); });
          else if (m.type === "gift") { setGiftAnim({s:m.sender,e:m.emoji,n:m.gift_name}); setTimeout(function(){setGiftAnim(null);}, 3000); }
          else if (m.type === "reaction") showReaction(m.emoji || "❤️");
          else if (m.type === "stream_ended") setStatus("ended");
        } catch {}
      };
      try { var gd = await getGiftCatalog(); setGifts(gd.gifts || []); } catch {}
      interval = setInterval(async function() {
        try {
          var ar2 = await fetch(API + "/live/active"); var ad2 = await ar2.json();
          var f2 = (ad2.streams||[]).find(function(x:any){return x.room_name===roomName;});
          if (f2) setViewers(f2.viewer_count); else setStatus("ended");
        } catch {}
      }, 10000);
    }

    (async () => {
      // Host path: we already received a publish token from /live/start. The
      // backend rejects a host re-joining their own room (already_broadcasting),
      // so we must use that token directly instead of calling join.
      if (hostToken) {
        setIsHost(true);
        setLkToken(hostToken as string);
        if (titleParam) setTitle(titleParam as string);
        setStatus("ok");
        await setupRoom();
        return;
      }
      // Viewer path.
      try {
        var r = await joinStream(roomName as string);
        if (r.status === 200 && r.data && r.data.token) {
          setStatus("ok"); setTitle(r.data.title || "");
          setLkToken(r.data.token);
          await setupRoom();
        } else if (r.status === 409) {
          // This user is the host of this room but arrived without a publish
          // token (e.g. re-opened from the list). Offer to end the orphaned
          // stream so they can start fresh.
          setIsHost(true);
          setError("already_broadcasting");
          setStatus("broadcasting_elsewhere");
        } else {
          setError((r.data && r.data.detail) || "Cannot join"); setStatus("fail");
        }
      } catch { setError("Network error"); setStatus("fail"); }
    })();
    return function() { if (ws) ws.close(); if (interval) clearInterval(interval); };
  }, [roomName, hostToken]);

  function send() {
    if (!msg.trim() || !wsRef.current) return;
    // Identity is derived server-side from the token; only send the text.
    wsRef.current.send(JSON.stringify({type:"chat",message:msg.trim()}));
    setMsg("");
  }

  async function react() {
    showReaction("❤️");  // optimistic
    try { await sendReaction(roomName as string, "❤️"); } catch {}
  }

  async function doGift(g: GiftItem) {
    var r = await sendGift(roomName as string, g.id);
    if (r.ok) setShowGifts(false); else Alert.alert("Error", r.detail || "Not enough coins");
  }

  function doEnd() {
    Alert.alert("End Stream?", "This will end the live for everyone.", [
      {text:"Cancel",style:"cancel"},
      {text:"End",style:"destructive",onPress:async function(){
        try{var t=await getToken();await fetch(API+"/live/"+roomName+"/end",{method:"POST",headers:{Authorization:"Bearer "+t}});}catch{}
        router.back();
      }}
    ]);
  }

  async function endOrphanAndLeave() {
    try { var t = await getToken(); await fetch(API + "/live/" + roomName + "/end", { method: "POST", headers: { Authorization: "Bearer " + t } }); } catch {}
    router.replace("/(app)/live");
  }

  if (status === "broadcasting_elsewhere") return (
    <View style={{flex:1,backgroundColor:Colors.bg,alignItems:"center",justifyContent:"center",padding:24}}>
      <Ionicons name="radio" size={56} color={Colors.red} />
      <Text style={{color:Colors.text,fontSize:20,fontWeight:"700",marginTop:16,marginBottom:8}}>Already Broadcasting</Text>
      <Text style={{color:Colors.textMuted,fontFamily:Fonts.mono,fontSize:12,marginBottom:24,textAlign:"center"}}>This stream is still marked live from another session. End it, then start a new one.</Text>
      <TouchableOpacity onPress={endOrphanAndLeave} style={{backgroundColor:Colors.red,paddingHorizontal:24,paddingVertical:12,marginBottom:12,flexDirection:"row",alignItems:"center",gap:8}}>
        <Ionicons name="stop-circle-outline" size={16} color="#fff" />
        <Text style={{color:"#fff",fontFamily:Fonts.mono,fontWeight:"700"}}>END PREVIOUS STREAM</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={function(){router.back();}} style={{paddingHorizontal:24,paddingVertical:10}}>
        <Text style={{color:Colors.textMuted,fontFamily:Fonts.mono,fontSize:12}}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  if (status === "ended" || status === "fail") return (
    <View style={{flex:1,backgroundColor:Colors.bg,alignItems:"center",justifyContent:"center",padding:24}}>
      <Ionicons name={status==="ended"?"radio-outline":"warning-outline"} size={56} color={status==="ended"?Colors.textMuted:Colors.red} />
      <Text style={{color:Colors.text,fontSize:20,fontWeight:"700",marginTop:16,marginBottom:8}}>{status==="ended"?"Stream Ended":"Cannot Join"}</Text>
      <Text style={{color:Colors.textMuted,fontFamily:Fonts.mono,fontSize:12,marginBottom:24,textAlign:"center"}}>{error||"This stream has ended."}</Text>
      <TouchableOpacity onPress={function(){router.back();}} style={{borderWidth:1,borderColor:Colors.blue,paddingHorizontal:24,paddingVertical:12,borderRadius:8}}>
        <Text style={{color:Colors.blue,fontFamily:Fonts.mono}}>Back to Streams</Text>
      </TouchableOpacity>
    </View>
  );

  if (status === "connecting") return (
    <View style={{flex:1,backgroundColor:Colors.bg,alignItems:"center",justifyContent:"center"}}>
      <ActivityIndicator color={Colors.red} size="large" />
      <Text style={{color:Colors.textMuted,fontFamily:Fonts.mono,fontSize:12,marginTop:16}}>CONNECTING...</Text>
    </View>
  );

  return (
    <View style={{flex:1,backgroundColor:"#000"}}>
      {/* Native LiveKit video — full screen */}
      {lkToken ? (
        <LiveKitRoom
          serverUrl={LIVEKIT_URL}
          token={lkToken}
          connect={true}
          audio={isHost}
          video={isHost ? { facingMode: "user" } : false}
          options={ROOM_OPTIONS}
          onError={function(e){ setError(e.message || "Stream error"); }}
        >
          <VideoStage isHost={isHost} facing={facing} />
          {isHost && <HostControls facing={facing} setFacing={setFacing} />}
        </LiveKitRoom>
      ) : (
        <View style={[StyleSheet.absoluteFill,{alignItems:"center",justifyContent:"center"}]}>
          <Ionicons name="radio-outline" size={64} color="rgba(255,255,255,0.12)" />
        </View>
      )}

      {/* Top scrim for header legibility */}
      <View pointerEvents="none" style={{position:"absolute",top:0,left:0,right:0,height:110,backgroundColor:"rgba(0,0,0,0.45)"}} />

      {/* Header */}
      <View style={{position:"absolute",top:0,left:0,right:0,paddingTop:48,paddingHorizontal:12,paddingBottom:8,flexDirection:"row",alignItems:"center"}}>
        <TouchableOpacity onPress={function(){router.back();}} style={{padding:4}} hitSlop={{top:8,bottom:8,left:8,right:8}}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={{flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6}}>
          <View style={{width:8,height:8,borderRadius:4,backgroundColor:Colors.red}} />
          <Text style={{color:Colors.red,fontFamily:Fonts.mono,fontSize:12,fontWeight:"700"}}>LIVE</Text>
          <View style={{flexDirection:"row",alignItems:"center",gap:3}}>
            <Ionicons name="eye-outline" size={13} color="rgba(255,255,255,0.6)" />
            <Text style={{color:"rgba(255,255,255,0.6)",fontFamily:Fonts.mono,fontSize:11}}>{viewers}</Text>
          </View>
        </View>
        {isHost && (
          <TouchableOpacity onPress={doEnd} style={{backgroundColor:Colors.red,paddingHorizontal:12,paddingVertical:6,borderRadius:6}}>
            <Text style={{color:"#fff",fontFamily:Fonts.mono,fontSize:11,fontWeight:"700"}}>END</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Gift animation */}
      {giftAnim && (
        <View style={{position:"absolute",top:"25%",left:0,right:0,alignItems:"center",zIndex:50}}>
          <View style={{backgroundColor:"rgba(0,0,0,0.9)",paddingHorizontal:24,paddingVertical:14,borderRadius:16,flexDirection:"row",alignItems:"center",gap:10}}>
            <Text style={{fontSize:36}}>{giftAnim.e}</Text>
            <View>
              <Text style={{color:Colors.gold,fontFamily:Fonts.mono,fontSize:12,fontWeight:"700"}}>{giftAnim.s}</Text>
              <Text style={{color:Colors.textMuted,fontSize:11}}>sent {giftAnim.n}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Chat overlay */}
      <View style={{position:"absolute",left:0,right:70,bottom:64,maxHeight:"42%"}}>
        <FlatList ref={chatListRef} data={chat} keyExtractor={function(_,i){return String(i);}}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={function(){chatListRef.current?.scrollToEnd({animated:false});}}
          contentContainerStyle={{paddingHorizontal:12,paddingVertical:8}}
          renderItem={function({item}){return (
            <View style={{flexDirection:"row",alignSelf:"flex-start",backgroundColor:"rgba(0,0,0,0.5)",borderRadius:14,paddingHorizontal:10,paddingVertical:5,marginVertical:3,gap:6,alignItems:"baseline"}}>
              <Text style={{color:item.is_agent?Colors.blue:Colors.green,fontFamily:Fonts.mono,fontSize:12,fontWeight:"700"}}>{item.display_name||item.username}{item.is_agent?" ⚡":""}</Text>
              <Text style={{color:"#fff",fontSize:14,flexShrink:1}}>{item.message}</Text>
            </View>
          );}} />
      </View>

      {/* Floating reactions */}
      <View pointerEvents="none" style={{position:"absolute",right:8,bottom:80,width:60,height:240,zIndex:60}}>
        {hearts.map(function(h){return (
          <FloatingHeart key={h.id} emoji={h.emoji} x={h.x} onDone={function(){setHearts(function(p){return p.filter(function(z){return z.id!==h.id;});});}} />
        );})}
      </View>

      {/* Bottom bar (gift picker + input), rises with keyboard */}
      <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined} style={{position:"absolute",left:0,right:0,bottom:0}}>
        {showGifts && (
          <View style={{backgroundColor:Colors.card,borderTopWidth:1,borderTopColor:Colors.border,padding:12}}>
            <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <Text style={{color:Colors.text,fontWeight:"600",fontSize:14}}>Send a Gift</Text>
              <TouchableOpacity onPress={function(){setShowGifts(false);}}><Ionicons name="close" size={22} color={Colors.textMuted} /></TouchableOpacity>
            </View>
            <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
              {gifts.map(function(g){return (
                <TouchableOpacity key={g.id} onPress={function(){doGift(g);}}
                  style={{backgroundColor:Colors.bg,borderWidth:1,borderColor:Colors.border,borderRadius:12,paddingVertical:12,paddingHorizontal:8,alignItems:"center",width:"30%"}}>
                  <Text style={{fontSize:28}}>{g.emoji}</Text>
                  <Text style={{color:Colors.text,fontSize:11,marginTop:4}}>{g.name}</Text>
                  <Text style={{color:Colors.gold,fontFamily:Fonts.mono,fontSize:10}}>🪙 {g.coin_cost}</Text>
                </TouchableOpacity>
              );})}
            </View>
          </View>
        )}
        <View style={{flexDirection:"row",paddingHorizontal:8,paddingVertical:8,gap:8,backgroundColor:"rgba(0,0,0,0.4)"}}>
          <TouchableOpacity onPress={function(){setShowGifts(!showGifts);}} style={{width:42,height:42,borderRadius:21,backgroundColor:showGifts?Colors.gold+"44":"rgba(0,0,0,0.4)",alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:showGifts?Colors.gold:"rgba(255,255,255,0.15)"}}>
            <Ionicons name="gift" size={20} color={showGifts?Colors.gold:"#fff"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={react} style={{width:42,height:42,borderRadius:21,backgroundColor:"rgba(0,0,0,0.4)",alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:"rgba(255,255,255,0.15)"}}>
            <Ionicons name="heart" size={20} color={Colors.red} />
          </TouchableOpacity>
          <TextInput value={msg} onChangeText={setMsg} onSubmitEditing={send} placeholder="Say something..." placeholderTextColor={Colors.textMuted}
            style={{flex:1,backgroundColor:"rgba(0,0,0,0.5)",borderWidth:1,borderColor:"rgba(255,255,255,0.15)",color:"#fff",paddingHorizontal:14,paddingVertical:10,borderRadius:24,fontSize:14}} />
          <TouchableOpacity onPress={send} disabled={!msg.trim()}
            style={{width:42,height:42,borderRadius:21,backgroundColor:msg.trim()?Colors.green:"rgba(0,0,0,0.4)",alignItems:"center",justifyContent:"center"}}>
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
