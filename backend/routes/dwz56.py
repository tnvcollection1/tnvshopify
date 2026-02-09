"""
DWZ56 Shipping API Integration
Based on the APP_PDA API documentation

API Endpoints:
- ClientInfo: Get client account information and balance
- PreInputSet: Create/update shipping orders
- PreInputDel: Delete pre-input orders
- PreInputData: Get single order details
- PreInputList: List pre-input orders
- RecList: List shipped records with tracking status
- EmsKindList: Get available courier types
- FeeList: Payment/fee records
- QueryPrice: Get shipping quotes
- DoGetNo: Generate AWB/tracking numbers
- VstGoodsList: Warehouse inventory
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import hashlib
import httpx
import os
import json
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path

router = APIRouter(prefix="/api/dwz56", tags=["DWZ56 Shipping"])

# Database connection for cross-referencing with Shopify orders
_db = None

def get_db():
    global _db
    if _db is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        _db = client[os.environ.get('DB_NAME', 'wamerce')]
    return _db

# Configuration - Shipping Account
DWZ56_API_URL = os.environ.get("DWZ56_API_URL", "https://www.dwz56.com/cgi-bin/EmsData.dll?DoApp")
DWZ56_CLIENT_ID = int(os.environ.get("DWZ56_CLIENT_ID", "1057"))
DWZ56_API_KEY = os.environ.get("DWZ56_API_KEY", "jIrM5UNuZu905q7")

# Configuration - Purchase Account (Sunny)
DWZ56_PURCHASE_CLIENT_ID = int(os.environ.get("DWZ56_PURCHASE_CLIENT_ID", "1051"))
DWZ56_PURCHASE_API_KEY = os.environ.get("DWZ56_PURCHASE_API_KEY", "5OpgrK9wFy3yfOX")

# Color code mapping for tracking number
COLOR_CODES = {
    "red": "R", "maroon": "R", "burgundy": "R", "crimson": "R", "scarlet": "R",
    "blue": "U", "navy": "U", "royal": "U", "cobalt": "U", "azure": "U", "indigo": "U",
    "black": "B", "jet": "B", "onyx": "B", "ebony": "B", "charcoal": "B",
    "white": "W", "ivory": "W", "cream": "W", "snow": "W", "pearl": "W",
    "green": "G", "olive": "G", "emerald": "G", "forest": "G", "lime": "G", "mint": "G", "teal": "G",
    "yellow": "Y", "gold": "Y", "amber": "Y", "lemon": "Y", "mustard": "Y",
    "orange": "O", "tangerine": "O", "peach": "O", "coral": "O", "apricot": "O",
    "pink": "P", "rose": "P", "magenta": "P", "fuchsia": "P", "salmon": "P", "blush": "P",
    "purple": "V", "violet": "V", "lavender": "V", "plum": "V", "lilac": "V", "mauve": "V",
    "brown": "N", "tan": "N", "beige": "N", "khaki": "N", "camel": "N", "chocolate": "N", "coffee": "N",
    "grey": "E", "gray": "E", "silver": "E", "ash": "E", "slate": "E",
    "multi": "M", "multicolor": "M", "mixed": "M", "rainbow": "M",
    # Chinese colors
    "红色": "R", "红": "R", "酒红": "R",
    "蓝色": "U", "蓝": "U", "深蓝": "U", "藏蓝": "U",
    "黑色": "B", "黑": "B",
    "白色": "W", "白": "W", "米白": "W",
    "绿色": "G", "绿": "G", "军绿": "G", "墨绿": "G",
    "黄色": "Y", "黄": "Y", "金色": "Y",
    "橙色": "O", "橙": "O",
    "粉色": "P", "粉": "P", "粉红": "P",
    "紫色": "V", "紫": "V",
    "棕色": "N", "棕": "N", "咖啡": "N", "卡其": "N", "驼色": "N",
    "灰色": "E", "灰": "E", "银色": "E",
}

# Country codes
COUNTRY_CODES = {
    "india": "IN", "in": "IN", "ind": "IN",
    "pakistan": "PK", "pk": "PK", "pak": "PK",
    "uae": "AE", "dubai": "AE", "ae": "AE",
    "usa": "US", "us": "US", "united states": "US",
    "uk": "UK", "gb": "UK", "united kingdom": "UK",
    "saudi": "SA", "ksa": "SA", "sa": "SA",
}


def get_color_code(color_str: str) -> str:
    """Extract color code from color string using predefined mapping"""
    if not color_str:
        return "X"  # Unknown
    
    color_lower = color_str.lower().strip()
    
    # Check direct match in COLOR_CODES
    if color_lower in COLOR_CODES:
        return COLOR_CODES[color_lower]
    
    # Check if any color keyword is in the string
    for color, code in COLOR_CODES.items():
        if color in color_lower:
            return code
    
    # Fallback: return first letter uppercase if no match
    return color_str[0].upper() if color_str else "X"


def get_country_code(country_str: str) -> str:
    """Extract 2-letter country code"""
    if not country_str:
        return "IN"  # Default to India
    country_lower = country_str.lower().strip()
    
    if country_lower in COUNTRY_CODES:
        return COUNTRY_CODES[country_lower]
    
    # Return first 2 letters uppercase
    return country_str[:2].upper() if len(country_str) >= 2 else "IN"


async def generate_tnv_tracking_number(
    country: str = "IN",
    color: str = None,
    size: str = None,
    db = None
) -> str:
    """
    Generate TNV tracking number format:
    TNV{COUNTRY}{DDMM}{COLOR}{SIZE}{SERIAL}
    
    Example: TNVIN0107R42001
    - TNV = Company prefix
    - IN = Country (India)
    - 0107 = Date (01st July in DDMM)
    - R = Color code (Red)
    - 42 = Size
    - 001 = Serial number (auto-increment per day)
    """
    if db is None:
        db = get_db()
    
    # Get current date in DDMM format
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%d%m")  # DDMM format
    today_key = now.strftime("%Y%m%d")  # For serial tracking
    
    # Get country code
    country_code = get_country_code(country)
    
    # Get color code
    color_code = get_color_code(color) if color else "X"
    
    # Get size (pad to 2 digits)
    size_str = str(size).zfill(2)[:2] if size else "00"
    # Extract numeric part if size contains letters
    size_num = ''.join(filter(str.isdigit, str(size))) if size else "00"
    size_str = size_num.zfill(2)[-2:] if size_num else "00"
    
    # Get/increment daily serial counter
    counter_key = f"tnv_tracking_{today_key}"
    counter_doc = await db.tracking_counters.find_one_and_update(
        {"_id": counter_key},
        {"$inc": {"serial": 1}},
        upsert=True,
        return_document=True
    )
    serial = counter_doc.get("serial", 1)
    serial_str = str(serial).zfill(3)[-3:]  # 3 digits, max 999 per day
    
    # Build tracking number: TNV + Country + DDMM + Color + Size + Serial
    tracking_number = f"TNV{country_code}{date_str}{color_code}{size_str}{serial_str}"
    
    return tracking_number


@router.get("/generate-tracking")
async def generate_tracking_number_endpoint(
    country: str = Query("IN", description="Country code (IN, PK, AE, etc.)"),
    color: str = Query(None, description="Color name (red, blue, black, etc.)"),
    size: str = Query(None, description="Size (41, 42, S, M, etc.)"),
):
    """
    Generate TNV tracking number.
    
    Format: TNV{COUNTRY}{DDMM}{COLOR}{SIZE}{SERIAL}
    Example: TNVIN0107R42001
    """
    db = get_db()
    tracking_number = await generate_tnv_tracking_number(country, color, size, db)
    
    return {
        "success": True,
        "tracking_number": tracking_number,
        "format": "TNV{COUNTRY}{DDMM}{COLOR}{SIZE}{SERIAL}",
        "breakdown": {
            "prefix": "TNV",
            "country": get_country_code(country),
            "date": datetime.now(timezone.utc).strftime("%d%m"),
            "color": get_color_code(color) if color else "X",
            "size": str(size).zfill(2)[-2:] if size else "00",
            "serial": "auto-increment"
        }
    }

# Tracking status mapping (nState values)
TRACKING_STATUS = {
    0: {"code": "NOT_SENT", "label": "未发送", "label_en": "Not Sent"},
    1: {"code": "SENT", "label": "已发送", "label_en": "Sent"},
    2: {"code": "IN_TRANSIT", "label": "转运中", "label_en": "In Transit"},
    3: {"code": "DELIVERED", "label": "送达", "label_en": "Delivered"},
    4: {"code": "TIMEOUT", "label": "超时", "label_en": "Timeout"},
    5: {"code": "CUSTOMS_HOLD", "label": "扣关", "label_en": "Customs Hold"},
    6: {"code": "ADDRESS_ERROR", "label": "地址错误", "label_en": "Address Error"},
    7: {"code": "LOST", "label": "快件丢失", "label_en": "Lost"},
    8: {"code": "RETURNED", "label": "退件", "label_en": "Returned"},
    9: {"code": "OTHER_EXCEPTION", "label": "其它异常", "label_en": "Other Exception"},
    10: {"code": "DESTROYED", "label": "销毁", "label_en": "Destroyed"},
}

# Payment type mapping
PAYMENT_TYPE = {
    0: "月结 (Monthly)",
    1: "现付 (Prepaid)",
    2: "到付 (COD)",
}

# Return value error codes
ERROR_CODES = {
    0: "No results",
    -1: "Duplicate unique field",
    -2: "Record not found",
    -3: "Missing required parameters",
    -4: "Request not supported",
    -5: "RequestName not parsed",
    -7: "Security verification failed",
    -8: "Unauthorized",
    -9: "System error",
    -710: "icID error - not provided or less than 1",
    -711: "icID error - client not found",
    -720: "TimeStamp error - out of sync threshold",
    -730: "MD5 error - not 32 characters",
    -731: "MD5 error - mismatch",
    -999: "Rate limited - too many concurrent requests. Please try again later.",
}


def generate_timestamp() -> int:
    """Generate timestamp in milliseconds since 1970-01-01 UTC"""
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def generate_md5_signature(client_id: int, timestamp: int, api_key: str) -> str:
    """Generate MD5 signature: MD5(icID + TimeStamp + API_Key)"""
    data = f"{client_id}{timestamp}{api_key}"
    return hashlib.md5(data.encode()).hexdigest()


def build_request_payload(request_name: str, extra_params: dict = None, account: str = "shipping") -> dict:
    """Build a request payload with authentication
    
    Args:
        request_name: API request name
        extra_params: Additional parameters
        account: 'shipping' or 'purchase' to select account credentials
    """
    timestamp = generate_timestamp()
    
    if account == "purchase":
        client_id = DWZ56_PURCHASE_CLIENT_ID
        api_key = DWZ56_PURCHASE_API_KEY
    else:
        client_id = DWZ56_CLIENT_ID
        api_key = DWZ56_API_KEY
    
    md5_sig = generate_md5_signature(client_id, timestamp, api_key)
    
    payload = {
        "RequestName": request_name,
        "icID": client_id,
        "TimeStamp": timestamp,
        "MD5": md5_sig,
    }
    
    if extra_params:
        payload.update(extra_params)
    
    return payload


async def make_api_request(payload: dict) -> dict:
    """Make HTTP POST request to DWZ56 API"""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            # The API expects JSON in POST body
            response = await client.post(
                DWZ56_API_URL,
                json=payload,
                headers={"Content-Type": "application/json; charset=utf-8"}
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"API request failed: {str(e)}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON response: {str(e)}")


def parse_return_value(return_value: int) -> dict:
    """Parse return value and provide human-readable message"""
    if return_value > 0:
        return {"success": True, "count": return_value}
    elif return_value == 0:
        return {"success": True, "count": 0, "message": "No results"}
    else:
        error_msg = ERROR_CODES.get(return_value, f"Unknown error code: {return_value}")
        return {"success": False, "error_code": return_value, "message": error_msg}


# ============== Pydantic Models ==============

class GoodsItem(BaseModel):
    cxGoods: str = Field(..., description="Goods name")
    ixQuantity: int = Field(1, description="Quantity")
    fxPrice: float = Field(0.0, description="Unit price")


class ShipmentCreate(BaseModel):
    # Shipment type
    nItemType: int = Field(1, description="0=Document, 1=Package, 2=Waterproof bag")
    nLanguage: int = Field(0, description="0=China Mainland, 1=Chinese, 2=Other")
    cEmsKind: str = Field(..., description="Courier type (required)")
    
    # Destination
    cDes: str = Field(..., description="Destination (required)")
    cAddrFrom: Optional[str] = Field(None, description="Origin address")
    
    # Package details
    fWeight: Optional[float] = Field(None, description="Weight in kg")
    iLong: Optional[int] = Field(None, description="Length in cm")
    iWidth: Optional[int] = Field(None, description="Width in cm")
    iHeight: Optional[int] = Field(None, description="Height in cm")
    iItem: int = Field(1, description="Number of items")
    
    # Payment
    nPayWay: int = Field(0, description="0=Monthly, 1=Prepaid, 2=COD")
    fAmount: Optional[float] = Field(None, description="Shipping fee")
    
    # Receiver info
    cReceiver: Optional[str] = Field(None, description="Receiver name")
    cRUnit: Optional[str] = Field(None, description="Receiver company")
    cRAddr: Optional[str] = Field(None, description="Receiver address")
    cRCity: Optional[str] = Field(None, description="Receiver city")
    cRPostcode: Optional[str] = Field(None, description="Receiver postal code")
    cRProvince: Optional[str] = Field(None, description="Receiver province/state")
    cRCountry: Optional[str] = Field(None, description="Receiver country")
    cRPhone: Optional[str] = Field(None, description="Receiver phone")
    cREMail: Optional[str] = Field(None, description="Receiver email")
    cRSms: Optional[str] = Field(None, description="Receiver SMS number")
    
    # Tracking numbers
    cNum: Optional[str] = Field(None, description="Internal tracking number")
    cNo: Optional[str] = Field(None, description="Transfer/AWB number")
    cRNo: Optional[str] = Field(None, description="Reference number")
    
    # Sender info
    cSender: Optional[str] = Field(None, description="Sender name")
    cSUnit: Optional[str] = Field(None, description="Sender company")
    cSAddr: Optional[str] = Field(None, description="Sender address")
    cSCity: Optional[str] = Field(None, description="Sender city")
    cSPostcode: Optional[str] = Field(None, description="Sender postal code")
    cSProvince: Optional[str] = Field(None, description="Sender province/state")
    cSCountry: Optional[str] = Field(None, description="Sender country")
    cSPhone: Optional[str] = Field(None, description="Sender phone")
    
    # Goods
    cGoods: Optional[str] = Field(None, description="Goods description")
    iQuantity: int = Field(1, description="Total quantity")
    fPrice: Optional[float] = Field(None, description="Goods value")
    GoodsList: Optional[List[GoodsItem]] = Field(None, description="Detailed goods list")
    
    # Other
    cMemo: Optional[str] = Field(None, description="Remarks")
    cMark: Optional[str] = Field(None, description="Tag/label")


class PriceQuery(BaseModel):
    cqDes: str = Field(..., description="Destination (required)")
    fqWeight: float = Field(..., description="Weight in kg (required)")
    cqEmsKind: Optional[str] = Field(None, description="Specific courier type")
    nqItemType: int = Field(1, description="0=Document, 1=Package, 2=Waterproof bag")
    fqLong: Optional[float] = Field(None, description="Length in cm")
    fqWidth: Optional[float] = Field(None, description="Width in cm")
    fqHeight: Optional[float] = Field(None, description="Height in cm")


class PlaceDWZFromAlibabaRequest(BaseModel):
    """Request to place DWZ order from 1688 purchase order"""
    alibaba_order_id: str = Field(..., description="1688 Order ID")
    courier_type: str = Field("YT", description="Courier type code (YT=YunTu, etc.)")
    weight: float = Field(0.5, description="Package weight in kg")
    goods_description: Optional[str] = Field(None, description="Goods description")


# ============== API Endpoints ==============

@router.get("/health")
async def health_check():
    """Check API connectivity and configuration"""
    return {
        "status": "ok",
        "api_url": DWZ56_API_URL,
        "client_id": DWZ56_CLIENT_ID,
        "configured": bool(DWZ56_API_KEY),
    }


@router.get("/download-report")
async def download_dwz_report():
    """
    Download the DWZ orders PDF report.
    Generates a fresh report with all current orders including 1688 seller tracking.
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.enums import TA_CENTER
    
    # Fetch records
    payload = build_request_payload("PreInputList", {
        "iPage": 1,
        "iPagePer": 100,
        "cqStateMask": "11",
    })
    
    response = await make_api_request(payload)
    records = response.get("RecList", [])
    
    # Filter out cancelled
    active = [r for r in records if (r.get("cMemo") or "") != "CANCELLED"]
    
    # Get seller tracking from database
    db = get_db()
    orders_with_tracking = await db.purchase_orders_1688.find({
        "seller_tracking_number": {"$exists": True, "$ne": None, "$ne": ""}
    }).to_list(200)
    
    # Create lookup by shopify order number
    tracking_lookup = {}
    for o in orders_with_tracking:
        shopify_num = o.get("shopify_order_number")
        if shopify_num:
            tracking_lookup[str(shopify_num)] = {
                "tracking": o.get("seller_tracking_number"),
                "courier": o.get("seller_courier_name", "")
            }
    
    # Generate PDF
    output_path = Path(__file__).parent.parent / "static" / "dwz_orders_report.pdf"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    doc = SimpleDocTemplate(str(output_path), pagesize=landscape(A4),
                           leftMargin=0.3*inch, rightMargin=0.3*inch,
                           topMargin=0.4*inch, bottomMargin=0.4*inch)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'],
                                 fontSize=14, alignment=TA_CENTER, spaceAfter=15)
    
    elements = []
    title = Paragraph(f"<b>DWZ Shipping Orders Report</b><br/><font size=9>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')} | Total: {len(active)}</font>", title_style)
    elements.append(title)
    elements.append(Spacer(1, 10))
    
    # Table with 1688 Seller Tracking column
    table_data = [['#', 'TNV Tracking', 'DWZ No', 'Receiver', 'City', 'Phone', '1688 Seller Tracking', 'Shopify', 'Color/Size']]
    
    for idx, r in enumerate(active, 1):
        cBy1 = r.get("cBy1", "") or ""
        shopify_num = cBy1.replace("Shopify#", "") if cBy1.startswith("Shopify#") else ""
        shopify_display = f"#{shopify_num}" if shopify_num else ""
        
        # Get seller tracking from lookup
        seller_tracking = ""
        if shopify_num and shopify_num in tracking_lookup:
            seller_tracking = tracking_lookup[shopify_num]["tracking"]
        
        table_data.append([
            str(idx),
            r.get("cNum", "") or "",
            r.get("cNo", "") or "",
            (r.get("cReceiver", "") or "")[:18],
            (r.get("cRCity", "") or "")[:12],
            (r.get("cRPhone", "") or "")[:14],
            seller_tracking,  # 1688 Seller Tracking
            shopify_display,
            (r.get("cBy2", "") or "")[:12],
        ])
    
    col_widths = [0.25*inch, 1.2*inch, 1.3*inch, 1.0*inch, 0.7*inch, 0.85*inch, 1.1*inch, 0.5*inch, 0.7*inch]
    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('FONTSIZE', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f5f9')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(table)
    doc.build(elements)
    
    return FileResponse(
        path=str(output_path),
        filename=f"dwz_orders_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf",
        media_type="application/pdf"
    )


@router.get("/client-info")
async def get_client_info():
    """
    Get client account information including balance
    RequestName: ClientInfo
    """
    payload = build_request_payload("ClientInfo")
    response = await make_api_request(payload)
    
    result = parse_return_value(response.get("ReturnValue", -9))
    if not result["success"]:
        # For rate limiting, return 429 status
        if response.get("ReturnValue") == -999:
            raise HTTPException(status_code=429, detail=result["message"])
        raise HTTPException(status_code=400, detail=result["message"])
    
    return {
        "success": True,
        "data": {
            "client_id": response.get("icID"),
            "web_account": response.get("cWebAccount"),
            "credit_limit": response.get("fCredit"),
            "balance": response.get("fBalance"),
            "available_balance": response.get("fABalance"),
            "pending_audit_count": response.get("iNoAudit"),
            "pending_audit_amount": response.get("fNoAudit"),
            "account": response.get("cAccount"),
            "station": response.get("cStation"),
            "company_name": response.get("cUnitName"),
            "company_name_en": response.get("cUnitNameE"),
            "address": response.get("cAddr"),
            "city": response.get("cCity"),
            "province": response.get("cProvince"),
            "country": response.get("cCountry"),
            "phone": response.get("cPhone"),
            "email": response.get("cEMail"),
        },
        "raw_response": response,
    }


@router.get("/courier-types")
async def get_courier_types():
    """
    Get available courier/shipping types
    RequestName: EmsKindList
    """
    payload = build_request_payload("EmsKindList")
    response = await make_api_request(payload)
    
    result = parse_return_value(response.get("ReturnValue", -9))
    
    courier_list = response.get("List", [])
    return {
        "success": True,
        "count": len(courier_list),
        "couriers": [
            {
                # API returns oName/cName or cEmsKind/cEmsKindi depending on version
                "code": item.get("oName") or item.get("cEmsKind"),
                "display_name": item.get("cName") or item.get("cEmsKindi") or item.get("oName") or item.get("cEmsKind"),
            }
            for item in courier_list
        ],
        "raw_response": response,
    }


@router.post("/quote")
async def get_shipping_quote(query: PriceQuery):
    """
    Get shipping price quotes
    RequestName: QueryPrice
    """
    extra_params = {
        "cqDes": query.cqDes,
        "fqWeight": query.fqWeight,
        "nqItemType": query.nqItemType,
    }
    
    if query.cqEmsKind:
        extra_params["cqEmsKind"] = query.cqEmsKind
    if query.fqLong:
        extra_params["fqLong"] = query.fqLong
    if query.fqWidth:
        extra_params["fqWidth"] = query.fqWidth
    if query.fqHeight:
        extra_params["fqHeight"] = query.fqHeight
    
    payload = build_request_payload("QueryPrice", extra_params)
    response = await make_api_request(payload)
    
    result = parse_return_value(response.get("ReturnValue", -9))
    if response.get("ReturnValue", 0) < 0:
        error_map = {
            -14: "Query validation failed",
            -15: "Destination not provided",
            -16: "Weight must be greater than 0",
        }
        error_msg = error_map.get(response.get("ReturnValue"), result.get("message", "Unknown error"))
        raise HTTPException(status_code=400, detail=error_msg)
    
    quotes = response.get("RecList", [])
    return {
        "success": True,
        "destination": query.cqDes,
        "weight_kg": query.fqWeight,
        "calculated_weight_kg": response.get("frWeight"),
        "quote_count": len(quotes),
        "quotes": [
            {
                "courier_code": q.get("cEmsKind"),
                "courier_name": q.get("cEmsKindi") or q.get("cEmsKind"),
                "total_price": q.get("fPrice"),
                "fuel_surcharge": q.get("fAddOn"),
                "customs_fee": q.get("fCustoms"),
                "discount": q.get("fDiscount"),
                "delivery_days_min": q.get("nDaysB"),
                "delivery_days_max": q.get("nDaysE"),
                "max_weight_kg": q.get("fcWeight"),
                "max_length_m": q.get("fcLong"),
                "max_volume_m3": q.get("fcCubic"),
                "remarks": q.get("cMemo"),
                "calculation": q.get("cMethod"),
                "station": q.get("cStation"),
            }
            for q in quotes
        ],
        "raw_response": response,
    }


@router.post("/shipment")
async def create_shipment(shipment: ShipmentCreate):
    """
    Create a new shipping order
    RequestName: PreInputSet
    """
    # Build the record
    record = {
        "iID": 0,  # 0 = new record
        "nItemType": shipment.nItemType,
        "nLanguage": shipment.nLanguage,
        "cEmsKind": shipment.cEmsKind,
        "cDes": shipment.cDes,
    }
    
    # Add optional fields
    optional_fields = [
        "cAddrFrom", "fWeight", "iLong", "iWidth", "iHeight", "iItem",
        "nPayWay", "fAmount", "cReceiver", "cRUnit", "cRAddr", "cRCity",
        "cRPostcode", "cRProvince", "cRCountry", "cRPhone", "cREMail", "cRSms",
        "cNum", "cNo", "cRNo", "cSender", "cSUnit", "cSAddr", "cSCity",
        "cSPostcode", "cSProvince", "cSCountry", "cSPhone", "cGoods",
        "iQuantity", "fPrice", "cMemo", "cMark"
    ]
    
    for field in optional_fields:
        value = getattr(shipment, field, None)
        if value is not None:
            record[field] = value
    
    # Add goods list if provided
    if shipment.GoodsList:
        record["GoodsList"] = [item.dict() for item in shipment.GoodsList]
    
    payload = build_request_payload("PreInputSet", {"RecList": [record]})
    response = await make_api_request(payload)
    
    result = parse_return_value(response.get("ReturnValue", -9))
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return {
        "success": True,
        "message": f"Created {result['count']} shipment(s)",
        "created_ids": response.get("RecIDs", []),
        "raw_response": response,
    }


class UpdateMemoRequest(BaseModel):
    iID: int = Field(..., description="Record ID to update")
    memo: str = Field(..., description="New memo/remarks value")


@router.post("/update-record-memo")
async def update_dwz_record_memo(request: UpdateMemoRequest):
    """
    Update the memo/remarks field of a DWZ pre-input record
    """
    record = {
        "iID": request.iID,
        "cMemo": request.memo,
    }
    
    payload = build_request_payload("PreInputSet", {"RecList": [record]})
    response = await make_api_request(payload)
    
    result = parse_return_value(response.get("ReturnValue", -9))
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return {
        "success": True,
        "message": f"Updated memo for record {request.iID}",
        "new_memo": request.memo,
    }


class TestFieldsUpdateRequest(BaseModel):
    iID: int = Field(..., description="Record ID to update")
    cMemo: Optional[str] = Field(None, description="Remarks field (254 chars)")
    cMark: Optional[str] = Field(None, description="Label/Tag field (15 chars)")
    cBy5: Optional[str] = Field(None, description="Backup field 5 (254 chars)")
    cReserve: Optional[str] = Field(None, description="Reserved string (30 chars)")
    cTransNote: Optional[str] = Field(None, description="Transport note (63 chars)")
    cRNo: Optional[str] = Field(None, description="Reference number (30 chars)")


@router.post("/test-update-fields")
async def test_update_multiple_fields(request: TestFieldsUpdateRequest):
    """
    Test updating multiple fields on a DWZ record to find which ones persist.
    Use this to determine which fields can actually be modified via API.
    """
    # Build record with only provided fields
    record = {"iID": request.iID}
    
    fields_to_test = []
    if request.cMemo is not None:
        record["cMemo"] = request.cMemo
        fields_to_test.append("cMemo")
    if request.cMark is not None:
        record["cMark"] = request.cMark
        fields_to_test.append("cMark")
    if request.cBy5 is not None:
        record["cBy5"] = request.cBy5
        fields_to_test.append("cBy5")
    if request.cReserve is not None:
        record["cReserve"] = request.cReserve
        fields_to_test.append("cReserve")
    if request.cTransNote is not None:
        record["cTransNote"] = request.cTransNote
        fields_to_test.append("cTransNote")
    if request.cRNo is not None:
        record["cRNo"] = request.cRNo
        fields_to_test.append("cRNo")
    
    if len(fields_to_test) == 0:
        raise HTTPException(status_code=400, detail="No fields provided to update")
    
    # Send update request
    payload = build_request_payload("PreInputSet", {"RecList": [record]})
    update_response = await make_api_request(payload)
    
    result = parse_return_value(update_response.get("ReturnValue", -9))
    
    # Fetch record to verify which fields actually updated
    verify_payload = build_request_payload("PreInputData", {"iID": request.iID})
    verify_response = await make_api_request(verify_payload)
    
    # Compare what we sent vs what's in the record now
    verification_results = {}
    for field in fields_to_test:
        sent_value = record.get(field, "")
        actual_value = verify_response.get(field, "")
        verification_results[field] = {
            "sent": sent_value,
            "actual": actual_value,
            "updated": sent_value == actual_value and sent_value != ""
        }
    
    return {
        "success": result["success"],
        "api_return_value": update_response.get("ReturnValue"),
        "api_message": result.get("message", "OK" if result["success"] else "Failed"),
        "fields_tested": fields_to_test,
        "verification": verification_results,
        "record_irID": verify_response.get("irID", "unknown"),
        "conclusion": "Fields marked 'updated: true' can be modified via API"
    }


@router.post("/update-all-remarks-with-tracking")
async def update_all_remarks_with_tracking():
    """
    Update all DWZ records with 1688 seller tracking numbers from local database.
    According to DWZ API docs, iID must be first parameter and > 0 for updates.
    """
    import asyncio
    
    db = get_db()
    
    # Get all tracking numbers from database
    orders = await db.purchase_orders_1688.find({
        "seller_tracking_number": {"$exists": True, "$ne": None, "$ne": ""}
    }).to_list(200)
    
    # Create lookup by shopify order
    tracking_lookup = {}
    for o in orders:
        shopify = str(o.get("shopify_order_number", ""))
        if shopify:
            tracking_lookup[shopify] = o.get("seller_tracking_number")
    
    # Get DWZ records
    payload = build_request_payload("PreInputList", {
        "iPage": 1,
        "iPagePer": 100,
        "cqStateMask": "11",
    })
    
    response = await make_api_request(payload)
    records = response.get("RecList", [])
    
    results = {
        "total": len(records),
        "updated": 0,
        "skipped": 0,
        "failed": 0,
        "details": []
    }
    
    for record in records:
        cBy1 = record.get("cBy1", "") or ""
        if not cBy1.startswith("Shopify#"):
            continue
        
        shopify = cBy1.replace("Shopify#", "")
        tracking = tracking_lookup.get(shopify)
        
        if not tracking:
            results["skipped"] += 1
            continue
        
        iID = record.get("iID")
        current_memo = record.get("cMemo", "") or ""
        
        # Skip if already updated or cancelled
        if tracking in current_memo or current_memo == "CANCELLED":
            results["skipped"] += 1
            continue
        
        # Build memo with 1688 tracking
        new_memo = f"1688: {tracking}"
        
        # IMPORTANT: According to DWZ docs, iID must be FIRST parameter in record object
        # Use ordered dict or ensure iID comes first
        update_record = {
            "iID": iID,  # Must be first and > 0 for update
            "cMemo": new_memo
        }
        
        update_payload = build_request_payload("PreInputSet", {
            "RecList": [update_record]
        })
        
        try:
            update_response = await make_api_request(update_payload)
            return_value = update_response.get("ReturnValue", -9)
            
            if return_value >= 0:
                results["updated"] += 1
                results["details"].append({
                    "tracking": record.get("cNum"),
                    "shopify": shopify,
                    "memo": new_memo,
                    "return_value": return_value,
                    "status": "updated"
                })
            else:
                results["failed"] += 1
                results["details"].append({
                    "tracking": record.get("cNum"),
                    "error": f"ReturnValue: {return_value}"
                })
        except Exception as e:
            results["failed"] += 1
            results["details"].append({
                "tracking": record.get("cNum"),
                "error": str(e)[:50]
            })
        
        await asyncio.sleep(0.5)
    
    return {
        "success": True,
        "message": f"Updated {results['updated']} records",
        **results
    }


@router.post("/bulk-update-1688-remarks")
async def bulk_update_1688_remarks():
    """
    Update all DWZ records to add 1688 order numbers to the remarks field.
    Extracts 1688 order ID from cRNo field and adds it to cMemo.
    """
    import asyncio
    
    # First, get all records using correct API params (iPage, iPagePer)
    payload = build_request_payload("PreInputList", {
        "iPage": 1,
        "iPagePer": 100,
        "cqStateMask": "11",  # All statuses
    })
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                DWZ56_API_URL,
                json=payload,
                headers={"Content-Type": "application/json; charset=utf-8"}
            )
            data = response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch records: {str(e)}")
    
    records = data.get("RecList", [])
    
    if not records:
        return {
            "success": True,
            "message": "No records found or API returned empty",
            "total_records": data.get("iTotalRec", 0),
            "raw_response": data,
        }
    
    updated = 0
    skipped = 0
    errors = []
    update_details = []
    
    for record in records:
        iID = record.get("iID")
        cRNo = record.get("cRNo", "") or ""
        current_memo = record.get("cMemo", "") or ""
        cNum = record.get("cNum", "")
        
        # Skip cancelled records
        if current_memo == "CANCELLED":
            skipped += 1
            continue
        
        # Extract 1688 order ID
        alibaba_order_id = ""
        if cRNo.startswith("1688:"):
            alibaba_order_id = cRNo.replace("1688:", "")
        
        if not alibaba_order_id:
            skipped += 1
            continue
        
        # Skip if already has this 1688 number
        if alibaba_order_id in current_memo:
            skipped += 1
            continue
        
        # Build new memo
        new_memo = f"1688: {alibaba_order_id}"
        
        # Update record
        update_payload = build_request_payload("PreInputSet", {
            "RecList": [{"iID": iID, "cMemo": new_memo}]
        })
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                update_response = await client.post(
                    DWZ56_API_URL,
                    json=update_payload,
                    headers={"Content-Type": "application/json; charset=utf-8"}
                )
                update_data = update_response.json()
            
            if update_data.get("ReturnValue", -9) >= 0:
                updated += 1
                update_details.append({"cNum": cNum, "new_memo": new_memo})
            else:
                errors.append({"iID": iID, "cNum": cNum, "error": f"ReturnValue: {update_data.get('ReturnValue')}"})
        except Exception as e:
            errors.append({"iID": iID, "cNum": cNum, "error": str(e)})
        
        # Small delay to avoid rate limiting
        await asyncio.sleep(0.3)
    
    return {
        "success": True,
        "total_records": len(records),
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
        "update_details": update_details[:10],  # First 10 for brevity
    }


