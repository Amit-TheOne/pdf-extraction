import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const uploadPdf = async (pdfUrl: string) => {
  const response = await axios.post(`${API_BASE_URL}/extract`, { pdf_url: pdfUrl });
  return response.data;
};

// For future use

// Fetch extracted text from FastAPI
export const fetchPdfText = async (pdfId: number) => {
  const response = await axios.get(`${API_BASE_URL}/pdf/${pdfId}/text`);
  return response.data.texts;
};

// Fetch bounding boxes from FastAPI
export const fetchBoundingBoxes = async (pdfId: number) => {
  const response = await axios.get(`${API_BASE_URL}/pdf/${pdfId}/bounding_boxes`);
  return response.data.bounding_boxes;
};
