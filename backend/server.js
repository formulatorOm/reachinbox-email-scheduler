require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./db');
const emailQueue = require('./queue');
require('./worker');

const { Client } = require('@elastic/elasticsearch');
const elasticClient = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200' });

const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. BULLMQ DASHBOARD ---
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({ queues: [new BullMQAdapter(emailQueue)], serverAdapter });
app.use('/admin/queues', serverAdapter.getRouter());


// --- API ROUTES ---

app.get('/', (req, res) => {
  res.json({ message: 'ReachInbox API is running!', queueDashboard: '/admin/queues' });
});

// Helper function to get or create User and default SenderAccount
async function getOrCreateUserAndSender(userId, email, name) {
  let user = await prisma.user.findUnique({
    where: { email: userId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: userId,
        google_id: userId,
        email: userId,
        name: name || userId.split('@')[0],
      },
    });
  }

  let sender = await prisma.senderAccount.findFirst({
    where: { user_id: user.id },
  });

  if (!sender) {
    sender = await prisma.senderAccount.create({
      data: {
        user_id: user.id,
        email: user.email,
        sender_name: user.name,
        smtp_host: 'smtp.ethereal.email',
        smtp_port: 587,
        smtp_user: 'test@ethereal.email',
        smtp_pass: 'testpass',
        max_hourly_limit: 100,
      },
    });
  }

  return { user, sender };
}

