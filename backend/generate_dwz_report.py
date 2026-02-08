"""
Generate PDF report of all DWZ orders with 1688 fulfillment numbers
"""
import asyncio
import httpx
import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_LEFT

async def get_records():
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get("http://localhost:8001/api/dwz56/pre-input-list?page_size=100")
        return response.json().get("records", [])

def generate_pdf(records, output_path):
    # Use landscape for more columns
    doc = SimpleDocTemplate(output_path, pagesize=landscape(A4), 
                           leftMargin=0.3*inch, rightMargin=0.3*inch,
                           topMargin=0.4*inch, bottomMargin=0.4*inch)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle', parent=styles['Heading1'],
        fontSize=14, alignment=TA_CENTER, spaceAfter=15,
    )
    
    elements = []
    
    # Title
    title = Paragraph(f"<b>DWZ Shipping Orders Report</b><br/><font size=9>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')} | Total Orders: {len(records)}</font>", title_style)
    elements.append(title)
    elements.append(Spacer(1, 10))
    
    # Table header
    table_data = [
        ['#', 'TNV Tracking', 'DWZ No', 'Receiver', 'City', 'Province', 'Phone', '1688 Order ID', 'Shopify', 'Color/Size']
    ]
    
    for idx, r in enumerate(records, 1):
        cRNo = r.get("cRNo", "") or ""
        alibaba_id = cRNo.replace("1688:", "") if cRNo.startswith("1688:") else cRNo
        shopify = (r.get("cBy1", "") or "").replace("Shopify#", "#")
        color_size = r.get("cBy2", "") or ""
        
        row = [
            str(idx),
            r.get("cNum", "") or "",
            r.get("cNo", "") or "",
            (r.get("cReceiver", "") or "")[:18],
            (r.get("cRCity", "") or "")[:12],
            (r.get("cRProvince", "") or "")[:12],
            (r.get("cRPhone", "") or "")[:14],
            alibaba_id,
            shopify,
            color_size[:12],
        ]
        table_data.append(row)
    
    # Column widths for landscape
    col_widths = [0.25*inch, 1.2*inch, 1.4*inch, 1.0*inch, 0.7*inch, 0.7*inch, 0.9*inch, 1.4*inch, 0.5*inch, 0.7*inch]
    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('FONTSIZE', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 3),
        ('TOPPADDING', (0, 1), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f5f9')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    elements.append(table)
    doc.build(elements)
    return output_path

async def main():
    print("Fetching DWZ records...")
    records = await get_records()
    
    # Filter out cancelled
    active = [r for r in records if (r.get("cMemo") or "") != "CANCELLED"]
    print(f"Found {len(active)} active orders")
    
    output_path = "/app/backend/static/dwz_orders_report.pdf"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    generate_pdf(active, output_path)
    print(f"PDF generated: {output_path}")
    return output_path

if __name__ == "__main__":
    asyncio.run(main())
