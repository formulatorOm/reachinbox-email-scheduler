const IORedis = require('ioredis');

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
});

connection.on('error', (err) => {
  console.warn('Redis connection issue:', err.message);
});

module.exports = connection;