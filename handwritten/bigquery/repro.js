const {BigQuery} = require('./build/src/index.js');
const assert = require('assert');

const bq = new BigQuery({projectId: 'test-project'});

const query = {
  query: 'SELECT 1',
  jobTimeoutMs: 1000
};

try {
  const req = bq.buildQueryRequest_(query, {});
  console.log('Result of buildQueryRequest_:', req);

  assert.notStrictEqual(req, undefined, 'Should not return undefined when jobTimeoutMs is set');
  assert.strictEqual(req.jobTimeoutMs, '1000', 'jobTimeoutMs should be mapped as a string');
  
  console.log('Repro test passed (bug NOT present or fixed)');
  process.exit(0);
} catch (err) {
  console.error('Repro test failed (bug present):', err.message);
  process.exit(1);
}
