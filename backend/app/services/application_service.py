import datetime
import json
from typing import List, Optional, Tuple
from sqlalchemy import func, or_
from backend.app.db.session import SessionLocal
from backend.app.db.models import ApplicationModel
from backend.app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdate,
    TimelineItem,
    FindingsCount
)


class ApplicationService:
    def list_applications(
        self,
        search: Optional[str] = None,
        status: Optional[str] = None,
        app_type: Optional[str] = None,
        priority: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[ApplicationResponse], int]:
        with SessionLocal() as db:
            query = db.query(ApplicationModel)

            if search:
                q = f"%{search.lower()}%"
                query = query.filter(
                    or_(
                        func.lower(ApplicationModel.id).like(q),
                        func.lower(ApplicationModel.applicant_name).like(q),
                        func.lower(ApplicationModel.title).like(q),
                        func.lower(ApplicationModel.reference_no).like(q),
                    )
                )

            if status and status != "All":
                query = query.filter(ApplicationModel.status == status)

            if app_type and app_type != "All":
                query = query.filter(ApplicationModel.type == app_type)

            if priority and priority != "All":
                query = query.filter(ApplicationModel.priority == priority)

            total = query.count()
            # Order by id or created_at
            apps = query.order_by(ApplicationModel.id.desc()).offset(skip).limit(limit).all()
            return [app.to_schema() for app in apps], total

    def get_by_id(self, application_id: str) -> Optional[ApplicationResponse]:
        with SessionLocal() as db:
            app = db.query(ApplicationModel).filter(
                func.lower(ApplicationModel.id) == application_id.lower()
            ).first()
            if not app:
                return None
            return app.to_schema()

    def create(self, app_in: ApplicationCreate) -> ApplicationResponse:
        with SessionLocal() as db:
            if app_in.id:
                new_id = app_in.id
            else:
                count = db.query(ApplicationModel).count()
                new_id = f"APP2026{str(count + 1).zfill(3)}"

            # If application with this ID already exists, clean it up for idempotent test/client runs
            existing = db.query(ApplicationModel).filter(
                func.lower(ApplicationModel.id) == new_id.lower()
            ).first()
            if existing:
                db.delete(existing)
                db.commit()

            now_str = datetime.datetime.now().strftime("%d-%b-%y")
            time_str = datetime.datetime.now().strftime("%d-%b-%y %I:%M %p")

            initial_timeline = [
                {
                    "step": "Application Submitted",
                    "timestamp": time_str,
                    "status": "completed",
                    "details": "Created via REST API endpoint"
                }
            ]

            app_row = ApplicationModel(
                id=new_id,
                title=app_in.title,
                applicant_name=app_in.applicantName,
                type=app_in.type,
                category=app_in.category,
                reference_no=app_in.referenceNo,
                submitted_date=app_in.submittedDate or now_str,
                last_updated=time_str,
                status="Needs Review",
                priority=app_in.priority,
                risk_level=app_in.riskLevel,
                assigned_reviewer="Compliance Reviewer",
                contact_email=app_in.contactEmail,
                contact_phone=app_in.contactPhone,
                compliance_score=85,
                findings_high=0,
                findings_warning=1,
                findings_info=2,
                timeline_json=json.dumps(initial_timeline)
            )

            db.add(app_row)
            db.commit()
            db.refresh(app_row)
            return app_row.to_schema()

    def update_status(self, application_id: str, update_in: ApplicationStatusUpdate) -> Optional[ApplicationResponse]:
        with SessionLocal() as db:
            app = db.query(ApplicationModel).filter(
                func.lower(ApplicationModel.id) == application_id.lower()
            ).first()
            if not app:
                return None

            time_str = datetime.datetime.now().strftime("%d-%b-%y %I:%M %p")
            app.status = update_in.status
            app.last_updated = time_str

            timeline_items = []
            if app.timeline_json:
                try:
                    timeline_items = json.loads(app.timeline_json)
                except Exception:
                    pass

            timeline_items.append({
                "step": f"Status Changed to {update_in.status}",
                "timestamp": time_str,
                "status": "completed",
                "details": update_in.notes or f"Updated by {update_in.reviewerName}"
            })
            app.timeline_json = json.dumps(timeline_items)

            db.commit()
            db.refresh(app)
            return app.to_schema()

    def delete(self, application_id: str) -> bool:
        with SessionLocal() as db:
            app = db.query(ApplicationModel).filter(
                func.lower(ApplicationModel.id) == application_id.lower()
            ).first()
            if not app:
                return False

            db.delete(app)
            db.commit()
            return True


# Global singleton instance
application_service = ApplicationService()
