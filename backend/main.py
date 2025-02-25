from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import aiohttp
import os
import pdfplumber
import pytesseract
from pdf2image import convert_from_path
from dotenv import load_dotenv
import asyncio
from typing import List, Dict
import gc
# from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy.future import select
# from sqlalchemy import text
# from sqlalchemy import delete



load_dotenv()
CORS_ORIGIN = os.getenv("CLIENT_URL")

# # Set explicit Poppler path (for Windows)
# POPPLER_PATH = r"C:\poppler-24.08.0\Library\bin"

# # Set explicit Tesseract path (for Windows)
# TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
# pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN],  # Allow specific origin
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],
)


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



async def extract_text_from_images(pdf_path: str) -> List[Dict]:
    """Extract text from scanned PDFs using OCR while reducing memory usage."""
    
    extracted_data = []

    async def process_page(image, page_number):
        """Process a single page with OCR while limiting memory usage."""

        # Convert to grayscale & reduce resolution
        # image = image.convert("L").resize((image.width // 2, image.height // 2))  # Reduce size by half
        
        # Perform OCR
        text_data = await asyncio.to_thread(
            pytesseract.image_to_data, image, output_type=pytesseract.Output.DICT
        )

        # Extract text and bounding boxes
        page_texts = []
        for i in range(len(text_data["text"])):
            word = text_data["text"][i].strip()
            if word:
                page_texts.append({
                    "text": word,
                    "bbox": [text_data["left"][i], text_data["top"][i], text_data["left"][i] + text_data["width"][i], text_data["top"][i] + text_data["height"][i]],
                    "page": page_number + 1
                })

        return page_texts

    # Process each page separately to avoid memory overload
    for page_number, image in enumerate(convert_from_path(pdf_path, dpi=150)):
        extracted_data.extend(await process_page(image, page_number))
        
        # Free memory after processing each page
        image.close()
        del image
        gc.collect()

    return extracted_data



@app.post("/extract") 
async def process_pdf(request: PDFRequest):
    """API endpoint to process a PDF from URL"""
    pdf_url = request.pdf_url
    pdf_path = "temp.pdf"

    await download_pdf(pdf_url, pdf_path)

    try:
        extracted_data = []
        extracted_text = []

        if await is_pdf_searchable(pdf_path):
            extracted_data = await extract_text_and_bboxes(pdf_path)

            # Group text into paragraphs
            # formatted_text = group_text_by_lines(extracted_data)

            return {
                "url": pdf_url,
                "data": extracted_data,
                # "formatted_text": formatted_text
            }
        
        else:
            extracted_text = await extract_text_from_images(pdf_path)

            return {
                "url": pdf_url,
                "data": extracted_text
            }

    except Exception as e:
        raise e

    finally:
        os.remove(pdf_path)



# Health-check endpoint
@app.get("/health-check")
async def health_check():
    return {"status": "Server is operational. All Good!"}





# ---------------------------------------------------------------------------------------------------------------

# Group text into paragraphs function

# def group_text_by_lines(extracted_data):
#     """Groups words into lines based on bounding box Y-coordinates."""
#     lines = []
#     current_line = []
#     current_y = None

#     for item in extracted_data:
#         text, bbox = item["text"], item["bbox"]
#         y_coord = round(bbox[1], 1)  # Normalize Y-coordinate

#         if current_y is None or abs(y_coord - current_y) < 5:  # Adjust threshold as needed
#             current_line.append(text)
#         else:
#             lines.append(" ".join(current_line))
#             current_line = [text]

#         current_y = y_coord

#     if current_line:
#         lines.append(" ".join(current_line))

#     return "\n".join(lines)  # Ensures paragraph separation


# -----------------------------------++++++++++++++++++++++++++++++++++----------------------


# Endpoints for future use

# # for fetching all pdfs
# @app.get("/pdfs")
# async def get_all_pdfs(db: AsyncSession = Depends(get_db)):
#     """Fetch all processed PDFs"""
#     result = await db.execute(select(PDF))
#     pdfs = result.scalars().all()
#     return {"pdfs": [{"id": pdf.id, "url": pdf.url} for pdf in pdfs]}


# # for fetching texts of pdf by id
# @app.get("/pdf/{pdf_id}/text")
# async def get_pdf_text(pdf_id: int, db: AsyncSession = Depends(get_db)):
#     """Fetch extracted text for a given PDF"""
#     result = await db.execute(select(PDFText).where(PDFText.pdf_id == pdf_id))
#     texts = result.scalars().all()
    
#     if not texts:
#         return {"message": "No text found for the given PDF ID"}
    
#     return {"pdf_id": pdf_id, "texts": [{"text": t.text, "page_number": t.page_number} for t in texts]}


# # for fetching bounding box of pdf by id
# @app.get("/pdf/{pdf_id}/bounding_boxes")
# async def get_pdf_bounding_boxes(pdf_id: int, db: AsyncSession = Depends(get_db)):
#     """Fetch bounding boxes for a given PDF"""
#     result = await db.execute(select(BoundingBox).where(BoundingBox.pdf_id == pdf_id))
#     boxes = result.scalars().all()
    
#     if not boxes:
#         return {"message": "No bounding boxes found for the given PDF ID"}