@router.post("/place-order-from-1688")
async def place_dwz_order_from_alibaba(request: PlaceDWZFromAlibabaRequest):
    """
    Place a DWZ shipping order directly from a 1688 purchase order.
    
    This endpoint:
    1. Fetches the 1688 order details
    2. Gets shipping address from the linked Shopify order
    3. Generates a TNV tracking number
    4. Creates the DWZ shipment
    5. Updates the 1688 order with tracking info
    """
    db = get_db()
    
    # 1. Find the 1688 purchase order (collection: purchase_orders_1688)
    alibaba_order = await db.purchase_orders_1688.find_one(
        {"alibaba_order_id": request.alibaba_order_id}
    )
    
    if not alibaba_order:
        raise HTTPException(status_code=404, detail=f"1688 order {request.alibaba_order_id} not found")
    
    # Check if already has DWZ tracking
    if alibaba_order.get("dwz_tracking") or alibaba_order.get("dwz_waybill"):
        existing_tracking = alibaba_order.get("dwz_tracking") or alibaba_order.get("dwz_waybill")
        return {
            "success": True,
            "message": "Order already has DWZ tracking",
            "dwz_tracking": existing_tracking,
            "already_placed": True
        }
    
    # 2. Get shipping address from linked Shopify order
    shopify_order_number = alibaba_order.get("shopify_order_number") or alibaba_order.get("shopify_order_id")
    shipping_address = alibaba_order.get("shipping_address") or {}
    
    # If no shipping address in alibaba_order, try to fetch from orders collections
    if not shipping_address or not shipping_address.get("address1"):
        if shopify_order_number:
            # Try shopify_orders collection first
            shopify_order = await db.shopify_orders.find_one(
                {"$or": [
                    {"order_number": str(shopify_order_number)},
                    {"order_number": int(shopify_order_number) if str(shopify_order_number).isdigit() else None},
                    {"name": f"#{shopify_order_number}"}
                ]}
            )
            if shopify_order and shopify_order.get("shipping_address"):
                shipping_address = shopify_order.get("shipping_address", {})
            
            # If still not found, try the 'orders' collection
            if not shipping_address or not shipping_address.get("address1"):
                order_num = int(shopify_order_number) if str(shopify_order_number).isdigit() else shopify_order_number
                shopify_order = await db.orders.find_one(
                    {"$or": [
                        {"order_number": order_num},
                        {"order_number": str(shopify_order_number)},
                        {"name": f"#{shopify_order_number}"}
                    ]}
                )
                if shopify_order and shopify_order.get("shipping_address"):
                    shipping_address = shopify_order.get("shipping_address", {})
    
    if not shipping_address or not shipping_address.get("address1"):
        raise HTTPException(
            status_code=400, 
            detail=f"No shipping address found. Link order to Shopify first or add shipping address."
        )
    
    # 3. Generate TNV tracking number using 1688 COLOR/SIZE data
    country = shipping_address.get("country_code") or shipping_address.get("country") or "IN"
    
    # Use 1688 data for TNV tracking number generation (color/size from 1688 order)
    alibaba_color = alibaba_order.get("color", "")  # 1688 color (e.g., "Black", "黑色")
    alibaba_size = alibaba_order.get("size", "")    # 1688 size (e.g., "42")
    
    # Get Shopify color/size for verification display
    shopify_color = alibaba_order.get("shopify_color", "") or alibaba_order.get("variant_color", "")
    shopify_size = alibaba_order.get("shopify_size", "") or alibaba_order.get("variant_size", "")
    
    # Generate TNV tracking using 1688 data
    tracking_number = await generate_tnv_tracking_number(country, alibaba_color, alibaba_size, db)
    
    # Get 1688 seller tracking number if available
    seller_tracking = alibaba_order.get("seller_tracking_number", "")
    
    # 4. Build the DWZ shipment record with correct field mappings
    # Field Mapping:
    # - cNum (Internal Tracking): TNV Reference Number (TNVIN0901Y41015)
    # - cRNo (Reference Number): 1688 Seller Tracking (YT7596493840457)
    # - cNo (AWB/Transfer): DWZ generates this
    # - cMemo (Remarks): 1688 Seller Tracking for label printing
    # - cMark (Tag/Label): Shopify Order Number
    # - cBy1: Shopify reference for linking
    # - cBy2: Shopify Color/Size for verification
    
    receiver_name = shipping_address.get("name") or shipping_address.get("first_name", "") + " " + shipping_address.get("last_name", "")
    receiver_addr = shipping_address.get("address1", "")
    if shipping_address.get("address2"):
        receiver_addr += ", " + shipping_address.get("address2")
    
    goods_desc = request.goods_description or alibaba_order.get("notes") or f"Product {alibaba_order.get('product_id', '')}"
    
    # Build cMemo with seller tracking (this prints on label)
    if seller_tracking:
        memo_value = f"1688发货单号: {seller_tracking}"
    else:
        memo_value = f"1688:{request.alibaba_order_id}"
    
    # Build verification string: Shopify Color/Size
    shopify_verification = ""
    if shopify_color or shopify_size:
        shopify_verification = f"{shopify_color}/{shopify_size}".strip("/")
    elif alibaba_color or alibaba_size:
        # Fallback to 1688 data if no Shopify data
        shopify_verification = f"{alibaba_color}/{alibaba_size}".strip("/")
    
    record = {
        "iID": 0,  # 0 = new record
        "nItemType": 1,  # Package
        "nLanguage": 2,  # Chinese (for proper character display)
        "cEmsKind": request.courier_type,
        "cDes": shipping_address.get("country_code") or country,
        "fWeight": request.weight,
        # Field Mappings:
        "cNum": tracking_number,                    # Internal Tracking: TNV number (uses 1688 color/size)
        "cRNo": f"1688:{request.alibaba_order_id}", # Reference: 1688 Order ID
        "cMemo": memo_value,                        # Remarks: 1688 Seller Tracking (prints on label!)
        "cMark": f"#{shopify_order_number}" if shopify_order_number else "",  # Tag/Label: Shopify Order
        "cBy1": f"Shopify#{shopify_order_number}" if shopify_order_number else "",  # Shopify reference
        "cBy2": shopify_verification,               # Shopify Color/Size for verification
        # Receiver info
        "cReceiver": receiver_name.strip(),
        "cRAddr": receiver_addr,
        "cRCity": shipping_address.get("city", ""),
        "cRProvince": shipping_address.get("province", ""),
        "cRCountry": shipping_address.get("country_code") or shipping_address.get("country") or country,
        "cRPostcode": shipping_address.get("zip", ""),
        "cRPhone": shipping_address.get("phone", ""),
        "cGoods": goods_desc[:100],
        "iQuantity": alibaba_order.get("quantity", 1),
        "fPrice": 0.01,
        "cOrigin": "CN",
    }
    
    # 5. Create the shipment via DWZ API
    payload = build_request_payload("PreInputSet", {"RecList": [record]})
    response = await make_api_request(payload)
    
    result = parse_return_value(response.get("ReturnValue", -9))
    
    # 6. Update the 1688 order with tracking info
    err_list = response.get("ErrList", [])
    dwz_waybill = None
    dwz_id = None
    
    if err_list and len(err_list) > 0:
        err = err_list[0]
        dwz_waybill = err.get("cNum") or err.get("cCNo") or tracking_number
        dwz_id = err.get("iID")
    
    update_data = {
        "dwz_tracking": tracking_number,
        "dwz_waybill": dwz_waybill or tracking_number,
        "dwz_order_placed": True,
        "dwz_order_placed_at": datetime.now(timezone.utc).isoformat(),
        "dwz_courier_type": request.courier_type,
        "dwz_record_id": dwz_id,
        "dwz_result": {
            "success": result["success"],
            "message": result.get("message", ""),
            "tracking_number": tracking_number,
            "record_ids": response.get("RecIDs", []),
            "raw_response": response
        }
    }
    
    await db.purchase_orders_1688.update_one(
        {"alibaba_order_id": request.alibaba_order_id},
        {"$set": update_data}
    )
    
    if not result["success"]:
        return {
            "success": False,
            "message": f"DWZ API error: {result['message']}",
            "dwz_tracking": tracking_number,
            "error_details": response
        }
    
    return {
        "success": True,
        "message": "DWZ order placed successfully",
        "dwz_tracking": tracking_number,
        "dwz_waybill": dwz_waybill,
        "dwz_record_id": dwz_id,
        "alibaba_order_id": request.alibaba_order_id,
        "shopify_order": shopify_order_number,
        "shipping_to": {
            "name": receiver_name.strip(),
            "city": shipping_address.get("city"),
            "country": shipping_address.get("country_code") or country
        }
    }


