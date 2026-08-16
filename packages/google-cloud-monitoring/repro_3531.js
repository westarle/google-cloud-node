const { MetricServiceClient } = require('./build/src');
const nock = require('nock');
const fs = require('fs');
const path = require('path');

const privateKeyPath = path.join(__dirname, 'key.pem');
if (!fs.existsSync(privateKeyPath)) {
  console.error("key.pem not found! Run 'openssl genrsa -out key.pem 2048' first.");
  process.exit(4);
}
const private_key = fs.readFileSync(privateKeyPath, 'utf8');

const mockErrorResponse = {
  error: {
    code: 400,
    message: "Mocked rate limit exceeded or similar",
    status: "INVALID_ARGUMENT",
    details: [
      {
        "@type": "type.googleapis.com/google.monitoring.v3.CreateTimeSeriesSummary",
        "totalPointCount": 1,
        "successPointCount": 0,
        "errors": [
          {
            "status": {
              "code": 3,
              "message": "Field timeSeries[0].metric.labels[0] had an invalid value."
            },
            "pointCount": 1
          }
        ]
      }
    ]
  }
};

// Intercept the request
nock('https://monitoring.googleapis.com')
  .post(/\/v3\/projects\/.*\/timeSeries/)
  .reply(400, mockErrorResponse);

async function run() {
  const client = new MetricServiceClient({
    fallback: "rest",
    credentials: { client_email: 'dummy@example.com', private_key },
    projectId: 'dummy-project',
    clientOptions: {
      transporterOptions: {
        validateStatus: () => true
      }
    }
  });

  const dataPoint = {
    interval: {
      endTime: {
        seconds: Date.now() / 1000,
      },
    },
    value: {
      int64Value: 1,
    },
  };

  const requestArgs = {
    name: client.projectPath('dummy-project'),
    timeSeries: [
      {
        metric: {
          type: 'custom.googleapis.com/test',
          metricKind: 'GAUGE',
          valueType: 'INT64',
          labels: {
              runId: 'abc1234'
          },
        },
        resource: {
          type: "global",
          labels: {
            project_id: 'dummy-project',
          },
        },
        points: [dataPoint],
      },
    ],
  };

  try {
    await client.createTimeSeries(requestArgs);
    console.log("Success (unexpected, should have failed)");
    process.exit(1);
  } catch (err) {
    console.log("Caught error:");
    console.dir(err, { depth: null });
    if (err.message.includes('googleProtobufAnyFromProto3JSON') || err.message.includes('no such type')) {
      console.log("\nREPRODUCED: Failed with serialization error!");
      process.exit(0); // Exit with 0 because we successfully reproduced it
    } else if (err.statusDetails && err.statusDetails.length > 0) {
      const detail = err.statusDetails[0];
      if (detail.constructor.name === 'ResourceInfo') {
        console.log("\nFALLBACK: Got ResourceInfo fallback, not fully decoded.");
        process.exit(2);
      } else if (detail.constructor.name === 'CreateTimeSeriesSummary') {
        console.log("\nSUCCESS: Decoded CreateTimeSeriesSummary!");
        process.exit(1);
      } else {
        console.log(`\nDecoded detail type but unexpected: ${detail.constructor.name}`);
        process.exit(3);
      }
    } else {
      console.log("\nFailed with unexpected error: " + err.message);
      process.exit(3);
    }
  }
}

run();
