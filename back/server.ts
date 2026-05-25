import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import analyticsRoutes from "./analytics";

import { Server } from "socket.io";

import roomsRoute from "./routes/rooms";

import { initSocket } from "./sockets";
import studyRoutes from "./study";

dotenv.config();

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

initSocket(io);

app.use(cors());
app.use(express.json());
app.use("/analytics", analyticsRoutes);

app.use("/study", studyRoutes);


app.get("/", (req, res) => {
  res.send("Study Library Backend Running 🚀");
});

app.use("/rooms", roomsRoute);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});