// --- 2. USER & SENDER DATA ---
app.get('/api/senders/:userId', async (req, res) => {
  try {
    const rawUserId = decodeURIComponent(req.params.userId);
    const { sender } = await getOrCreateUserAndSender(rawUserId);

    const senders = await prisma.senderAccount.findMany({
      where: { user_id: rawUserId },
      select: { id: true, email: true, sender_name: true },
    });

    res.json(senders.length > 0 ? senders : [sender]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats/:userId', async (req, res) => {
  try {
    const rawUserId = decodeURIComponent(req.params.userId);

    const scheduledCount = await prisma.job.count({
      where: {
        campaign: { user_id: rawUserId },
        status: 'PENDING',
      },
    });

    const sentCount = await prisma.job.count({
      where: {
        campaign: { user_id: rawUserId },
        status: 'SENT',
      },
    });

    res.json({ scheduled: scheduledCount, sent: sentCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- 3. DASHBOARD TABLES ---
app.get('/api/jobs/scheduled/:userId', async (req, res) => {
  try {
    const rawUserId = decodeURIComponent(req.params.userId);

    const jobs = await prisma.job.findMany({
      where: {
        campaign: { user_id: rawUserId },
        status: 'PENDING',
      },
      orderBy: { scheduled_at: 'asc' },
      include: {
        campaign: { select: { subject: true, body: true } },
      },
    });

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/jobs/sent/:userId', async (req, res) => {
  try {
    const rawUserId = decodeURIComponent(req.params.userId);

    const jobs = await prisma.job.findMany({
      where: {
        campaign: { user_id: rawUserId },
        status: 'SENT',
      },
      orderBy: { sent_at: 'desc' },
      include: {
        campaign: { select: { subject: true, body: true } },
      },
    });

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- 4. CORE SCHEDULING ENGINE ---
app.post('/api/schedule', async (req, res) => {
  try {
    const { userId, senderAccountId, subject, body, recipients, delayBetween, hourlyLimit, startTime } = req.body;

    const rawUserId = decodeURIComponent(userId);
    const { sender } = await getOrCreateUserAndSender(rawUserId);

    let activeSenderId = senderAccountId;
    if (!activeSenderId || activeSenderId === 'default-sender') {
      activeSenderId = sender.id;
    }

    const campaign = await prisma.campaign.create({
      data: {
        user_id: rawUserId,
        sender_account_id: activeSenderId,
        subject: subject || 'No Subject',
        body: body || '',
        hourly_limit: Number(hourlyLimit) || 100,
        delay_between_emails: Number(delayBetween) || 0,
      },
    });

    const baseTime = startTime ? new Date(startTime).getTime() : Date.now();
    const delayStepMs = (Number(delayBetween) || 0) * 1000;

    const createdJobs = [];

    for (let i = 0; i < recipients.length; i++) {
      const targetTime = baseTime + (i * delayStepMs);
      const delayUntilExecution = Math.max(0, targetTime - Date.now());

      const dbJob = await prisma.job.create({
        data: {
          campaign_id: campaign.id,
          recipient_email: recipients[i],
          scheduled_at: new Date(targetTime),
        },
      });

      await emailQueue.add(
        'send-email',
        {
          dbJobId: dbJob.id,
          campaignId: campaign.id,
          recipientEmail: recipients[i],
          subject: subject || 'No Subject',
          body: body || '',
          hourlyLimit: Number(hourlyLimit) || 100,
          senderAccountId: activeSenderId,
        },
        {
          delay: delayUntilExecution,
          jobId: dbJob.id,
        }
      );

      createdJobs.push(dbJob);
    }

    res.status(200).json({ message: 'Campaign scheduled', campaignId: campaign.id, count: createdJobs.length });
  } catch (error) {
    console.error('Scheduling error:', error);
    res.status(500).json({ error: error.message });
  }
});


// --- 5. SEARCH ENDPOINT (Elasticsearch with DB Fallback) ---
app.get('/api/search/:userId', async (req, res) => {
  try {
    const rawUserId = decodeURIComponent(req.params.userId);
    const { q } = req.query;

    if (!q || !String(q).trim()) {
      return res.json([]);
    }

    // Try Elasticsearch search first
    try {
      const result = await elasticClient.search({
        index: 'reachinbox-emails',
        query: {
          multi_match: {
            query: String(q),
            fields: ['subject', 'to', 'body'],
          },
        },
      });

      const hits = result.hits.hits.map((hit) => hit._source);
      if (hits.length > 0) {
        return res.json(hits);
      }
    } catch (esErr) {
      console.warn('Elasticsearch query failed, using DB fallback:', esErr.message);
    }

    // Fallback DB Search
    const dbJobs = await prisma.job.findMany({
      where: {
        campaign: { user_id: rawUserId },
        OR: [
          { recipient_email: { contains: String(q), mode: 'insensitive' } },
          { campaign: { subject: { contains: String(q), mode: 'insensitive' } } },
          { campaign: { body: { contains: String(q), mode: 'insensitive' } } },
        ],
      },
      include: {
        campaign: { select: { subject: true, body: true } },
      },
    });

    res.json(dbJobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- 6. SLACK OAUTH INTEGRATION ---
app.get('/api/slack/auth', (req, res) => {
  const userId = req.query.userId || '1';
  const clientId = process.env.SLACK_CLIENT_ID || '12011104406278.12016784835508';
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=incoming-webhook&state=${encodeURIComponent(userId)}&redirect_uri=http://localhost:5002/api/slack/callback`;
  res.redirect(slackAuthUrl);
});

app.get('/api/slack/callback', async (req, res) => {
  const { code, state: userId, error } = req.query;

  if (error) return res.status(400).send(`Slack auth failed: ${error}`);

  try {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID || '12011104406278.12016784835508',
        client_secret: process.env.SLACK_CLIENT_SECRET || 'e47c00737a0c48ea1e88274fe3702fb0',
        code: String(code),
        redirect_uri: 'http://localhost:5002/api/slack/callback',
      }),
    });

    const data = await response.json();
    if (!data.ok) throw new Error(data.error);

    const webhookUrl = data.incoming_webhook?.url;

    const rawUserId = decodeURIComponent(String(userId));
    const { user } = await getOrCreateUserAndSender(rawUserId);

    await prisma.user.update({
      where: { id: user.id },
      data: { slack_webhook: webhookUrl },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://reachinbox-email-scheduler-chi-two.vercel.app';
    res.redirect(`${frontendUrl}/?slack=success`);
  } catch (err) {
    console.error('Slack OAuth Error:', err);
    res.status(500).send('Failed to connect Slack.');
  }
});

// SERVER INITIALIZATION
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Queue Dashboard on http://localhost:${PORT}/admin/queues`);
});