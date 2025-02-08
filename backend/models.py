from sqlalchemy import Column, Integer, String, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from database import Base

class PDF(Base):
    __tablename__ = "pdfs"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, unique=True, nullable=False)

    texts = relationship("PDFText", back_populates="pdf", cascade="all, delete-orphan")
    bounding_boxes = relationship("BoundingBox", back_populates="pdf", cascade="all, delete-orphan")

class PDFText(Base):
    __tablename__ = "pdf_texts"

    id = Column(Integer, primary_key=True, index=True)
    pdf_id = Column(Integer, ForeignKey("pdfs.id", ondelete="CASCADE"))
    text = Column(Text, nullable=False)
    page_number = Column(Integer)

    pdf = relationship("PDF", back_populates="texts")

class BoundingBox(Base):
    __tablename__ = "bounding_boxes"

    id = Column(Integer, primary_key=True, index=True)
    pdf_id = Column(Integer, ForeignKey("pdfs.id", ondelete="CASCADE"))
    text = Column(String, nullable=False)
    x0 = Column(Float)
    y0 = Column(Float)
    x1 = Column(Float)
    y1 = Column(Float)
    page_number = Column(Integer)

    pdf = relationship("PDF", back_populates="bounding_boxes")
