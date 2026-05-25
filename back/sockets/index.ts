import { Server, Socket } from "socket.io";

interface RoomUser {
  socketId?: string;
  userId: string;
  name: string;
  image?: string;
  isStudying: boolean;
  cameraOn: boolean;
}
const presence = new Map<string, Map<string, RoomUser>>();

function getRoomUsers(roomId: string): RoomUser[] {
  return Array.from(presence.get(roomId)?.values() ?? []);
}

export function initSocket(io: Server) {

  io.on("connection", (socket: Socket) => {

    let currentRoom: string | null = null;

    /*
    JOIN ROOM
    */
    socket.on("join-room", ({ roomId, user }) => {

      currentRoom = roomId;

      socket.join(roomId);

      if (!presence.has(roomId)) {
        presence.set(roomId, new Map());
      }
presence.get(roomId)?.set(socket.id, {
  ...user,
  socketId: socket.id
});

      /*
      SEND CURRENT USERS
      */
      socket.emit("room-presence", getRoomUsers(roomId));

      /*
      NOTIFY OTHERS
      */
      socket.to(roomId).emit("user-joined", {
        socketId: socket.id,
        user
      });

    });

    /*
    WEBRTC OFFER
    */
    socket.on("webrtc-offer", ({ to, offer }) => {

      io.to(to).emit("webrtc-offer", {
        from: socket.id,
        offer
      });

    });

    /*
    WEBRTC ANSWER
    */
    socket.on("webrtc-answer", ({ to, answer }) => {

      io.to(to).emit("webrtc-answer", {
        from: socket.id,
        answer
      });

    });

    /*
    ICE CANDIDATE
    */
    socket.on("ice-candidate", ({ to, candidate }) => {

      io.to(to).emit("ice-candidate", {
        from: socket.id,
        candidate
      });

    });

    /*
    PRESENCE UPDATE
    */
    socket.on("presence-update", (update) => {

      if (!currentRoom) return;

      const room = presence.get(currentRoom);

      if (!room) return;

      const existing = room.get(socket.id);

      if (!existing) return;

      const updated = {
        ...existing,
        ...update
      };

      room.set(socket.id, updated);

      io.to(currentRoom).emit("room-presence", getRoomUsers(currentRoom));

    });

    /*
    DISCONNECT
    */
    socket.on("disconnect", () => {

      if (!currentRoom) return;

      presence.get(currentRoom)?.delete(socket.id);

      io.to(currentRoom).emit(
        "room-presence",
        getRoomUsers(currentRoom)
      );

    });

  });

}