// SPDX-License-Identifier: Apache-2.0

// The hardhat-mocha plugin runs mocha programmatically and only sets
// process.exitCode — it never calls process.exit(). A lingering SDK gRPC
// channel or provider handle can keep the event loop alive after the reporters
// have flushed, so a finished run hangs until the job's timeout and reports as
// "cancelled". This root hook force-exits once the run is done. The timer is
// unref()'d, so it never keeps an otherwise-idle process alive and fires only
// when something else is still holding the loop open.
if (typeof after === 'function') {
  after(function forceExitAfterRun() {
    setTimeout(() => process.exit(process.exitCode ?? 0), 10000).unref();
  });
}
