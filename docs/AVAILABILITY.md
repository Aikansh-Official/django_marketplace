# Render heartbeat and cold starts

The personal deployment uses the same internal-loop approach as DSA Visual Lab.
Gunicorn loads `server/gunicorn.conf.py` from its backend working directory. The
heartbeat starts in `post_worker_init`, after the application is ready and after
forking. The current free deployment uses one worker.

1. Wait 60 seconds after worker initialization.
2. Send a certificate-verified HTTPS GET to the service's own `/api/ready/` endpoint.
3. Accept only a successful JSON response with `ready: true`.
4. Wait 300 seconds after the request completes, then repeat.

Requests have a ten-second deadline, never overlap, never follow redirects and have
a bounded response size. A failed request waits for the normal interval. Worker
shutdown cancels the pending wait/request. No browser tab needs to stay open.

`/api/ready/` performs no MongoDB query, compilation, file upload or user-data update.
Its `heartbeat.enabled` and `heartbeat.last_success_at` fields provide a lightweight
way to confirm the loop is active. `/api/health/` remains the separate, real database
health check and continues to issue a MongoDB ping.

The loop enables only when Render sets `RENDER=true` and a valid
`RENDER_EXTERNAL_HOSTNAME`. The hostname must be a single `*.onrender.com` service
hostname without a path, port, credentials or query. Set `KEEP_ALIVE_ENABLED=false`
in the server environment to disable it. Credentials are not sent by the heartbeat.

This is best effort: a loop cannot wake a process that has already been stopped,
and it does not override Render's free usage limits, failures or maintenance. It is
not a guaranteed always-on hosting plan.

## Browser recovery

The client automatically retries temporary network failures and HTTP 502/503/504
responses for GET/HEAD requests within a bounded 60-second sequence. An attempt is
capped at 25 seconds; backoff is limited and cancelled when the request is aborted.
Login, messages, listings, offers and other write requests are never replayed.
Authentication/permission failures, rate limits and explicit maintenance mode do
not trigger this recovery. A continued outage still shows an honest error.

Changing a filter, manually retrying or leaving the homepage cancels its prior
listing request. An older request cannot hide the current loading indicator or
replace newer results.

## Verification

```powershell
cd server
..\venv\Scripts\python.exe -m unittest server.test_render_heartbeat
..\venv\Scripts\python.exe manage.py test server.test_readiness server.test_health server.test_security
cd ..
node --test client/src/services/readRetry.test.js
```

After a backend deployment, check `/api/ready/` for `heartbeat.enabled: true`, then
wait for a non-null `last_success_at` or the Render log `Render heartbeat: application ready.`
The first success should occur after the one-minute initial wait. Verify public
categories/listings and private role journeys separately from this lightweight probe.
