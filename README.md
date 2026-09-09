# 🚀 ReachInbox - Full-Stack Email Job Scheduler

An AI-driven, scalable email job scheduling and management platform built for **ReachInbox** (Outbox Labs). This monorepo features a modern **Next.js 16** frontend, an **Express.js** API backend, **BullMQ + Redis** job queues with configurable rate-limiting/throttling, **Elasticsearch** log indexer, **Prisma ORM (PostgreSQL)** database, and **Ethereal SMTP** test email integration.

---

## 🌟 Key Features

1. **Email Job Scheduling & Popover Modal**
   - **Send Later Popover**: Schedule emails for exact dates/times or quick presets (*In 30 mins*, *Tomorrow morning*, *Next week*).
   - **Throttling Controls**: Configure delays between consecutive emails (e.g., 2 seconds) and hourly sending caps (e.g., 50 emails/hr) to avoid spam flags.

2. **Compose & Batch Upload**
   - **Recipient Management**: Add multiple email recipients as interactive chips with a `+N` indicator.
   - **CSV Recipient Upload**: Parse and auto-populate recipient lists directly from `.csv` files.
   - **Rich Text Toolbar**: Full formatting support (Bold, Italic, Bullet lists, Link insertion, Image attachment previews).

3. **Email List & Detail View**
   - **Figma-Matched UI**: Interactive sidebar with live counts (`Scheduled`, `Sent`), profile details (`Oliver Brown`), and email list filtering.
   - **Detail Modal**: Inspect sent/scheduled emails with full sender headers, status tags, and highlight boxes.

4. **Robust Queue Management & Monitoring**
   - **BullMQ + Redis Queue**: Reliable asynchronous job execution with automatic retry logic and concurrency controls.
   - **BullMQ Admin Dashboard**: Built-in queue monitor accessible at `/admin/queues`.
   - **Elasticsearch Log Indexing**: Real-time audit logs and fast search queries over sent email history.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, Lucide Icons, NextAuth.js
- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM, BullMQ, Redis, Elasticsearch, Ethereal SMTP / Nodemailer
- **Database**: PostgreSQL (Docker container on port 5433)
- **Monorepo Structure**:
  - `frontend/` - Next.js client application
  - `backend/` - Express API server, BullMQ workers, and Prisma schema

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
Make sure you have installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Docker Desktop](https://www.docker.com/) (for PostgreSQL, Redis, and Elasticsearch)

---

### 1️⃣ Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/formulatorOm/reachinbox-scheduler.git
cd reachinbox-scheduler

# Install Backend dependencies
cd backend
npm install

# Install Frontend dependencies
cd ../frontend
npm install
```

---

### 2️⃣ Start Docker Services (Database, Redis, Elasticsearch)

From the project root directory, launch the required Docker containers:

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on port `5433`
- **Redis** on port `6379`
- **Elasticsearch** on port `9200`

---

### 3️⃣ Setup Environment Variables

#### Backend `.env` (`backend/.env`)
```env
PORT=5002
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/reachinbox_db?schema=public"
REDIS_HOST="localhost"
REDIS_PORT=6379
ELASTICSEARCH_NODE="http://localhost:9200"
JWT_SECRET="reachinbox_jwt_secret_key"
```

#### Frontend `.env.local` (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:5002"
NEXTAUTH_SECRET="reachinbox_nextauth_secret_key"
NEXTAUTH_URL="http://localhost:3000"
```

---

### 4️⃣ Database Migration

In the `backend/` directory, run Prisma migrations:

```bash
cd backend
npx prisma db push
```

---

### 5️⃣ Run the Application

Start both the backend API and frontend client:

#### Terminal 1 (Backend Server & Queue Worker):
```bash
cd backend
npm start
```
*Backend runs at:* `http://localhost:5002`  
*Queue Dashboard at:* `http://localhost:5002/admin/queues`

#### Terminal 2 (Frontend Client):
```bash
cd frontend
npm run dev
```
*Frontend runs at:* `http://localhost:3000`

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/emails/schedule` | Schedule a new email or batch of emails |
| `GET` | `/api/emails` | List all scheduled & sent emails |
| `GET` | `/api/emails/:id` | Get details of a single email |
| `GET` | `/admin/queues` | Interactive BullMQ Queue Dashboard |

---

## 🌐 Deploying to Cloud

### Frontend (Vercel)
1. Push project to GitHub.
2. Log into [Vercel.com](https://vercel.com) and click **Add New Project**.
3. Import your repository and set **Root Directory** to `frontend`.
4. Add Environment Variable `NEXT_PUBLIC_API_URL` pointing to your backend.
5. Click **Deploy**.

### Backend (Render / Railway)
1. Create a free PostgreSQL database on Render / Railway.
2. Create a Web Service pointing to the `backend` folder.
3. Set Build Command: `npm install && npx prisma generate`
4. Set Start Command: `npm start`
5. Click **Deploy**.

---

## 📄 License
This project is created for the ReachInbox (Outbox Labs) Full-stack Hiring Assignment.
