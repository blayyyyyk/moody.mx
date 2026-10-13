import type { QueueAllowance } from "./spotify-types";

const LIMIT = 3;
const HOUR = 60 * 60 * 1000;

// A shared, rolling-hour budget within one server instance. No IPs or persistent
// storage are used; deployments and separate Vercel instances have their own budget.
export function createQueueLimiter(now = Date.now) {
    const slots = new Map<symbol, { at: number; pending: boolean }>();

    function allowance(): QueueAllowance {
        const time = now();
        for (const [id, slot] of slots) {
            if (!slot.pending && slot.at + HOUR <= time) slots.delete(id);
        }
        return {
            limit: LIMIT,
            remaining: Math.max(0, LIMIT - slots.size),
            resetsAt: slots.size ? Math.min(...Array.from(slots.values(), (slot) => slot.at + HOUR)) : null,
        };
    }

    function reserve() {
        if (allowance().remaining === 0) return null;
        const id = Symbol();
        slots.set(id, { at: now(), pending: true });
        return {
            commit() { if (slots.has(id)) slots.set(id, { at: now(), pending: false }); },
            release() { slots.delete(id); },
        };
    }

    return { allowance, reserve };
}
