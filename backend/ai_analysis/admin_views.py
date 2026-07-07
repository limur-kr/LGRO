import threading
import uuid
from io import StringIO

from django.core.management import call_command
from django.db import close_old_connections
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import IsServiceAdmin

_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()


def _run_job(job_id: str, command: str, cmd_args: list[str]) -> None:
    close_old_connections()
    stdout = StringIO()
    with _jobs_lock:
        _jobs[job_id]["status"] = "running"
    try:
        call_command(command, *cmd_args, stdout=stdout, no_color=True)
        with _jobs_lock:
            _jobs[job_id].update({"status": "done", "log": stdout.getvalue()})
    except Exception as exc:
        with _jobs_lock:
            _jobs[job_id].update(
                {"status": "error", "log": f"{stdout.getvalue()}\n[ERROR] {exc}"}
            )


def _start_job(command: str, restaurant_id: str | None) -> str:
    cmd_args = ["--restaurant-id", str(restaurant_id)] if restaurant_id else ["--all"]
    job_id = str(uuid.uuid4())
    with _jobs_lock:
        _jobs[job_id] = {"status": "pending", "log": ""}
    threading.Thread(
        target=_run_job, args=(job_id, command, cmd_args), daemon=True
    ).start()
    return job_id


@api_view(["POST"])
@permission_classes([IsServiceAdmin])
def collect_reviews(request):
    job_id = _start_job("collect_reviews", request.data.get("restaurant_id"))
    return Response({"job_id": job_id}, status=status.HTTP_202_ACCEPTED)


@api_view(["POST"])
@permission_classes([IsServiceAdmin])
def run_analysis(request):
    job_id = _start_job("run_analysis", request.data.get("restaurant_id"))
    return Response({"job_id": job_id}, status=status.HTTP_202_ACCEPTED)


@api_view(["GET"])
@permission_classes([IsServiceAdmin])
def job_status(request, job_id: str):
    with _jobs_lock:
        job = dict(_jobs.get(job_id, {}))
    if not job:
        return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response(job)