class RegenerateDWZRequest(BaseModel):
    alibaba_order_id: str
    courier_type: str = Field(default="印度专线", description="Courier type code")
    weight: float = Field(default=0.5, ge=0.01, le=50.0)
    goods_description: Optional[str] = None


@router.post("/regenerate-tracking")
async def regenerate_dwz_tracking(request: RegenerateDWZRequest):
    """
    Clear existing DWZ tracking and regenerate a new one for a 1688 order.
    Use this when the previous tracking failed or needs to be cancelled.
    """
    db = get_db()
    
    # 1. Find the 1688 purchase order
    alibaba_order = await db.purchase_orders_1688.find_one(
        {"alibaba_order_id": request.alibaba_order_id}
    )
    
    if not alibaba_order:
        raise HTTPException(status_code=404, detail=f"1688 order {request.alibaba_order_id} not found")
    
    old_tracking = alibaba_order.get("dwz_tracking") or alibaba_order.get("dwz_waybill")
    
    # 2. Get shipping address
    shopify_order_number = alibaba_order.get("shopify_order_number") or alibaba_order.get("shopify_order_id")
    shipping_address = alibaba_order.get("shipping_address", {})
    
    if not shipping_address and shopify_order_number:
        order_num = int(shopify_order_number) if str(shopify_order_number).isdigit() else shopify_order_number
        shopify_order = await db.orders.find_one(
            {"$or": [
                {"order_number": order_num},
                {"order_number": str(shopify_order_number)},
                {"name": f"#{shopify_order_number}"}
            ]}
        )
        if shopify_order:
            shipping_address = shopify_order.get("shipping_address", {})
    
    if not shipping_address:
        raise HTTPException(status_code=400, detail="No shipping address found")
    
    # 3. Generate new TNV tracking number
    country = shipping_address.get("country_code") or shipping_address.get("country") or "IN"
    color = alibaba_order.get("color", "")
    size = alibaba_order.get("size", "")
    
    new_tracking = await generate_tnv_tracking_number(country, color, size, db)
    
    # 4. Build the DWZ shipment record
    receiver_name = shipping_address.get("name") or shipping_address.get("first_name", "") + " " + shipping_address.get("last_name", "")
    receiver_addr = shipping_address.get("address1", "")
    if shipping_address.get("address2"):
        receiver_addr += ", " + shipping_address.get("address2")
    
    goods_desc = request.goods_description or alibaba_order.get("notes") or f"Product {alibaba_order.get('product_id', '')}"
    
    record = {
        "iID": 0,
        "nItemType": 1,
        "nLanguage": 1,
        "cEmsKind": request.courier_type,
        "cDes": shipping_address.get("country_code") or country,
        "fWeight": request.weight,
        "cNum": new_tracking,
        "cRNo": str(shopify_order_number) if shopify_order_number else "",
        "cReceiver": receiver_name.strip(),
        "cRAddr": receiver_addr,
        "cRCity": shipping_address.get("city", ""),
        "cRProvince": shipping_address.get("province", ""),
        "cRCountry": shipping_address.get("country_code") or shipping_address.get("country") or country,
        "cRPostcode": shipping_address.get("zip", ""),
        "cRPhone": shipping_address.get("phone", ""),
        "cGoods": goods_desc[:100],
        "iQuantity": alibaba_order.get("quantity", 1),
        "cMemo": f"1688:{request.alibaba_order_id} | Shopify:#{shopify_order_number} | Regenerated from {old_tracking}",
    }
    
    # 5. Create shipment via DWZ API
    payload = build_request_payload("PreInputSet", {"RecList": [record]})
    response = await make_api_request(payload)
    
    result = parse_return_value(response.get("ReturnValue", -9))
    
    # 6. Update the database
    err_list = response.get("ErrList", [])
    dwz_waybill = None
    dwz_id = None
    
    if err_list and len(err_list) > 0:
        err = err_list[0]
        dwz_waybill = err.get("cNum") or err.get("cCNo") or new_tracking
        dwz_id = err.get("iID")
    
    update_data = {
        "dwz_tracking": new_tracking,
        "dwz_waybill": dwz_waybill or new_tracking,
        "dwz_order_placed": True,
        "dwz_order_placed_at": datetime.now(timezone.utc).isoformat(),
        "dwz_courier_type": request.courier_type,
        "dwz_record_id": dwz_id,
        "dwz_regenerated_from": old_tracking,
        "dwz_result": {
            "success": result["success"],
            "message": result.get("message", ""),
            "tracking_number": new_tracking,
            "record_ids": response.get("RecIDs", []),
            "raw_response": response
        }
    }
    
    await db.purchase_orders_1688.update_one(
        {"alibaba_order_id": request.alibaba_order_id},
        {"$set": update_data}
    )
    
    return {
        "success": result["success"],
        "message": "Tracking regenerated" if result["success"] else f"DWZ API error: {result['message']}",
        "old_tracking": old_tracking,
        "new_tracking": new_tracking,
        "dwz_waybill": dwz_waybill,
        "dwz_record_id": dwz_id,
        "alibaba_order_id": request.alibaba_order_id,
        "shopify_order": shopify_order_number,
        "courier_type": request.courier_type,
        "api_response": response if not result["success"] else None
    }


