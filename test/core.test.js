import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TimestampStamper } from '../src/index.js';

function makeClock(values) {
  let i = 0;
  return () => {
    if (i >= values.length) {
      throw new Error('clock exhausted');
    }
    return values[i++];
  };
}

test('stamps are strictly increasing when clock is constant', () => {
  const stamper = new TimestampStamper({ clock: () => 1000 });
  const a = stamper.stamp();
  const b = stamper.stamp();
  const c = stamper.stamp();
  assert.equal(a, 1000);
  assert.equal(b, 1001);
  assert.equal(c, 1002);
});

test('stamps follow clock when clock advances faster than last + 1', () => {
  const stamper = new TimestampStamper({ clock: makeClock([10, 100, 1000]) });
  assert.equal(stamper.stamp(), 10);
  assert.equal(stamper.stamp(), 100);
  assert.equal(stamper.stamp(), 1000);
});

test('stamps do not go backwards when clock goes backwards', () => {
  const stamper = new TimestampStamper({ clock: makeClock([500, 100, 200]) });
  assert.equal(stamper.stamp(), 500);
  assert.equal(stamper.stamp(), 501);
  assert.equal(stamper.stamp(), 502);
});

test('peek returns epoch before first stamp', () => {
  const stamper = new TimestampStamper({ clock: () => 42, epoch: 7 });
  assert.equal(stamper.peek(), 7);
});

test('peek returns last issued stamp', () => {
  const stamper = new TimestampStamper({ clock: () => 42 });
  stamper.stamp();
  assert.equal(stamper.peek(), 42);
  stamper.stamp();
  assert.equal(stamper.peek(), 43);
});

test('epoch sets the starting point for the first stamp', () => {
  const stamper = new TimestampStamper({ clock: () => 0, epoch: 1000 });
  assert.equal(stamper.stamp(), 1000);
  assert.equal(stamper.stamp(), 1001);
});

test('default epoch is zero', () => {
  const stamper = new TimestampStamper({ clock: () => 0 });
  assert.equal(stamper.stamp(), 0);
  assert.equal(stamper.stamp(), 1);
});

test('default clock is Date.now', () => {
  const stamper = new TimestampStamper();
  const a = stamper.stamp();
  const b = stamper.stamp();
  assert.ok(Number.isFinite(a));
  assert.ok(Number.isFinite(b));
  assert.ok(b > a);
});

test('throws when clock returns a non-finite number', () => {
  const stamper = new TimestampStamper({ clock: () => NaN });
  assert.throws(() => stamper.stamp(), /non-finite/);
});

test('throws when clock is not a function', () => {
  assert.throws(() => new TimestampStamper({ clock: 5 }), /clock must be a function/);
});

test('throws when epoch is not finite', () => {
  assert.throws(() => new TimestampStamper({ epoch: Infinity }), /epoch must be a finite number/);
});

test('stamps remain unique under concurrent async operations', async () => {
  const stamper = new TimestampStamper({ clock: () => 0 });
  const results = await Promise.all(
    Array.from({ length: 50 }, () => Promise.resolve().then(() => stamper.stamp()))
  );
  const unique = new Set(results);
  assert.equal(unique.size, results.length);
  const sorted = [...results].sort((a, b) => a - b);
  assert.deepEqual(sorted, results);
});
