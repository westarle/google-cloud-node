const { LoggingWinston } = require('../build/src/index');
const winston = require('winston');

// Set env var to nonexistent file
process.env.GOOGLE_APPLICATION_CREDENTIALS = '/nonexistent/file.json';

process.on('uncaughtException', (err) => {
  console.log('Captured uncaughtException (expected):', err.message);
});

const logger = winston.createLogger({
  transports: [
    new LoggingWinston({})
  ]
});

// Do NOT attach logger.on('error') to repro the hang/crash path

console.log('Writing log...');
logger.info('test message');

console.log('Calling logger.end()...');
logger.end(() => {
  console.log('logger.end() callback fired!');
  console.log('Success: logger.end() callback fired, no hang.');
  process.exit(0);
});

setTimeout(() => {
  console.error('Failure: logger.end() callback did NOT fire within 4 seconds. Hang!');
  process.exit(1);
}, 4000);