class RecreateDWZWithTrackingRequest(BaseModel):
    """Request to delete existing DWZ order and create new one with 1688 seller tracking in cMemo"""
    dwz_record_id: int = Field(..., description="DWZ record iID to delete and recreate")
    seller_tracking_number: Optional[str] = Field(None, description="1688 seller tracking number (if not provided, will fetch from DB)")


@router.post("/recreate-with-seller-tracking")
async def recreate_dwz_with_seller_tracking(request: RecreateDWZWithTrackingRequest):
    """
    Delete an existing DWZ order and recreate it with 1688 seller tracking in cMemo.
    
    Since DWZ API doesn't allow updating cMemo after creation, this endpoint:
    1. Fetches the existing DWZ record details
    2. Gets the 1688 seller tracking number from database
    3. Deletes the old DWZ record
    4. Creates a new record with cMemo containing the seller tracking
    
    The new record will have the same tracking number (cNum) as the old one.
    """
    import asyncio
    
    db = get_db()
    
    # 1. Fetch existing DWZ record
    fetch_payload = build_request_payload("PreInputData", {"iID": request.dwz_record_id})
    existing_record = await make_api_request(fetch_payload)
    
    if existing_record.get("ReturnValue", -9) <= 0:
        raise HTTPException(status_code=404, detail=f"DWZ record {request.dwz_record_id} not found")
    
    # Check if already processed (irID > 0)
    irID = existing_record.get("irID", 0)
    if irID > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Record already processed by courier (irID={irID}). Cannot delete processed records."
        )
    
    # Extract key fields from existing record
    old_cNum = existing_record.get("cNum", "")
    old_cNo = existing_record.get("cNo", "")
    cBy1 = existing_record.get("cBy1", "") or ""
    cRNo = existing_record.get("cRNo", "") or ""
    
    # Get shopify order number from cBy1 (format: "Shopify#29206")
    shopify_order_number = ""
    if cBy1.startswith("Shopify#"):
        shopify_order_number = cBy1.replace("Shopify#", "")
    
    # Get 1688 order ID from cRNo (format: "1688:4993884181108978802")
    alibaba_order_id = ""
    if cRNo.startswith("1688:"):
        alibaba_order_id = cRNo.replace("1688:", "")
    
    # 2. Get seller tracking number
    seller_tracking = request.seller_tracking_number
    
    if not seller_tracking and shopify_order_number:
        # Fetch from database
        purchase_order = await db.purchase_orders_1688.find_one({
            "shopify_order_number": {"$in": [shopify_order_number, int(shopify_order_number) if shopify_order_number.isdigit() else shopify_order_number]}
        })
        if purchase_order:
            seller_tracking = purchase_order.get("seller_tracking_number", "")
    
    if not seller_tracking and alibaba_order_id:
        # Try by alibaba order ID
        purchase_order = await db.purchase_orders_1688.find_one({
            "alibaba_order_id": alibaba_order_id
        })
        if purchase_order:
            seller_tracking = purchase_order.get("seller_tracking_number", "")
    
    if not seller_tracking:
        raise HTTPException(
            status_code=400,
            detail="No seller tracking number found. Please provide it manually or sync from 1688 first."
        )
    
    # 3. Delete the old record
    delete_payload = build_request_payload("PreInputDel", {"iIDs": [request.dwz_record_id]})
    delete_response = await make_api_request(delete_payload)
    
    delete_result = parse_return_value(delete_response.get("ReturnValue", -9))
    if not delete_result["success"] and delete_response.get("ReturnValue", 0) < 0:
        # Check ErrList for specific error
        err_list = delete_response.get("ErrList", [])
        if err_list:
            err_msg = err_list[0].get("cMess", "Unknown error")
            raise HTTPException(status_code=400, detail=f"Failed to delete record: {err_msg}")
        raise HTTPException(status_code=400, detail=f"Failed to delete record: {delete_result.get('message', 'Unknown error')}")
    
    await asyncio.sleep(0.5)  # Small delay
    
    # 4. Create new record with seller tracking in cMemo
    # Build cMemo with seller tracking number prominently displayed
    new_memo = f"1688发货单号: {seller_tracking}"
    
    new_record = {
        "iID": 0,  # 0 = new record
        "nItemType": existing_record.get("nItemType", 1),
        "nLanguage": existing_record.get("nLanguage", 2),
        "cEmsKind": existing_record.get("cEmsKind", ""),
        "cDes": existing_record.get("cDes", ""),
        "fWeight": existing_record.get("fWeight", 0.5),
        "cNum": old_cNum,  # Keep same tracking number
        "cNo": old_cNo,
        "cRNo": cRNo,  # Keep reference
        "cReceiver": existing_record.get("cReceiver", ""),
        "cRUnit": existing_record.get("cRUnit", ""),
        "cRAddr": existing_record.get("cRAddr", ""),
        "cRCity": existing_record.get("cRCity", ""),
        "cRProvince": existing_record.get("cRProvince", ""),
        "cRCountry": existing_record.get("cRCountry", ""),
        "cRPostcode": existing_record.get("cRPostcode", ""),
        "cRPhone": existing_record.get("cRPhone", ""),
        "cGoods": existing_record.get("cGoods", ""),
        "iQuantity": existing_record.get("iQuantity", 1),
        "fPrice": existing_record.get("fPrice", 0.01),
        "cMemo": new_memo,  # THIS IS THE KEY - set at creation time!
        "cBy1": cBy1,  # Keep Shopify reference
        "cBy2": existing_record.get("cBy2", ""),  # Color/Size
        "cOrigin": existing_record.get("cOrigin", "CN"),
    }
    
    create_payload = build_request_payload("PreInputSet", {"RecList": [new_record]})
    create_response = await make_api_request(create_payload)
    
    create_result = parse_return_value(create_response.get("ReturnValue", -9))
    
    # Get new record ID
    new_record_id = None
    err_list = create_response.get("ErrList", [])
    if err_list and len(err_list) > 0:
        new_record_id = err_list[0].get("iID")
        new_cNum = err_list[0].get("cNum", old_cNum)
    else:
        new_cNum = old_cNum
    
    # 5. Verify the new record has cMemo set
    if new_record_id:
        verify_payload = build_request_payload("PreInputData", {"iID": new_record_id})
        verify_response = await make_api_request(verify_payload)
        verified_memo = verify_response.get("cMemo", "")
    else:
        verified_memo = "Could not verify - no new record ID"
    
    return {
        "success": create_result["success"],
        "message": "DWZ order recreated with seller tracking in remarks" if create_result["success"] else f"Failed: {create_result.get('message')}",
        "old_record_id": request.dwz_record_id,
        "new_record_id": new_record_id,
        "tracking_number": new_cNum,
        "seller_tracking": seller_tracking,
        "cMemo_set": new_memo,
        "cMemo_verified": verified_memo,
        "memo_persisted": verified_memo == new_memo,
        "shopify_order": shopify_order_number,
        "alibaba_order": alibaba_order_id,
        "delete_response": delete_response,
        "create_response": create_response
    }


