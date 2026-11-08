# log-timestamp-stamper

Provides strictly increasing, collision-free integer timestamps for log entries emitted by concurrent async operations.

## Usage

```js
import { TimestampStamper } from 'log-timestamp-stamper';

const stamper = new TimestampStamper();

async function handleRequest(id) {
  const stamp = stamper.stamp();
  console.log(`${stamp} request ${id}`);
}

await Promise.all([handleRequest(1), handleRequest(2)]);
```

## Why this exists

`Date.now()` has millisecond resolution and can move backwards when the system clock is adjusted. Two log entries written in the same millisecond get identical timestamps, which makes them impossible to order deterministically. This library issues a strictly increasing integer for each call, so every log entry gets a unique position in the sequence even if the wall clock stalls or jumps backwards.

The trade-off is that stamps can drift ahead of wall-clock time when the clock is slow or has moved backwards. The stamper therefore keeps a `last` value and uses `Math.max(clock(), last + 1)`, which means the sequence is monotonic but not necessarily equal to the system time. If you need wall-clock accuracy and monotonicity you cannot have both; this library chooses monotonicity.

## API

### `new TimestampStamper(options?)`

- `options.clock`: a function returning the current time in milliseconds. Defaults to `Date.now`. Inject a fake clock in tests for deterministic behaviour.
- `options.epoch`: the starting point for the first stamp. Defaults to `0`. The first call to `stamp()` returns at least `epoch`.

### `stamper.stamp()`

Returns the next timestamp. The value is always strictly greater than any previously returned stamp from the same instance.

### `stamper.peek()`

Returns the most recently issued stamp without advancing the sequence. Before the first call to `stamp()`, this returns the configured `epoch`.

## Edge cases

If the clock moves backwards, stamps continue from `last + 1` rather than following the clock. This is intentional: it guarantees uniqueness and ordering. The clock function is called exactly once per `stamp()` call, so a clock that returns non-finite numbers causes `stamp()` to throw a `TypeError` rather than producing an invalid stamp.
