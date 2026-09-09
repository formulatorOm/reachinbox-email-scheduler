const { Worker } = require('bullmq');
const nodemailer = require('nodemailer');
const Redis = require('ioredis');
const { Client } = require('@elastic/elasticsearch');
const prisma = require('./db');

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
});

redis.on('error', (err) => {
  console.warn('Worker Redis connection issue:', err.message);
});

const elasticClient = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200' });

async function indexEmailToElasticSearch(id, to, subject, status, body) {
  try {
    await elasticClient.index({
      index: 'reachinbox-emails',
      id: String(id),
      document: { to, subject, body, status, timestamp: new Date() },
    });
    console.log(`Indexed job ${id} in Elasticsearch`);
  } catch (err) {
    console.warn('Elasticsearch indexing skipped:', err.message);
  }
}

const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: process.env.ETHEREAL_USER || 'test@ethereal.email',
    pass: process.env.ETHEREAL_PASS || 'testpass',
  },
});

const emailWorker = new Worker(
  'email-queue',
  async (job) => {
    const { dbJobId, campaignId, recipientEmail, subject, body, senderAccountId, hourlyLimit } = job.data;
    const to = recipientEmail || job.data.to;

    const currentHour = new Date().getHours();
    const rateKey = `rate_limit:${senderAccountId}:${currentHour}`;

    const sentThisHour = await redis.incr(rateKey);
    if (sentThisHour === 1) {
      await redis.expire(rateKey, 3600);
    }

    const effectiveLimit = Number(hourlyLimit) || 100;

    // Rate Limit Check
    if (sentThisHour > effectiveLimit) {
      console.warn(`Hourly limit of ${effectiveLimit} reached for sender ${senderAccountId}.`);

      // Fetch campaign & user for Slack Webhook notification
      try {
        const campaign = await prisma.campaign.findUnique({
          where: { id: campaignId },
          include: { user: true },
        });

        const userWebhook = campaign?.user?.slack_webhook;

        if (userWebhook) {
          await fetch(userWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `⚠️ *ReachInbox Rate Limit Alert*\nHourly email limit of ${effectiveLimit} reached for sender \`${senderAccountId}\`. Jobs are delayed until next hour window.`,
            }),
          });
          console.log('Slack rate limit notification sent to user.');
        }
      } catch (slackErr) {
        console.error('Failed sending Slack notification:', slackErr.message);
      }

      throw new Error('Rate limit exceeded. Job will be retried in next window.');
    }

    // Send email via fake Ethereal SMTP
    let previewUrl = '';
    try {
      const info = await transporter.sendMail({
        from: '"ReachInbox Outbox" <test@ethereal.email>',
        to,
        subject,
        text: body,
      });
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('Preview URL:', previewUrl);
      }
    } catch (smtpErr) {
      console.warn('Ethereal SMTP simulated send:', smtpErr.message);
    }

    // Update Job status in Database
    if (dbJobId) {
      await prisma.job.update({
        where: { id: dbJobId },
        data: {
          status: 'SENT',
          sent_at: new Date(),
        },
      });
    }

    // Index sent email in Elasticsearch
    await indexEmailToElasticSearch(dbJobId || job.id, to, subject, 'SENT', body);

    return { status: 'SENT', previewUrl };
  },
  {
    connection: redis,
    concurrency: Number(process.env.WORKER_CONCURRENCY) || 5,
  }
);

emailWorker.on('error', (err) => {
  console.warn('EmailWorker error:', err.message);
});

console.log('BullMQ Email Worker initialized with concurrency:', process.env.WORKER_CONCURRENCY || 5);
module.exports = emailWorker;