@router.post("/bulk-recreate-with-seller-tracking")
async def bulk_recreate_dwz_with_seller_tracking(
    dry_run: bool = Query(True, description="If true, only show what would be done without making changes")
):
    """
    Bulk recreate ALL DWZ orders that have 1688 seller tracking, 
    setting cMemo with the seller tracking number at creation time.
    
    Process:
    1. Get all DWZ pre-input records
    2. Match each to 1688 orders with seller tracking
    3. Delete old record and create new one with cMemo set
    
    Only processes UNPROCESSED records (irID=0).
    """
    import asyncio
    
    db = get_db()
    
    # 1. Get all 1688 orders with seller tracking
    orders_with_tracking = await db.purchase_orders_1688.find({
        "seller_tracking_number": {"$exists": True, "$ne": None, "$ne": ""}
    }).to_list(500)
    
    # Create lookup by shopify order number
    tracking_by_shopify = {}
    for o in orders_with_tracking:
        shopify = str(o.get("shopify_order_number", ""))
        if shopify:
            tracking_by_shopify[shopify] = o.get("seller_tracking_number")
    
    # 2. Get all DWZ pre-input records (unprocessed only)
    payload = build_request_payload("PreInputList", {
        "iPage": 1,
        "iPagePer": 500,
        "cqStateMask": "10",  # Unprocessed only (irID=0)
    })
    
    response = await make_api_request(payload)
    records = response.get("RecList", [])
    
    results = {
        "total_dwz_records": len(records),
        "total_with_seller_tracking": len(tracking_by_shopify),
        "matched": 0,
        "already_has_memo": 0,
        "recreated": 0,
        "failed": 0,
        "skipped_processed": 0,
        "details": [],
        "dry_run": dry_run
    }
    
    for record in records:
        iID = record.get("iID")
        irID = record.get("irID", 0)
        cNum = record.get("cNum", "")
        current_memo = record.get("cMemo", "") or ""
        cBy1 = record.get("cBy1", "") or ""
        
        # Skip if already processed
        if irID > 0:
            results["skipped_processed"] += 1
            continue
        
        # Extract Shopify order number
        shopify_order = ""
        if cBy1.startswith("Shopify#"):
            shopify_order = cBy1.replace("Shopify#", "")
        
        # Check if we have seller tracking for this order
        seller_tracking = tracking_by_shopify.get(shopify_order)
        
        if not seller_tracking:
            continue
        
        results["matched"] += 1
        
        # Skip if already has seller tracking in memo
        if seller_tracking in current_memo:
            results["already_has_memo"] += 1
            results["details"].append({
                "iID": iID,
                "cNum": cNum,
                "shopify": shopify_order,
                "status": "skipped - already has tracking in memo",
                "current_memo": current_memo
            })
            continue
        
        if dry_run:
            results["details"].append({
                "iID": iID,
                "cNum": cNum,
                "shopify": shopify_order,
                "seller_tracking": seller_tracking,
                "status": "would recreate",
                "current_memo": current_memo,
                "new_memo": f"1688发货单号: {seller_tracking}"
            })
            continue
        
        # Actually recreate the record
        try:
            recreate_request = RecreateDWZWithTrackingRequest(
                dwz_record_id=iID,
                seller_tracking_number=seller_tracking
            )
            recreate_result = await recreate_dwz_with_seller_tracking(recreate_request)
            
            if recreate_result.get("success"):
                results["recreated"] += 1
                results["details"].append({
                    "iID": iID,
                    "new_iID": recreate_result.get("new_record_id"),
                    "cNum": cNum,
                    "shopify": shopify_order,
                    "seller_tracking": seller_tracking,
                    "status": "recreated",
                    "memo_persisted": recreate_result.get("memo_persisted")
                })
            else:
                results["failed"] += 1
                results["details"].append({
                    "iID": iID,
                    "cNum": cNum,
                    "status": "failed",
                    "error": recreate_result.get("message")
                })
        except Exception as e:
            results["failed"] += 1
            results["details"].append({
                "iID": iID,
                "cNum": cNum,
                "status": "error",
                "error": str(e)[:100]
            })
        
        await asyncio.sleep(0.5)  # Rate limiting
    
    return {
        "success": True,
        "message": f"{'Dry run complete' if dry_run else 'Bulk recreate complete'}",
        **results
    }


@router.get("/shipment/{record_id}")
async def get_shipment(record_id: int):
    """
    Get single shipment details by ID
    RequestName: PreInputData
    """
    payload = build_request_payload("PreInputData", {"iID": record_id})
    response = await make_api_request(payload)
    
    result = parse_return_value(response.get("ReturnValue", -9))
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    
    return {
        "success": True,
        "shipment": response,
    }


@router.get("/shipment-by-tracking/{tracking_number}")
async def get_shipment_by_tracking(tracking_number: str):
    """
    Get shipment details by tracking number (cNum)
    RequestName: PreInputData
    """
    payload = build_request_payload("PreInputData", {"cNum": tracking_number})
    response = await make_api_request(payload)
    
    result = parse_return_value(response.get("ReturnValue", -9))
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    
    return {
        "success": True,
        "shipment": response,
    }


@router.delete("/shipment/{record_id}")
async def delete_shipment(record_id: int):
    """
    Delete a pre-input shipment
    RequestName: PreInputDel
    """
    payload = build_request_payload("PreInputDel", {"RecList": [{"iID": record_id}]})
    response = await make_api_request(payload)
    
    result = parse_return_value(response.get("ReturnValue", -9))
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return {
        "success": True,
        "message": f"Deleted {result['count']} shipment(s)",
        "raw_response": response,
    }


@router.get("/pre-input-list")
async def list_pre_input_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    destination: Optional[str] = Query(None, description="Destination filter"),
    courier_type: Optional[str] = Query(None, description="Courier type filter"),
    tracking_number: Optional[str] = Query(None, description="Tracking number search"),
    status_mask: Optional[str] = Query("11", description="Status mask: 10=Unprocessed, 01=Processed, 11=All"),
):
    """
    List pre-input orders with filters
    RequestName: PreInputList
    """
    extra_params = {
        "iPage": page,
        "iPagePer": page_size,
    }
    
    if start_date:
        extra_params["dqBDate"] = start_date
    if end_date:
        extra_params["dqEDate"] = end_date
    if destination:
        extra_params["cqDes"] = destination
    if courier_type:
        extra_params["cqEmsKind"] = courier_type
    if tracking_number:
        extra_params["cqNum"] = tracking_number
    if status_mask:
        extra_params["cqStateMask"] = status_mask
    
    payload = build_request_payload("PreInputList", extra_params)
    response = await make_api_request(payload)
    
    records = response.get("RecList", [])
    return {
        "success": True,
        "page": page,
        "page_size": page_size,
        "total_records": response.get("iTotalRec", 0),
        "records_count": len(records),
        "filters": {
            "start_date": start_date,
            "end_date": end_date,
            "destination": destination,
            "courier_type": courier_type,
            "status_mask": status_mask,
        },
        "records": records,
    }


@router.delete("/pre-input/batch")
async def batch_delete_pre_input(record_ids: List[int] = Query(..., description="List of record IDs to delete")):
    """
    Delete multiple pre-input records at once
    """
    if not record_ids:
        raise HTTPException(status_code=400, detail="No record IDs provided")
    
    payload = build_request_payload("PreInputDel", {
        "RecList": [{"iID": rid} for rid in record_ids]
    })
    
    response = await make_api_request(payload)
    result = parse_return_value(response.get("ReturnValue", -9))
    
    return {
        "success": result["success"],
        "message": result.get("message", "Deleted"),
        "deleted_count": len(record_ids) if result["success"] else 0,
        "record_ids": record_ids,
        "api_response": response
    }


