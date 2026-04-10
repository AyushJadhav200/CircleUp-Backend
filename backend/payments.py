import os
import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request
from database import User, get_db
import auth
import schemas

router = APIRouter(tags=["payments"])

# Initialize Razorpay Client
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_placeholder")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "placeholder_secret")

razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

@router.post("/create-order")
async def create_razorpay_order(order: schemas.PaymentOrderCreate, current_user: User = Depends(auth.get_current_user)):
    """
    Create a Razorpay Order for a given amount.
    Returns order_id to the frontend.
    """
    # Amount must be in subunits (paise for INR)
    amount_in_paise = int(order.amount * 100)
    
    data = {
        "amount": amount_in_paise,
        "currency": order.currency,
        "receipt": f"receipt_{current_user.id}_{os.urandom(4).hex()}",
        "notes": {
            "user_id": current_user.id,
            "user_email": current_user.email
        }
    }
    
    try:
        order_res = razorpay_client.order.create(data=data)
        return {
            "order_id": order_res['id'],
            "amount": order_res['amount'],
            "currency": order_res['currency'],
            "key_id": RAZORPAY_KEY_ID
        }
    except Exception as e:
        print(f"Razorpay Order Creation Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verify-payment")
async def verify_payment(payload: schemas.PaymentVerify, current_user: User = Depends(auth.get_current_user)):
    """
    Verify payment signature from the frontend.
    Mandatory for Razorpay security.
    """
    try:
        razorpay_client.utility.verify_payment_signature(payload.model_dump())
        return {"status": "verified"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Payment verification failed")

@router.post("/webhook")
async def razorpay_webhook(request: Request):
    # This would handle post-payment logic asynchronously (e.g., verifying large payments)
    # payload = await request.json()
    return {"status": "received"}
