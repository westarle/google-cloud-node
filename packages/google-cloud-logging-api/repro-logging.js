const { LoggingServiceV2Client } = require('./build/src/v2/logging_service_v2_client.js');

process.on('unhandledRejection', (e) => console.log('[unhandledRejection]', e.stack));
process.on('uncaughtException', (e) => {
  console.log('[uncaughtException — should have been a promise rejection]', e.stack);
  process.exit(0);
});

async function main() {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/definitely-does-not-exist-credentials.json';

  const client = new LoggingServiceV2Client();

  console.log('Calling writeLogEntries...');
  try {
    const promise = client.writeLogEntries({
      logName: 'projects/dummy/logs/dummy',
      resource: { type: 'global' },
      entries: [],
    });
    
    await promise;
    console.log('writeLogEntries succeeded (unexpected)');
  } catch (err) {
    console.log('[catch] Caught error in main:', err.message);
  }
}

main();
