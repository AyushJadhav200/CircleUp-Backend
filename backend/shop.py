from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Product, ProductImage
from schemas import ProductResponse
from typing import List

router = APIRouter(tags=["Shop"])

@router.get("/products", response_model=List[ProductResponse])
def get_products(category: str = None, db: Session = Depends(get_db)):
    query = db.query(Product).filter(Product.is_active == True)
    if category and category != "All":
        query = query.filter(Product.category == category)
    return query.all()

@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=44, detail="Product not found")
    return product

@router.post("/seed")
def seed_products(db: Session = Depends(get_db)):
    # Check if already seeded
    if db.query(Product).count() > 0:
        return {"message": "Database already seeded with products"}
    
    sample_products = [
        Product(
            name="Heavy Duty Work Gloves",
            description="Reinforced leather palms, breathable back. Perfect for gardening and heavy lifting.",
            price=249.0,
            category="Safety",
            image_url="https://images.unsplash.com/photo-1590779033100-9f60a05a013d?q=80&w=400"
        ),
        Product(
            name="Safety Goggles (Anti-Fog)",
            description="Wide vision, clear lens with anti-scratch coating. Essential for drilling and sawing.",
            price=129.0,
            category="Safety",
            image_url="https://images.unsplash.com/photo-1584467385949-62399268f773?q=80&w=400"
        ),
        Product(
            name="10-Piece Masonry Drill Bit Set",
            description="Tungsten carbide tips for drilling into brick, stone, and concrete.",
            price=599.0,
            category="Consumables",
            image_url="https://images.unsplash.com/photo-1572981779307-38b8cabb2407?q=80&w=400"
        ),
        Product(
            name="Assorted Sandpaper Pack (20 Sheets)",
            description="Grits from 60 to 320. Ideal for wood and metal finishing.",
            price=199.0,
            category="Consumables",
            image_url="https://images.unsplash.com/photo-1513467535987-fd81bc20622d?q=80&w=400"
        ),
        Product(
            name="WD-40 Multi-Use Lubricant (100ml)",
            description="Stops squeaks, removes moisture, cleans and protects metal surfaces.",
            price=149.0,
            category="Maintenance",
            image_url="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=400"
        )
    ]
    
    db.add_all(sample_products)
    db.commit()
    return {"message": f"Successfully seeded {len(sample_products)} products"}
