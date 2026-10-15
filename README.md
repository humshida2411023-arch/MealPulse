# HostelEats — Full-stack hostel food feedback system

## Requirements
- Node.js 20+ (18+ may work)
- MongoDB Community Server running locally, or MongoDB Atlas
- VS Code

## 1. Connect MongoDB Compass
For a local MongoDB installation, open MongoDB Compass and connect using:

`mongodb://127.0.0.1:27017`

The app uses the database `hosteleats`. You do not need to create it manually; MongoDB creates it after the first successful write.

If you use MongoDB Atlas instead, replace `MONGODB_URI` in `backend/.env` with your Atlas connection string.

## 2. Start the backend
Open a VS Code terminal:

```bash
cd backend
```

Copy `.env.example` to `.env` (Windows PowerShell: `Copy-Item .env.example .env`; macOS/Linux: `cp .env.example .env`), then install and run:

```bash
npm install
npm run dev
```

Backend runs at `http://localhost:5000`.

## 3. Start the frontend
Open a second VS Code terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

## 4. Create an administrator
Register a normal account first. To grant administrator access, open MongoDB Compass:
1. Open database `hosteleats`.
2. Open collection `users`.
3. Find your user document and change `role` from `"student"` to `"admin"`.
4. Sign out and sign in again.

Never expose your database connection string or JWT secret publicly.

## Features included
- Student registration and login with hashed passwords and JWT authentication
- Student dashboard
- Daily menu view and administrator menu management
- Meal feedback with taste, quality, quantity, cleanliness and overall ratings
- Personal feedback history
- Complaints submission and status tracking
- Administrator dashboard with feedback, complaints, average ratings and basic analytics
- Responsive UI and API validation
- MongoDB via Mongoose; compatible with MongoDB Compass because Compass views the same database

## Troubleshooting
- `ECONNREFUSED 127.0.0.1:27017`: start MongoDB Community Server, then reconnect in Compass.
- `MongoServerSelectionError`: check `MONGODB_URI` and ensure MongoDB is running.
- `EADDRINUSE`: another process is using the port; stop it or change `PORT` in `.env`.
- If npm reports dependency errors, use Node.js 20 LTS and run `npm install` in each folder.