#     return {
#         "pdf_id": pdf_id,
#         "bounding_boxes": [
#             {"text": b.text, "page_number": b.page_number, "bbox": [b.x0, b.y0, b.x1, b.y1]}
#             for b in boxes
#         ]
#     }


# # for fetching particular pdf by url
# @app.get("/pdf/url")
# async def get_pdf_by_url(url: str, db: AsyncSession = Depends(get_db)):
#     """Fetch PDF details by URL"""
#     result = await db.execute(select(PDF).where(PDF.url == url))
#     pdf = result.scalars().first()

#     if not pdf:
#         return {"message": "No PDF found for the given URL"}

#     return {"pdf_id": pdf.id, "url": pdf.url}

# # for deleting pdf by id
# @app.delete("/pdf/{pdf_id}")
# async def delete_pdf(pdf_id: int, db: AsyncSession = Depends(get_db)):
#     """Delete a PDF and its associated data"""
#     await db.execute(delete(PDFText).where(PDFText.pdf_id == pdf_id))
#     await db.execute(delete(BoundingBox).where(BoundingBox.pdf_id == pdf_id))
#     result = await db.execute(delete(PDF).where(PDF.id == pdf_id))

#     await db.commit()

#     if result.rowcount == 0:
#         return {"message": "PDF not found"}
    
#     return {"message": f"PDF with ID {pdf_id} deleted"}


# -----------------------------------++++++++++++++++++++++++++++++++++----------------------


# Optimized and Efficient OCR Text Extraction (Required 512+MB RAM in production)

# async def extract_text_from_images(pdf_path: str) -> List[Dict]:
#     """Extract text and generate bounding boxes asynchronously using OCR."""
#     extracted_data = []
    
#     images = await asyncio.to_thread(convert_from_path, pdf_path, poppler_path=POPPLER_PATH) # For Windows
#     # images = await asyncio.to_thread(convert_from_path, pdf_path)

#     # Run OCR in parallel on all pages
#     ocr_tasks = [asyncio.to_thread(pytesseract.image_to_data, img, output_type=pytesseract.Output.DICT) for img in images]
#     texts = await asyncio.gather(*ocr_tasks)  # Runs all OCR tasks in parallel

#     for page_number, text in enumerate(texts):
#         for i in range(len(text["text"])):  
#             word = text["text"][i].strip()
#             if word:  # Ignore empty text
#                 extracted_data.append({
#                     "text": word,
#                     "bbox": [text["left"][i], text["top"][i], text["left"][i] + text["width"][i], text["top"][i] + text["height"][i]],
#                     "page": page_number + 1
#                 })

#     return extracted_data


# async def extract_text_from_images(pdf_path: str) -> List[Dict]:
#     """Efficiently extract text from scanned PDFs using OCR with limited concurrency."""
    
#     extracted_data = []
#     semaphore = asyncio.Semaphore(1)  # Limits concurrent OCR tasks

#     async def process_page(image):
#         """Process a single page with OCR while limiting memory usage."""
#         async with semaphore:  # Ensures only 2 OCR tasks run concurrently
#             return await asyncio.to_thread(
#                 pytesseract.image_to_data, image, output_type=pytesseract.Output.DICT
#             )

#     # Convert all pages to images first
#     # images = convert_from_path(pdf_path, poppler_path=POPPLER_PATH)  # For Windows
#     images = convert_from_path(pdf_path)

#     # Create OCR tasks for multiple pages at once
#     ocr_tasks = [process_page(images[img]) for img in range(len(images))]
    
#     # Run multiple OCR tasks concurrently, but limited by the semaphore
#     texts_data = await asyncio.gather(*ocr_tasks)

#     for page_number, text in enumerate(texts_data):
#         for i in range(len(text["text"])):
#             word = text["text"][i].strip()
#             if word:
#                 extracted_data.append({
#                     "text": word,
#                     "bbox": [text["left"][i], text["top"][i], text["left"][i] + text["width"][i], text["top"][i] + text["height"][i]],
#                     "page": page_number + 1
#                 })

#     return extracted_data


# async def extract_text_from_images(pdf_path: str) -> List[Dict]:
#     """Extract text from scanned PDFs using OCR without memory leaks."""
    
#     extracted_data = []

#     async def process_page(image, page_number):
#         """Process a single page with OCR while limiting memory usage."""
#         text_data = await asyncio.to_thread(
#             pytesseract.image_to_data, image, output_type=pytesseract.Output.DICT
#         )

#         page_texts = []
#         for i in range(len(text_data["text"])):
#             word = text_data["text"][i].strip()
#             if word:
#                 page_texts.append({
#                     "text": word,
#                     "bbox": [text_data["left"][i], text_data["top"][i], text_data["left"][i] + text_data["width"][i], text_data["top"][i] + text_data["height"][i]],
#                     "page": page_number + 1
#                 })

#         return page_texts

#     # Process each page one at a time to reduce memory usage
#     page_number = 0
#     for image in convert_from_path(pdf_path, poppler_path=POPPLER_PATH):  # For Windows
#         extracted_data.extend(await process_page(image, page_number))
#         page_number += 1
        
#         # Free memory after processing each page
#         del image
#         gc.collect()

#     return extracted_data