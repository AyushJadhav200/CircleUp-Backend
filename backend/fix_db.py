from database import engine, Base, ToolImage
from sqlalchemy import inspect

def check_and_create_tables():
    inspector = inspect(engine)
    if not inspector.has_table("tool_images"):
        print("[CircleUp] Creating missing table: tool_images")
        Base.metadata.create_all(bind=engine)
        print("[CircleUp] Table created successfully!")
    else:
        print("[CircleUp] Table 'tool_images' already exists.")

if __name__ == "__main__":
    check_and_create_tables()
