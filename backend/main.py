from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import aiohttp
import os
import pdfplumber
import pytesseract
from pdf2image import convert_from_path
from database import engine, Base, get_db
import asyncio
from models import PDF, PDFText, BoundingBox
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from dotenv import load_dotenv
from sqlalchemy import delete


load_dotenv()
CORS_ORIGIN = os.getenv("CLIENT_URL")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN],  # Allow specific origin
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],
)


# Initialize DB at app startup
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# Register the on_startup event to initialize the database
@app.on_event("startup")
async def on_startup():
    await init_db()
    asyncio.create_task(ping_db_periodically())


# Periodically ping the database to keep the connection alive
async def ping_db_periodically():
    while True:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        await asyncio.sleep(30)  # Ping every 30 seconds


class PDFRequest(BaseModel):
    pdf_url: str

async def download_pdf(pdf_url, save_path):
    """Download PDF from a given URL"""
    async with aiohttp.ClientSession() as session:
        async with session.get(pdf_url) as response:
            if response.status != 200:
                raise HTTPException(status_code=400, detail="Failed to download PDF")
            with open(save_path, 'wb') as f:
                f.write(await response.read())


async def is_pdf_searchable(pdf_path):
    """Check if a PDF contains searchable text asynchronously"""
    try:
        return await asyncio.to_thread(_is_pdf_searchable, pdf_path)
    except Exception:
        return False

    
def _is_pdf_searchable(pdf_path):
    """Check if a PDF contains searchable text, handling potential issues."""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            return any(page.extract_text() for page in pdf.pages)
    except Exception:
        return False


async def extract_text_and_bboxes(pdf_path):
    """Extract text and bounding boxes asynchronously"""
    return await asyncio.to_thread(_extract_text_and_bboxes, pdf_path)


def _extract_text_and_bboxes(pdf_path):
    """Extract text and bounding boxes from a searchable PDF"""
    extracted_data = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_number, page in enumerate(pdf.pages):
            words =  page.extract_words(x_tolerance=1)
            for word in words:
                extracted_data.append({
                    "text": word["text"],
                    "bbox": [word["x0"], word["top"], word["x1"], word["bottom"]],
                    "page": page_number + 1
                })
    return extracted_data



async def extract_text_from_images(pdf_path):
    """Extract text from a scanned PDF asynchronously using parallel OCR"""
    extracted_texts = ""
    images = await asyncio.to_thread(convert_from_path, pdf_path)  # Convert PDF to images asynchronously

    # Run OCR in parallel on all pages
    ocr_tasks = [asyncio.to_thread(pytesseract.image_to_string, img) for img in images]
    extracted_texts = await asyncio.gather(*ocr_tasks)  # Runs all OCR tasks in parallel

    return "\n".join(extracted_texts)


def group_text_by_lines(extracted_data):
    """Groups words into lines based on bounding box Y-coordinates."""
    lines = []
    current_line = []
    current_y = None

    for item in extracted_data:
        text, bbox = item["text"], item["bbox"]
        y_coord = round(bbox[1], 1)  # Normalize Y-coordinate

        if current_y is None or abs(y_coord - current_y) < 5:  # Adjust threshold as needed
            current_line.append(text)
        else:
            lines.append(" ".join(current_line))
            current_line = [text]

        current_y = y_coord

    if current_line:
        lines.append(" ".join(current_line))

    return "\n".join(lines)  # Ensures paragraph separation


