"""
Script to update DWZ records with 1688 fulfillment numbers in remarks
and generate a PDF report
"""
import asyncio
import httpx
import hashlib
import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# DWZ API Config
DWZ56_API_URL = "https://www.dwz56.com/cgi-bin/EmsData.dll?DoApp"
DWZ56_CLIENT_ID = 1057
DWZ56_API_KEY = "jIrM5UNuZu905q7"

def build_request_payload(request_name: str, params: dict = None) -> dict:
    """Build the API request payload with authentication"""
    payload = {
        "RequestName": request_name,
        "ClientID": DWZ56_CLIENT_ID,
        "Key": DWZ56_API_KEY,
    }
    if params:
        payload.update(params)
    return payload

async def get_all_dwz_records():
    """Fetch all DWZ pre-input records"""
    payload = build_request_payload("PreInputList", {
        "iStart": 0,
        "iCount": 100,
        "nStatus": 11,  # All statuses
    })
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(DWZ56_API_URL, json=payload)
        data = response.json()
        return data.get("RecList", [])

async def update_dwz_record_memo(record: dict) -> dict:
    """Update a single DWZ record to add 1688 number to memo"""
    iID = record.get("iID")
    cRNo = record.get("cRNo", "")
    current_memo = record.get("cMemo", "")
    
    # Extract 1688 order number from cRNo (format: "1688:4993587147300978802")
    alibaba_order_id = ""
    if cRNo and cRNo.startswith("1688:"):
        alibaba_order_id = cRNo.replace("1688:", "")
    
    # Build new memo with 1688 number
    if alibaba_order_id:
        new_memo = f"1688 Order: {alibaba_order_id}"
        if current_memo and current_memo != "CANCELLED":
            new_memo = f"{new_memo} | {current_memo}"
    else:
        new_memo = current_memo or ""
    
    # Skip if memo already has the 1688 order
    if current_memo and alibaba_order_id and alibaba_order_id in current_memo:
        return {"success": True, "skipped": True, "iID": iID, "message": "Already has 1688 number"}
    
    # Skip cancelled records
    if current_memo == "CANCELLED":
        return {"success": True, "skipped": True, "iID": iID, "message": "Cancelled record"}
    
    # Update the record
    update_record = {
        "iID": iID,
        "cMemo": new_memo,
    }
    
    payload = build_request_payload("PreInputSet", {"RecList": [update_record]})
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(DWZ56_API_URL, json=payload)
        data = response.json()
        
        return_value = data.get("ReturnValue", -9)
        if return_value >= 0:
            return {"success": True, "iID": iID, "new_memo": new_memo}
        else:
            return {"success": False, "iID": iID, "error": f"ReturnValue: {return_value}"}

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
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=8,
        alignment=TA_LEFT,
    )
    
    elements = []
    
    # Title
    title = Paragraph(f"DWZ Shipping Orders Report<br/>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", title_style)
    elements.append(title)
    elements.append(Spacer(1, 20))
    
    # Summary
    total_orders = len(records)
    summary = Paragraph(f"<b>Total Orders:</b> {total_orders}", styles['Normal'])
    elements.append(summary)
    elements.append(Spacer(1, 20))
    
    # Table header
    table_data = [
        ['#', 'TNV Tracking', 'DWZ No', 'Receiver', 'City', 'Phone', '1688 Order', 'Shopify', 'Remarks']
    ]
    
    for idx, record in enumerate(records, 1):
        cRNo = record.get("cRNo", "")
        alibaba_id = cRNo.replace("1688:", "") if cRNo.startswith("1688:") else ""
        shopify = record.get("cBy1", "").replace("Shopify#", "#")
        
        row = [
            str(idx),
            record.get("cNum", ""),
            record.get("cNo", "")[:15] + "..." if len(record.get("cNo", "")) > 15 else record.get("cNo", ""),
            record.get("cReceiver", "")[:20],
            record.get("cRCity", "")[:15],
            record.get("cRPhone", "")[:15],
            alibaba_id[-10:] if alibaba_id else "",  # Last 10 digits
            shopify,
            record.get("cMemo", "")[:20] if record.get("cMemo") else "",
        ]
        table_data.append(row)
    
    # Create table
    col_widths = [0.3*inch, 1.1*inch, 1.0*inch, 1.0*inch, 0.8*inch, 0.9*inch, 0.8*inch, 0.5*inch, 1.0*inch]
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
    print("Fetching DWZ records...")
    records = await get_all_dwz_records()
    print(f"Found {len(records)} records")
    
    # Filter out cancelled records for update
    active_records = [r for r in records if r.get("cMemo") != "CANCELLED"]
    print(f"Active records (non-cancelled): {len(active_records)}")
    
    # Update remarks with 1688 numbers
    print("\nUpdating remarks with 1688 fulfillment numbers...")
    updated = 0
    skipped = 0
    errors = 0
    
    for record in active_records:
        result = await update_dwz_record_memo(record)
        if result.get("success"):
            if result.get("skipped"):
                skipped += 1
            else:
                updated += 1
                print(f"  Updated {record.get('cNum')}: {result.get('new_memo', '')[:50]}")
        else:
            errors += 1
            print(f"  Error updating {record.get('cNum')}: {result.get('error')}")
        
        # Small delay to avoid rate limiting
        await asyncio.sleep(0.2)
    
    print(f"\nUpdate complete: {updated} updated, {skipped} skipped, {errors} errors")
    
    # Re-fetch records to get updated data
    print("\nRe-fetching records for PDF...")
    records = await get_all_dwz_records()
    
    # Filter out cancelled for PDF
    active_records = [r for r in records if r.get("cMemo") != "CANCELLED"]
    
    # Generate PDF
    output_path = "/app/backend/static/dwz_orders_report.pdf"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    generate_pdf_report(active_records, output_path)
    
    return output_path

if __name__ == "__main__":
    result = asyncio.run(main())
    print(f"\nDone! PDF available at: {result}")
