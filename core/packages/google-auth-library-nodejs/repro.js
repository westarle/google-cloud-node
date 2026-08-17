const { getErrorFromOAuthErrorResponse } = require('./build/src/auth/oauth2common.js');

try {
  const authError = getErrorFromOAuthErrorResponse(
    { error: 'invalid_grant', error_description: 'ID Token is stale to sign-in.' },
    new Error('underlying transport failure'),
  );

  console.log('Stack descriptor:', Object.getOwnPropertyDescriptor(authError, 'stack'));

  // Strict mode: throws if stack is read-only.
  (function () {
    'use strict';
    authError.stack += '\nCaused by: x';
  })();
  console.log('Successfully appended to stack (Sloppy/Strict failed to throw)');
} catch (e) {
  console.error('Caught expected error:');
  console.error(e);
  process.exit(1); // Exit with error code to indicate failure to append (which is the bug we want to repro, wait, if it throws, it means we reproduced the crash)
}
