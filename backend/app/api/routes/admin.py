from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.schemas import AdminUserCreate, UserResponse, UserUpdate
from app.security import get_admin_user
from app.services.user import create_user

router = APIRouter()

@router.post("/create-admission", response_model=UserResponse)
def create_admission_staff(
    user_data: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a new admission staff member (admin only)"""
    # Create a new user with admission role
    return create_user(db=db, user=user_data, role="admission")

@router.get("/employees", response_model=List[UserResponse])
def get_all_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get all employees (admin only)"""
    employees = db.query(User).filter(User.role == "admission").all()
    return employees

@router.put("/employees/{user_id}", response_model=UserResponse)
def update_employee(
    user_id: str,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update employee data (admin only)"""
    employee = db.query(User).filter(User.id == user_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    for key, value in user_data.dict(exclude_unset=True).items():
        setattr(employee, key, value)
    
    db.commit()
    db.refresh(employee)
    return employee