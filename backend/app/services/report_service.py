import os
from io import BytesIO
from typing import List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from app.models.result import Result

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

def generate_results_excel(results: List[Result], school_name: str = "SchoolSync Academy") -> BytesIO:
    """
    Generates a premium, formatted Microsoft Excel sheet containing the approved results.
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "Approved Results"
    
    # Make sure gridlines are visible
    ws.views.sheetView[0].showGridLines = True
    
    # Styled Font Family
    title_font = Font(name="Calibri", size=16, bold=True, color="1A365D")
    subtitle_font = Font(name="Calibri", size=11, italic=True, color="4A5568")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    data_font = Font(name="Calibri", size=11)
    
    # Fill colors
    header_fill = PatternFill(start_color="2B6CB0", end_color="2B6CB0", fill_type="solid")
    alt_row_fill = PatternFill(start_color="F7FAFC", end_color="F7FAFC", fill_type="solid")
    
    # Alignments
    center_align = Alignment(horizontal="center", vertical="center")
    left_align = Alignment(horizontal="left", vertical="center")
    
    # Borders
    thin_border = Border(
        left=Side(style='thin', color="E2E8F0"),
        right=Side(style='thin', color="E2E8F0"),
        top=Side(style='thin', color="E2E8F0"),
        bottom=Side(style='thin', color="E2E8F0")
    )
    
    # Document headers setup
    ws.merge_cells("A1:I1")
    ws["A1"] = school_name
    ws["A1"].font = title_font
    ws["A1"].alignment = center_align
    ws.row_dimensions[1].height = 35
    
    ws.merge_cells("A2:I2")
    ws["A2"] = "Approved Student Results Report"
    ws["A2"].font = subtitle_font
    ws["A2"].alignment = center_align
    ws.row_dimensions[2].height = 20
    
    ws.append([])  # Space
    
    # Table headers
    headers = ["Roll No", "Student Name", "Class", "Subject", "Exam Type", "Marks Obtained", "Total Marks", "Percentage", "Grade"]
    ws.append(headers)
    
    header_row = 4
    ws.row_dimensions[header_row].height = 25
    
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=header_row, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align
        cell.border = thin_border
        
    # Table data entries
    for idx, r in enumerate(results):
        student_name = r.student.name if r.student else "N/A"
        roll_no = r.student.roll_no if r.student else "N/A"
        class_name = f"{r.student.school_class.class_name}{r.student.school_class.division}" if r.student and r.student.school_class else "N/A"
        subject_name = r.subject.subject_name if r.subject else "N/A"
        exam_name = r.exam_type.name if r.exam_type else "N/A"
        
        row_data = [
            roll_no,
            student_name,
            class_name,
            subject_name,
            exam_name,
            r.marks_obtained,
            r.total_marks,
            r.percentage,
            r.grade
        ]
        
        ws.append(row_data)
        curr_row = header_row + 1 + idx
        ws.row_dimensions[curr_row].height = 20
        
        # Format columns styling
        for col_idx in range(1, len(row_data) + 1):
            cell = ws.cell(row=curr_row, column=col_idx)
            cell.font = data_font
            cell.border = thin_border
            
            # Column alignments
            if col_idx in [2, 4]:  # Name, Subject
                cell.alignment = left_align
            else:
                cell.alignment = center_align
                
            # Alternating rows coloring
            if idx % 2 == 1:
                cell.fill = alt_row_fill
                
            # Format percentage cell
            if col_idx == 8:
                cell.number_format = '0.00"%"'
                
    # Auto-adjust column widths
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            if cell.row in [1, 2]:  # Skip title row merges
                continue
            if cell.value is not None:
                max_len = max(max_len, len(str(cell.value)))
        ws.column_dimensions[col_letter].width = max(max_len + 4, 11)
        
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer
