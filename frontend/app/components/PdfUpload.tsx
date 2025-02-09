"use client";

import { useState } from "react";
import { uploadPdf } from "@/lib/api";
import Loading from "./Loading";

interface UploadSuccessData {
    id: number;
    url: string;
    data: [
        {
            text: string;
            page: number;
            bbox: number[];
        }
    ];
    formatted_text: string;
}

export default function PdfUpload({
    onUploadSuccess,
}: {
    onUploadSuccess: (data: UploadSuccessData) => void;
}) {
    const [pdfUrl, setPdfUrl] = useState("");
    const [loading, setLoading] = useState(false);

    const handleUpload = async () => {
        if (!pdfUrl) return alert("Enter a valid PDF URL");
        setLoading(true);

        try {
            const data = await uploadPdf(pdfUrl);
            setLoading(false);
            onUploadSuccess(data);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
            setLoading(false);
            alert("Failed to process PDF");
        }
    };

    return (
        <div className="m-24">
            {loading && <Loading />}

            <div className="text-3xl text-center mb-8 text-white">
                Enter PDF URL ⬇️
            </div>
            <div className="flex flex-col justify-center items-center">
                <input
                    type="text"
                    placeholder="https://virtualfair.sarsef.org/wp-content/uploads/2024/02/HS-BEH22-virtual_presentation.....pdf"
                    className="border-4 p-4 w-4/6 border-white rounded-md"
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                />
                <button
                    onClick={handleUpload}
                    className="bg-slate-950 hover:bg-opacity-60 text-white font-semibold p-4 mt-6 rounded-md"
                >
                    Process PDF
                </button>
            </div>
        </div>
    );
}
