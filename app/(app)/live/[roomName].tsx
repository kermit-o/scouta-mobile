import { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert, Animated, Easing, Share } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { joinStream, getGiftCatalog, sendGift } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Fonts, LIVEKIT_URL, API_BASE } from "@/lib/constants";
import { takePendingHostToken } from "@/lib/liveTokenStore";
import { LiveKitRoom, AudioSession, VideoTrack, useTracks } from "@livekit/react-native";
import { Track } from "livekit-client";

interface ChatMsg { username?: string; display_name?: string; message: string; is_agent?: boolean; }
interface GiftItem { id: number; name: string; emoji: string; coin_cost: number; }
interface FloatingHeart { id: number; anim: Animated.Value; xOffset: number; }

function VideoArea({ title, isHost }: { title: string; isHost: boolean }) {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const camTrack = tracks.find(t => !!t.publication);
  if (!camTrack) {
    return (
      <View style={{flex:1,alignItems:"center",justifyContent:"center"}}>
        <ActivityIndicator color={Colors.textMuted} size="small" />
        <Text style={{color:"rgba(255,255,255,0.5)",fontFamily:Fonts.mono,fontSize:11,marginTop:10}}>
          {isHost ? "Starting camera..." : "Waiting for host..."}
        </Text>
        {title ? <Text style={{color:"rgba(255,255,255,0.3)",fontFamily:Fonts.mono,fontSize:10,marginTop:4}}>{title}</Text> : null}
      </View>
    );
  }
  return <VideoTrack trackRef={camTrack} style={{flex:1,backgroundColor:"#000"}} objectFit="cover" mirror={isHost && camTrack.participant?.isLocal} />;
}