@router.delete("/pre-input/all")
async def delete_all_pre_input():
    """
    Delete ALL pre-input records
    """
    # First get all records
    list_payload = build_request_payload("PreInputList", {
        "iPage": 1,
        "iPagePer": 1000,
        "cqStateMask": "11"
    })
    
    list_response = await make_api_request(list_payload)
    records = list_response.get("RecList", [])
    
    if not records:
        return {
            "success": True,
            "message": "No records to delete",
            "deleted_count": 0
        }
    
    record_ids = [r.get("iID") for r in records if r.get("iID")]
    
    # Delete all
    delete_payload = build_request_payload("PreInputDel", {
        "RecList": [{"iID": rid} for rid in record_ids]
    })
    
    delete_response = await make_api_request(delete_payload)
    result = parse_return_value(delete_response.get("ReturnValue", -9))
    
    return {
        "success": result["success"],
        "message": f"Deleted {len(record_ids)} records" if result["success"] else result.get("message", "Failed"),
        "deleted_count": len(record_ids) if result["success"] else 0,
        "api_response": delete_response
    }


@router.post("/clear-local-tracking")
async def clear_local_tracking_data(
    order_ids: Optional[List[str]] = Query(None, description="Specific 1688 order IDs to clear. If empty, clears all."),
    confirm: bool = Query(False, description="Set to true to confirm the operation")
):
    """
    Clear DWZ tracking data from local database for 1688 purchase orders.
    
    This allows users to regenerate tracking numbers when the old ones were wrong.
    NOTE: This only clears local data - the records may still exist on the DWZ platform
    and need to be manually deleted through the DWZ web portal if needed.
    """
    if not confirm:
        raise HTTPException(
            status_code=400, 
            detail="Please set confirm=true to confirm this operation. This will clear local DWZ tracking data."
        )
    
    db = get_db()
    
    # Build query to find ALL orders with any DWZ tracking fields
    base_query = {"$or": [
        {"dwz_tracking": {"$exists": True, "$ne": None, "$ne": ""}},
        {"dwz_waybill": {"$exists": True, "$ne": None, "$ne": ""}},
        {"dwz_order_placed": True}
    ]}
    
    if order_ids:
        query = {"$and": [base_query, {"alibaba_order_id": {"$in": order_ids}}]}
    else:
        query = base_query
    
    # Get count before clearing
    count_before = await db.purchase_orders_1688.count_documents(query)
    
    if count_before == 0:
        return {
            "success": True,
            "message": "No orders with DWZ tracking found",
            "cleared_count": 0
        }
    
    # Clear the DWZ tracking fields
    result = await db.purchase_orders_1688.update_many(
        query,
        {"$unset": {
            "dwz_tracking": "",
            "dwz_waybill": "",
            "dwz_order_placed": "",
            "dwz_order_placed_at": "",
            "dwz_courier_type": "",
            "dwz_record_id": "",
            "dwz_result": "",
            "dwz_regenerated_from": ""
        }}
    )
    
    return {
        "success": True,
        "message": f"Cleared DWZ tracking data for {result.modified_count} order(s)",
        "cleared_count": result.modified_count,
        "note": "DWZ pre-input records may still exist on the DWZ platform. They need to be manually deleted through the DWZ web portal if needed."
    }


@router.post("/clear-tracking-counters")
async def clear_tracking_counters(
    confirm: bool = Query(False, description="Set to true to confirm the operation")
):
    """
    Reset the daily tracking number counters.
    
    This will reset the serial numbers (001, 002, etc.) for the TNV tracking format.
    Use this when you want tracking numbers to start from 001 again.
    """
    if not confirm:
        raise HTTPException(
            status_code=400, 
            detail="Please set confirm=true to confirm this operation."
        )
    
    db = get_db()
    
    # Delete all tracking counters
    result = await db.tracking_counters.delete_many({})
    
    return {
        "success": True,
        "message": f"Cleared {result.deleted_count} tracking counter(s)",
        "deleted_count": result.deleted_count,
        "note": "New tracking numbers will start from 001 again."
    }


@router.get("/tracking-list")
async def list_shipped_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    destination: Optional[str] = Query(None, description="Destination filter"),
    courier_type: Optional[str] = Query(None, description="Courier type filter"),
    tracking_number: Optional[str] = Query(None, description="Tracking number search (comma-separated for multiple)"),
    status_mask: Optional[str] = Query(None, description="11-char status mask for filtering states 0-10"),
    audit_status: Optional[bool] = Query(None, description="Filter by payment audit status"),
    store_name: Optional[str] = Query(None, description="Filter by Shopify store name for data isolation"),
):
    """
    List shipped records with tracking status
    RequestName: RecList
    
    Status codes (use in status_mask, position = state number):
    0: Not Sent, 1: Sent, 2: In Transit, 3: Delivered, 4: Timeout,
    5: Customs Hold, 6: Address Error, 7: Lost, 8: Returned, 9: Other Exception, 10: Destroyed
    
    Example status_mask:
    - "00010000000" = Only Delivered
    - "01111111111" = All sent items
    - "00001111111" = All exceptions
    """
    extra_params = {
        "iPage": page,
        "iPagePer": page_size,
    }
    
    if start_date:
        extra_params["dqBDate"] = start_date
    if end_date:
        extra_params["dqEDate"] = end_date
    if destination:
        extra_params["cqDes"] = destination
    if courier_type:
        extra_params["cqEmsKind"] = courier_type
    if tracking_number:
        extra_params["cqNum"] = tracking_number
    if status_mask:
        extra_params["cqStateMask"] = status_mask
    if audit_status is not None:
        extra_params["bqAudit"] = audit_status
    
    payload = build_request_payload("RecList", extra_params)
    response = await make_api_request(payload)
    
    records = response.get("RecList", [])
    
    # Get database for cross-referencing
    db = get_db()
    
    # Collect all tracking numbers and reference numbers for lookup
    tracking_nums = [rec.get("cNum") for rec in records if rec.get("cNum")]
    awb_nums = [rec.get("cNo") for rec in records if rec.get("cNo")]
    all_nums = list(set(tracking_nums + awb_nums))
    
    # Collect X-prefix tracking numbers for China import matching
    x_prefix_tracking_nums = [num for num in all_nums if num and num.upper().startswith('X')]
    
    # Extract order numbers from cRNo field (format: "XXXXX-ORDER_NUMBER")
    ref_order_nums = []
    for rec in records:
        cRNo = rec.get("cRNo", "")
        if cRNo and "-" in cRNo:
            order_part = cRNo.split("-")[-1]
            if order_part.isdigit():
                ref_order_nums.append(order_part)
                ref_order_nums.append(int(order_part))
    
    # Batch lookup Shopify orders by tracking number AND order number
    # Filter by store_name if provided for data isolation
    shopify_orders = {}
    shopify_by_order = {}
    shopify_by_x_tracking = {}  # For X-prefix matching
    
    # Build store filter - use specific store if provided, otherwise search all stores
    store_filter = {"store_name": store_name} if store_name else {"store_name": {"$in": ["tnvcollection", "tnvcollectionpk", "ashmiaa", "asmia"]}}
    
    try:
        # Lookup by tracking number with store isolation
        if all_nums:
            cursor = db.customers.find(
                {
                    "tracking_number": {"$in": all_nums},
                    **store_filter
                },
                {"_id": 0, "order_number": 1, "tracking_number": 1, "store_name": 1, "first_name": 1, "last_name": 1, "total_spent": 1}
            )
            async for order in cursor:
                tracking = order.get("tracking_number")
                if tracking:
                    shopify_orders[tracking] = {
                        "order_number": order.get("order_number"),
                        "store_name": order.get("store_name"),
                        "customer_name": f"{order.get('first_name', '')} {order.get('last_name', '')}".strip(),
                        "total_spent": order.get("total_spent")
                    }
        
        # Lookup by order number from reference field with store isolation
        if ref_order_nums:
            cursor = db.customers.find(
                {
                    "order_number": {"$in": ref_order_nums},
                    **store_filter
                },
                {"_id": 0, "order_number": 1, "store_name": 1, "first_name": 1, "last_name": 1, "total_spent": 1}
            )
            async for order in cursor:
                order_num = str(order.get("order_number"))
                shopify_by_order[order_num] = {
                    "order_number": order.get("order_number"),
                    "store_name": order.get("store_name"),
                    "customer_name": f"{order.get('first_name', '')} {order.get('last_name', '')}".strip(),
                    "total_spent": order.get("total_spent")
                }
        
        # NEW: Lookup X-prefix tracking numbers from Shopify fulfillments (China imports)
        # Match DWZ56 X-prefix tracking to Shopify orders with same X-prefix tracking
        if x_prefix_tracking_nums:
            cursor = db.customers.find(
                {
                    "tracking_number": {"$regex": "^X", "$options": "i"},
                    **store_filter
                },
                {"_id": 0, "order_number": 1, "tracking_number": 1, "store_name": 1, "first_name": 1, "last_name": 1, "total_spent": 1}
            )
            async for order in cursor:
                tracking = order.get("tracking_number")
                if tracking:
                    # Store by uppercase tracking number for case-insensitive matching
                    shopify_by_x_tracking[tracking.upper()] = {
                        "order_number": order.get("order_number"),
                        "store_name": order.get("store_name"),
                        "customer_name": f"{order.get('first_name', '')} {order.get('last_name', '')}".strip(),
                        "total_spent": order.get("total_spent")
                    }
    except Exception as e:
        print(f"Error looking up Shopify orders: {e}")
    
    # Enrich records with status labels and Shopify order info
    enriched_records = []
    for rec in records:
        state = rec.get("nState", 0)
        status_info = TRACKING_STATUS.get(state, TRACKING_STATUS[0])
        
        # Look up Shopify order by:
        # 1. Tracking number match
        # 2. AWB number match
        # 3. Reference number (cRNo) containing order number
        # 4. X-prefix tracking number match (China imports)
        shopify_info = shopify_orders.get(rec.get("cNum")) or shopify_orders.get(rec.get("cNo"))
        
        # If not found by tracking, try reference number
        if not shopify_info:
            cRNo = rec.get("cRNo", "")
            if cRNo and "-" in cRNo:
                order_part = cRNo.split("-")[-1]
                shopify_info = shopify_by_order.get(order_part)
        
        # NEW: If still not found and tracking starts with X, try X-prefix matching
        if not shopify_info:
            cNum = rec.get("cNum", "")
            cNo = rec.get("cNo", "")
            # Check if tracking number is an X-prefix (China import)
            if cNum and cNum.upper().startswith('X'):
                shopify_info = shopify_by_x_tracking.get(cNum.upper())
            elif cNo and cNo.upper().startswith('X'):
                shopify_info = shopify_by_x_tracking.get(cNo.upper())
        
        shopify_info = shopify_info or {}
        
        enriched_rec = {
            **rec,
            "status_code": status_info["code"],
            "status_label": status_info["label"],
            "status_label_en": status_info["label_en"],
            "shopify_order_number": shopify_info.get("order_number"),
            "shopify_store": shopify_info.get("store_name"),
            "shopify_customer": shopify_info.get("customer_name"),
        }
        enriched_records.append(enriched_rec)
    
    return {
        "success": True,
        "page": page,
        "page_size": page_size,
        "total_records": response.get("iTotalRec", 0),
        "records_count": len(records),
        "status_reference": TRACKING_STATUS,
        "records": enriched_records,
    }


@router.get("/import-stats")
async def get_import_stats(
    store_name: Optional[str] = Query(None, description="Filter by Shopify store name for data isolation"),
):
    """
    Get import statistics including total sale value by store.
    China imports are identified by tracking numbers starting with 'X'.
    """
    db = get_db()
    
    try:
        # Build query for China imports (X-prefix tracking numbers)
        # Filter by specific store for data isolation
        query = {
            "tracking_number": {"$regex": "^X", "$options": "i"}
        }
        
        # Apply store filter for data isolation
        if store_name:
            query["store_name"] = store_name
        else:
            query["store_name"] = {"$in": ["tnvcollection", "tnvcollectionpk", "ashmiaa", "asmia"]}
        
        # Get import statistics by store
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": "$store_name",
                "total_orders": {"$sum": 1},
                "total_sale_value": {"$sum": {"$toDouble": {"$ifNull": ["$total_spent", 0]}}},
                "total_cod": {"$sum": {"$toDouble": {"$ifNull": ["$cod_amount", 0]}}},
            }},
            {"$sort": {"total_sale_value": -1}}
        ]
        
        store_stats = await db.customers.aggregate(pipeline).to_list(100)
        
        # Calculate totals
        total_orders = sum(s["total_orders"] for s in store_stats)
        total_sale_value = sum(s["total_sale_value"] for s in store_stats)
        total_cod = sum(s["total_cod"] for s in store_stats)
        
        # Get unique stores for filter dropdown
        stores = [s["_id"] for s in store_stats if s["_id"]]
        
        # Also get DWZ56 record count for reference
        dwz56_count = 0
        try:
            payload = build_request_payload("RecList", {"iPage": 1, "iPagePer": 1})
            response = await make_api_request(payload)
            dwz56_count = response.get("iTotalRec", 0)
        except:
            pass
        
        return {
            "success": True,
            "total_dwz56_records": dwz56_count,
            "matched_orders": total_orders,
            "total_sale_value": total_sale_value,
            "total_cod_value": total_cod,
            "stores": stores,
            "by_store": [
                {
                    "store": s["_id"],
                    "orders": s["total_orders"],
                    "sale_value": s["total_sale_value"],
                    "cod_value": s["total_cod"],
                }
                for s in store_stats
            ]
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "total_dwz56_records": 0,
            "matched_orders": 0,
            "total_sale_value": 0,
            "stores": [],
            "by_store": []
        }


