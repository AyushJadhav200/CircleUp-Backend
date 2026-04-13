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
