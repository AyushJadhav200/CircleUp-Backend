from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from datetime import datetime
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db, Tool, Borrow, User, ToolImage, Review
import schemas
import auth
import utils
import uuid
import s3_utils
from fastapi import UploadFile, File

router = APIRouter(tags=["tools"])

@router.post("/", response_model=schemas.ToolResponse)
def add_tool(tool: schemas.ToolCreate, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    new_tool = Tool(
        name=tool.name,
        description=tool.description,
        category=tool.category,
        price_per_day=tool.price_per_day,
        sale_price=tool.sale_price,
        image_url=tool.image_url,
        latitude=tool.latitude or current_user.latitude,
        longitude=tool.longitude or current_user.longitude,
        owner_id=current_user.id,
        is_verified=tool.is_verified,
        is_preowned=tool.is_preowned
    )
    db.add(new_tool)
    db.commit()
    db.refresh(new_tool)
    
    # Award karma for adding a tool
    current_user.karma_points += 5
    
    # Save multiple images if provided using relationships
    if tool.images:
        for idx, img_url in enumerate(tool.images):
            # The first image also becomes the primary image_url for easy access
            if idx == 0:
                new_tool.image_url = img_url
            
            new_tool.images.append(ToolImage(url=img_url))
            
    db.commit()
    db.refresh(new_tool)
    
    # Enrich with pre-signed URLs before returning
    enrich_tool_with_presigned_url(new_tool, db=db)
    
    return new_tool

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: User = Depends(auth.get_current_user)):
    """
    Upload a file to AWS S3 and return the public URL.
    """
    import os
    
    # Check credentials first to give a helpful error
    aws_key = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret = os.getenv("AWS_SECRET_ACCESS_KEY")
    aws_bucket = os.getenv("AWS_S3_BUCKET")
    aws_region = os.getenv("AWS_REGION", "eu-north-1")
    
    if not all([aws_key, aws_secret, aws_bucket]):
        missing = [k for k, v in {"AWS_ACCESS_KEY_ID": aws_key, "AWS_SECRET_ACCESS_KEY": aws_secret, "AWS_S3_BUCKET": aws_bucket}.items() if not v]
        raise HTTPException(
            status_code=500,
            detail=f"Server configuration error: Missing AWS env vars: {', '.join(missing)}. Please add them to your Render environment variables."
        )
    
    # Read and validate file
    file_data = await file.read()
    if not file_data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    
    # Determine folder
    folder = "tools"
    content_type = file.content_type or "image/jpeg"
    if content_type.startswith("video/"):
        folder = "videos"
    
    # Generate unique filename
    original_name = file.filename or "upload.jpg"
    extension = original_name.rsplit(".", 1)[-1] if "." in original_name else "jpg"
    unique_filename = f"{uuid.uuid4()}.{extension}"
    
    # Upload to S3
    try:
        s3_url = s3_utils.upload_file_to_s3(
            file_data=file_data,
            file_name=unique_filename,
            content_type=content_type,
            folder=folder
        )
    except Exception as e:
        print(f"[S3 Upload Error] {str(e)}")
        raise HTTPException(status_code=500, detail=f"S3 upload failed: {str(e)}")
    
    if not s3_url:
        raise HTTPException(
            status_code=500,
            detail=f"S3 upload returned no URL. Check that bucket '{aws_bucket}' exists in region '{aws_region}' and IAM permissions are correct."
        )
    
    print(f"[Upload] Success: {s3_url}")
    return {"url": s3_url}

