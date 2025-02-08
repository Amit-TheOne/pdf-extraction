"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Viewer, Worker, SpecialZoomLevel } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { highlightPlugin } from "@react-pdf-viewer/highlight";
// import { usePdfData } from "@/lib/hooks";
import { Canvas, Rect } from "fabric";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "@react-pdf-viewer/highlight/lib/styles/index.css";


interface PdfViewerProps {
  pdfId: number;
  pdfUrl: string;
  extractedData: { text: string; page: number; bbox: number[] }[];
  formattedText: string;
}

// export default function PdfViewer({ pdfId ,pdfUrl, extractedData, formattedText }: PdfViewerProps) {
export default function PdfViewer({ pdfUrl, extractedData }: PdfViewerProps) {
  // const { textData, bboxData, textLoading, bboxLoading } = usePdfData(pdfId);
  const defaultLayout = defaultLayoutPlugin();
  const highlightPluginInstance = highlightPlugin();
  const { jumpToHighlightArea } = highlightPluginInstance;
  const [selectedText, setSelectedText] = useState<string | null>(null);
  // const [scale, setScale] = useState(1);
  // const [pageScale, setPageScale] = useState(1); // Track PDF zoom level
  // const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);
  const [overlayReady, setOverlayReady] = useState(false);


  // Initialize Fabric.js Overlay
  useEffect(() => {
    if (!pdfContainerRef.current) return;

    // Initialize Fabric.js canvas

    const pdfViewerLayer = pdfContainerRef.current.querySelector(".rpv-core__page-layer");
    if (!pdfViewerLayer) return;

    // Create a Fabric.js overlay canvas
    const canvasElement = document.createElement("canvas");
    canvasElement.style.position = "absolute";
    canvasElement.style.top = "0";
    canvasElement.style.left = "0";
    canvasElement.style.pointerEvents = "none"; // Prevent blocking interactions

    pdfViewerLayer.appendChild(canvasElement);


    const fabricCanvas = new Canvas(canvasElement, { selection: false });
    fabricCanvasRef.current = fabricCanvas;


    fabricCanvas.setDimensions({
      width: pdfViewerLayer.clientWidth,
      height: pdfViewerLayer.clientHeight,
    });

    setOverlayReady(true); // Overlay is now properly set

    return () => {
      fabricCanvas.dispose();
      pdfViewerLayer.removeChild(canvasElement);
    };
  }, []);


  // Efficient Bounding Box Highlighting
  interface ExtractedDataItem {
    text: string;
    page: number;
    bbox: number[];
  }

  type HandleTextClick = (text: string) => void;

  const handleTextClick: HandleTextClick = useCallback((text: string) => {
    setSelectedText(text);

    if (!fabricCanvasRef.current || !extractedData || !overlayReady) return;
    fabricCanvasRef.current.clear();

    const matchingItems: ExtractedDataItem[] = extractedData.filter((item) => item.text === text);

    requestAnimationFrame(() => {
      matchingItems.forEach((item) => {
        jumpToHighlightArea({
          pageIndex: item.page - 1,
          left: item.bbox[0],
          top: item.bbox[1],
          width: item.bbox[2] - item.bbox[0],
          height: item.bbox[3] - item.bbox[1],
        });

        const rect = new Rect({
          left: item.bbox[0],
          top: item.bbox[1],
          width: item.bbox[2] - item.bbox[0],
          height: item.bbox[3] - item.bbox[1],
          fill: "rgba(0, 255, 0, 0.3)",
          stroke: "green",
          strokeWidth: 2,
          selectable: false,
        });
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.add(rect);
        }
      });

      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.renderAll();
      }
    });
  }, [extractedData, overlayReady, jumpToHighlightArea]);

  // Memoized Extracted Text Rendering
  const formatText = useMemo(() => {
    // const matchingItem = extractedData.find((item) => item.text === children);

    return extractedData.map((item, index) => (
      <span
        key={index}
        // className={`cursor-pointer clickable-text hover:bg-green-400 ${
        //   selectedText === item.text ? "bg-yellow-300" : ""
        // }`}
        className="clickable-text"
      // onClick={() => matchingItem && handleTextClick(matchingItem.text)}
      // onClick={() => handleTextClick(item.text)}
      >
        {item.text}
      </span>
    ));
  }, [extractedData]);


  return (
    <div className="flex h-full">
      {/* PDF Viewer */}
      <div ref={pdfContainerRef} className="relative w-5/12 overflow-hidden">
        <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`}>
          <Viewer
            fileUrl={pdfUrl}
            plugins={[defaultLayout, highlightPluginInstance]}
            defaultScale={SpecialZoomLevel.PageFit} // Ensure proper scaling
          // onZoom={handleZoomChange} // Capture zoom changes
          />
        </Worker>
        {/* <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none border-2 border-black bg-yellow-200"/> */}
      </div>

      {/* Extracted Text */}
      <div className="ml-8 px-4 py-4 w-7/12 bg-gray-200 text-zinc-950 ">
        {/* <h2>Extracted Text</h2> */}
        <div className="h-full overflow-auto px-4 py-6">
          <ReactMarkdown
            className="break-words whitespace-pre-wrap text-center leading-6 text-sm"
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]} // Enables raw HTML rendering
            components={{
              span: ({ children }) => {
                const matchingItem = extractedData.find((item) => item.text === children);

                return (
                  <span
                    className={`cursor-pointer ${selectedText === children ? "bg-yellow-200" : "bg-yellow-950"
                      }`}
                    onClick={() => matchingItem && handleTextClick(matchingItem.text)}
                  >
                    {children}
                  </span>
                )
              }
            }}
          >
            {formatText.map((item) => item.props.children).join(" ")}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
