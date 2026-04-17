'use strict';
/**
 * In-memory retry queue with exponential backoff
 * Retries failed emails up to 3 times before giving up
 */

const QUEUE     = [];
const FAILED    = [];
const MAX_RETRY = 3;
let   processing = false;

function enqueue(job) {
  QUEUE.push({ ...job, attempts: 0, addedAt: Date.now() });
  if (!processing) processQueue();
}

async function processQueue() {
  if (processing || QUEUE.length === 0) return;
  processing = true;

  while (QUEUE.length > 0) {
    const job = QUEUE.shift();
    try {
      await job.fn();
      console.log(`[Queue] ✅ Job done: ${job.id}`);
    } catch(e) {
      job.attempts++;
      console.error(`[Queue] ❌ Job failed (attempt ${job.attempts}): ${job.id} — ${e.message}`);
      if (job.attempts < MAX_RETRY) {
        // Exponential backoff: 10s, 30s, 90s
        const delay = 10000 * Math.pow(3, job.attempts - 1);
        console.log(`[Queue] ↻ Retrying in ${delay/1000}s`);
        setTimeout(() => { QUEUE.push(job); if (!processing) processQueue(); }, delay);
      } else {
        console.error(`[Queue] 💀 Job permanently failed: ${job.id}`);
        FAILED.push({ ...job, failedAt: Date.now(), lastError: e.message });
      }
    }
    // Small gap between sends to avoid SMTP rate limits
    await new Promise(r => setTimeout(r, 200));
  }

  processing = false;
}

function getStats() {
  return { queued: QUEUE.length, failed: FAILED.length, recentFailed: FAILED.slice(-5) };
}

module.exports = { enqueue, getStats };
