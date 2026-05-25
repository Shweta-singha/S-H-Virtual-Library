"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";

import { socket } from "@/app/lib/socket";

interface Props {
  params: Promise<{
    code: string;
  }>;
}

interface RoomUser {
  socketId?: string;
  userId: string;
  name: string;
  image?: string;
  isStudying: boolean;
  cameraOn: boolean;
}

export default function RoomPage({ params }: Props) {

  const [roomCode, setRoomCode] = useState("");

  const [users, setUsers] = useState<RoomUser[]>([]);

  const [mySocketId, setMySocketId] = useState("");

  /*
  STUDY TIMER
  */
  const [isStudying, setIsStudying] = useState(false);

  const [seconds, setSeconds] = useState(0);
  const [sessionId, setSessionId] =
  useState<string | null>(null);

  /*
  LOCAL VIDEO
  */
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /*
  REMOTE VIDEO
  */
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  /*
  WEBRTC
  */
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  const localStream = useRef<MediaStream | null>(null);

  /*
  CAMERA
  */
  const [cameraOn, setCameraOn] = useState(false);

  /*
  JOIN ROOM
  */
  useEffect(() => {

    const load = async () => {

      const resolved = await params;

      setRoomCode(resolved.code);

      setMySocketId(socket.id || "");

      const savedUser = localStorage.getItem("user");

const parsedUser = savedUser
  ? JSON.parse(savedUser)
  : null;

socket.emit("join-room", {
  roomId: resolved.code,
  user: {
    userId: parsedUser?.sub || Math.random().toString(),

    name: parsedUser?.name || "Study User",

    image: parsedUser?.picture || "",

    isStudying: false,

    cameraOn: false
  }
});

    };

    load();

    /*
    RECEIVE ROOM USERS
    */
    socket.on("room-presence", (roomUsers) => {

      setUsers(roomUsers);

    });

    /*
    PRESENCE CHANGED
    */
    socket.on("presence-changed", ({ socketId, user }) => {

      setUsers(prev =>
        prev.map(u =>
          u.socketId === socketId
            ? { ...u, ...user }
            : u
        )
      );

    });

    /*
    USER JOINED
    */
    socket.on("user-joined", ({ socketId, user }) => {

      setUsers(prev => [
        ...prev,
        {
          ...user,
          socketId
        }
      ]);

    });

    /*
    USER LEFT
    */
    socket.on("user-left", ({ socketId }) => {

      setUsers(prev =>
        prev.filter(user => user.socketId !== socketId)
      );

    });

    /*
    WEBRTC OFFER
    */
    socket.on("webrtc-offer", async ({ offer, from }) => {

      if (!peerConnection.current) {

        peerConnection.current = new RTCPeerConnection();

      }

      /*
      REMOTE STREAM
      */
      peerConnection.current.ontrack = (event) => {

        const remoteStream = event.streams[0];

        if (remoteVideoRef.current) {

          remoteVideoRef.current.srcObject = remoteStream;

        }

      };

      /*
      ICE
      */
      peerConnection.current.onicecandidate = (event) => {

        if (event.candidate) {

          socket.emit("ice-candidate", {
            to: from,
            candidate: event.candidate
          });

        }

      };

      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      /*
      LOCAL TRACKS
      */
   if (localStream.current) {

  const senders =
    peerConnection.current.getSenders();

  localStream.current.getTracks().forEach(track => {

    const alreadyAdded = senders.find(
      sender => sender.track === track
    );

    if (!alreadyAdded) {

      peerConnection.current?.addTrack(
        track,
        localStream.current!
      );

    }

  });

}

      const answer = await peerConnection.current.createAnswer();

      await peerConnection.current.setLocalDescription(answer);

      socket.emit("webrtc-answer", {
        to: from,
        answer
      });

    });

    /*
    WEBRTC ANSWER
    */
    socket.on("webrtc-answer", async ({ answer }) => {

      await peerConnection.current?.setRemoteDescription(
        new RTCSessionDescription(answer)
      );

    });

    /*
    ICE
    */
    socket.on("ice-candidate", async ({ candidate }) => {

      try {

        await peerConnection.current?.addIceCandidate(candidate);

      } catch (error) {

        console.error(error);

      }

    });

    return () => {

      socket.off("room-presence");
      socket.off("presence-changed");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("webrtc-offer");
      socket.off("webrtc-answer");
      socket.off("ice-candidate");

    };

  }, [params]);

  /*
  TIMER
  */
  useEffect(() => {

    let interval: NodeJS.Timeout;

    if (isStudying) {

      interval = setInterval(() => {

        setSeconds(prev => prev + 1);

      }, 1000);

    }

    return () => clearInterval(interval);

  }, [isStudying]);

/*
START / STOP STUDY
*/
const toggleStudy = async () => {

  try {

    const next = !isStudying;

    /*
    START STUDY SESSION
    */
    if (next) {

      console.log("START CLICKED");

      const savedUser = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      console.log(savedUser);

      const res = await axios.post(
        "http://localhost:5000/study/start",
        {
          userEmail: savedUser.email,
        }
      );

      console.log(res.data);

      setSessionId(res.data.id);

      console.log("Study session started");

    }

    /*
    END STUDY SESSION
    */
    else {

      console.log("STOP CLICKED");

      if (sessionId) {

        const res = await axios.post(
          "http://localhost:5000/study/end",
          {
            sessionId,
          }
        );

        console.log(res.data);

        console.log("Study session ended");

      }

    }

    /*
    UPDATE UI
    */
    setIsStudying(next);

    socket.emit("presence-update", {
      isStudying: next
    });

  } catch (error) {

    console.error(error);

  }

};
  /*
  CAMERA
  */
  const toggleCamera = async () => {

    /*
    TURN OFF
    */
    if (cameraOn) {

      localStream.current?.getTracks().forEach(track => track.stop());

      if (videoRef.current) {

        videoRef.current.srcObject = null;

      }

      setCameraOn(false);

      socket.emit("presence-update", {
        cameraOn: false
      });

      return;
    }

    /*
    TURN ON
    */
    try {

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStream.current = stream;

      setCameraOn(true);

      /*
      SHOW LOCAL VIDEO
      */
      if (videoRef.current) {

        videoRef.current.srcObject = stream;

      }

      socket.emit("presence-update", {
        cameraOn: true
      });

      /*
      CREATE PEER
      */
      if (peerConnection.current) {

  peerConnection.current.close();

}
peerConnection.current = new RTCPeerConnection();
      /*
      LOCAL TRACKS
      */
      stream.getTracks().forEach(track => {

        peerConnection.current?.addTrack(track, stream);

      });

      /*
      REMOTE STREAM
      */
      peerConnection.current.ontrack = (event) => {

        const remoteStream = event.streams[0];

        if (remoteVideoRef.current) {

          remoteVideoRef.current.srcObject = remoteStream;

        }

      };

      /*
      ICE
      */
      peerConnection.current.onicecandidate = (event) => {

        if (event.candidate) {

          const partner = users.find(
            user => user.socketId !== mySocketId
          );

          if (!partner?.socketId) return;

          socket.emit("ice-candidate", {
            to: partner.socketId,
            candidate: event.candidate
          });

        }

      };

      /*
      FIND PARTNER
      */
      const partner = users.find(
        user => user.socketId !== mySocketId
      );

      if (!partner?.socketId) {

        alert("Waiting for partner to join");

        return;
      }
      

      /*
      OFFER
      */
      const offer = await peerConnection.current.createOffer();

      await peerConnection.current.setLocalDescription(offer);

      socket.emit("webrtc-offer", {
        to: partner.socketId,
        offer
      });

    } catch (error) {

      console.error(error);

      alert("Camera permission denied");

    }

  };

  return (
    <main className="min-h-screen bg-[#0d0b08] text-white p-10">

      <div className="max-w-6xl mx-auto">

        <div className="flex justify-between items-center mb-10">

          <div>

            <h1 className="text-5xl font-bold text-amber-300">
              Study Room
            </h1>

            <p className="text-xl text-amber-500 mt-2">
              Room Code: {roomCode}
            </p>

          </div>

          <div className="bg-[#1a140f] px-5 py-3 rounded-xl border border-amber-700/20">

            <p className="text-amber-200">
              Online Users: {users.length}
            </p>

          </div>

        </div>

        {/* CONTROLS */}

        <div className="flex flex-wrap items-center gap-4 mb-10">

          <button
  onClick={toggleStudy}
  className={`px-6 py-3 rounded-xl font-bold transition ${
    isStudying
      ? "bg-green-500 hover:bg-green-400 text-black"
      : "bg-amber-500 hover:bg-amber-400 text-black"
  }`}
>
  {isStudying
    ? "Stop Studying"
    : "Start Studying"}
</button>

          <div className="bg-[#1a140f] px-5 py-3 rounded-xl border border-amber-700/20">

            <p className="text-amber-200 text-xl">
              Timer: {Math.floor(seconds / 60)}m {seconds % 60}s
            </p>

          </div>

          <button
            onClick={toggleCamera}
            className="bg-[#2c1b12] hover:bg-[#3a2418] px-6 py-3 rounded-xl border border-amber-700/20"
          >
            {cameraOn ? "Turn Camera Off" : "Turn Camera On"}
          </button>

        </div>

        {/* USERS */}

        <div className="grid grid-cols-2 gap-6 mb-10">

          {users.map((user, index) => (

            <div
              key={index}
              className="bg-[#1a140f] p-6 rounded-2xl border border-amber-700/20"
            >

              <div className="text-center">

                {user.image ? (

 <img
  src={user.image}
  alt="profile"
  referrerPolicy="no-referrer"
  className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
/>

) : (

  <div className="w-20 h-20 bg-amber-700 rounded-full mx-auto mb-4" />

)}

                <p className="text-amber-100 text-xl">
                  {user.name}
                </p>

                <p className="text-green-400 text-sm mt-2">
                  {user.isStudying
                    ? "Studying 📚"
                    : "Connected"}
                </p>

                <p className="text-blue-400 text-sm mt-2">
                  {user.cameraOn
                    ? "Camera On 📹"
                    : "Camera Off"}
                </p>

              </div>

            </div>

          ))}

        </div>

        {/* VIDEO SECTION */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* LOCAL */}

          <div className="bg-[#1a140f] p-4 rounded-2xl border border-amber-700/20">

            <h2 className="text-amber-300 mb-4 text-xl">
              Your Camera
            </h2>

            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-72 rounded-2xl object-cover bg-black"
            />

          </div>

          {/* REMOTE */}

          <div className="bg-[#1a140f] p-4 rounded-2xl border border-amber-700/20">

            <h2 className="text-amber-300 mb-4 text-xl">
              Partner Camera
            </h2>

            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-72 rounded-2xl object-cover bg-black"
            />

          </div>

        </div>

      </div>

    </main>
  );
}