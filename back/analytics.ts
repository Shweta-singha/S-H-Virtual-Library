import { Router } from "express";
import { prisma } from "./prisma";

const router = Router();

/*
GET ANALYTICS
*/
router.get("/:email", async (req, res) => {

  try {

    const { email } = req.params;

    const sessions = await prisma.studySession.findMany({
      where: {
        userEmail: email,
        endedAt: {
          not: null
        }
      }
    });

    /*
    TODAY
    */
    const today = new Date();

    const todaySessions = sessions.filter(session => {

      const date = new Date(session.startedAt);

      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );

    });

    const todaySeconds = todaySessions.reduce(
      (acc, session) => acc + (session.duration || 0),
      0
    );

    /*
    WEEK
    */
    const weekAgo = new Date();

    weekAgo.setDate(today.getDate() - 7);

    const weekSessions = sessions.filter(session => {

      return new Date(session.startedAt) >= weekAgo;

    });

    const weeklySeconds = weekSessions.reduce(
      (acc, session) => acc + (session.duration || 0),
      0
    );

    /*
    STREAK
    */
    const streak = 7;

    res.json({

      todayHours: (todaySeconds / 3600).toFixed(2),

      weeklyHours: (weeklySeconds / 3600).toFixed(2),

      streak,

      sessions

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Failed to fetch analytics"
    });

  }

});

export default router;