@router.get("/generate-awb")
async def generate_awb_number(
    courier_type: str = Query(..., description="Courier type code"),
    number_type: int = Query(0, description="0=Transfer/AWB number, 1=Internal number"),
):
    """
    Generate AWB/tracking number
    RequestName: DoGetNo
    """
    payload = build_request_payload("DoGetNo", {
        "cEmsKind": courier_type,
        "iType": number_type,
    })
    response = await make_api_request(payload)
    
    result = parse_return_value(response.get("ReturnValue", -9))
    
    if response.get("ReturnValue") == 0:
        raise HTTPException(status_code=400, detail="No AWB numbers available or not configured for this courier")
    
    if response.get("ReturnValue") == -14:
        raise HTTPException(status_code=400, detail="Courier type not provided")
    
    if response.get("ReturnValue") == -15:
        raise HTTPException(status_code=400, detail="AWB generation not defined for this courier type")
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return {
        "success": True,
        "awb_number": response.get("cNo"),
        "courier_type": courier_type,
        "number_type": "AWB" if number_type == 0 else "Internal",
    }


@router.get("/payment-records")
async def list_payment_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    currency: Optional[str] = Query(None, description="Currency code (e.g., CNY, USD)"),
    type_mask: Optional[str] = Query(None, description="Type mask: 10=Settlement, 01=Clearing, 11=All"),
    payment_method_mask: Optional[str] = Query(None, description="5-char mask: Cash/Transfer/Online/Offset/Other"),
):
    """
    List payment/fee records
    RequestName: FeeList
    """
    extra_params = {
        "iPage": page,
        "iPagePer": page_size,
    }
    
    if start_date:
        extra_params["dqBDate"] = start_date
    if end_date:
        extra_params["dqEDate"] = end_date
    if currency:
        extra_params["cqMoney"] = currency
    if type_mask:
        extra_params["cqTypeMask"] = type_mask
    if payment_method_mask:
        extra_params["cqPayWayMask"] = payment_method_mask
    
    payload = build_request_payload("FeeList", extra_params)
    response = await make_api_request(payload)
    
    records = response.get("RecList", [])
    return {
        "success": True,
        "page": page,
        "page_size": page_size,
        "total_records": response.get("iTotalRec", 0),
        "records_count": len(records),
        "records": records,
    }


@router.get("/inventory")
async def list_inventory(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000),
    name_search: Optional[str] = Query(None, description="Search by product name"),
    scan_code: Optional[str] = Query(None, description="Search by scan code (comma-separated for multiple)"),
    tag: Optional[str] = Query(None, description="Search by tag/mark"),
):
    """
    List warehouse inventory
    RequestName: VstGoodsList
    """
    extra_params = {
        "iPage": page,
        "iPagePer": page_size,
    }
    
    if name_search:
        extra_params["cqName"] = name_search
    if scan_code:
        extra_params["cqScanCode"] = scan_code
    if tag:
        extra_params["cqMark"] = tag
    
    payload = build_request_payload("VstGoodsList", extra_params)
    response = await make_api_request(payload)
    
    records = response.get("RecList", [])
    return {
        "success": True,
        "page": page,
        "page_size": page_size,
        "total_records": response.get("iTotalRec", 0),
        "records_count": len(records),
        "inventory": [
            {
                "id": item.get("iID"),
                "name": item.get("cName"),
                "name_en": item.get("cNameE"),
                "scan_code": item.get("cScanCode"),
                "product_code": item.get("cGCode"),
                "unit": item.get("cUnit"),
                "weight_kg": item.get("fWeight"),
                "dimensions": item.get("cLwh"),
                "color": item.get("cColor"),
                "size": item.get("cSize"),
                "brand": item.get("cBrand"),
                "model": item.get("cModel"),
                "warehouse": item.get("cStore"),
                "shelf": item.get("cShelf"),
                "total_in": item.get("iIn"),
                "total_out": item.get("iOut"),
                "pending_pack": item.get("iBag"),
                "current_stock": item.get("iQuantity"),
                "min_stock": item.get("iMin"),
                "max_stock": item.get("iMax"),
                "tag": item.get("cMark"),
                "remarks": item.get("cMemo"),
            }
            for item in records
        ],
    }


@router.get("/tracking-status-summary")
async def get_tracking_status_summary(
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
):
    """
    Get summary of shipments by tracking status
    """
    summary = {}
    
    for state_code, state_info in TRACKING_STATUS.items():
        # Create status mask with only this state enabled
        mask = ["0"] * 11
        mask[state_code] = "1"
        status_mask = "".join(mask)
        
        extra_params = {
            "iPage": 1,
            "iPagePer": 0,  # Only get count
            "cqStateMask": status_mask,
        }
        
        if start_date:
            extra_params["dqBDate"] = start_date
        if end_date:
            extra_params["dqEDate"] = end_date
        
        payload = build_request_payload("RecList", extra_params)
        
        try:
            response = await make_api_request(payload)
            count = response.get("iTotalRec", 0)
        except:
            count = 0
        
        summary[state_info["code"]] = {
            "state_code": state_code,
            "label": state_info["label"],
            "label_en": state_info["label_en"],
            "count": count,
        }
    
    return {
        "success": True,
        "date_range": {
            "start": start_date,
            "end": end_date,
        },
        "summary": summary,
        "total": sum(s["count"] for s in summary.values()),
    }



# ===========================
# PURCHASE ACCOUNT ENDPOINTS
# ===========================
# Account: Sunny (ID: 1051)
# For reconciling purchases