def enrich_tool_with_presigned_url(tool, db: Session = None):
    import os
    try:
        bucket = os.getenv('AWS_S3_BUCKET')
        region = os.getenv('AWS_REGION', 'eu-north-1')
        if bucket and region:
            bucket_url = f"https://{bucket}.s3.{region}.amazonaws.com/"
            if tool.image_url and tool.image_url.startswith(bucket_url):
                file_key = tool.image_url.replace(bucket_url, "")
                presigned_url = s3_utils.get_presigned_url(file_key)
                if presigned_url:
                    tool.image_url = presigned_url
                    
            # Enrich all associated tool images
            if hasattr(tool, "images") and tool.images:
                for img in tool.images:
                    if img.url and img.url.startswith(bucket_url):
                        file_key = img.url.replace(bucket_url, "")
                        presigned_url = s3_utils.get_presigned_url(file_key)
                        if presigned_url:
                            img.url = presigned_url
    except Exception as e:
        print(f"[S3 Enrich Warning] Could not generate presigned URL: {e}")
    
    return tool

@router.get("/", response_model=List[schemas.ToolResponse])
def get_all_tools(db: Session = Depends(get_db)):
    tools = db.query(Tool).filter(Tool.is_available == True).all()
    for tool in tools:
        enrich_tool_with_presigned_url(tool, db=db)
    return tools

