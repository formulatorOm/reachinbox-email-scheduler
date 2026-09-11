# 🚀 ReachInbox - Full-Stack Email Job Scheduler

An enterprise-grade, distributed cold email job scheduling and outreach platform built for the **ReachInbox (Outbox Labs)** Full-Stack Hiring Assignment.

---

## 🔗 Production Cloud Links & References

| Service | Live URL / Access | Description |
| :--- | :--- | :--- |
| 🌐 **Live Web Application** | [https://reachinbox-email-scheduler-chi-two.vercel.app](https://reachinbox-email-scheduler-chi-two.vercel.app) | Production Next.js 16 client application deployed on Vercel. |
| 📊 **BullMQ Queue Dashboard** | [https://reachinbox-email-scheduler-chi-two.vercel.app/admin/queues](https://reachinbox-email-scheduler-chi-two.vercel.app/admin/queues) | Live Bull-Board UI monitor for real-time job queue visibility. |
| ⚙️ **Railway Backend API** | [https://enthusiastic-clarity-production.up.railway.app](https://enthusiastic-clarity-production.up.railway.app) | Live Express + TypeScript API server & worker deployed on Railway. |
| 📁 **GitHub Repository** | [https://github.com/formulatorOm/reachinbox-email-scheduler](https://github.com/formulatorOm/reachinbox-email-scheduler) | Monorepo source code (*Collaborators: `@Mitrajit`, `@Yadav036`*). |

---

## 🎯 Executive Overview & Problem Statement

At **ReachInbox**, cold email outreach requires sending millions of personalized email sequences reliably while maintaining domain sender reputation. 

A naive approach using basic `cron` jobs or raw `setTimeout` loops fails under load because:
1. **Server Restarts**: In-memory timers wipe out pending email tasks.
2. **Spam & Rate Limits**: Sending too many emails at once causes email service providers (Google/Microsoft) to blacklist domain IPs.
3. **Database Bottlenecks**: Polling a SQL database with cron every second degrades system performance.

### The Solution:
This project implements a **production-grade distributed email scheduler** that accepts scheduling requests via REST APIs, persists state in **PostgreSQL via Prisma ORM**, schedules asynchronous delayed jobs via **BullMQ + Redis**, enforces strict **hourly sender rate limits and delays**, indexes sent emails in **Elasticsearch**, triggers live **Slack notifications** when rate limits hit, and renders a high-fidelity frontend adhering to all **5 Figma design references**.

---

## 📐 System Architecture & Workflow Diagrams

### 1. High-Level Architecture Overview

```mermaid
flowchart TD
    subgraph Client ["Frontend (Next.js 16 + Tailwind CSS)"]
        UI["Dashboard & Figma Components"]
        Auth["NextAuth (Google & Credentials)"]
        Compose["Composer & CSV Lead Parser"]
    end

    subgraph Backend ["Backend API (Express.js + TypeScript)"]
        API["REST API Routes (/api/schedule)"]
        QueueManager["BullMQ Producer"]
        Prisma["Prisma ORM"]
    end

    subgraph Queues ["Asynchronous Queue & Storage (Redis & Postgres)"]
        Redis[("Redis (Delayed Jobs & Hourly Counters)")]
        DB[("PostgreSQL Database")]
        Worker["BullMQ Queue Worker (Concurrency: 5)"]
    end

    subgraph External ["External Services"]
        SMTP["Ethereal SMTP (Fake Email Sending)"]
        Elastic[("Elasticsearch Log Indexer")]
        Slack["Slack Webhook (Rate Limit Alerts)"]
    end

    UI --> Auth
    UI --> API
    Compose --> API
    API --> Prisma --> DB
    API --> QueueManager --> Redis
    Worker <--> Redis
    Worker --> Prisma
    Worker --> SMTP
    Worker --> Elastic
    Worker -- "Rate Limit Hit" --> Slack
```

---

### 2. End-to-End Email Scheduling & Execution Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Marketer
    participant Frontend as Next.js App
    participant API as Express API
    participant DB as PostgreSQL (Prisma)
    participant Redis as Redis Queue
    participant Worker as BullMQ Worker
    participant SMTP as Ethereal SMTP
    participant Slack as Slack Webhook

    User->>Frontend: Select recipients (or upload CSV) & set delay/limit
    User->>Frontend: Click "Send Later" -> Select date/time preset
    Frontend->>API: POST /api/schedule
    API->>DB: Create Campaign & Job records (Status: PENDING)
    API->>Redis: Enqueue BullMQ delayed job (delay = targetTime - Date.now())
    API-->>Frontend: Return HTTP 200 (Campaign Scheduled)
    
    Note over Redis,Worker: Target execution timestamp reached
    Redis->>Worker: Dispatch job to worker (Concurrency: 5)
    Worker->>Redis: Increment sender hourly counter (rate_limit:sender:hour)
    
    alt Hourly Rate Limit Exceeded
        Worker->>Slack: Send POST alert: "⚠️ Hourly limit reached for sender"
        Worker-->>Redis: Reschedule job into next available hour window
    else Within Rate Limit
        Worker->>SMTP: Send email via Ethereal Nodemailer transport
        Worker->>DB: Update Job status to SENT (sent_at timestamp)
        Worker->>Elasticsearch: Index email payload (reachinbox-emails)
    end
```

---

## 🔬 Tech Stack Breakdown: Why We Used Each Technology

### 1. ⚙️ BullMQ (Job Scheduler & Queue Engine)
- **What it is**: A fast, reliable TypeScript queue system for Node.js backed by Redis.
- **Why we used it (No Cron)**: Cron jobs poll at fixed intervals and cannot handle millions of dynamic target timestamps efficiently. BullMQ uses **Redis Sorted Sets (ZSET)** to schedule delayed jobs with millisecond precision.
- **What it does in this project**:
  - Receives email send requests and calculates `delay = scheduledTime - currentTime`.
  - Distributes tasks across **5 parallel worker threads** (`concurrency: 5`).
  - Automatically retries failed email sends with exponential backoff.
  - Exposes live queue metrics at `/admin/queues`.

### 2. ⚡ Redis (In-Memory Data Store & Atomic Counter)
- **What it is**: An ultra-fast, in-memory key-value database.
- **Why we used it**: Relational databases (PostgreSQL) are too slow for high-frequency queue operations and rate-limit locking. Redis operates entirely in memory with sub-millisecond latency.
- **What it does in this project**:
  - Serves as the persistent storage engine for BullMQ queues.
  - Maintains atomic rate-limiting counters using key `rate_limit:{senderId}:{hourWindow}` with a 1-hour expiration (`redis.expire(key, 3600)`).

### 3. 🐘 PostgreSQL & Prisma ORM (Relational Database)
- **What it is**: PostgreSQL is an enterprise relational database; Prisma is a type-safe TypeScript ORM.
- **Why we used it**: To guarantee **ACID compliance** and ensure zero data loss during server restarts.
- **What it does in this project**:
  - Stores `User`, `SenderAccount`, `Campaign`, `Job`, and `AuditLog` records.
  - Preserves job state (`PENDING`, `SENT`, `FAILED`) so if Node.js or Docker restarts, future jobs resume seamlessly without duplicating previously sent emails (Idempotency).

### 4. 🔎 Elasticsearch (Log Audit Indexer & Search Engine)
- **What it is**: A distributed full-text search and analytics engine.
- **Why we used it**: Querying massive email bodies and subject logs in SQL slows down primary database performance.
- **What it does in this project**:
  - Indexes every sent email under the `reachinbox-emails` index.
  - Provides sub-millisecond full-text search across `subject`, `to`, and `body` fields for the dashboard search bar.

### 5. ✉️ Ethereal Email & Nodemailer (Fake SMTP Transport)
- **What it is**: A safe fake SMTP service designed for testing email delivery.
- **Why we used it**: Allows testing real SMTP handshakes, headers, and previews without risking actual domain blacklisting.
- **What it does in this project**:
  - Receives emails dispatched by BullMQ worker threads and generates test URL previews (e.g. `https://ethereal.email/message/...`).

### 6. 💬 Slack OAuth & Incoming Webhooks (Real-Time Alerts)
- **What it is**: Slack’s OAuth 2.0 API for incoming webhooks.
- **Why we used it**: To provide real-time alert notifications when cold email senders hit their hourly limits.
- **What it does in this project**:
  - Allows users to click **Connect Slack** on the dashboard.
  - Saves user webhook URLs to PostgreSQL (`slack_webhook` column).
  - Posts live alert messages to the user's Slack channel whenever an hourly sending limit is triggered.

### 7. 🎨 Next.js 16 (App Router) + NextAuth + Tailwind CSS
- **What it is**: Modern React 19 web application framework.
- **Why we used it**: Server-Side Rendering (SSR), clean App Router layout structure, and seamless NextAuth session handling.
- **What it does in this project**:
  - Implements high-fidelity UI matching all **5 Figma design references**.
  - Provides Google OAuth and Credentials sign-in.
  - Renders recipient chips with dynamic `+N` overflow badges, CSV list uploader, and date-time popovers.

---

## 🎨 Component Workflows & Figma Compliance

### Workflow 1: Authentication (Figma Image 1)
- User signs in via Google OAuth or Credentials.
- Authenticated state resolves user email as `oliver.brown@domain.io` and avatar.
- Session is preserved globally via NextAuth `SessionProvider`.

### Workflow 2: Dashboard Overview (Figma Image 5)
- Displays **ONB** top logo, profile card, green outline **Compose** button, and **CORE** sidebar navigation.
- Live counters display **Scheduled 12** and **Sent 785** emails.
- Interactive table displays email records, recipient avatars, subject lines, status tags, and timestamps.

### Workflow 3: Compose Email & Recipient Management (Figma Images 2 & 3)
- **Sender Dropdown**: Select verified sender address.
- **Recipient Chips**: Interactive chip inputs with dynamic `+N` badge when multiple recipients exist.
- **CSV Uploader**: Click **Upload List** to parse `.csv` lead files and automatically convert email rows into recipient chips.
- **Throttling Inputs**: Set minimum delay between emails (e.g., 2s) and hourly cap (e.g., 50 emails/hour).

### Workflow 4: 'Send Later' Popover Modal (Figma Image 1)
- Click **Send Later** next to the Send button.
- Popover opens with a custom Date-Time picker and quick presets: **In 30 mins**, **Tomorrow morning**, **Next week**.

### Workflow 5: Email Detail View Modal (Figma Image 4)
- Click any table row to open the Email Detail Modal.
- Displays complete email headers, sender info callout box, status tags, and attached image previews.

---

## 🛠️ Local Installation & Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Docker Desktop](https://www.docker.com/)

---

### Step 1: Clone Repository & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/formulatorOm/reachinbox-email-scheduler.git
cd reachinbox-email-scheduler

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

---

### Step 2: Start Local Docker Infrastructure

Run Docker containers for PostgreSQL, Redis, and Elasticsearch:

```bash
# From project root directory
docker-compose up -d
```

This starts:
- **PostgreSQL**: `localhost:5433`
- **Redis**: `localhost:6379`
- **Elasticsearch**: `localhost:9200`

---

### Step 3: Environment Variables Setup

#### Backend Environment Variables (`backend/.env`)
```env
DATABASE_URL="postgresql://root:rootpassword@localhost:5433/reachinbox?schema=public"
PORT=5002
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379
ELASTICSEARCH_URL="http://127.0.0.1:9200"
JWT_SECRET="reachinbox_jwt_secret_key"
SLACK_CLIENT_ID="12011104406278.12016784835508"
SLACK_CLIENT_SECRET="e47c00737a0c48ea1e88274fe3702fb0"
```

#### Frontend Environment Variables (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:5002"
NEXTAUTH_SECRET="reachinbox_nextauth_secret_key"
NEXTAUTH_URL="http://localhost:3000"
```

---

### Step 4: Sync Database Schema

In the `backend/` folder, push the Prisma schema to PostgreSQL:

```bash
cd backend
npx prisma db push
```

---

### Step 5: Start Local Servers

#### Terminal 1 (Backend Server & Worker):
```bash
cd backend
npm start
```
- *Backend API*: `http://localhost:5002`
- *BullMQ Dashboard*: `http://localhost:5002/admin/queues`

#### Terminal 2 (Frontend Client):
```bash
cd frontend
npm run dev
```
- *Frontend App*: `http://localhost:3000`

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/schedule` | Schedule a new email campaign or batch of emails with throttling options |
| `GET` | `/api/senders/:userId` | Get or create sender accounts for user |
| `GET` | `/api/stats/:userId` | Fetch scheduled vs sent email counts |
| `GET` | `/api/jobs/scheduled/:userId` | List all pending/scheduled email jobs |
| `GET` | `/api/jobs/sent/:userId` | List all completed/sent email jobs |
| `GET` | `/api/search/:userId?q=term` | Full-text search across subject, recipient, and body |
| `GET` | `/admin/queues` | Live BullMQ Queue Monitoring Dashboard |
| `GET` | `/api/slack/auth` | Initiate Slack OAuth authorization flow |
| `GET` | `/api/slack/callback` | Process Slack OAuth callback and save incoming webhook URL |

---

## 📝 Assignment Requirements Compliance Matrix

| Assignment Requirement | Implementation Status | Code Location |
| :--- | :---: | :--- |
| **No Cron Jobs** | ✅ Verified | Enforced via BullMQ delayed jobs (`backend/server.js`) |
| **Relational Database Storage** | ✅ Verified | PostgreSQL + Prisma ORM (`backend/prisma/schema.prisma`) |
| **Ethereal Email SMTP** | ✅ Verified | Nodemailer Ethereal transport (`backend/worker.js`) |
| **Elasticsearch Log Search** | ✅ Verified | Elasticsearch indexer (`backend/server.js`) |
| **Live Queue Dashboard** | ✅ Verified | Bull-Board UI at `/admin/queues` |
| **Server Restart Persistence** | ✅ Verified | PostgreSQL + Redis state persistence |
| **Worker Concurrency** | ✅ Verified | BullMQ worker `concurrency: 5` (`backend/worker.js`) |
| **Delay Between Emails** | ✅ Verified | Target time step calculations (`backend/server.js`) |
| **Emails Per Hour Limit** | ✅ Verified | Redis-backed atomic counters (`backend/worker.js`) |
| **Live Slack Alert on Limit** | ✅ Verified | Slack webhook alert dispatcher (`backend/worker.js`) |
| **Google Login & User Profile** | ✅ Verified | NextAuth Google & Credentials (`frontend/app/lib/auth.ts`) |
| **Figma UI Compliance (1-5)** | ✅ Verified | Custom Tailwind CSS UI (`frontend/app/`) |
| **CSV Lead Upload & Parsing** | ✅ Verified | CSV lead uploader (`frontend/app/compose/page.tsx`) |
| **Send Later Popover Modal** | ✅ Verified | Popover modal & presets (`frontend/app/compose/page.tsx`) |

---

## 📄 License
This repository is developed for the ReachInbox (Outbox Labs) Full-stack Hiring Assignment.
