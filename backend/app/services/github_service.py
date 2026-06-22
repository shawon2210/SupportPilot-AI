"""SupportPilot AI — GitHub Integration Service

Fetches documentation from GitHub repositories and imports them
into the knowledge base.
"""

from __future__ import annotations

import json
import logging
import os
from urllib.parse import urlparse

import httpx

from app.config import get_settings

logger = logging.getLogger("supportpilot.github")


class GitHubService:
    """
    Fetches files (README, docs/) from a GitHub repo and returns
    them as (filename, content_bytes) pairs ready for ingestion.
    """

    GITHUB_API = "https://api.github.com"

    def __init__(self):
        settings = get_settings()
        self.token = os.environ.get("GITHUB_TOKEN", "") or getattr(settings, "GITHUB_TOKEN", "")
        self._client = httpx.AsyncClient(
            headers={
                "Accept": "application/vnd.github.v3.raw",
                "User-Agent": "SupportPilot-AI/1.0",
                **({"Authorization": f"Bearer {self.token}"} if self.token else {}),
            },
            timeout=30.0,
        )

    async def close(self):
        await self._client.aclose()

    def parse_repo_url(self, url: str) -> tuple[str, str, str | None]:
        """
        Parse a GitHub URL into (owner, repo, path).
        Supports:
          - https://github.com/owner/repo
          - https://github.com/owner/repo/tree/main/docs
          - https://github.com/owner/repo/blob/main/README.md
          - owner/repo
        """
        if "://" not in url and "/" in url:
            parts = url.split("/")
            if len(parts) >= 2:
                return parts[0], parts[1], None

        parsed = urlparse(url)
        if parsed.hostname and "github" not in parsed.hostname:
            raise ValueError(f"Not a GitHub URL: {url}")

        segments = [s for s in parsed.path.split("/") if s]
        if len(segments) < 2:
            raise ValueError(f"Could not parse owner/repo from: {url}")

        owner, repo = segments[0], segments[1]
        path = None

        if len(segments) > 3 and segments[2] in ("blob", "tree"):
            # /owner/repo/{blob,tree}/branch/path
            path = "/".join(segments[4:]) if len(segments) > 4 else None
        elif len(segments) > 2:
            # Could be /owner/repo/path (unlikely on raw URL but handle it)
            path = "/".join(segments[2:])

        return owner, repo, path

    async def fetch_repo_files(
        self, repo_url: str, branch: str = "main"
    ) -> list[dict]:
        """
        Fetch all documentation files from a GitHub repo.

        Returns a list of {filename, content, path, url} dicts.
        """
        owner, repo, path = self.parse_repo_url(repo_url)
        files: list[dict] = []

        # If a specific file/dir path was given, just fetch that
        if path:
            if any(path.endswith(ext) for ext in (".md", ".txt", ".mdx", ".rst", ".adoc")):
                file = await self._fetch_file(owner, repo, path, branch)
                if file:
                    files.append(file)
            else:
                dir_files = await self._fetch_dir(owner, repo, path, branch)
                files.extend(dir_files)
        else:
            # Fetch README + docs/ directory
            readme = await self._fetch_file(owner, repo, "README.md", branch)
            if readme:
                files.append(readme)

            readme2 = await self._fetch_file(owner, repo, "README.rst", branch)
            if readme2:
                files.append(readme2)

            docs = await self._fetch_dir(owner, repo, "docs", branch)
            files.extend(docs)

            wiki = await self._fetch_dir(owner, repo, "wiki", branch)
            files.extend(wiki)

        return files

    async def _fetch_file(
        self, owner: str, repo: str, path: str, branch: str
    ) -> dict | None:
        """Fetch a single file from a GitHub repo."""
        url = f"{self.GITHUB_API}/repos/{owner}/{repo}/contents/{path}?ref={branch}"
        try:
            resp = await self._client.get(url)
            if resp.status_code == 200:
                return {
                    "filename": path.split("/")[-1],
                    "content": resp.content,
                    "path": path,
                    "url": f"https://github.com/{owner}/{repo}/blob/{branch}/{path}",
                }
            elif resp.status_code == 404:
                logger.debug("File not found: %s", path)
                return None
            elif resp.status_code == 403:
                logger.warning("GitHub API rate limit hit when fetching %s", path)
                return None
            else:
                logger.warning("GitHub API returned %d for %s", resp.status_code, path)
                return None
        except httpx.TimeoutException:
            logger.warning("Timeout fetching %s", path)
            return None
        except Exception as e:
            logger.warning("Error fetching %s: %s", path, e)
            return None

    async def _fetch_dir(
        self, owner: str, repo: str, dir_path: str, branch: str
    ) -> list[dict]:
        """List and fetch all markdown/text files in a directory."""
        url = f"{self.GITHUB_API}/repos/{owner}/{repo}/contents/{dir_path}?ref={branch}"
        try:
            resp = await self._client.get(url)
            if resp.status_code != 200:
                return []

            data = resp.json()
            if not isinstance(data, list):
                return []

            files = []
            for item in data:
                if item.get("type") == "file":
                    name = item.get("name", "")
                    if any(name.endswith(ext) for ext in (".md", ".txt", ".mdx", ".rst", ".adoc")):
                        file = await self._fetch_file(owner, repo, item["path"], branch)
                        if file:
                            files.append(file)
                elif item.get("type") == "dir":
                    nested = await self._fetch_dir(owner, repo, item["path"], branch)
                    files.extend(nested)

            return files
        except Exception as e:
            logger.warning("Error listing directory %s: %s", dir_path, e)
            return []
