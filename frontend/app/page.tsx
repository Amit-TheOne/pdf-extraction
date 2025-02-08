"use client";

import { useState } from "react";
import PdfUpload from "./components/PdfUpload";
import PdfViewer from "./components/PdfViewer";

export default function Home() {
  const [pdfId, setPdfId] = useState<number | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<string>("");
  const [formattedText, setFormattedText] = useState<string>("");

  const handleUploadSuccess = (data) => {
    setPdfId(data.id);
    setPdfUrl(data.url);
    setExtractedData(data.data);
    setFormattedText(data.formatted_text);
    // console.log(data);
    // console.log(data.formatted_text);
    // console.log(data);
    // console.log(data.id, data.url);
    // console.log(pdfId, pdfUrl);

  };
  // console.log(pdfId, pdfUrl);

  return (
    <div className="p-8 h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-slate-800 via-gray-600 to-slate-900">
      {!pdfId && !pdfUrl ?
        <>
          <div className="text-4xl font-bold text-center mt-16 mb-10 font-cardo text-white">
            PDF Upload & Extraction
          </div>
          <PdfUpload onUploadSuccess={handleUploadSuccess} />
        </>
        : <PdfViewer pdfId={pdfId} pdfUrl={pdfUrl} extractedData={extractedData} formattedText={formattedText} />
      }

      {/* {pdfId && pdfUrl && <PdfViewer pdfId={pdfId} pdfUrl={pdfUrl} extractedData={extractedData} />} */}
      {/* <PdfViewer /> */}
    </div>
  );
}
