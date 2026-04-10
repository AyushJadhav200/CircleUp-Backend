from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db, Message, Conversation, User
import schemas
import auth
from datetime import datetime

router = APIRouter(tags=["messaging"])

@router.get("", response_model=List[schemas.ConversationResponse])
def get_my_chats(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    # Find conversations where current_user is either user1 or user2
    chats = db.query(Conversation).filter(
        (Conversation.user1_id == current_user.id) | (Conversation.user2_id == current_user.id)
    ).order_by(Conversation.last_updated.desc()).all()
    
    # Enrich with other user's name
    for chat in chats:
        other_user_id = chat.user2_id if chat.user1_id == current_user.id else chat.user1_id
        other_user = db.query(User).filter(User.id == other_user_id).first()
        chat.other_user_name = other_user.name if other_user else "Unknown Neighbor"
        
    return chats

@router.get("/{chat_id}/messages", response_model=List[schemas.MessageResponse])
def get_chat_messages(chat_id: int, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    # Verify chat exists and user is part of it
    chat = db.query(Conversation).filter(Conversation.id == chat_id).first()
    if not chat or (chat.user1_id != current_user.id and chat.user2_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to view this chat")
        
    messages = db.query(Message).filter(Message.conversation_id == chat_id).order_by(Message.timestamp.asc()).all()
    return messages

@router.post("/{chat_id}/send", response_model=schemas.MessageResponse)
def send_message(chat_id: int, msg: schemas.MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    chat = db.query(Conversation).filter(Conversation.id == chat_id).first()
    if not chat or (chat.user1_id != current_user.id and chat.user2_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to message here")
        
    new_msg = Message(
        conversation_id=chat_id,
        sender_id=current_user.id,
        content=msg.content
    )
    
    # Update conversation metadata
    chat.last_message = msg.content
    chat.last_updated = datetime.utcnow()
    
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    
    # [WS] Broadcast instantly to recipient if online
    import websocket
    recipient_id = chat.user2_id if chat.user1_id == current_user.id else chat.user1_id
    
    # We send the message ID and content so the frontend can append it
    broadcast_payload = {
        "event": "new_message",
        "chat_id": chat_id,
        "message": {
            "id": new_msg.id,
            "conversation_id": chat_id,
            "sender_id": current_user.id,
            "content": new_msg.content,
            "timestamp": new_msg.timestamp.isoformat()
        }
    }
    
    import asyncio
    asyncio.create_task(websocket.notify_user(recipient_id, broadcast_payload))
    
    # [Push] Send mobile notification if token exists
    recipient = db.query(User).filter(User.id == recipient_id).first()
    if recipient and recipient.push_token:
        import utils
        utils.send_push_notification(
            recipient.push_token,
            f"New Message from {current_user.name}",
            msg.content[:100]
        )
    
    return new_msg

@router.post("/start/{other_user_id}", response_model=schemas.ConversationResponse)
def start_conversation(other_user_id: int, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if other_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot start chat with yourself")
        
    # Check if conversation already exists
    chat = db.query(Conversation).filter(
        ((Conversation.user1_id == current_user.id) & (Conversation.user2_id == other_user_id)) |
        ((Conversation.user1_id == other_user_id) & (Conversation.user2_id == current_user.id))
    ).first()
    
    if not chat:
        chat = Conversation(user1_id=current_user.id, user2_id=other_user_id)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        
    # Enrich with other user's name
    other_user = db.query(User).filter(User.id == other_user_id).first()
    chat.other_user_name = other_user.name if other_user else "Neighbor"
    
    return chat
