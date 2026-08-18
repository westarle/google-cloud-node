import * as assert from 'assert';
import * as proxyquire from 'proxyquire';
import {PassThrough} from 'stream';
import * as defer from 'p-defer';
import * as crypto from 'crypto';

class FakeMessageStream extends PassThrough {
  options: any;
  constructor(sub: any, options: any) {
    super({objectMode: true});
    this.options = options;
    FakeMessageStream.latestStream = this;
  }
  static latestStream: FakeMessageStream;
  setOptions(options: any) {}
  setStreamAckDeadline(): void {}
  _destroy(
    _error: Error | null,
    _callback: (error: Error | null) => void,
  ): void {}
  async start() {}
}

const hangPromise = defer<any>().promise;

const mockClient = {
  acknowledge: async (reqOpts: any, callOptions: any) => {
    console.log('mockClient.acknowledge called with:', reqOpts);
    console.log('Hanging acknowledge call...');
    await hangPromise;
  },
  modifyAckDeadline: async (reqOpts: any, callOptions: any) => {
    console.log('mockClient.modifyAckDeadline called with:', reqOpts);
    if (reqOpts.ackDeadlineSeconds === 0) {
      console.log('Hanging modifyAckDeadline call (NACK)...');
      await hangPromise;
    } else {
      console.log('Resolving modifyAckDeadline call immediately.');
    }
  }
};

class FakePubSub {
  client = mockClient;
  getClient_(options: any, callback: any): void {
    callback(null, this.client);
  }
}

class FakeSubscription {
  name = 'projects/fake-project/subscriptions/fake-sub';
  projectId = 'fake-project';
  pubsub = new FakePubSub();
}

const s = proxyquire('../src/subscriber.js', {
  './message-stream': {MessageStream: FakeMessageStream},
});

const Subscriber = s.Subscriber;
const Message = s.Message;
const SubscriberCloseBehaviors = s.SubscriberCloseBehaviors;
const Duration = proxyquire('../src/index.js', {}).Duration;

const RECEIVED_MESSAGE = {
  ackId: 'fake-ack-id-' + crypto.randomUUID(),
  message: {
    attributes: {},
    data: Buffer.from('Hello, world!'),
    messageId: 'fake-message-id-' + crypto.randomUUID(),
    publishTime: {seconds: 12, nanos: 32},
  },
};

async function run() {
  console.log('Starting repro to test close timeout (WaitForProcessing default)...');
  const subscription = new FakeSubscription() as any;
  const subscriber = new Subscriber(subscription, {
    closeOptions: {
      behavior: SubscriberCloseBehaviors.WaitForProcessing,
      // timeout is not specified, defaults to 60m
    }
  });

  subscriber.open();
  subscriber.setSubscriptionProperties({exactlyOnceDeliveryEnabled: true});

  const stream = FakeMessageStream.latestStream;
  if (!stream) {
    throw new Error('Stream not created');
  }

  const messagePromise = defer<any>();
  subscriber.on('message', (msg: any) => {
    console.log('Received message:', msg.ackId);
    messagePromise.resolve(msg);
  });

  stream.write({receivedMessages: [RECEIVED_MESSAGE]});
  const message = await messagePromise.promise;

  console.log('Calling message.ack()...');
  message.ack();

  console.log('Calling subscriber.close() immediately after...');
  const startTime = Date.now();
  const closePromise = subscriber.close();

  console.log('Awaiting subscriber.close()...');
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('TIMEOUT: subscriber.close() hung beyond 15 seconds!'));
    }, 15000); // 15 seconds script timeout (we expect it to resolve in 10s)
  });

  try {
    await Promise.race([closePromise, timeoutPromise]);
    const duration = (Date.now() - startTime) / 1000;
    console.log(`SUCCESS: subscriber.close() resolved after ${duration} seconds.`);
    // It should resolve after ~10 seconds (the DEFAULT_FLUSH_TIMEOUT cap).
    if (duration < 9.5 || duration > 11.5) {
      console.error(`Warning: resolved in ${duration}s, expected ~10s`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('FAILED:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

run().catch(err => {
  console.error('Unhandled error in run:', err);
  process.exit(1);
});
