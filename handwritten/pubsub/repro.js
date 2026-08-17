const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, 'node_modules', '@opentelemetry', 'core', 'package.json');
try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  console.log(`Installed @opentelemetry/core version: ${pkg.version}`);
  const versionParts = pkg.version.split('.').map(Number);
  
  // Vulnerability GHSA-8988-4f7v-96qf affects < 2.8.0
  const isVulnerable = versionParts[0] < 2 || (versionParts[0] === 2 && versionParts[1] < 8);
  
  if (isVulnerable) {
     console.log("REPRODUCED: Vulnerable version installed.");
     process.exit(0); // Exit code 0 means repro succeeded (issue is present)
  } else {
     console.log("FAILURE: Safe version installed.");
     process.exit(1); // Exit code 1 means repro failed (issue is NOT present)
  }
} catch (e) {
  console.error("Failed to read @opentelemetry/core package.json. Make sure npm install was run.");
  console.error(e);
  process.exit(2);
}
