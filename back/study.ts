import { Router } from "express";
import { prisma } from "./prisma";
const router = Router();

/*
START STUDY SESSION
*/
router.post("/start", async (req, res) => {

  try {

    const { userEmail } = req.body;

    const session = await prisma.studySession.create({
      data: {
        userEmail,
        startedAt: new Date(),
      },
    });

    res.json(session);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Failed to start session",
    });

  }

});

/*
END STUDY SESSION
*/
router.post("/end", async (req, res) => {

  try {

    const { sessionId } = req.body;

    const session = await prisma.studySession.findUnique({
      where: {
        id: sessionId,
      },
    });

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    const endedAt = new Date();

    const duration = Math.floor(
      (endedAt.getTime() -
        session.startedAt.getTime()) / 1000
    );

    const updated = await prisma.studySession.update({
      where: {
        id: sessionId,
      },
      data: {
        endedAt,
        duration,
      },
    });

    res.json(updated);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Failed to end session",
    });

  }

});

export default router;