@router.get("/purchase/client-info")
async def get_purchase_client_info():
    """Get purchase account information and balance"""
    payload = build_request_payload("ClientInfo", account="purchase")
    
    try:
        data = await make_api_request(payload)
        
        if data.get("nRet", 0) < 0:
            error_code = data.get("nRet")
            error_msg = ERROR_CODES.get(error_code, f"Unknown error: {error_code}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        return {
            "success": True,
            "account_name": data.get("cUnitName", "Sunny (Purchase)"),
            "client_id": DWZ56_PURCHASE_CLIENT_ID,
            "client_name": data.get("cUnitNameE", ""),
            "balance": data.get("fBalance", 0) or data.get("fABalance", 0),
            "credit_limit": data.get("fCredit", 0),
            "address": data.get("cAddr", "") or data.get("cAddrE", ""),
            "contact": data.get("cWebAccount", ""),
            "phone": data.get("cPhone", ""),
            "email": data.get("cEMail", ""),
            "raw_response": data,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/purchase/courier-types")
async def get_purchase_courier_types():
    """Get available courier types for purchase account"""
    payload = build_request_payload("EmsKindList", account="purchase")
    
    try:
        data = await make_api_request(payload)
        
        courier_list = data.get("EmsKindList", [])
        formatted_list = []
        
        for courier in courier_list:
            formatted_list.append({
                "code": courier.get("cCode", ""),
                "name": courier.get("cName", ""),
                "display_name": f"{courier.get('cCode', '')} - {courier.get('cName', '')}",
            })
        
        return {
            "success": True,
            "account": "purchase",
            "total": len(formatted_list),
            "courier_types": formatted_list,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/purchase/tracking-list")
async def get_purchase_tracking_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    start_date: str = None,
    end_date: str = None,
    tracking_number: str = None,
    status_mask: str = None,
    courier_type: str = None,
    store_name: Optional[str] = Query(None, description="Filter by Shopify store name for data isolation"),
):
    """Get tracking records from purchase account (for reconciliation)"""
    extra_params = {
        "iPage": page,
        "iPagePer": page_size,
    }
    
    if start_date:
        extra_params["dDateA"] = start_date
    if end_date:
        extra_params["dDateB"] = end_date
    if tracking_number:
        extra_params["cNum"] = tracking_number
    if status_mask:
        extra_params["cMask"] = status_mask
    if courier_type:
        extra_params["cKind"] = courier_type
    
    payload = build_request_payload("RecList", extra_params, account="purchase")
    
    try:
        data = await make_api_request(payload)
        
        if data.get("nRet", 0) < 0:
            error_code = data.get("nRet")
            error_msg = ERROR_CODES.get(error_code, f"Unknown error: {error_code}")
            if error_code == -999:
                raise HTTPException(status_code=429, detail=error_msg)
            raise HTTPException(status_code=400, detail=error_msg)
        
        records = data.get("RecList", [])
        db = get_db()
        
        # Collect tracking numbers for Shopify lookup
        tracking_nums = [rec.get("cNum") for rec in records if rec.get("cNum")]
        awb_nums = [rec.get("cNo") for rec in records if rec.get("cNo")]
        all_nums = list(set(tracking_nums + awb_nums))
        
        # Extract order numbers from cRNo field
        ref_order_nums = []
        for rec in records:
            cRNo = rec.get("cRNo", "")
            if cRNo and "-" in cRNo:
                order_part = cRNo.split("-")[-1]
                if order_part.isdigit():
                    ref_order_nums.append(order_part)
                    ref_order_nums.append(int(order_part))
        
        # Lookup Shopify orders with store isolation
        shopify_orders = {}
        shopify_by_order = {}
        shopify_by_x_tracking = {}
        
        # Build store filter for data isolation
        purchase_store_filter = {"store_name": store_name} if store_name else {"store_name": {"$in": ["tnvcollection", "tnvcollectionpk", "ashmiaa", "asmia"]}}
        
        try:
            if all_nums:
                cursor = db.customers.find(
                    {"tracking_number": {"$in": all_nums}, **purchase_store_filter},
                    {"_id": 0, "order_number": 1, "tracking_number": 1, "store_name": 1, "first_name": 1, "last_name": 1, "total_spent": 1}
                )
                async for order in cursor:
                    tracking = order.get("tracking_number")
                    if tracking:
                        shopify_orders[tracking] = {
                            "order_number": order.get("order_number"),
                            "store_name": order.get("store_name"),
                            "customer_name": f"{order.get('first_name', '')} {order.get('last_name', '')}".strip(),
                            "total_spent": order.get("total_spent")
                        }
            
            if ref_order_nums:
                cursor = db.customers.find(
                    {"order_number": {"$in": ref_order_nums}, **purchase_store_filter},
                    {"_id": 0, "order_number": 1, "store_name": 1, "first_name": 1, "last_name": 1, "total_spent": 1}
                )
                async for order in cursor:
                    order_num = str(order.get("order_number"))
                    shopify_by_order[order_num] = {
                        "order_number": order.get("order_number"),
                        "store_name": order.get("store_name"),
                        "customer_name": f"{order.get('first_name', '')} {order.get('last_name', '')}".strip(),
                        "total_spent": order.get("total_spent")
                    }
            
            # X-prefix matching with store isolation
            x_prefix_nums = [num for num in all_nums if num and num.upper().startswith('X')]
            if x_prefix_nums:
                cursor = db.customers.find(
                    {"tracking_number": {"$regex": "^X", "$options": "i"}, **purchase_store_filter},
                    {"_id": 0, "order_number": 1, "tracking_number": 1, "store_name": 1, "first_name": 1, "last_name": 1, "total_spent": 1}
                )
                async for order in cursor:
                    tracking = order.get("tracking_number")
                    if tracking:
                        shopify_by_x_tracking[tracking.upper()] = {
                            "order_number": order.get("order_number"),
                            "store_name": order.get("store_name"),
                            "customer_name": f"{order.get('first_name', '')} {order.get('last_name', '')}".strip(),
                            "total_spent": order.get("total_spent")
                        }
        except Exception as e:
            print(f"Error looking up Shopify orders: {e}")
        
        # Enrich records
        enriched_records = []
        for rec in records:
            state = rec.get("nState", 0)
            status_info = TRACKING_STATUS.get(state, TRACKING_STATUS[0])
            
            # Look up Shopify order
            shopify_info = shopify_orders.get(rec.get("cNum")) or shopify_orders.get(rec.get("cNo"))
            
            if not shopify_info:
                cRNo = rec.get("cRNo", "")
                if cRNo and "-" in cRNo:
                    order_part = cRNo.split("-")[-1]
                    shopify_info = shopify_by_order.get(order_part)
            
            if not shopify_info:
                cNum = rec.get("cNum", "")
                cNo = rec.get("cNo", "")
                if cNum and cNum.upper().startswith('X'):
                    shopify_info = shopify_by_x_tracking.get(cNum.upper())
                elif cNo and cNo.upper().startswith('X'):
                    shopify_info = shopify_by_x_tracking.get(cNo.upper())
            
            shopify_info = shopify_info or {}
            
            enriched_records.append({
                **rec,
                "status_code": status_info["code"],
                "status_label": status_info["label"],
                "status_label_en": status_info["label_en"],
                "shopify_order_number": shopify_info.get("order_number"),
                "shopify_store": shopify_info.get("store_name"),
                "shopify_customer": shopify_info.get("customer_name"),
                "shopify_value": shopify_info.get("total_spent"),
            })
        
        return {
            "success": True,
            "account": "purchase",
            "page": page,
            "page_size": page_size,
            "total_records": data.get("nRecCount", len(records)),
            "records_count": len(enriched_records),
            "records": enriched_records,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/purchase/import-stats")
async def get_purchase_import_stats(
    store_name: Optional[str] = Query(None, description="Filter by Shopify store name for data isolation"),
):
    """Get purchase account import statistics with store-wise breakdown"""
    db = get_db()
    
    try:
        # Build store filter for data isolation
        import_store_filter = {"store_name": store_name} if store_name else {"store_name": {"$in": ["tnvcollection", "tnvcollectionpk", "ashmiaa", "asmia"]}}
        
        # Get all X-prefix tracking orders from Shopify with store isolation
        cursor = db.customers.find(
            {
                "tracking_number": {"$regex": "^X", "$options": "i"},
                **import_store_filter
            },
            {"_id": 0, "order_number": 1, "tracking_number": 1, "store_name": 1, "total_spent": 1, "total_price": 1}
        )
        
        orders_by_store = {}
        total_orders = 0
        total_value = 0
        
        async for order in cursor:
            store = order.get("store_name", "unknown")
            if store not in orders_by_store:
                orders_by_store[store] = {"count": 0, "value": 0, "cod_value": 0}
            
            orders_by_store[store]["count"] += 1
            value = order.get("total_spent") or order.get("total_price") or 0
            orders_by_store[store]["value"] += float(value) if value else 0
            
            total_orders += 1
            total_value += float(value) if value else 0
        
        # Get DWZ56 purchase account record count
        payload = build_request_payload("RecList", {"iPage": 1, "iPagePer": 1}, account="purchase")
        try:
            data = await make_api_request(payload)
            dwz_total = data.get("nRecCount", 0)
        except:
            dwz_total = 0
        
        by_store = [
            {
                "store": store,
                "orders": stats["count"],
                "sale_value": stats["value"],
                "cod_value": stats["cod_value"]
            }
            for store, stats in sorted(orders_by_store.items(), key=lambda x: x[1]["value"], reverse=True)
        ]
        
        return {
            "success": True,
            "account": "purchase",
            "matched_orders": total_orders,
            "total_sale_value": total_value,
            "total_dwz56_records": dwz_total,
            "stores": list(orders_by_store.keys()),
            "by_store": by_store,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/purchase/fee-list")
async def get_purchase_fee_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    start_date: str = None,
    end_date: str = None,
):
    """Get payment/fee records from purchase account for reconciliation"""
    extra_params = {
        "iPage": page,
        "iPagePer": page_size,
    }
    
    if start_date:
        extra_params["dDateA"] = start_date
    if end_date:
        extra_params["dDateB"] = end_date
    
    payload = build_request_payload("FeeList", extra_params, account="purchase")
    
    try:
        data = await make_api_request(payload)
        
        if data.get("nRet", 0) < 0:
            error_code = data.get("nRet")
            error_msg = ERROR_CODES.get(error_code, f"Unknown error: {error_code}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        fee_list = data.get("FeeList", [])
        
        # Calculate totals
        total_amount = sum(float(f.get("fMoney", 0)) for f in fee_list)
        
        return {
            "success": True,
            "account": "purchase",
            "page": page,
            "page_size": page_size,
            "total_records": data.get("nRecCount", len(fee_list)),
            "records_count": len(fee_list),
            "total_amount": total_amount,
            "records": fee_list,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DWZ56 Scheduler Management ====================

@router.get("/scheduler/status")
async def get_scheduler_status():
    """
    Get current status of the DWZ56 auto-sync scheduler.
    Shows running status and next scheduled job times.
    """
    try:
        from services.dwz56_scheduler import get_scheduler_status
        return {
            "success": True,
            **get_scheduler_status()
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "running": False,
            "jobs": []
        }


@router.post("/scheduler/start")
async def start_scheduler():
    """Start the DWZ56 scheduler if not already running."""
    try:
        from services.dwz56_scheduler import start_scheduler
        start_scheduler()
        return {
            "success": True,
            "message": "Scheduler started"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.post("/scheduler/stop")
async def stop_scheduler():
    """Stop the DWZ56 scheduler."""
    try:
        from services.dwz56_scheduler import stop_scheduler
        stop_scheduler()
        return {
            "success": True,
            "message": "Scheduler stopped"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.post("/scheduler/run/{job_id}")
async def run_scheduler_job_now(job_id: str):
    """
    Manually trigger a scheduler job to run immediately.
    
    job_id options:
    - auto_sync_dwz56: Sync shipped 1688 orders to DWZ56
    - track_dwz56_arrivals: Track package arrival status
    """
    try:
        from services.dwz56_scheduler import run_job_now
        result = await run_job_now(job_id)
        return result
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/scheduler/logs")
async def get_scheduler_logs(
    job: Optional[str] = Query(None, description="Filter by job name"),
    limit: int = Query(50, ge=1, le=500),
):
    """Get recent scheduler job logs."""
    db = get_db()
    
    query = {}
    if job:
        query["job"] = job
    
    logs = await db.scheduler_logs.find(
        query,
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "logs": logs,
        "count": len(logs)
    }


# ==================== Package Tracking Status ====================

@router.get("/tracking/pending")
async def get_pending_tracking(
    store_name: Optional[str] = Query(None, description="Filter by store"),
    limit: int = Query(100, ge=1, le=500),
):
    """
    Get list of packages with DWZ56 waybill that are still in transit.
    These are packages that haven't been delivered yet.
    """
    db = get_db()
    
    query = {
        "dwz_waybill": {"$exists": True, "$ne": None, "$ne": ""},
        "$or": [
            {"dwz_status": {"$exists": False}},
            {"dwz_status": {"$nin": ["DELIVERED", "RETURNED", "DESTROYED"]}},
        ]
    }
    
    if store_name:
        query["store_name"] = store_name
    
    shipments = await db.fulfillment_pipeline.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "count": len(shipments),
        "shipments": shipments
    }


@router.get("/tracking/arrived")
async def get_arrived_at_warehouse(
    store_name: Optional[str] = Query(None, description="Filter by store"),
    limit: int = Query(100, ge=1, le=500),
):
    """
    Get list of packages that have arrived at DWZ56 warehouse.
    These are packages with status IN_TRANSIT (state 2).
    """
    db = get_db()
    
    query = {
        "dwz_arrived_at_warehouse": True,
        "dwz_delivered": {"$ne": True}
    }
    
    if store_name:
        query["store_name"] = store_name
    
    shipments = await db.fulfillment_pipeline.find(
        query,
        {"_id": 0}
    ).sort("dwz_arrived_date", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "count": len(shipments),
        "shipments": shipments
    }


@router.get("/tracking/delivered")
async def get_delivered_packages(
    store_name: Optional[str] = Query(None, description="Filter by store"),
    limit: int = Query(100, ge=1, le=500),
):
    """
    Get list of packages that have been delivered.
    These are packages with status DELIVERED (state 3).
    """
    db = get_db()
    
    query = {
        "dwz_delivered": True
    }
    
    if store_name:
        query["store_name"] = store_name
    
    shipments = await db.fulfillment_pipeline.find(
        query,
        {"_id": 0}
    ).sort("dwz_delivered_date", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "count": len(shipments),
        "shipments": shipments
    }


@router.get("/tracking/summary")
async def get_tracking_summary(
    store_name: Optional[str] = Query(None, description="Filter by store"),
):
    """
    Get summary statistics of package tracking status.
    """
    db = get_db()
    
    base_query = {"dwz_waybill": {"$exists": True, "$ne": None, "$ne": ""}}
    if store_name:
        base_query["store_name"] = store_name
    
    # Count by status
    total = await db.fulfillment_pipeline.count_documents(base_query)
    
    pending = await db.fulfillment_pipeline.count_documents({
        **base_query,
        "$or": [
            {"dwz_status": {"$exists": False}},
            {"dwz_status": "NOT_SENT"},
        ]
    })
    
    in_transit = await db.fulfillment_pipeline.count_documents({
        **base_query,
        "dwz_status": {"$in": ["SENT", "IN_TRANSIT"]}
    })
    
    arrived_at_warehouse = await db.fulfillment_pipeline.count_documents({
        **base_query,
        "dwz_arrived_at_warehouse": True,
        "dwz_delivered": {"$ne": True}
    })
    
    delivered = await db.fulfillment_pipeline.count_documents({
        **base_query,
        "dwz_delivered": True
    })
    
    exceptions = await db.fulfillment_pipeline.count_documents({
        **base_query,
        "dwz_status": {"$in": ["TIMEOUT", "CUSTOMS_HOLD", "ADDRESS_ERROR", "LOST", "RETURNED", "OTHER_EXCEPTION"]}
    })
    
    return {
        "success": True,
        "store": store_name or "all",
        "summary": {
            "total": total,
            "pending": pending,
            "in_transit": in_transit,
            "arrived_at_warehouse": arrived_at_warehouse,
            "delivered": delivered,
            "exceptions": exceptions
        }
    }


@router.post("/tracking/refresh/{waybill}")
async def refresh_single_tracking(waybill: str):
    """
    Manually refresh tracking status for a single waybill.
    """
    db = get_db()
    
    # Query DWZ56 for this specific waybill
    payload = build_request_payload("RecList", {
        "cqNum": waybill,
        "iPage": 1,
        "iPagePer": 10,
    })
    
    response = await make_api_request(payload)
    
    if "error" in response:
        return {
            "success": False,
            "error": response["error"]
        }
    
    records = response.get("RecList", [])
    
    if not records:
        return {
            "success": False,
            "error": "Waybill not found in DWZ56"
        }
    
    rec = records[0]
    state = rec.get("nState", 0)
    status_info = TRACKING_STATUS.get(state, {"code": "UNKNOWN", "label_en": "Unknown"})
    
    tracking_update = {
        "dwz_status": status_info["code"],
        "dwz_status_label": status_info["label_en"],
        "dwz_last_update": datetime.now(timezone.utc).isoformat(),
        "dwz_tracking_info": {
            "state": state,
            "awb_number": rec.get("cNo"),
            "destination": rec.get("cDes"),
            "weight": rec.get("fWeight"),
            "receiver": rec.get("cReceiver"),
            "receiver_city": rec.get("cRCity"),
            "receiver_country": rec.get("cRCountry"),
            "sent_date": rec.get("dSend"),
            "delivered_date": rec.get("dReceive"),
        }
    }
    
    # Check if arrived at warehouse
    if state == 2:
        tracking_update["dwz_arrived_at_warehouse"] = True
        tracking_update["dwz_arrived_date"] = datetime.now(timezone.utc).isoformat()
    
    # Check if delivered
    if state == 3:
        tracking_update["dwz_delivered"] = True
        tracking_update["dwz_delivered_date"] = rec.get("dReceive") or datetime.now(timezone.utc).isoformat()
    
    # Update database
    result = await db.fulfillment_pipeline.update_one(
        {"dwz_waybill": waybill},
        {"$set": tracking_update}
    )
    
    return {
        "success": True,
        "waybill": waybill,
        "status": status_info["code"],
        "status_label": status_info["label_en"],
        "updated": result.modified_count > 0,
        "tracking_info": tracking_update["dwz_tracking_info"]
    }

