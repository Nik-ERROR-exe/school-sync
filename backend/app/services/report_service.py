import os
from io import BytesIO
from datetime import datetime
from typing import List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from app.models.result import Result
from app.config import settings
from app.services.result_service import calculate_overall_grade, get_grading_scale_group

def generate_results_pdf(results: List[Result], school_name: str = "SchoolSync Academy") -> BytesIO:
    """
    Generates a high-quality, professional PDF report of approved student results
    using ReportLab.
    """
    buffer = BytesIO()
    
    # Page setup
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    story = []
    
    styles = getSampleStyleSheet()
    
    # Premium Typography & Color styles matching modern designs
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=colors.HexColor('#1A365D'),  # Deep Navy Blue
        alignment=1,  # Center
        spaceAfter=8
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=colors.HexColor('#4A5568'),  # Dark Gray
        alignment=1,
        spaceAfter=24
    )
    
    cell_style = ParagraphStyle(
        'CellText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.HexColor('#2D3748')
    )
    
    cell_style_bold = ParagraphStyle(
        'CellTextBold',
        parent=cell_style,
        fontName='Helvetica-Bold'
    )
    
    # Document Header
    story.append(Paragraph(school_name, title_style))
    story.append(Paragraph("OFFICIAL STUDENT PERFORMANCE REPORT (APPROVED BATCH)", subtitle_style))
    story.append(Spacer(1, 10))
    
    # Table headers and contents
    data = [[
        Paragraph("<b>Roll No</b>", cell_style_bold),
        Paragraph("<b>Student Name</b>", cell_style_bold),
        Paragraph("<b>Class</b>", cell_style_bold),
        Paragraph("<b>Subject</b>", cell_style_bold),
        Paragraph("<b>Exam Type</b>", cell_style_bold),
        Paragraph("<b>Marks</b>", cell_style_bold),
        Paragraph("<b>Grade</b>", cell_style_bold)
    ]]
    
    for r in results:
        student_name = r.student.name if r.student else "N/A"
        roll_no = r.student.roll_no if r.student else "N/A"
        class_name = f"{r.student.school_class.class_name}{r.student.school_class.division}" if r.student and r.student.school_class else "N/A"
        subject_name = r.subject.subject_name if r.subject else "N/A"
        exam_name = r.exam_type.name if r.exam_type else "N/A"
        marks_str = f"{r.marks_obtained} / {r.total_marks} ({r.percentage}%)"
        grade_str = r.grade
        
        data.append([
            Paragraph(roll_no, cell_style),
            Paragraph(student_name, cell_style),
            Paragraph(class_name, cell_style),
            Paragraph(subject_name, cell_style),
            Paragraph(exam_name, cell_style),
            Paragraph(marks_str, cell_style),
            Paragraph(grade_str, cell_style)
        ])
        
    # Table layouts - margins: letter is 612 wide. 612 - 80 margins = 532 printable area
    t = Table(data, colWidths=[65, 120, 50, 105, 75, 82, 35])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2B6CB0')),  # Soft Teal/Blue Header
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),  # Subtle border lines
        # Alternating row background colors
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#F7FAFC')),
        ('BOTTOMPADDING', (0,1), (-1,-1), 6),
        ('TOPPADDING', (0,1), (-1,-1), 6),
    ]))
    
    story.append(t)
    doc.build(story)
    buffer.seek(0)
    return buffer

