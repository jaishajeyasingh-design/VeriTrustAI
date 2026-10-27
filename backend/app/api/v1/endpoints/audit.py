from typing import List, Optional
from fastapi import APIRouter, Depends
from backend.app.schemas.audit import AuditEvent, AuditEventCreate
from backend.app.services.audit_service import audit_service
from backend.app.core.security import verify_api_key

router = APIRouter()


@router.get("/", response_model=List[AuditEvent], summary="[Implemented] Retrieve immutable audit trail")
async def list_audit_events(
    application_id: Optional[str] = None,
    _: str = Depends(verify_api_key)
) -> List[AuditEvent]:
    """
    Returns cryptographic audit log events.
    Protected: Requires valid API Key or Bearer token.
    """
    return audit_service.list_events(application_id=application_id)


@router.post("/", response_model=AuditEvent, summary="[Implemented] Append audit trail entry")
async def record_audit_event(
    event_in: AuditEventCreate,
    _: str = Depends(verify_api_key)
) -> AuditEvent:
    """
    Logs an action to the audit ledger and generates a tamper-evident SHA256 block hash.
    Protected: Requires valid API Key or Bearer token.
    """
    return audit_service.record_event(
        action=event_in.action,
        application_id=event_in.applicationId,
        details=event_in.details,
        user=event_in.user,
        user_role=event_in.userRole
    )


@router.get("/verify", summary="[Implemented] Verify SHA-256 hash chain continuity")
async def verify_audit_ledger(_: str = Depends(verify_api_key)):
    """
    Validates chronological hash chain links across all recorded events.
    Documents limitations regarding database-level privilege escalation.
    Protected: Requires valid API Key or Bearer token.
    """
    return audit_service.verify_hash_chain()

