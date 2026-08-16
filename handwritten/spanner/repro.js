// Repro script for issue 9153
// Run with: node repro.js

process.env.SPANNER_EMULATOR_HOST = 'localhost:9010';
process.env.GCLOUD_PROJECT = 'test-project';

const {Spanner} = require('./build/src');
const spanner = new Spanner();

const instanceId = 'repro-instance';
const databaseId = 'repro-database';

async function main() {
  const instance = spanner.instance(instanceId);
  const database = instance.database(databaseId);

  // 1. Create Instance
  console.log('Creating instance...');
  try {
    const [, instanceOp] = await spanner.createInstance(instanceId, {
      config: 'regional-us-central1',
      nodes: 1,
    });
    await instanceOp.promise();
    console.log('Instance created.');
  } catch (err) {
    if (err.code === 6) { // ALREADY_EXISTS
      console.log('Instance already exists.');
    } else {
      console.error('Failed to create instance:', err);
      return;
    }
  }

  // 2. Create Database and Table
  console.log('Creating database and table...');
  try {
    const [, dbOp] = await instance.createDatabase(databaseId, {
      schema: [
        `CREATE TABLE Events (
          Id INT64 NOT NULL,
          Value STRING(MAX)
        ) PRIMARY KEY (Id)`,
      ],
    });
    await dbOp.promise();
    console.log('Database created.');
  } catch (err) {
    if (err.code === 6) { // ALREADY_EXISTS
      console.log('Database already exists.');
    } else {
      console.error('Failed to create database:', err);
      return;
    }
  }

  // Enable multiplexed sessions for RW if we want to test it.
  // Wait, how do we enable it?
  // In `session-factory.ts`:
  // const isMultiplexedRW =
  //   (process.env.GOOGLE_CLOUD_SPANNER_MULTIPLEXED_SESSIONS === 'true' ||
  //     process.env.GOOGLE_CLOUD_SPANNER_MULTIPLEXED_SESSIONS === 'rw')
  //
  // It seems it is enabled by default in 8.10.0?
  // User says: "Multiplexed sessions: library defaults (enabled, including read/write)"
  // Let's check `session-factory.ts` to see defaults.
  
  process.env.GOOGLE_CLOUD_SPANNER_MULTIPLEXED_SESSIONS = 'true';

  let attempts = 0;
  try {
    await database.runTransactionAsync(async (transaction) => {
      attempts++;
      console.log(`Transaction attempt ${attempts}...`);
      console.log('  Database isMuxEnabledForRW_:', database.isMuxEnabledForRW_);
      console.log('  Session ID:', transaction.session.id);
      console.log('  Session metadata:', transaction.session.metadata);
      
      transaction.upsert('Events', {
        Id: 1,
        Value: `value-${attempts}`,
      });
      
      if (attempts === 1) {
        console.log('Simulating abort on first attempt...');
        const err = new Error('Aborted');
        err.code = 10; // ABORTED
        throw err;
      }
      
      console.log('Committing on attempt', attempts);
      await transaction.commit();
    });
    console.log('Transaction succeeded after retry.');
  } catch (err) {
    console.error('Transaction failed:', err);
  }
  
  // Cleanup
  console.log('Cleaning up...');
  try {
    await database.delete();
    await instance.delete();
    console.log('Cleanup done.');
  } catch (err) {
    console.error('Cleanup failed:', err);
  }
}

main().catch(console.error);