@app.post("/extract") 
async def process_pdf(request: PDFRequest, db: AsyncSession = Depends(get_db)):
    """API endpoint to process a PDF from URL"""
    pdf_url = request.pdf_url
    pdf_path = "temp.pdf"

    await download_pdf(pdf_url, pdf_path)

    try:
        new_pdf = PDF(url=pdf_url)
        db.add(new_pdf)
        await db.flush()
        await db.refresh(new_pdf)
        
        pdf_id = new_pdf.id
        pdf_url = new_pdf.url

        extracted_data = []
        extracted_text = ""

        if await is_pdf_searchable(pdf_path):
            extracted_data = await extract_text_and_bboxes(pdf_path)

            # Group text into paragraphs
            formatted_text = group_text_by_lines(extracted_data)

            pdf_texts = [PDFText(pdf_id=pdf_id, text=item["text"], page_number=item["page"]) for item in extracted_data]
            bounding_boxes = [
                BoundingBox(pdf_id=pdf_id, text=item["text"],
                            x0=item["bbox"][0], y0=item["bbox"][1],
                            x1=item["bbox"][2], y1=item["bbox"][3],
                            page_number=item["page"])
                for item in extracted_data
            ]

            db.add_all(pdf_texts + bounding_boxes)
            await db.commit()

            return {
                "id": pdf_id,
                "url": pdf_url,
                "data": extracted_data,
                "formatted_text": formatted_text
            }
        
        else:
            extracted_text = await extract_text_from_images(pdf_path)
            db_text = PDFText(pdf_id=pdf_id, text=extracted_text, page_number=1)
            db.add(db_text)
            await db.commit()

            return {
                "id": pdf_id,
                "url": pdf_url,
                "text": extracted_text
            }

    except Exception as e:
        await db.rollback()  # Rollback on error
        raise e

    finally:
        os.remove(pdf_path)



# Health-check endpoint
@app.get("/health-check")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "Server is operational. All Good!"}
    except Exception:
        return {"status": "Error"}


# Endpoints for future use

# for fetching all pdfs
@app.get("/pdfs")
async def get_all_pdfs(db: AsyncSession = Depends(get_db)):
    """Fetch all processed PDFs"""
    result = await db.execute(select(PDF))
    pdfs = result.scalars().all()
    return {"pdfs": [{"id": pdf.id, "url": pdf.url} for pdf in pdfs]}


# for fetching texts of pdf by id
@app.get("/pdf/{pdf_id}/text")
async def get_pdf_text(pdf_id: int, db: AsyncSession = Depends(get_db)):
    """Fetch extracted text for a given PDF"""
    result = await db.execute(select(PDFText).where(PDFText.pdf_id == pdf_id))
    texts = result.scalars().all()
    
    if not texts:
        return {"message": "No text found for the given PDF ID"}
    
    return {"pdf_id": pdf_id, "texts": [{"text": t.text, "page_number": t.page_number} for t in texts]}


# for fetching bounding box of pdf by id
@app.get("/pdf/{pdf_id}/bounding_boxes")
async def get_pdf_bounding_boxes(pdf_id: int, db: AsyncSession = Depends(get_db)):
    """Fetch bounding boxes for a given PDF"""
    result = await db.execute(select(BoundingBox).where(BoundingBox.pdf_id == pdf_id))
    boxes = result.scalars().all()
    
    if not boxes:
        return {"message": "No bounding boxes found for the given PDF ID"}

    return {
        "pdf_id": pdf_id,
        "bounding_boxes": [
            {"text": b.text, "page_number": b.page_number, "bbox": [b.x0, b.y0, b.x1, b.y1]}
            for b in boxes
        ]
    }


# for fetching particular pdf by url
@app.get("/pdf/url")
async def get_pdf_by_url(url: str, db: AsyncSession = Depends(get_db)):
    """Fetch PDF details by URL"""
    result = await db.execute(select(PDF).where(PDF.url == url))
    pdf = result.scalars().first()

    if not pdf:
        return {"message": "No PDF found for the given URL"}

    return {"pdf_id": pdf.id, "url": pdf.url}

# for deleting pdf by id
@app.delete("/pdf/{pdf_id}")
async def delete_pdf(pdf_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a PDF and its associated data"""
    await db.execute(delete(PDFText).where(PDFText.pdf_id == pdf_id))
    await db.execute(delete(BoundingBox).where(BoundingBox.pdf_id == pdf_id))
    result = await db.execute(delete(PDF).where(PDF.id == pdf_id))

    await db.commit()

    if result.rowcount == 0:
        return {"message": "PDF not found"}
    
    return {"message": f"PDF with ID {pdf_id} deleted"}
