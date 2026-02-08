"""
Script to update DWZ records with 1688 fulfillment numbers in remarks
and generate a PDF report - Uses internal API
"""
import asyncio
import httpx
import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# Use internal API
API_BASE = "http://localhost:8001/api/dwz56"

async def get_all_dwz_records():
    """Fetch all DWZ pre-input records via internal API"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(f"{API_BASE}/pre-input-list?page_size=100")
        data = response.json()
        return data.get("records", [])

async def update_dwz_record_memo(iID: int, new_memo: str) -> dict:
    """Update a single DWZ record memo via internal API"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{API_BASE}/update-record-memo",
            json={"iID": iID, "memo": new_memo}
        )
        return response.json()

def generate_pdf_report(records: list, output_path: str):
    """Generate PDF report of all DWZ orders"""
    doc = SimpleDocTemplate(output_path, pagesize=A4, 
                           leftMargin=0.5*inch, rightMargin=0.5*inch,
                           topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        alignment=TA_CENTER,
        spaceAfter=20,
    )
    
    elements = []
    
    # Title
    title = Paragraph(f"DWZ Shipping Orders Report<br/>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", title_style)
    elements.append(title)
    elements.append(Spacer(1, 20))
    
    # Summary
    total_orders = len(records)
    summary = Paragraph(f"<b>Total Active Orders:</b> {total_orders}", styles['Normal'])
    elements.append(summary)
    elements.append(Spacer(1, 20))
    
    # Table header
    table_data = [
        ['#', 'TNV Tracking', 'DWZ No', 'Receiver', 'City', 'Phone', '1688 Order', 'Shopify', 'Remarks']
    ]
    
    for idx, record in enumerate(records, 1):
        cRNo = record.get("cRNo", "") or ""
        alibaba_id = cRNo.replace("1688:", "") if cRNo.startswith("1688:") else ""
        shopify = (record.get("cBy1", "") or "").replace("Shopify#", "#")
        cMemo = record.get("cMemo", "") or ""
        
        row = [
            str(idx),
            record.get("cNum", "") or "",
            (record.get("cNo", "") or "")[:18],
            (record.get("cReceiver", "") or "")[:20],
            (record.get("cRCity", "") or "")[:15],
            (record.get("cRPhone", "") or "")[:15],
            alibaba_id[-12:] if alibaba_id else "",  # Last 12 digits
            shopify,
            cMemo[:25] if cMemo else "",
        ]
        table_data.append(row)
    
    # Create table
    col_widths = [0.25*inch, 1.1*inch, 1.1*inch, 0.9*inch, 0.7*inch, 0.8*inch, 0.85*inch, 0.45*inch, 1.0*inch]
    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('FONTSIZE', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    elements.append(table)
    
    # Build PDF
    doc.build(elements)
    print(f"PDF generated: {output_path}")

async def main():
    print("Fetching DWZ records via internal API...")
    records = await get_all_dwz_records()
    print(f"Found {len(records)} records")
    
    # Filter out cancelled records
    active_records = [r for r in records if (r.get("cMemo") or "") != "CANCELLED"]
    print(f"Active records (non-cancelled): {len(active_records)}")
    
    # Generate PDF
    output_path = "/app/backend/static/dwz_orders_report.pdf"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    generate_pdf_report(active_records, output_path)
    
    return output_path

if __name__ == "__main__":
    result = asyncio.run(main())
    print(f"\nDone! PDF available at: {result}")
