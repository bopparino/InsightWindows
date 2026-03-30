import os
import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from core.config import settings
from core.security import get_current_user

router = APIRouter()


def _format_size(num_bytes: int) -> str:
    if num_bytes >= 1_048_576:
        return f"{num_bytes / 1_048_576:.0f} MB"
    if num_bytes >= 1_024:
        return f"{num_bytes / 1_024:.0f} KB"
    return f"{num_bytes} B"


def _parse_plan_number(filename: str) -> str | None:
    """Extract plan number from filenames like AC0010326_quote.pdf"""
    m = re.match(r'^([A-Z]{1,3}\d{3}\d{4})_(quote|field_sheet)\.(pdf|html)$', filename)
    return m.group(1) if m else None


@router.get("/serve", dependencies=[Depends(get_current_user)])
def serve_file(path: str = Query(...), download: bool = False):
    """
    Serve a file from STORAGE_PATH for inline preview or download.
    `path` is relative to STORAGE_PATH (e.g. 'AC/AC0010326_quote.pdf').
    Path traversal is blocked by resolving both paths and comparing prefixes.
    """
    base   = os.path.realpath(settings.STORAGE_PATH)
    target = os.path.realpath(os.path.join(base, path))

    if not target.startswith(base + os.sep):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not os.path.isfile(target):
        raise HTTPException(status_code=404, detail="File not found")

    ext = os.path.splitext(target)[1].lower()
    media_type = "application/pdf" if ext == ".pdf" else "text/html"
    disposition = "attachment" if download else "inline"

    return FileResponse(
        target,
        media_type=media_type,
        headers={"Content-Disposition": f'{disposition}; filename="{os.path.basename(target)}"'},
    )


@router.get("/", dependencies=[Depends(get_current_user)])
def list_files():
    """Walk settings.STORAGE_PATH and return a folder tree of quote files."""
    base = settings.STORAGE_PATH
    if not os.path.isdir(base):
        return []

    folders = []
    for entry in sorted(os.scandir(base), key=lambda e: e.name):
        if not entry.is_dir():
            continue
        children = []
        for fentry in sorted(os.scandir(entry.path), key=lambda e: e.name):
            if not fentry.is_file():
                continue
            stat = fentry.stat()
            children.append({
                "name":        fentry.name,
                "type":        "file",
                "size":        _format_size(stat.st_size),
                "modified":    datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d"),
                "plan_number": _parse_plan_number(fentry.name),
            })
        stat = entry.stat()
        folders.append({
            "name":     entry.name,
            "type":     "folder",
            "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d"),
            "children": children,
        })

    return folders
