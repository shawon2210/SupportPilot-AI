"""SupportPilot AI — GitHub Import Endpoint"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, HttpUrl

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_role
from app.schemas.knowledge_source import KnowledgeSourceResponse
from app.services.document_service import DocumentProcessingError, DocumentService
from app.services.github_service import GitHubService

logger = logging.getLogger("supportpilot.api.github")
router = APIRouter()


class GitHubImportRequest(BaseModel):
    repo_url: str
    branch: str = "main"


@router.post("/github/import", response_model=list[KnowledgeSourceResponse])
async def import_github_repo(
    workspace_id: str,
    body: GitHubImportRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """Fetch and import documentation files from a GitHub repository."""
    gh = GitHubService()
    try:
        files = await gh.fetch_repo_files(body.repo_url, branch=body.branch)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("GitHub fetch failed")
        raise HTTPException(status_code=502, detail=f"Failed to fetch repo: {e}")
    finally:
        await gh.close()

    if not files:
        raise HTTPException(
            status_code=404,
            detail="No documentation files found in the repository. "
                   "Looked for README.md and docs/ directory.",
        )

    doc_service = DocumentService(db)
    sources = []
    errors = []

    for f in files:
        try:
            source = await doc_service.upload_document(
                workspace_id=workspace_id,
                filename=f["filename"],
                content=f["content"],
                mime_type="text/markdown",
                created_by=current_user["id"],
            )
            sources.append(source)
        except DocumentProcessingError as e:
            errors.append({"file": f["filename"], "error": str(e)})
        except Exception as e:
            logger.exception("Failed to import %s", f["filename"])
            errors.append({"file": f["filename"], "error": str(e)})

    if errors:
        logger.warning("GitHub import completed with errors: %s", errors)

    return [KnowledgeSourceResponse.model_validate(s) for s in sources]
