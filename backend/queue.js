const { Queue } = require('bullmq');
const connection = require('./redis');

const emailQueue = new Queue('email-queue', { connection });

module.exports = emailQueue;