import express from "express";
import prisma from "../lib/prisma";
import { nanoid } from "nanoid";

const router = express.Router();

/*
GET TEST
*/
router.get("/", async (req, res) => {
  res.json({
    success: true,
    message: "Rooms route working"
  });
});

/*
CREATE ROOM
*/
router.post("/create", async (req, res) => {
  try {
    const roomCode = nanoid(6).toUpperCase();

    const room = await prisma.room.create({
      data: {
        code: roomCode
      }
    });

    res.json({
      success: true,
      room
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to create room"
    });
  }
});

/*
JOIN ROOM
*/
router.post("/join", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Room code required"
      });
    }

    const room = await prisma.room.findUnique({
      where: {
        code: code.toUpperCase()
      }
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    res.json({
      success: true,
      room
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to join room"
    });
  }
});

export default router;