@router.get("/activity")
def get_user_activity(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    # Get all borrow records where the user is either the borrower or the tool owner
    my_borrows = db.query(Borrow).filter(Borrow.borrower_id == current_user.id).all()
    my_tools = db.query(Tool).filter(Tool.owner_id == current_user.id).all()
    my_tool_ids = [t.id for t in my_tools]
    my_lends = db.query(Borrow).filter(Borrow.tool_id.in_(my_tool_ids)).all()
    
    activity_feed = []
    
    for b in my_lends:
        tool = db.query(Tool).filter(Tool.id == b.tool_id).first()
        borrower = db.query(User).filter(User.id == b.borrower_id).first()
        activity_feed.append({
            "id": f"lend_{b.id}",
            "type": "lend",
            "user": borrower.name if borrower else "Unknown",
            "tool": tool.name if tool else "Unknown Tool",
            "time": b.borrow_date.strftime("%b %d, %Y"),
            "status": "Completed" if b.is_returned else "In Progress"
        })
        
    for b in my_borrows:
        tool = db.query(Tool).filter(Tool.id == b.tool_id).first()
        owner = db.query(User).filter(User.id == tool.owner_id).first() if tool else None
        activity_feed.append({
            "id": f"borrow_{b.id}",
            "type": "borrow",
            "user": owner.name if owner else "Unknown",
            "tool": tool.name if tool else "Unknown Tool",
            "time": b.borrow_date.strftime("%b %d, %Y"),
            "status": "Completed" if b.is_returned else "In Progress"
        })
        
    # Sort by recent first (we can use the id or mock sorting for now, but descending IDs works)
    activity_feed.reverse()
    
    # Prepend a system karma update for flavour
    if current_user.karma_points > 0:
        activity_feed.insert(0, {
            "id": "system_karma",
            "type": "system",
            "user": "CircleUp",
            "tool": "Karma Points",
            "time": "Recent",
            "status": "Awarded"
        })

    # Count total tools lent by this user
    tools_lent_count = db.query(Borrow).join(Tool).filter(Tool.owner_id == current_user.id, Borrow.is_returned == True).count()

    return {
        "activities": activity_feed,
        "stats": {
            "tools_lent": tools_lent_count,
            "karma_earned": current_user.karma_points
        }
    }

@router.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if not current_user.is_owner:
        raise HTTPException(status_code=403, detail="Admin access denied")
        
    total_users = db.query(User).count()
    total_tools = db.query(Tool).count()
    active_borrows = db.query(Borrow).filter(Borrow.is_returned == False).all()
    
    # Global Activity (Borrows + Tool Listings)
    recent_borrows = db.query(Borrow).order_by(Borrow.borrow_date.desc()).limit(15).all()
    recent_tools = db.query(Tool).order_by(Tool.id.desc()).limit(15).all()
    
    global_activity = []
    
    # Add Borrows
    for b in recent_borrows:
        tool = db.query(Tool).filter(Tool.id == b.tool_id).first()
        borrower = db.query(User).filter(User.id == b.borrower_id).first()
        global_activity.append({
            "id": f"b_{b.id}",
            "sort_key": b.borrow_date.timestamp(),
            "user_id": borrower.id if borrower else None,
            "user": borrower.name if borrower else "Unknown",
            "action": "Borrowed",
            "tool_id": tool.id if tool else None,
            "tool": tool.name if tool else "Unknown Tool",
            "status": "In Use" if not b.is_returned else "Returned",
            "date": b.borrow_date.isoformat()
        })
    
    # Add Listings
    for t in recent_tools:
        owner = db.query(User).filter(User.id == t.owner_id).first()
        base_time = datetime(2026, 1, 1).timestamp()
        global_activity.append({
            "id": f"t_{t.id}",
            "sort_key": base_time + t.id,
            "user_id": owner.id if owner else None,
            "user": owner.name if owner else "Unknown",
            "action": "Listed",
            "tool_id": t.id,
            "tool": t.name,
            "status": "Available",
            "date": datetime.now().isoformat()
        })

    # Sort globally
    global_activity.sort(key=lambda x: x['sort_key'], reverse=True)

    return {
        "total_users": total_users,
        "total_tools": total_tools,
        "active_rentals": len(active_borrows),
        "global_activity": global_activity[:20]
    }

@router.post("/admin/users/{user_id}/verify")
def verify_user_admin(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if not current_user.is_owner:
        raise HTTPException(status_code=403, detail="Admin restricted")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_verified = True
    db.commit()
    return {"status": "success", "message": f"User {user.name} is now verified"}

@router.post("/admin/tools/{tool_id}/suspend")
def suspend_tool_admin(tool_id: int, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if not current_user.is_owner:
        raise HTTPException(status_code=403, detail="Admin restricted")
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Listing not found")
    tool.is_suspended = True
    db.commit()
    return {"status": "success", "message": f"Listing {tool.name} suspended"}

@router.get("/admin/users")
def get_admin_users(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    """Admin-only: Returns full neighborhood directory with all user details."""
    if not current_user.is_owner:
        raise HTTPException(status_code=403, detail="Admin restricted")
    
    users = db.query(User).order_by(User.id.desc()).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email or "—",
            "phone": u.phone_number or "—",
            "karma": u.karma_points,
            "is_verified": u.is_verified,
            "is_owner": u.is_owner,
            "avatar_url": u.avatar_url,
            "joined": u.id,  # Use ID as proxy for join order
        }
        for u in users
    ]

@router.get("/nearby", response_model=List[schemas.ToolResponse])
def get_nearby_tools(
    lat: float, 
    lon: float, 
    radius: float = 500.0, 
    category: Optional[str] = None,
    query: Optional[str] = None,
    db: Session = Depends(get_db)
):
    # Base query for available tools (Hide suspended ones)
    stmt = db.query(Tool).filter(Tool.is_available == True).filter(Tool.is_suspended == False)
    
    # Apply category filter if provided
    if category and category != "All":
        stmt = stmt.filter(Tool.category.ilike(f"%{category}%"))
        
    # Apply search query filter if provided (name or description)
    if query:
        stmt = stmt.filter(
            (Tool.name.ilike(f"%{query}%")) | 
            (Tool.description.ilike(f"%{query}%"))
        )
        
    all_tools = stmt.all()
    nearby_tools = []
    
    for t in all_tools:
        if t.latitude and t.longitude:
            dist = utils.haversine(lat, lon, t.latitude, t.longitude)
            if dist <= radius:
                enrich_tool_with_presigned_url(t, db=db)
                nearby_tools.append(t)
    
    return nearby_tools

@router.post("/borrow")
def borrow_tool(borrow: schemas.BorrowCreate, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    tool = db.query(Tool).filter(Tool.id == borrow.tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    if not tool.is_available:
        raise HTTPException(status_code=400, detail="Tool is currently not available")
    if tool.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot borrow your own tool")
        
    # High-Value Protection: Require ID Verification for tools > ₹1000
    tool_value = tool.sale_price or (tool.price_per_day * 50) # Fallback if sale_price is null
    if tool_value > 1000 and not current_user.is_verified:
        raise HTTPException(
            status_code=403, 
            detail="Identity Verification Required. This is a high-value tool. Please verify your ID in Profile to proceed."
        )
        
    try:
        # 1. Calculate Billing Breakdown
        start_date = borrow.start_date
        end_date = borrow.end_date
        days = max(1, (end_date - start_date).days)
        
        rental_price = tool.price_per_day * days
        service_fee = round(rental_price * 0.05, 2)  # 5% Service Fee
        delivery_fee = borrow.delivery_fee or 0.0
        security_deposit = 500.0  # Fixed refundable deposit
        grand_total = rental_price + service_fee + delivery_fee + security_deposit
        
        # 2. Impact Calculation (Karma)
        # Karma = 5 (base) + 1 per 100 Rs of rental
        karma_to_earn = 5 + int(rental_price // 100)

        # 3. Update Tool Status
        tool.is_available = False
        
        # 4. Create Borrow Record
        new_borrow = Borrow(
            tool_id=tool.id,
            borrower_id=current_user.id,
            qr_code=f"RETURN_{tool.id}_{datetime.now().timestamp()}",
            start_date=start_date,
            end_date=end_date,
            status="pending",
            
            # Detailed Billing
            rental_price=rental_price,
            service_fee=service_fee,
            delivery_fee=delivery_fee,
            security_deposit=security_deposit,
            grand_total=grand_total,
            
            # Karma tracking
            karma_earned=karma_to_earn,
            
            is_delivery=borrow.is_delivery or False,
            delivery_status="pending",
            borrower_lat=borrow.borrower_lat,
            borrower_lon=borrow.borrower_lon,
            lender_lat=tool.latitude,
            lender_lon=tool.longitude,
        )
        db.add(new_borrow)
        
        # 5. Award karma for borrowing impact
        current_user.karma_points += karma_to_earn
        
        # 6. Save to DB
        db.commit()
        db.refresh(new_borrow)
        
        # 7. Notify owner
        owner = db.query(User).filter(User.id == tool.owner_id).first()
        if owner and owner.push_token:
            delivery_label = "With Delivery" if new_borrow.is_delivery else "Self-Pickup"
            utils.send_push_notification(
                owner.push_token,
                "New Rental Request! 🔧",
                f"{current_user.name} wants to borrow your {tool.name} ({delivery_label})."
            )
        
        return {
            "status": "success",
            "id": new_borrow.id,
            "tool_id": tool.id,
            "rental_price": rental_price,
            "service_fee": service_fee,
            "delivery_fee": delivery_fee,
            "security_deposit": security_deposit,
            "grand_total": grand_total,
            "payment_method": "razorpay",
            "message": "Order placed! Proceed to secure payment."
        }
    except Exception as e:
        db.rollback()
        import traceback
        err_msg = f"[ERROR-TOOLS] {datetime.now()} /borrow: {e}\n{traceback.format_exc()}"
        with open("global_error.log", "a") as f:
            f.write(err_msg + "\n" + "="*50 + "\n")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/borrow/{borrow_id}/approve")
def approve_borrow(borrow_id: int, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    borrow = db.query(Borrow).filter(Borrow.id == borrow_id).first()
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow request not found")
        
    tool = db.query(Tool).filter(Tool.id == borrow.tool_id).first()
    if tool.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can approve")
        
    borrow.status = "approved"
    db.commit()
    
    # Notify Borrower
    borrower = db.query(User).filter(User.id == borrow.borrower_id).first()
    if borrower and borrower.push_token:
        utils.send_push_notification(
            borrower.push_token, 
            "Request Approved! 🎉", 
            f"Your request to borrow {tool.name} has been approved. You can pick it up now!"
        )
        
    return {"message": "Approved"}

@router.post("/return", response_model=dict)
def return_tool(verify: schemas.QRVerify, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    # The current_user here is likely the OWNER scanning the borrower's QR code.
    # Find active borrow session with this qr_code payload
    borrow = db.query(Borrow).filter(Borrow.qr_code == verify.qr_code, Borrow.is_returned == False).first()
    
    if not borrow:
        raise HTTPException(status_code=400, detail="Invalid QR code or tool already returned")
        
    tool = db.query(Tool).filter(Tool.id == borrow.tool_id).first()
    
    if tool.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the tool owner can verify the return")
        
    borrow.is_returned = True
    tool.is_available = True
    
    # Award karma to the owner and borrower
    current_user.karma_points += 10 # Owner points
    borrower = db.query(User).filter(User.id == borrow.borrower_id).first()
    if borrower:
        borrower.karma_points += 5 # Borrower points for returning
        
    db.commit()

    # Notify Borrower of Karma Earned
    if borrower and borrower.push_token:
        utils.send_push_notification(
            borrower.push_token,
            "Tool Returned! 🎁",
            f"You earned 5 Karma points for returning {tool.name}. Keep it up!"
        )

    return {"message": "Tool returned successfully", "owner_karma": current_user.karma_points}

@router.delete("/{tool_id}")
def delete_tool(tool_id: int, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    if tool.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this tool")
    
    # Check if the tool is currently borrowed
    active_borrow = db.query(Borrow).filter(Borrow.tool_id == tool_id, Borrow.is_returned == False).first()
    if active_borrow:
        raise HTTPException(status_code=400, detail="Cannot delete tool while it is currently borrowed")
        
    db.delete(tool)
    db.commit()
    return {"message": "Tool deleted successfully"}

@router.get("/{tool_id}")
def get_tool_by_id(tool_id: int, db: Session = Depends(get_db)):
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    enrich_tool_with_presigned_url(tool, db=db)
    return {
        "id": tool.id,
        "name": tool.name,
        "description": tool.description,
        "category": tool.category,
        "price_per_day": tool.price_per_day,
        "image_url": tool.image_url,
        "is_available": tool.is_available,
        "owner_id": tool.owner_id,
        "owner_name": tool.owner_name or "Community",
        "karma_impact": 45,
        "rating": 4.9,
        "reviews": 12,
        "images": [img.url for img in tool.images] if tool.images else ([tool.image_url] if tool.image_url else [])
    }

@router.post("/reviews", response_model=schemas.ReviewResponse)
def submit_review(
    review: schemas.ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Submit a star review after a completed rental."""
    # 1. Validate the borrow record exists and belongs to current user
    borrow = db.query(Borrow).filter(Borrow.id == review.borrow_id).first()
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow record not found")
    if borrow.borrower_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only review your own rentals")
    if not borrow.is_returned:
        raise HTTPException(status_code=400, detail="Can only review completed rentals")

    # 2. Prevent duplicate reviews
    existing = db.query(Review).filter(Review.borrow_id == review.borrow_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this rental")

    # 3. Validate rating range
    if not 1 <= review.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    # 4. Get the tool owner (reviewee)
    tool = db.query(Tool).filter(Tool.id == borrow.tool_id).first()
    reviewee_id = tool.owner_id if tool else None

    # 5. Save review
    new_review = Review(
        borrow_id=review.borrow_id,
        reviewer_id=current_user.id,
        reviewee_id=reviewee_id,
        tool_id=borrow.tool_id,
        rating=review.rating,
        comment=review.comment
    )
    db.add(new_review)

    # 6. Award karma to the reviewer for leaving a review
    current_user.karma_points += 5
    db.commit()
    db.refresh(new_review)
    return new_review
