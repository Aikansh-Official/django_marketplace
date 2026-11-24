"""Gunicorn reads this file from the backend root directory automatically.

The deployed service uses one worker. Start the heartbeat after the worker/app is
ready, not in the master process before fork. Development runserver is unaffected.
"""


def post_worker_init(worker):
    from server.render_heartbeat import start_render_heartbeat
    start_render_heartbeat()


def worker_exit(server, worker):
    from server.render_heartbeat import stop_render_heartbeat
    stop_render_heartbeat()
