const DEFAULT_EPOCH = 0;

/**
 * A monotonic timestamp stamper.
 *
 * The stamper produces strictly increasing integer timestamps, even when the
 * underlying clock moves backwards or stays still. This is useful for log
 * entries emitted by concurrent async operations: each entry gets a unique,
 * ordered stamp that can be used for sorting and correlation.
 *
 * The implementation keeps a `last` value (the most recently issued stamp).
 * On each call it computes `base = Math.max(clock(), last + 1)`. The `last + 1`
 * term guarantees strict monotonicity; the `clock()` term keeps stamps close to
 * wall-clock time when the clock is well-behaved.
 *
 * A clock function is injected so tests can be deterministic. The default
 * clock uses `Date.now()`.
 */
export class TimestampStamper {
  /**
   * @param {object} [options]
   * @param {() => number} [options.clock] Function returning the current time in milliseconds. Defaults to `Date.now`.
   * @param {number} [options.epoch] Starting point for the first stamp. Defaults to 0.
   */
  constructor(options = {}) {
    const { clock = Date.now, epoch = DEFAULT_EPOCH } = options;
    if (typeof clock !== 'function') {
      throw new TypeError('clock must be a function');
    }
    if (!Number.isFinite(epoch)) {
      throw new TypeError('epoch must be a finite number');
    }
    this._clock = clock;
    this._epoch = epoch;
    this._last = epoch - 1;
  }

  /**
   * Return the next stamp. The returned value is always strictly greater than
   * any previously returned stamp from this instance.
   *
   * @returns {number} The next monotonic timestamp.
   */
  stamp() {
    const now = this._clock();
    if (!Number.isFinite(now)) {
      throw new TypeError('clock returned a non-finite number');
    }
    const next = Math.max(now, this._last + 1);
    this._last = next;
    return next;
  }

  /**
   * Return the most recently issued stamp without advancing the sequence.
   * Before the first call to `stamp`, this returns the configured epoch.
   *
   * @returns {number}
   */
  peek() {
    if (this._last < this._epoch) {
      return this._epoch;
    }
    return this._last;
  }
}
