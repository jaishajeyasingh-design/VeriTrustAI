from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status, Depends
from backend.app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdate,
    ApplicationListResponse
)
from backend.app.schemas.finding import (
    VerificationFinding,
    FindingReviewUpdate,
    ValidationSummaryResponse
)
from backend.app.services.application_service import application_service
from backend.app.services.validation_service import validation_service
from backend.app.core.security import (
    get_current_principal,
    require_role,
    check_application_access,
    UserPrincipal
)

router = APIRouter()


@router.get("/", response_model=ApplicationListResponse, summary="List submitted applications with filters")
async def list_applications(
    search: Optional[str] = Query(None, description="Search by application ID, title, applicant name, or reference"),
    status: Optional[str] = Query(None, description="Filter by status: Needs Review, Verified, Pending, Rejected"),
    type: Optional[str] = Query(None, alias="type", description="Filter by type: Institutional, Affiliation, Extension, Accreditation"),
    priority: Optional[str] = Query(None, description="Filter by priority: High, Medium, Low"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=250),
    principal: UserPrincipal = Depends(get_current_principal)
) -> ApplicationListResponse:
    """
    Retrieve all institutional applications matching optional search, status, type, and priority filters.
    Protected: Requires valid API Key or Bearer token.
    Enforces application boundary: Applicants only see dossiers permitted for their identity.
    """
    items, total = application_service.list_applications(
        search=search,
        status=status,
        app_type=type,
        priority=priority,
        skip=skip,
        limit=limit
    )

    if principal.role == "applicant" and principal.allowed_applications is not None:
        allowed = set(a.lower() for a in principal.allowed_applications)
        filtered_items = [item for item in items if item.id.lower() in allowed]
        return ApplicationListResponse(
            items=filtered_items,
            total=len(filtered_items),
            skip=skip,
            limit=limit
        )

    return ApplicationListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED, summary="Submit a new application dossier")
async def create_application(
    application_in: ApplicationCreate,
    _principal: UserPrincipal = Depends(get_current_principal)
) -> ApplicationResponse:
    """
    Submit a new institutional verification application dossier.
    Protected: Requires valid API Key or Bearer token.
    """
    new_app = application_service.create(application_in)
    return new_app


@router.get("/{application_id}", response_model=ApplicationResponse, summary="Get single application details")
async def get_application(
    application_id: str,
    principal: UserPrincipal = Depends(get_current_principal)
) -> ApplicationResponse:
    """
    Retrieve full application details, including attached documents, findings, and lifecycle audit timeline.
    Protected: Requires valid API Key or Bearer token. Enforces application boundary checks.
    """
    check_application_access(principal, application_id)
    app = application_service.get_by_id(application_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{application_id}' was not found."
        )
    return app


@router.patch("/{application_id}/status", response_model=ApplicationResponse, summary="Reviewer decision & status update")
async def update_application_status(
    application_id: str,
    update_in: ApplicationStatusUpdate,
    _principal: UserPrincipal = Depends(require_role(["reviewer", "administrator"]))
) -> ApplicationResponse:
    """
    Update verification status (e.g. Verified, Rejected, Needs Review) and log reviewer decision notes.
    Protected & RBAC: Requires 'reviewer' or 'administrator' role. (Applicant denied -> 403).
    """
    updated = application_service.update_status(application_id, update_in)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{application_id}' was not found."
        )
    return updated


@router.delete("/{application_id}", summary="Delete application dossier")
async def delete_application(
    application_id: str,
    _principal: UserPrincipal = Depends(require_role(["administrator"]))
):
    """
    Delete an application dossier from the registry.
    Protected & RBAC: Requires 'administrator' role ONLY. (Reviewers and Applicants denied -> 403).
    """
    deleted = application_service.delete(application_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{application_id}' was not found."
        )
    return {"success": True, "message": f"Application {application_id} deleted."}


@router.post(
    "/{application_id}/validate",
    response_model=ValidationSummaryResponse,
    summary="[Implemented] Run cross-document validation & rules engine"
)
async def validate_application(
    application_id: str,
    _principal: UserPrincipal = Depends(require_role(["reviewer", "administrator"]))
) -> ValidationSummaryResponse:
    """
    Executes the deterministic cross-document validation service and enabled compliance
    rules engine across all uploaded documents associated with this application.
    Protected & RBAC: Requires 'reviewer' or 'administrator' role. (Applicant denied -> 403).
    """
    summary = validation_service.evaluate_application(application_id)
    return summary


@router.get(
    "/{application_id}/findings",
    response_model=List[VerificationFinding],
    summary="[Implemented] Retrieve verification findings"
)
async def get_application_findings(
    application_id: str,
    principal: UserPrincipal = Depends(get_current_principal)
) -> List[VerificationFinding]:
    """
    Returns all verification findings generated for this application.
    Protected: Requires valid API Key or Bearer token. Enforces application boundary checks.
    """
    check_application_access(principal, application_id)
    return validation_service.get_findings_for_application(application_id)


@router.get(
    "/{application_id}/validation-summary",
    response_model=ValidationSummaryResponse,
    summary="[Implemented] Retrieve validation score and summary"
)
async def get_validation_summary(
    application_id: str,
    principal: UserPrincipal = Depends(get_current_principal)
) -> ValidationSummaryResponse:
    """
    Returns the latest validation summary, score, risk rating, and rule breakdown.
    Protected: Requires valid API Key or Bearer token. Enforces application boundary checks.
    """
    check_application_access(principal, application_id)
    return validation_service.evaluate_application(application_id)


@router.patch(
    "/{application_id}/findings/{finding_id}/review",
    response_model=VerificationFinding,
    summary="[Implemented] Reviewer updates finding status"
)
async def update_finding_review(
    application_id: str,
    finding_id: str,
    review_in: FindingReviewUpdate,
    _principal: UserPrincipal = Depends(require_role(["reviewer", "administrator"]))
) -> VerificationFinding:
    """
    Allows authorized compliance reviewers to mark a finding as Reviewed, Resolved,
    or Dismissed, and log official disposition notes to the audit trail.
    Protected & RBAC: Requires 'reviewer' or 'administrator' role. (Applicant denied -> 403).
    """
    return validation_service.update_finding_review(
        application_id=application_id,
        finding_id=finding_id,
        status_update=review_in.get_effective_status(),
        reviewer_notes=review_in.reviewerNotes,
        reviewer_name=review_in.reviewerName or "Compliance Reviewer"
    )
