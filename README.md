# S&H Virtual Library

A real-time collaborative virtual study platform where users can:

- Create and join study rooms
- Study together in real time
- Track productivity and study sessions
- View analytics dashboards and study streaks
- Enable live camera/video collaboration

---

# Features

## Authentication

- Google OAuth 2.0 Login
- Persistent Sessions
- User Profile Integration

## Real-Time Collaboration

- Socket.IO live room presence
- WebRTC peer-to-peer video communication
- Real-time study room updates

## Study Tracking

- Start/Stop study timer
- Session duration tracking
- Productivity analytics
- Weekly study statistics
- Study streak tracking
- Calendar visualization dashboard

## Backend

- Express.js REST APIs
- Prisma ORM integration
- PostgreSQL (Neon) database
- Real-time socket handling

## Frontend

- Next.js App Router
- Tailwind CSS UI
- Responsive dashboard design
- Protected routes and local persistence

---

# Tech Stack

## Frontend

- Next.js
- React.js
- TypeScript
- Tailwind CSS

## Backend

- Node.js
- Express.js
- Socket.IO
- WebRTC
- Prisma ORM

## Database

- PostgreSQL (Neon)

## Authentication

- Google OAuth 2.0
- JWT

---

# Project Structure

```bash
S-H-Virtual-Library/
│
├── frontend/
├── back/
└── README.md
```

---

# Installation

## Clone Repository

```bash
git clone https://github.com/Shweta-singha/S-H-Virtual-Library.git
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Runs on:

```bash
http://localhost:3000
```

---

## Backend Setup

```bash
cd back
npm install
npm run dev
```

Runs on:

```bash
http://localhost:5000
```

---

# Environment Variables

Create:

```bash
back/.env
```

Add:

```env
DATABASE_URL=
JWT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FRONTEND_URL=http://localhost:3000
PORT=5000
```

---

# Future Improvements

- Pomodoro mode
- Group study leaderboards
- AI productivity insights
- Screen sharing
- Cloud deployment
- Mobile responsiveness improvements

---

# Author


