const { LoggingWinston } = require('../build/src/index');
const winston = require('winston');
const { Logging } = require('@google-cloud/logging');

let writeCount = 0;
let secondWriteAttempted = false;

// Mock Logging
const originalLog = Logging.prototype.log;
Logging.prototype.log = function(name, options) {
  const logInstance = originalLog.call(this, name, options);
  logInstance.write = function(entries, callback) {
    writeCount++;
    console.log(`Mock write called (count: ${writeCount})`);
    if (writeCount === 1) {
      const err = new Error('simulated PERMISSION_DENIED from writeLogEntries (first write)');
      if (callback) {
        setImmediate(() => callback(err));
      } else {
        return Promise.reject(err);
      }
    } else {
      secondWriteAttempted = true;
      console.log('Second write succeeded in mock');
      if (callback) {
        setImmediate(() => callback(null, {}));
      } else {
        return Promise.resolve([{}]);
      }
    }
  };
  return logInstance;
};

const logger = winston.createLogger({
  transports: [
    new LoggingWinston({
      projectId: 'fake-project',
    })
  ]
});

logger.on('error', (err) => {
  console.log('Captured logger error:', err.message);
});

console.log('Writing first log...');
logger.info('first message');

setTimeout(() => {
  console.log('Writing second log...');
  logger.info('second message');
}, 1000);

setTimeout(() => {
  console.log(`Results: writeCount=${writeCount}, secondWriteAttempted=${secondWriteAttempted}`);
  if (secondWriteAttempted) {
    console.log('Success: Transport survived the error and attempted second write.');
    process.exit(0);
  } else {
    console.error('Failure: Transport did NOT attempt second write. Stream might be dead.');
    process.exit(1);
  }
}, 3000);