export default function LiveRoomScreen() {
  const { roomName } = useLocalSearchParams<{ roomName: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<string>("connecting");
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [viewers, setViewers] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const [lkToken, setLkToken] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [msg, setMsg] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [giftAnim, setGiftAnim] = useState<{s:string;e:string;n:string}|null>(null);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const wsRef = useRef<WebSocket|null>(null);
  const chatListRef = useRef<FlatList>(null);
  const heartIdRef = useRef(0);

  useEffect(() => {
    AudioSession.startAudioSession();
    return () => { AudioSession.stopAudioSession(); };
  }, []);

  useEffect(() => {
    var ws: WebSocket|null = null;
    var interval: any = null;
    (async () => {
      try {
        var pending = takePendingHostToken(roomName as string);
        var lkTok: string;
        var streamTitle = "";
        var amHost = false;
        if (pending) {
          lkTok = pending.token;
          streamTitle = pending.title || "";
          amHost = true;
          console.log("[live/room] using host token from store");
        } else {
          var r = await joinStream(roomName as string);
          if (!(r.status === 200 && r.data && r.data.token)) {
            setError((r.data && r.data.detail) || "Cannot join");
            setStatus("fail");
            return;
          }
          lkTok = r.data.token;
          streamTitle = r.data.title || "";
        }

        try {
          var ar = await fetch(API_BASE + "/live/active");
          var ad = await ar.json();
          var found = (ad.streams||[]).find(function(x:any){return x.room_name===roomName;});
          if (found) {
            if (!streamTitle && found.title) streamTitle = found.title;
            if (found.host_username === user?.username) amHost = true;
          }
        } catch {}

        setTitle(streamTitle);
        setIsHost(amHost);
        setLkToken(lkTok);
        setStatus("ok");

        try { var ch = await fetch(API_BASE + "/live/" + roomName + "/chat?limit=50"); var cd = await ch.json(); if (cd.messages) setChat(cd.messages); } catch {}

        var wsUrl = API_BASE.replace("https://","wss://").replace("http://","ws://") + "/live/" + roomName + "/ws";
        ws = new WebSocket(wsUrl); wsRef.current = ws;
        ws.onmessage = function(e) {
          try {
            var m = JSON.parse(e.data);
            if (m.type === "chat") setChat(function(p) { return p.concat(m).slice(-100); });
            else if (m.type === "gift") { setGiftAnim({s:m.sender,e:m.emoji,n:m.gift_name}); setTimeout(function(){setGiftAnim(null);}, 3000); }
            else if (m.type === "stream_ended") setStatus("ended");
          } catch {}
        };

        try { var gd = await getGiftCatalog(); setGifts(gd.gifts || []); } catch {}

        interval = setInterval(async function() {
          try {
            var ar2 = await fetch(API_BASE + "/live/active"); var ad2 = await ar2.json();
            var f2 = (ad2.streams||[]).find(function(x:any){return x.room_name===roomName;});
            if (f2) setViewers(f2.viewer_count); else setStatus("ended");
          } catch {}
        }, 10000);
      } catch (e: any) {
        console.log("[live/room] exception", e);
        setError("Network error");
        setStatus("fail");
      }
    })();
    return function() { if (ws) ws.close(); if (interval) clearInterval(interval); };
  }, [roomName]);

  function send() {
    if (!msg.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({type:"chat",user_id:user?.id,username:user?.username,display_name:user?.display_name||user?.username,message:msg.trim()}));
    setMsg("");
  }

  async function doGift(g: GiftItem) {
    var r = await sendGift(roomName as string, g.id);
    if (r.ok) setShowGifts(false); else Alert.alert("Error", r.detail || "Not enough coins");
  }

  function doEnd() {
    Alert.alert("End Stream?", "This will end the live for everyone.", [
      {text:"Cancel",style:"cancel"},
      {text:"End",style:"destructive",onPress:async function(){
        try{var t=await getToken();await fetch(API_BASE+"/live/"+roomName+"/end",{method:"POST",headers:{Authorization:"Bearer "+t}});}catch{}
        router.back();
      }}
    ]);
  }

  function tapHeart() {
    const id = heartIdRef.current++;
    const anim = new Animated.Value(0);
    const xOffset = (Math.random() - 0.5) * 60;
    setHearts(prev => [...prev, { id, anim, xOffset }]);
    Animated.timing(anim, {
      toValue: 1,
      duration: 1800,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setHearts(prev => prev.filter(h => h.id !== id));
    });
  }

  async function shareStream() {
    try {
      const url = `https://scouta.co/live/${roomName}`;
      const message = title ? `${title} — Live now on Scouta\n${url}` : `Live now on Scouta\n${url}`;
      await Share.share({ message, url, title: title || "Live on Scouta" });
    } catch (e: any) {
      console.log("[live/share] error", e?.message || e);
    }
  }

  if (status === "ended" || status === "fail") return (
    <View style={{flex:1,backgroundColor:Colors.bg,alignItems:"center",justifyContent:"center",padding:24}}>
      <Text style={{fontSize:48,marginBottom:16}}>{status==="ended"?"[off]":"[!]"}</Text>
      <Text style={{color:Colors.text,fontSize:20,fontWeight:"700",marginBottom:8}}>{status==="ended"?"Stream Ended":"Cannot Join"}</Text>
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
    <View style={{flex:1,backgroundColor:Colors.bg}}>
      <View style={{paddingTop:48,paddingHorizontal:12,paddingBottom:8,flexDirection:"row",alignItems:"center",backgroundColor:"#000"}}>
        <TouchableOpacity onPress={function(){router.back();}} style={{padding:4}}>
          <Text style={{color:"#fff",fontSize:22}}>X</Text>
        </TouchableOpacity>
        <View style={{flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6}}>
          <View style={{width:8,height:8,borderRadius:4,backgroundColor:Colors.red}} />
          <Text style={{color:Colors.red,fontFamily:Fonts.mono,fontSize:12,fontWeight:"700"}}>LIVE</Text>
          <Text style={{color:"rgba(255,255,255,0.5)",fontFamily:Fonts.mono,fontSize:11}}>{viewers} watching</Text>
        </View>
        {isHost && (
          <TouchableOpacity onPress={doEnd} style={{backgroundColor:Colors.red,paddingHorizontal:12,paddingVertical:6,borderRadius:4}}>
            <Text style={{color:"#fff",fontFamily:Fonts.mono,fontSize:11,fontWeight:"700"}}>END</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{height:"35%",backgroundColor:"#000"}}>
        {lkToken ? (
          <LiveKitRoom
            serverUrl={LIVEKIT_URL}
            token={lkToken}
            connect={true}
            audio={isHost}
            video={isHost}
            options={{
              adaptiveStream: false,
              dynacast: false,
              publishDefaults: { simulcast: false, videoCodec: "h264" },
            }}
            onError={(e: any) => { console.log("[lk] error", e?.message || e); setError(e?.message || "LiveKit error"); }}
            onConnected={() => console.log("[lk] connected")}
            onDisconnected={(reason: any) => console.log("[lk] disconnected", reason)}
          >
            <VideoArea title={title} isHost={isHost} />
          </LiveKitRoom>
        ) : (
          <View style={{flex:1,alignItems:"center",justifyContent:"center"}}>
            <Text style={{color:"rgba(255,255,255,0.15)",fontSize:60}}>[live]</Text>
            <Text style={{color:"rgba(255,255,255,0.4)",fontFamily:Fonts.mono,fontSize:12,marginTop:8}}>{title}</Text>
          </View>
        )}
      </View>

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

      <View style={{flex:1}}>
        <FlatList ref={chatListRef} data={chat} keyExtractor={function(_,i){return String(i);}}
          onContentSizeChange={function(){chatListRef.current?.scrollToEnd({animated:false});}}
          contentContainerStyle={{paddingHorizontal:12,paddingVertical:8}}
          renderItem={function({item}){return (
            <View style={{flexDirection:"row",gap:6,paddingVertical:4}}>
              <Text style={{color:item.is_agent?Colors.blue:Colors.green,fontFamily:Fonts.mono,fontSize:12,fontWeight:"700"}}>{item.display_name||item.username}{item.is_agent?" *":""}</Text>
              <Text style={{color:Colors.text,fontSize:14,flex:1}}>{item.message}</Text>
            </View>
          );}} />
      </View>

      {/* Floating hearts (local-only optimistic, no sync until backend reaction endpoint) */}
      <View pointerEvents="none" style={{position:"absolute",right:4,bottom:60,width:90,height:240}}>
        {hearts.map(function(h){
          var translateY = h.anim.interpolate({inputRange:[0,1],outputRange:[0,-220]});
          var translateX = h.anim.interpolate({inputRange:[0,0.5,1],outputRange:[0,h.xOffset,h.xOffset*1.4]});
          var opacity = h.anim.interpolate({inputRange:[0,0.7,1],outputRange:[1,1,0]});
          var scale = h.anim.interpolate({inputRange:[0,0.2,1],outputRange:[0.6,1.3,1]});
          return (
            <Animated.View key={h.id} style={{position:"absolute",right:30,bottom:0,transform:[{translateY},{translateX},{scale}],opacity}}>
              <Text style={{fontSize:30,color:Colors.red}}>{"♥"}</Text>
            </Animated.View>
          );
        })}
      </View>

      {showGifts && (
        <View style={{backgroundColor:Colors.card,borderTopWidth:1,borderTopColor:Colors.border,padding:12}}>
          <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <Text style={{color:Colors.text,fontWeight:"600",fontSize:14}}>Send a Gift</Text>
            <TouchableOpacity onPress={function(){setShowGifts(false);}}><Text style={{color:Colors.textMuted,fontSize:20}}>X</Text></TouchableOpacity>
          </View>
          <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
            {gifts.map(function(g){return (
              <TouchableOpacity key={g.id} onPress={function(){doGift(g);}}
                style={{backgroundColor:Colors.bg,borderWidth:1,borderColor:Colors.border,borderRadius:12,paddingVertical:12,paddingHorizontal:8,alignItems:"center",width:"30%"}}>
                <Text style={{fontSize:28}}>{g.emoji}</Text>
                <Text style={{color:Colors.text,fontSize:11,marginTop:4}}>{g.name}</Text>
                <Text style={{color:Colors.gold,fontFamily:Fonts.mono,fontSize:10}}>{g.coin_cost} coins</Text>
              </TouchableOpacity>
            );})}
          </View>
        </View>
      )}

      <View style={{flexDirection:"row",paddingHorizontal:8,paddingVertical:8,gap:6,borderTopWidth:1,borderTopColor:Colors.border,backgroundColor:Colors.bg,alignItems:"center"}}>
        <TouchableOpacity onPress={function(){setShowGifts(!showGifts);}} style={{width:38,height:38,borderRadius:19,backgroundColor:showGifts?Colors.gold+"44":Colors.card,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:showGifts?Colors.gold:Colors.border}}>
          <Text style={{fontSize:18,color:Colors.text}}>G</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={tapHeart} style={{width:38,height:38,borderRadius:19,backgroundColor:Colors.card,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:Colors.border}}>
          <Text style={{fontSize:18,color:Colors.red}}>{"♥"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={shareStream} style={{width:38,height:38,borderRadius:19,backgroundColor:Colors.card,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:Colors.border}}>
          <Text style={{fontSize:18,color:Colors.blue}}>{"↗"}</Text>
        </TouchableOpacity>
        <TextInput value={msg} onChangeText={setMsg} onSubmitEditing={send} placeholder="Say something..." placeholderTextColor={Colors.textMuted}
          style={{flex:1,backgroundColor:Colors.inputBg,borderWidth:1,borderColor:Colors.inputBorder,color:Colors.text,paddingHorizontal:12,paddingVertical:8,borderRadius:19,fontSize:14,height:38}} />
        <TouchableOpacity onPress={send} disabled={!msg.trim()}
          style={{width:38,height:38,borderRadius:19,backgroundColor:msg.trim()?Colors.green:Colors.card,alignItems:"center",justifyContent:"center"}}>
          <Text style={{color:"#fff",fontSize:16,fontWeight:"700"}}>{">"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
