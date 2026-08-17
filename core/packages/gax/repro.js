const { GrpcClient } = require('./build/src/grpc.js');
const grpc = require('@grpc/grpc-js');

process.on('unhandledRejection', (e) => console.log('[unhandledRejection]', e.stack));
process.on('uncaughtException', (e) => {
  console.log('[uncaughtException — should have been a promise rejection]', e.stack);
  process.exit(0);
});

async function main() {
  const grpcClient = new GrpcClient({ grpc });
  
  class DummyStub {
    constructor(address, creds, options) {
      console.log('DummyStub constructor called');
    }
  }

  process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/definitely-does-not-exist-credentials.json';

  console.log('Calling createStub...');
  try {
    const stubPromise = grpcClient.createStub(DummyStub, {
      servicePath: 'logging.googleapis.com',
      port: 443,
    });
    
    const stub = await stubPromise;
    console.log('Stub created successfully (unexpected)');
  } catch (err) {
    console.log('[catch] Caught error in main:', err.message);
  }
}

main();
