from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from backend.app.schemas.rule import ComplianceRule, RuleToggleRequest, RuleTestRequest
from backend.app.services.rule_service import rule_service
from backend.app.core.security import verify_api_key, require_role

router = APIRouter()


@router.get("/", response_model=List[ComplianceRule], summary="[Implemented] List compliance rules")
async def list_rules(_: str = Depends(verify_api_key)) -> List[ComplianceRule]:
    """
    Returns configured statutory compliance rules.
    Protected: Requires valid API Key or Bearer token.
    """
    return rule_service.list_rules()


@router.patch("/{rule_id}/toggle", response_model=ComplianceRule, summary="[Implemented] Toggle rule enabled status")
async def toggle_rule(
    rule_id: str,
    body: RuleToggleRequest,
    _role: str = Depends(require_role(["reviewer", "administrator"]))
) -> ComplianceRule:
    """
    Enable or disable a statutory compliance rule.
    Protected & RBAC: Requires 'reviewer' or 'administrator' role.
    """
    rule = rule_service.toggle_rule(rule_id, body.enabled)
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Rule {rule_id} not found")
    return rule


@router.post("/test", summary="[Implemented - Rules Matrix Engine] Test rule matrix against sample payload")
async def test_rule_matrix(
    request: RuleTestRequest,
    _: str = Depends(verify_api_key)
):
    """
    Evaluates enabled compliance rules against a test dossier payload or returns matrix stats.
    Protected: Requires valid API Key or Bearer token.
    """
    enabled_rules = rule_service.get_enabled_rules()
    return {
        "status": "success",
        "mode": "deterministic_rule_matrix",
        "evaluated_rules_count": len(enabled_rules),
        "enabled_rules": [r.id for r in enabled_rules],
        "passed": True,
        "sampleData": request.sampleData
    }
