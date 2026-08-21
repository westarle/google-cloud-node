const {Storage} = require('@google-cloud/storage');

async function run() {
  const storage = new Storage();
  await storage.getBuckets();
}
run().catch(console.error);
