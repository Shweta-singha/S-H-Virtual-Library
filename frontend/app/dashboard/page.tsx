"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function DashboardPage() {

  const [stats, setStats] = useState<any>(null);

  useEffect(() => {

    const fetchAnalytics = async () => {

      try {

        const user = JSON.parse(
          localStorage.getItem("user") || "{}"
        );

        const res = await axios.get(
          `http://localhost:5000/analytics/${user.email}`
        );

        console.log(res.data);

        setStats(res.data);

      } catch (error) {

        console.error(error);

      }

    };

    fetchAnalytics();

  }, []);

  return (

    <main className="min-h-screen bg-black text-white p-10">

      <div className="max-w-5xl mx-auto">

        <h1 className="text-5xl text-amber-300 font-bold mb-10">
          Study Dashboard
        </h1>

        {/* STATS */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

          {/* TODAY */}

          <div className="bg-[#1a140f] p-6 rounded-2xl">

            <p className="text-gray-400">
              Today's Study
            </p>

            <h2 className="text-4xl text-amber-300 mt-2">

              {stats
                ? `${stats.todayHours}h`
                : "Loading..."}

            </h2>

          </div>

          {/* WEEKLY */}

          <div className="bg-[#1a140f] p-6 rounded-2xl">

            <p className="text-gray-400">
              Weekly Study
            </p>

            <h2 className="text-4xl text-amber-300 mt-2">

              {stats
                ? `${stats.weeklyHours}h`
                : "Loading..."}

            </h2>

          </div>

          {/* STREAK */}

          <div className="bg-[#1a140f] p-6 rounded-2xl">

            <p className="text-gray-400">
              Study Streak
            </p>

            <h2 className="text-4xl text-amber-300 mt-2">

              {stats
                ? `${stats.streak} Days 🔥`
                : "Loading..."}

            </h2>

          </div>

        </div>

        {/* CALENDAR */}

        <div className="bg-[#1a140f] p-8 rounded-2xl">

          <Calendar />

        </div>

      </div>

    </main>

  );

}