import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debouncer } from '@/services/debouncer';

describe('debouncer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    it('delays callback execution until the wait time elapses', () => {
        const callback = vi.fn();
        const delayed = debouncer(callback, 250);

        delayed('first');

        expect(callback).not.toHaveBeenCalled();

        vi.advanceTimersByTime(249);
        expect(callback).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('first');
    });

    it('clears the previous timer when called again before the delay expires', () => {
        const callback = vi.fn();
        const delayed = debouncer(callback, 200);

        delayed('first');
        vi.advanceTimersByTime(100);

        delayed('second');
        vi.advanceTimersByTime(199);

        expect(callback).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('second');
    });

    it('uses the original context when invoking the callback', () => {
        const context = {
            prefix: 'context-',
            run: debouncer(function (value) {
                this.triggered = `${this.prefix}${value}`;
            }, 100)
        };

        context.run('done');
        vi.advanceTimersByTime(100);

        expect(context.triggered).toBe('context-done');
    });
});