def generate_results_excel(payload: dict) -> BytesIO:
    school_name = payload.get("school_name") or "School"
    class_display = payload.get("class_display") or ""
    exam_name = payload.get("exam_name") or ""
    subjects = payload.get("subjects") or []
    students = payload.get("students") or []

    try:
        term_start = datetime.strptime(settings.ACADEMIC_TERM_START, "%Y-%m-%d")
        academic_year = f"{term_start.year}-{(term_start.year + 1) % 100:02d}"
    except (ValueError, AttributeError, TypeError):
        academic_year = ""

    wb = Workbook()
    ws = wb.active
    ws.title = (exam_name or "Results")[:31]
    ws.views.sheetView[0].showGridLines = True

    title_font = Font(name="Calibri", size=16, bold=True, color="1A365D")
    subtitle_font = Font(name="Calibri", size=11, italic=True, color="4A5568")
    group_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    sub_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    data_font = Font(name="Calibri", size=11)
    bold_font = Font(name="Calibri", size=11, bold=True)

    group_fill = PatternFill(start_color="2B6CB0", end_color="2B6CB0", fill_type="solid")
    sub_fill = PatternFill(start_color="5B8DC7", end_color="5B8DC7", fill_type="solid")
    alt_fill = PatternFill(start_color="F7FAFC", end_color="F7FAFC", fill_type="solid")
    subtotal_fill = PatternFill(start_color="EBF3FB", end_color="EBF3FB", fill_type="solid")

    center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left = Alignment(horizontal="left", vertical="center")
    thin_border = Border(
        left=Side(style="thin", color="E2E8F0"),
        right=Side(style="thin", color="E2E8F0"),
        top=Side(style="thin", color="E2E8F0"),
        bottom=Side(style="thin", color="E2E8F0"),
    )

    leading_cols = 2
    trailing_cols = 4
    subject_col_counts = [len(s.get("components") or []) + 1 for s in subjects]
    total_cols = leading_cols + sum(subject_col_counts) + trailing_cols
    last_col_letter = get_column_letter(total_cols)
    trailing_start = total_cols - trailing_cols + 1

    ws.merge_cells(f"A1:{last_col_letter}1")
    ws["A1"] = school_name
    ws["A1"].font = title_font
    ws["A1"].alignment = center
    ws.row_dimensions[1].height = 28

    ws.merge_cells(f"A2:{last_col_letter}2")
    parts = []
    if class_display:
        parts.append(f"Class: {class_display}")
    if exam_name:
        parts.append(exam_name)
    if academic_year:
        parts.append(f"AY {academic_year}")
    ws["A2"] = "  •  ".join(parts)
    ws["A2"].font = subtitle_font
    ws["A2"].alignment = center
    ws.row_dimensions[2].height = 20

    row_group = 3
    row_sub = 4

    ws.cell(row=row_group, column=1, value="Roll No")
    ws.merge_cells(start_row=row_group, start_column=1, end_row=row_sub, end_column=1)
    ws.cell(row=row_group, column=2, value="Student Name")
    ws.merge_cells(start_row=row_group, start_column=2, end_row=row_sub, end_column=2)

    col = leading_cols + 1
    for subj in subjects:
        span = len(subj.get("components") or []) + 1
        ws.cell(row=row_group, column=col, value=subj.get("name") or "")
        if span > 1:
            ws.merge_cells(start_row=row_group, start_column=col, end_row=row_group, end_column=col + span - 1)
        col += span

    for i, label in enumerate(["Total", "%", "Grade", "Result"]):
        ws.cell(row=row_group, column=trailing_start + i, value=label)
        ws.merge_cells(start_row=row_group, start_column=trailing_start + i, end_row=row_sub, end_column=trailing_start + i)

    col = leading_cols + 1
    for subj in subjects:
        for comp in (subj.get("components") or []):
            label = comp.get("label") or comp.get("code") or ""
            mx = comp.get("max_marks")
            text = f"{label}\n/{mx:g}" if isinstance(mx, (int, float)) else label
            ws.cell(row=row_sub, column=col, value=text)
            col += 1
        ws.cell(row=row_sub, column=col, value="एकूण")
        col += 1

    for r in (row_group, row_sub):
        for c in range(1, total_cols + 1):
            cell = ws.cell(row=r, column=c)
            cell.font = group_font if r == row_group else sub_font
            cell.fill = group_fill if r == row_group else sub_fill
            cell.alignment = center
            cell.border = thin_border
    ws.row_dimensions[row_group].height = 24
    ws.row_dimensions[row_sub].height = 34

    for idx, stu in enumerate(students):
        r = row_sub + 1 + idx
        ws.cell(row=r, column=1, value=stu.get("roll_no") or "")
        ws.cell(row=r, column=2, value=stu.get("name") or "")

        col = leading_cols + 1
        subj_data_map = stu.get("subject_data") or {}
        for subj in subjects:
            sid = subj.get("id")
            sd = subj_data_map.get(sid) or {}
            comp_marks = sd.get("components") or {}
            for c in subj.get("components") or []:
                code = c.get("code")
                val = comp_marks.get(code) if isinstance(comp_marks, dict) else None
                ws.cell(row=r, column=col, value=val if val is not None else "")
                col += 1
            subtotal = sd.get("subtotal")
            ws.cell(row=r, column=col, value=subtotal if subtotal is not None else "")
            col += 1

        ws.cell(row=r, column=trailing_start + 0, value=stu.get("grand_total") if stu.get("grand_total") is not None else "")
        ws.cell(row=r, column=trailing_start + 1, value=stu.get("percentage") if stu.get("percentage") is not None else "")
        ws.cell(row=r, column=trailing_start + 2, value=stu.get("grade") or "")
        ws.cell(row=r, column=trailing_start + 3, value=stu.get("result_status") or "")

        for c in range(1, total_cols + 1):
            cell = ws.cell(row=r, column=c)
            cell.font = data_font
            cell.border = thin_border
            cell.alignment = left if c == 2 else center
            if idx % 2 == 1:
                cell.fill = alt_fill

        col = leading_cols + 1
        for subj in subjects:
            col += len(subj.get("components") or [])
            sub_cell = ws.cell(row=r, column=col)
            sub_cell.fill = subtotal_fill
            sub_cell.font = bold_font
            col += 1

    ws.column_dimensions[get_column_letter(1)].width = 10
    ws.column_dimensions[get_column_letter(2)].width = 26
    col = leading_cols + 1
    for subj in subjects:
        for _ in (subj.get("components") or []):
            ws.column_dimensions[get_column_letter(col)].width = 10
            col += 1
        ws.column_dimensions[get_column_letter(col)].width = 10
        col += 1
    ws.column_dimensions[get_column_letter(trailing_start)].width = 12
    ws.column_dimensions[get_column_letter(trailing_start + 1)].width = 10
    ws.column_dimensions[get_column_letter(trailing_start + 2)].width = 10
    ws.column_dimensions[get_column_letter(trailing_start + 3)].width = 10

    ws.freeze_panes = f"C{row_sub + 1}"

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer
