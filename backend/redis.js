const IORedis = require('ioredis');

function createRedisConnection() {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || process.env.REDIS_PUBLIC_URL;

  if (redisUrl) {
    return new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
    });
  }

  const host = process.env.REDIS_HOST || process.env.REDISHOST || '127.0.0.1';
  const port = Number(process.env.REDIS_PORT || process.env.REDISPORT) || 6379;
  const password = process.env.REDIS_PASSWORD || process.env.REDISPASSWORD || undefined;

  return new IORedis({
    host,
    port,
    password,
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  });
}

const connection = createRedisConnection();

connection.on('error', (err) => {
  console.warn('Redis connection issue:', err.message);
});

module.exports = connection;
module.exports.createRedisConnection = createRedisConnection;