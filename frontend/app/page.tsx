"use client";

import { useState } from "react";
import PdfUpload from "./components/PdfUpload";
import PdfViewer from "./components/PdfViewer";

export default function Home() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<{ text: string; page: number; bbox: number[] }[]>([]);

  interface UploadSuccessData {
    url: string;
    data: [
      {
        text: string;
        page: number;
        bbox: number[];
      }
    ]
  }

  const handleUploadSuccess = (data: UploadSuccessData) => {
    setPdfUrl(data.url);
    setExtractedData(data.data);
  };

  return (
    <div className="p-8 h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-slate-800 via-gray-600 to-slate-900">

      {!pdfUrl ?
        <>
          <div className="text-4xl font-bold text-center mt-16 mb-10 font-cardo text-white">
            PDF Upload & Extraction
          </div>
          <PdfUpload onUploadSuccess={handleUploadSuccess} />
        </>
        : pdfUrl && <PdfViewer pdfUrl={pdfUrl} extractedData={extractedData} />
      }
    </div>
  );
}
