const { wrapError } = require('./build/src/util.js');

// Create an error with a non-writable stack
const authError = new Error('original error');
Object.defineProperty(authError, 'stack', {
  value: authError.stack,
  writable: false,
  enumerable: true,
  configurable: true
});

console.log('Original stack writable:', Object.getOwnPropertyDescriptor(authError, 'stack').writable);

try {
  wrapError(authError, 'some_caller_stack');
  console.log('Successfully wrapped error (expected to fail if bug is present)');
  process.exit(0);
} catch (e) {
  console.error('Caught expected TypeError:');
  console.error(e);
  if (e instanceof TypeError && e.message.includes("Cannot assign to read only property 'stack'")) {
    console.log('REPRODUCED: wrapError threw TypeError as expected');
    process.exit(1);
  } else {
    console.log('UNEXPECTED ERROR:', e);
    process.exit(2);
  }
}
