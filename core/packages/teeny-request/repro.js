const nock = require('nock');
const {teenyRequest} = require('./build/src/index.js');

nock.disableNetConnect();
nock('https://example.com').get('/').reply(200, 'ok');

process.once('unhandledRejection', error => {
  console.error('Unhandled Rejection (Expected failure):', error);
  process.exitCode = 1;
});

process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  process.exitCode = 1;
});

const stream = teenyRequest({uri: 'https://example.com'});

stream.on('error', err => {
  console.log('Stream received error:', err.message, err.code);
});

stream.once('reading', () => {
  console.log('stream: reading event');
});

stream.once('response', response => {
  console.log('stream: response event');
  response.body.once('close', () => console.log('response body closed'));
  console.log('destroying stream');
  stream.destroy();
});

console.log('calling resume');
stream.resume();

setTimeout(() => {
  console.log('finished');
  if (process.exitCode === 1) {
    console.log('REPRODUCED: failure occurred');
  } else {
    console.log('CLEAN: no failure');
  }
}, 100);
