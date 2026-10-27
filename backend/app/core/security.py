from dataclasses import dataclass
from typing import List, Optional, Set
from fastapi import Header, HTTPException, status, Depends
from backend.app.core.config import settings


@dataclass(frozen=True)
class UserPrincipal:
    """
    Immutable server-trusted principal representing an authenticated entity.
    Roles and resource boundaries are established exclusively on the server,
    never derived from browser-supplied headers, localStorage, or query/body parameters.
    """
    principal_id: str
    name: str
    role: str  # "applicant", "reviewer", "administrator"
    allowed_applications: Optional[List[str]] = None
    is_authenticated: bool = True

    @property
    def is_admin(self) -> bool:
        return self.role == "administrator"

    @property
    def is_reviewer(self) -> bool:
        return self.role in {"reviewer", "administrator"}

    @property
    def is_applicant(self) -> bool:
        return self.role == "applicant"


def resolve_principal_from_token(token: str) -> Optional[UserPrincipal]:
    """
    Server-side identity resolution mapping authenticated credentials
    directly to trusted UserPrincipals (Option A: Explicit Server-Side Identity Mapping).
    Establishes server-trusted identity without trusting client headers.
    """
    if not token or not isinstance(token, str):
        return None

    cleaned_token = token.strip()

    # 1. Administrator principal — authorized for application deletion & system-wide policy admin
    if cleaned_token == settings.ADMIN_API_KEY:
        return UserPrincipal(
            principal_id="usr_admin_01",
            name="System Policy Administrator",
            role="administrator",
            allowed_applications=None
        )

    # 2. Reviewer principal — authorized for validation, finding review, status updates, reports
    if cleaned_token == settings.REVIEWER_API_KEY:
        return UserPrincipal(
            principal_id="usr_reviewer_01",
            name="Senior Compliance Reviewer",
            role="reviewer",
            allowed_applications=None
        )

    # 3. Applicant principal — strictly scoped to their own authorized institution & application
    if cleaned_token == settings.APPLICANT_API_KEY:
        return UserPrincipal(
            principal_id="usr_applicant_01",
            name="Institutional Representative (ABC College)",
            role="applicant",
            allowed_applications=["APP2026001"]
        )

    # 4. Legacy/Default shared API key — mapped to Reviewer with least privilege (never administrator)
    if cleaned_token == settings.API_KEY:
        return UserPrincipal(
            principal_id="usr_reviewer_default",
            name="Compliance Reviewer (Shared Credential)",
            role="reviewer",
            allowed_applications=None
        )

    return None


async def get_current_principal(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
) -> UserPrincipal:
    """
    Authenticates the caller from server-trusted credentials and derives their role.
    Accepts credentials via 'X-API-Key' or 'Authorization: Bearer <token>'.
    Rejects missing or invalid credentials with HTTP 401 Unauthorized.

    SECURITY ENFORCEMENT:
    - Never trusts 'X-User-Role' to grant or elevate privileges.
    - If 'X-User-Role' attempts role escalation (e.g., applicant sending 'administrator'),
      strictly rejects with HTTP 403 Forbidden.
    - If 'X-User-Role' is unknown, strictly rejects with HTTP 403 Forbidden.
    """
    token = x_api_key
    if not token and authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Bearer token format. Expected 'Bearer <token>'.",
                headers={"WWW-Authenticate": "Bearer"}
            )

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided. Missing API key or Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    principal = resolve_principal_from_token(token)
    if not principal:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key or Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Inspect client-supplied X-User-Role header as untrusted input
    if x_user_role:
        claimed_role = x_user_role.lower().strip()
        valid_roles = {"applicant", "reviewer", "administrator"}
        if claimed_role not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Invalid user role '{x_user_role}'. Allowed roles: {', '.join(sorted(valid_roles))}"
            )

        # Detect and deny role spoofing attempts:
        # A caller with a lower trusted role cannot claim an elevated role in headers
        role_hierarchy = {"applicant": 1, "reviewer": 2, "administrator": 3}
        trusted_level = role_hierarchy.get(principal.role, 0)
        claimed_level = role_hierarchy.get(claimed_role, 0)

        if claimed_level > trusted_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role spoofing detected: Authenticated principal '{principal.principal_id}' has role '{principal.role}' and cannot claim elevated role '{claimed_role}'."
            )

    return principal


async def verify_api_key(
    principal: UserPrincipal = Depends(get_current_principal)
) -> UserPrincipal:
    """
    Legacy compatibility dependency ensuring authentication.
    Returns the server-trusted UserPrincipal.
    """
    return principal


def get_current_user_role(
    principal: UserPrincipal = Depends(get_current_principal)
) -> str:
    """
    Returns the caller's server-trusted role established from verified credentials.
    Never derives the role from browser-controlled headers.
    """
    return principal.role


def require_role(allowed_roles: List[str]):
    """
    Dependency factory to enforce backend Role-Based Access Control (RBAC).
    Rejects unauthorized access with HTTP 403 Forbidden.
    """
    normalized_allowed = [r.lower() for r in allowed_roles]

    async def role_checker(
        principal: UserPrincipal = Depends(get_current_principal)
    ) -> UserPrincipal:
        if principal.role not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: Operation requires one of the following roles: {', '.join(allowed_roles)}. Current trusted role: '{principal.role}'."
            )
        return principal

    return role_checker


def check_application_access(principal: UserPrincipal, application_id: str) -> None:
    """
    Enforces application boundary authorization.
    Applicants can only access dossiers explicitly authorized for their principal.
    Reviewers and Administrators have cross-application review authority.
    """
    if principal.role == "applicant" and principal.allowed_applications is not None:
        if application_id.lower() not in [a.lower() for a in principal.allowed_applications]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cross-application access denied: Applicant '{principal.principal_id}' is not authorized to access application '{application_id}'."
            )
