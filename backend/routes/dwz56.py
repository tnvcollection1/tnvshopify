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
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import hashlib
import httpx
import os
import json

router = APIRouter(prefix="/api/dwz56", tags=["DWZ56 Shipping"])

# Configuration
DWZ56_API_URL = os.environ.get("DWZ56_API_URL", "https://www.dwz56.com/cgi-bin/EmsData.dll?DoApp")
DWZ56_CLIENT_ID = int(os.environ.get("DWZ56_CLIENT_ID", "1057"))
DWZ56_API_KEY = os.environ.get("DWZ56_API_KEY", "jIrM5UNuZu905q7")

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
}


def generate_timestamp() -> int:
    """Generate timestamp in milliseconds since 1970-01-01 UTC"""
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def generate_md5_signature(client_id: int, timestamp: int, api_key: str) -> str:
    """Generate MD5 signature: MD5(icID + TimeStamp + API_Key)"""
    data = f"{client_id}{timestamp}{api_key}"
    return hashlib.md5(data.encode()).hexdigest()


def build_request_payload(request_name: str, extra_params: dict = None) -> dict:
    """Build a request payload with authentication"""
    timestamp = generate_timestamp()
    md5_sig = generate_md5_signature(DWZ56_CLIENT_ID, timestamp, DWZ56_API_KEY)
    
    payload = {
        "RequestName": request_name,
        "icID": DWZ56_CLIENT_ID,
        "TimeStamp": timestamp,
        "MD5": md5_sig,
    }
    
    if extra_params:
        payload.update(extra_params)
    
    return payload


async def make_api_request(payload: dict) -> dict:
    """Make HTTP POST request to DWZ56 API"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
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
    
    # Enrich records with status labels
    enriched_records = []
    for rec in records:
        state = rec.get("nState", 0)
        status_info = TRACKING_STATUS.get(state, TRACKING_STATUS[0])
        enriched_rec = {
            **rec,
            "status_code": status_info["code"],
            "status_label": status_info["label"],
            "status_label_en": status_info["label_en"],
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
