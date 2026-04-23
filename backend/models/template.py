"""SharedTemplate and UserTemplate models."""
from sqlalchemy import Column, Integer, String, JSON, Boolean, Index, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class SharedTemplate(Base):
    """Global flight form templates - read-only predefined templates."""
    __tablename__ = 'shared_templates'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    category = Column(String(50))  # e.g., 'ifr', 'xc', 'training'
    
    # Template structure
    fields = Column(JSON, default=[])  # [{key, label, type, required, options}, ...]
    calculations = Column(JSON, default={})  # {field: expression, ...}
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(String)  # Date string


class UserTemplate(Base):
    """User's flight form templates - copied from shared or created fresh."""
    __tablename__ = 'user_templates'
    __table_args__ = (
        Index('ix_user_templates_user_id', 'user_id'),
        Index('ix_user_templates_user_name', 'user_id', 'name'),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    shared_template_id = Column(Integer, ForeignKey('shared_templates.id'), nullable=True)
    # If shared_template_id is NULL, template was created from scratch
    
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    category = Column(String(50))
    
    # Template structure
    fields = Column(JSON, default=[])
    calculations = Column(JSON, default={})
    
    # User modifications
    is_modified = Column(Boolean, default=False)  # True if copied and then modified

    user = relationship('User', back_populates='templates')
    shared_template = relationship('SharedTemplate')
