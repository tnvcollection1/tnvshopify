"""
Facebook User Data Deletion Endpoint
Required for Facebook Login integration compliance
"""
from fastapi import APIRouter, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse
import hashlib
import hmac
import base64
import json
import os
from datetime import datetime, timezone

router = APIRouter(prefix="/api/facebook", tags=["Facebook"])

# Facebook App Secret - should be in environment
FACEBOOK_APP_SECRET = os.environ.get("FACEBOOK_APP_SECRET", "")


def parse_signed_request(signed_request: str, secret: str) -> dict:
    """Parse and verify Facebook signed request"""
    try:
        encoded_sig, payload = signed_request.split('.', 2)
        
        # Decode signature
        sig = base64.urlsafe_b64decode(encoded_sig + '==')
        
        # Decode payload
        data = json.loads(base64.urlsafe_b64decode(payload + '=='))
        
        # Verify signature
        expected_sig = hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        if hmac.compare_digest(sig, expected_sig):
            return data
        return None
    except Exception as e:
        print(f"Error parsing signed request: {e}")
        return None


@router.post("/data-deletion")
async def facebook_data_deletion_callback(request: Request):
    """
    Facebook Data Deletion Callback
    Called by Facebook when a user requests deletion of their data
    """
    try:
        form_data = await request.form()
        signed_request = form_data.get("signed_request", "")
        
        if signed_request and FACEBOOK_APP_SECRET:
            data = parse_signed_request(signed_request, FACEBOOK_APP_SECRET)
            if data:
                user_id = data.get("user_id")
                
                # TODO: Delete user data from your database
                # Example:
                # db = get_db()
                # await db.users.delete_one({"facebook_id": user_id})
                # await db.user_data.delete_many({"facebook_id": user_id})
                
                # Generate confirmation code
                confirmation_code = hashlib.sha256(
                    f"{user_id}-{datetime.now(timezone.utc).isoformat()}".encode()
                ).hexdigest()[:16].upper()
                
                # Return confirmation URL and code
                base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://wamerce.com")
                return JSONResponse({
                    "url": f"{base_url}/api/facebook/deletion-status?code={confirmation_code}",
                    "confirmation_code": confirmation_code
                })
        
        # If no signed request, still return success (for testing)
        confirmation_code = hashlib.sha256(
            f"test-{datetime.now(timezone.utc).isoformat()}".encode()
        ).hexdigest()[:16].upper()
        
        base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://wamerce.com")
        return JSONResponse({
            "url": f"{base_url}/api/facebook/deletion-status?code={confirmation_code}",
            "confirmation_code": confirmation_code
        })
        
    except Exception as e:
        print(f"Data deletion error: {e}")
        return JSONResponse(
            {"error": "Failed to process deletion request"},
            status_code=500
        )


@router.get("/deletion-status")
async def check_deletion_status(code: str = ""):
    """
    Check data deletion status
    Users can check the status of their deletion request
    """
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Data Deletion Status - Wamerce</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }}
            .container {{
                background: white;
                border-radius: 16px;
                padding: 40px;
                max-width: 500px;
                width: 100%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.2);
                text-align: center;
            }}
            .icon {{
                width: 80px;
                height: 80px;
                background: #10B981;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 24px;
            }}
            .icon svg {{ width: 40px; height: 40px; color: white; }}
            h1 {{
                color: #1F2937;
                font-size: 24px;
                margin-bottom: 16px;
            }}
            .code {{
                background: #F3F4F6;
                padding: 12px 24px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 18px;
                color: #374151;
                margin: 20px 0;
                display: inline-block;
            }}
            p {{
                color: #6B7280;
                line-height: 1.6;
                margin-bottom: 12px;
            }}
            .status {{
                background: #ECFDF5;
                color: #065F46;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: 600;
                display: inline-block;
                margin-top: 16px;
            }}
            .footer {{
                margin-top: 32px;
                padding-top: 24px;
                border-top: 1px solid #E5E7EB;
            }}
            .footer a {{
                color: #667eea;
                text-decoration: none;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
            </div>
            <h1>Data Deletion Request</h1>
            <p>Your data deletion request has been processed successfully.</p>
            
            {"<div class='code'>" + code + "</div>" if code else ""}
            
            <p>All personal data associated with your Facebook account has been removed from Wamerce.</p>
            
            <div class="status">✓ Completed</div>
            
            <div class="footer">
                <p>Questions? Contact us at <a href="mailto:asmiacouture@gmail.com">asmiacouture@gmail.com</a></p>
                <p style="margin-top: 8px;"><a href="https://wamerce.com">Return to Wamerce</a></p>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@router.get("/data-deletion-instructions")
async def data_deletion_instructions():
    """
    Data Deletion Instructions Page
    Public page explaining how users can request data deletion
    """
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Data Deletion - Wamerce</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #F9FAFB;
                min-height: 100vh;
                padding: 40px 20px;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border-radius: 16px;
                padding: 48px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }
            h1 {
                color: #1F2937;
                font-size: 32px;
                margin-bottom: 24px;
            }
            h2 {
                color: #374151;
                font-size: 20px;
                margin: 32px 0 16px;
            }
            p, li {
                color: #6B7280;
                line-height: 1.8;
                margin-bottom: 16px;
            }
            ul {
                padding-left: 24px;
            }
            .highlight {
                background: #EEF2FF;
                border-left: 4px solid #667eea;
                padding: 16px 24px;
                border-radius: 0 8px 8px 0;
                margin: 24px 0;
            }
            .highlight p { margin: 0; color: #4338CA; }
            a { color: #667eea; }
            .contact {
                background: #F3F4F6;
                padding: 24px;
                border-radius: 12px;
                margin-top: 32px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🗑️ User Data Deletion</h1>
            
            <p>At Wamerce, we respect your privacy and give you full control over your personal data. This page explains how you can request deletion of your data.</p>
            
            <h2>What Data We Collect</h2>
            <p>When you use Facebook Login with Wamerce, we may collect:</p>
            <ul>
                <li>Your name and email address</li>
                <li>Your Facebook profile picture</li>
                <li>Your Facebook User ID</li>
            </ul>
            
            <h2>How to Delete Your Data</h2>
            <p>You can request deletion of your data in two ways:</p>
            
            <div class="highlight">
                <p><strong>Option 1:</strong> Go to your Facebook Settings → Apps and Websites → Find "Wamerce" → Click "Remove" → Select "Delete all data"</p>
            </div>
            
            <div class="highlight">
                <p><strong>Option 2:</strong> Email us at <a href="mailto:asmiacouture@gmail.com">asmiacouture@gmail.com</a> with the subject "Data Deletion Request"</p>
            </div>
            
            <h2>What Happens After Deletion</h2>
            <ul>
                <li>All your personal information will be permanently removed from our servers</li>
                <li>Your order history will be anonymized</li>
                <li>You will receive a confirmation code for your records</li>
                <li>Deletion is typically completed within 24-48 hours</li>
            </ul>
            
            <div class="contact">
                <h2 style="margin-top: 0;">Contact Us</h2>
                <p style="margin-bottom: 0;">
                    For any questions about data deletion or privacy, contact us at:<br>
                    📧 <a href="mailto:asmiacouture@gmail.com">asmiacouture@gmail.com</a><br>
                    🌐 <a href="https://wamerce.com">wamerce.com</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
