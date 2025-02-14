# PDF Upload & Extraction

A FastAPI and Next JS based web application that allows users to upload PDF files through URL and extract text and bounding boxes from them. The extracted data is displayed alongside the PDF for easy reference and interaction.

## Tech Stack

 **Frontend:**
  - Next.js
  - TypeScript
  - Tailwind CSS
  - react-pdf-viewer
  - React Markdown

**Backend:**
  - FastAPI
  - SQLAlchemy
  - pdfplumber
  - pytesseract
  - pdf2image
  - aiohttp

## Features

- [x] Upload PDF files via URL
- [x] Extract text and bounding boxes from searchable PDFs
- [x] Perform OCR on scanned PDFs
- [x] Display extracted text alongside the PDF
- [ ] Highlight text and bounding boxes on the PDF
- [x] Responsive and user-friendly interface

## Getting Started

### Prerequisites

- Node.js 19.0+
- Python 3.8+
- Tesseract OCR <code>(for windows)</code>

### Clone the Repository

```bash
git clone https://github.com/your-username/pdf-upload-extraction.git

cd pdf-upload-extraction
```

### Frontend Setup

1. Navigate to the frontend directory:

    ```bash
    cd frontend
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Start the development server:

    ```bash
    npm run dev
    ```

### Backend Setup

1. Navigate to the backend directory:

    ```bash
    cd backend
    ```

2. Create a virtual environment and activate it:

    ```bash
    python -m venv venv
    venv\Scripts\activate # On Mac, use `source venv/bin/activate`
    ```

3. Install dependencies:

    ```bash
    pip install -r requirements.txt
    ```

4. Start the FastAPI server:

    ```bash
    uvicorn main:app --reload
    ```

### Environment Variables

Create a `.env` file in the backend directory and add the following environment variables:

```
CLIENT_URL=http://localhost:3000 || https://your-deployed-frontend-url
DATABASE_URL=postgresql://user:password@localhost/dbname
```

Create a `.env` file in the frontent directory and add the following environment variables:

```
NEXT_PUBLIC_API_URL=http://localhost:8000 || https://your-deployed-backend-url
```

### Running the Application

1. Ensure both the frontend and backend servers are running.
2. Open your browser and navigate to `http://localhost:3000`.
3. Test the backend APIs by navigating to `http://localhost:8000/docs`.


## References

- [pdfplumber](https://github.com/jsvine/pdfplumber)
- [pytesseract](https://github.com/madmaze/pytesseract)
- [pdf2image](https://github.com/Belval/pdf2image)
- [React PDF Viewer](https://react-pdf-viewer.dev/)
- [React Markdown](https://github.com/remarkjs/react-markdown)

---

Made with 3 AM Coffee ☕️

Feel free to reach out to me via my Socials for any queries or suggestions!

[![Twitter](https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=x&logoColor=white&)](https://twitter.com/iamamit_18)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=LinkedIn&logoColor=white)](https://www.linkedin.com/in/amit-dewangan/)