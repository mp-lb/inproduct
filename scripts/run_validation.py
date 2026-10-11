#!/usr/bin/env python3
"""Serialize local validation across checkouts, with bounded Node heaps."""

import argparse
import fcntl
import os
from pathlib import Path
import shlex
import signal
import subprocess
import sys
import tempfile
import time


def validation_environment(heap_mib=2048):
    env = os.environ.copy()
    # Replace inherited heap overrides; this is per process, not a total RAM cap.
    options = shlex.split(env.get("NODE_OPTIONS", ""))
    retained = []
    skip = False
    for option in options:
        if skip:
            skip = False
            continue
        name = option.split("=", 1)[0].replace("_", "-")
        if name in ("--max-old-space-size", "--max-old-space-size-percentage"):
            skip = "=" not in option
        else:
            retained.append(option)
    retained.append(f"--max-old-space-size={heap_mib}")
    env["NODE_OPTIONS"] = " ".join('"' + x.replace('"', '\\"') + '"' for x in retained)
    env["TURBO_CONCURRENCY"] = "1"
    return env


def stop_group(pid, sig):
    try:
        os.killpg(pid, sig)
    except ProcessLookupError:
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", choices=("default", "lint"), default="default",
                        help="lint allows a 4096 MiB Node heap; default allows 2048 MiB")
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command
    if command[:1] == ["--"]:
        command = command[1:]
    if not command:
        parser.error("a command is required after --")
    heap_mib = 4096 if args.profile == "lint" else 2048

    # Stable across projects/worktrees for this macOS/Linux user. Never unlink
    # the lock file: replacing its inode would allow two independent holders.
    directory = Path(tempfile.gettempdir()) / f"local-validation-{os.getuid()}"
    directory.mkdir(mode=0o700, exist_ok=True)
    lock_path = directory / "heavy-job.lock"
    cancelled = []
    child = None

    def cancel(signum, _frame):
        cancelled.append(signum)
        if child is not None:
            stop_group(child.pid, signal.SIGTERM)

    for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
        signal.signal(sig, cancel)

    with lock_path.open("a+") as lock:
        announced = False
        while not cancelled:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if not announced:
                    print("[validation] Waiting for another heavy job to finish…", file=sys.stderr, flush=True)
                    announced = True
                time.sleep(0.2)
        if cancelled:
            return 128 + cancelled[0]

        print(f"[validation] Starting; Node heap {heap_mib} MiB/process, concurrency 1.", file=sys.stderr, flush=True)
        try:
            child = subprocess.Popen(command, env=validation_environment(heap_mib), start_new_session=True,
                                     pass_fds=(lock.fileno(),))
            while child.poll() is None and not cancelled:
                time.sleep(0.1)
            if cancelled:
                stop_group(child.pid, signal.SIGTERM)
                try:
                    child.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    stop_group(child.pid, signal.SIGKILL)
                    child.wait()
                return 128 + cancelled[0]
            return child.returncode if child.returncode >= 0 else 128 - child.returncode
        except FileNotFoundError:
            print(f"[validation] Command not found: {command[0]}", file=sys.stderr)
            return 127
        finally:
            if child is not None:
                # A completed/cancelled job must not leave workers behind when
                # the next job acquires the lock.
                stop_group(child.pid, signal.SIGKILL)
                child.wait()


if __name__ == "__main__":
    sys.exit(main())
