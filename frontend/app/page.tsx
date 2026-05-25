"use client";

import axios from "axios";

import { useRouter } from "next/navigation";

import { useEffect, useState } from "react";

import { GoogleLogin } from "@react-oauth/google";

import { jwtDecode } from "jwt-decode";

export default function HomePage() {

  const router = useRouter();

  const [roomCode, setRoomCode] = useState("");

  const [loading, setLoading] = useState(false);

  /*
  GOOGLE USER
  */
  const [user, setUser] = useState<any>(null);

  /*
  PERSIST LOGIN
  */
  useEffect(() => {

    const saved = localStorage.getItem("user");

    if (saved) {

      setUser(JSON.parse(saved));

    }

  }, []);

  /*
  CREATE ROOM
  */
  const createRoom = async () => {

    try {

      setLoading(true);

      const res = await axios.post(
        "http://localhost:5000/rooms/create"
      );

      const code = res.data.room.code;

      router.push(`/room/${code}`);

    } catch (error) {

      console.error(error);

      alert("Failed to create room");

    } finally {

      setLoading(false);

    }

  };

  /*
  JOIN ROOM
  */
  const joinRoom = async () => {

    try {

      setLoading(true);

      const res = await axios.post(
        "http://localhost:5000/rooms/join",
        {
          code: roomCode
        }
      );

      router.push(`/room/${res.data.room.code}`);

    } catch (error) {

      console.error(error);

      alert("Room not found");

    } finally {

      setLoading(false);

    }

  };

  return (

    <main className="min-h-screen bg-[#140d08] text-[#f5e6d0] flex items-center justify-center">

      <div className="w-full max-w-md bg-[#24150d] border border-amber-700/30 rounded-2xl p-8 shadow-2xl">

        <h1 className="text-4xl font-serif text-amber-300 mb-2 text-center">
          S&H Virtual Library
        </h1>

        <p className="text-center text-amber-100/60 mb-8 italic">
          Study together in silence ✨
        </p>

        {/* GOOGLE LOGIN */}

        <div className="mb-8 flex justify-center">

          {!user ? (

            <GoogleLogin
              onSuccess={(credentialResponse) => {

                const decoded: any = jwtDecode(
                  credentialResponse.credential!
                );

                console.log(decoded);

                setUser(decoded);

                localStorage.setItem(
                  "user",
                  JSON.stringify(decoded)
                );

              }}
              onError={() => {

                console.log("Login Failed");

              }}
            />

          ) : (

            <div className="flex items-center gap-4 bg-[#1a140f] p-4 rounded-xl w-full">

              <img
                src={user.picture}
                alt="profile"
                className="w-14 h-14 rounded-full"
              />

              <div>

                <p className="text-white font-bold">
                  {user.name}
                </p>

                <p className="text-gray-400 text-sm">
                  {user.email}
                </p>

              </div>

            </div>

          )}

        </div>

        {/* ROOM ACTIONS */}

        <button
  onClick={() => router.push("/dashboard")}
  className="w-full mb-6 bg-[#3b2418] hover:bg-[#523122] text-white py-3 rounded-xl"
>
  Open Dashboard
</button>

        <div className="space-y-4">

          <button
            onClick={createRoom}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-500 text-black font-semibold py-3 rounded-xl transition"
          >
            {loading ? "Loading..." : "Create Study Room"}
          </button>

          <div className="flex gap-2">

            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Enter room code"
              className="flex-1 bg-[#1a110c] border border-amber-700/30 rounded-xl px-4 py-3 outline-none"
            />

            <button
              onClick={joinRoom}
              disabled={loading}
              className="bg-[#3b2418] hover:bg-[#523122] px-5 rounded-xl"
            >
              Join
            </button>

          </div>

        </div>

      </div>

    </main>

  );

}