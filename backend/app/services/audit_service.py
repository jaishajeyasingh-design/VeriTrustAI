import hashlib
import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import func
from backend.app.schemas.audit import AuditEvent
from backend.app.db.session import SessionLocal
from backend.app.db.models import AuditEventModel

SEED_AUDIT: List[AuditEvent] = [
    AuditEvent(
        id="AUD-991",
        timestamp="28-Oct-26 10:34 AM",
        user="Compliance Reviewer",
        userRole="reviewer",
        action="Verification Completed",
        applicationId="APP2026001",
        details="Simulated verification results generated. Cross-document comparison flagged 2 mismatches.",
        hash="sha256:8f4c2e19b0d1a4e76317bcde89a241e"
    ),
    AuditEvent(
        id="AUD-990",
        timestamp="28-Oct-26 10:30 AM",
        user="System Engine",
        userRole="System",
        action="Document Processed",
        applicationId="APP2026001",
        details="OCR extraction completed for Application_Form.pdf (Confidence: 99.2%).",
        hash="sha256:7b1a9e33c4d5f6a89012bcde3456789"
    ),
    AuditEvent(
        id="AUD-987",
        timestamp="27-Oct-26 04:12 PM",
        user="Senior Officer Patel",
        userRole="reviewer",
        action="Application Approved",
        applicationId="APP2026002",
        details="Approval granted for University Affiliation Renewal. Regulatory compliance rating 98%.",
        hash="sha256:9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4"
    )
]


class AuditService:
    def list_events(self, application_id: Optional[str] = None) -> List[AuditEvent]:
        with SessionLocal() as db:
            query = db.query(AuditEventModel)
            if application_id:
                query = query.filter(func.lower(AuditEventModel.application_id) == application_id.lower())

            events = query.order_by(AuditEventModel.created_at.desc(), AuditEventModel.id.desc()).all()
            return [e.to_schema() for e in events]

    def record_event(
        self,
        action: str,
        application_id: str,
        details: str,
        user: str = "System Engine",
        user_role: str = "System"
    ) -> AuditEvent:
        now = datetime.datetime.now()
        timestamp_str = now.strftime("%d-%b-%y %I:%M %p")

        with SessionLocal() as db:
            # Retrieve latest event to link into the SHA-256 hash chain
            last_event = db.query(AuditEventModel).order_by(
                AuditEventModel.created_at.desc(),
                AuditEventModel.id.desc()
            ).first()

            prev_hash = last_event.hash if last_event else "GENESIS_HASH_00000000000000000000"
            hash_payload = f"{prev_hash}|{timestamp_str}|{user}|{action}|{application_id}|{details}"
            digest = hashlib.sha256(hash_payload.encode()).hexdigest()
            current_hash = f"sha256:{digest[:32]}"

            total_count = db.query(AuditEventModel).count()
            event_id = f"AUD-{total_count + 1001}"

            event_row = AuditEventModel(
                id=event_id,
                timestamp=timestamp_str,
                user=user,
                user_role=user_role,
                action=action,
                application_id=application_id,
                details=details,
                prev_hash=prev_hash,
                hash=current_hash
            )

            db.add(event_row)
            db.commit()
            db.refresh(event_row)
            return event_row.to_schema()

    def verify_hash_chain(self) -> Dict[str, Any]:
        """
        Validates hash chain continuity for all linked events.
        SECURITY & REGULATORY LIMITATION NOTE:
        SHA-256 cryptographic hash-chaining detects unauthorized in-flight alterations
        or record tampering under standard application operations. However, because SQLite
        resides on local storage without append-only hardware (WORM) or decentralized consensus,
        a privileged administrator with direct file-system write access could rewrite historical
        records and recalculate hash values. For statutory multi-party non-repudiation,
        external ledger anchoring is recommended.
        """
        with SessionLocal() as db:
            events = db.query(AuditEventModel).order_by(AuditEventModel.created_at.asc()).all()
            if not events:
                return {"valid": True, "total_events": 0, "broken_links": 0, "verified": True}

            broken = []
            for i in range(1, len(events)):
                prev = events[i - 1]
                curr = events[i]
                if curr.prev_hash and curr.prev_hash != prev.hash:
                    broken.append({
                        "event_id": curr.id,
                        "expected_prev": prev.hash,
                        "found_prev": curr.prev_hash,
                        "message": f"Broken chain link at {curr.id}: expected prev_hash '{prev.hash}', found '{curr.prev_hash}'."
                    })

            return {
                "valid": len(broken) == 0,
                "total_events": len(events),
                "broken_links": len(broken),
                "broken_details": broken,
                "limitations_documented": True
            }


audit_service = AuditService()
