from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import require_admin
from app.services.result_service import get_results_by_status
from app.services.report_service import generate_results_pdf, generate_results_excel
from app.core.exceptions import ValidationException

router = APIRouter(
    prefix="/admin/reports",
    tags=["Admin - Reports"],
    dependencies=[Depends(require_admin)]
)

@router.get("/results")
def export_results(
    format: str = Query(..., description="Export format: 'pdf' or 'excel'"),
    school_name: str = Query("Amarkor Vidyalaya", description="School name header to show on reports"),
    db: Session = Depends(get_db)
):
    """
    Downloads a compiled report of all approved student results in PDF or Excel format.
    """
    # Fetch only approved results for reporting
    results = get_results_by_status(db, "approved")
    
    fmt = format.lower()
    if fmt == "pdf":
        pdf_buffer = generate_results_pdf(results, school_name)
        headers = {
            'Content-Disposition': 'attachment; filename="approved_results_report.pdf"'
        }
        return StreamingResponse(pdf_buffer, media_type="application/pdf", headers=headers)
        
    elif fmt == "excel":
        excel_buffer = generate_results_excel(results, school_name)
        headers = {
            'Content-Disposition': 'attachment; filename="approved_results_report.xlsx"'
        }
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers
        )
        
    else:
        raise ValidationException("Unsupported report format. Please choose 'pdf' or 'excel'.")
