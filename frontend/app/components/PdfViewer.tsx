"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Viewer, Worker, SpecialZoomLevel } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { highlightPlugin } from "@react-pdf-viewer/highlight";
import { Canvas, Rect } from "fabric";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "@react-pdf-viewer/highlight/lib/styles/index.css";

interface ExtractedDataItem {
  text: string;
  page: number;
  bbox: number[];
}

interface PdfViewerProps {
  pdfUrl: string;
  extractedData: ExtractedDataItem[];
}

// This hook manages the PDF viewer's scale and viewport
const usePdfViewport = () => {
  const [scale, setScale] = useState(1);
  
  return {
    scale,
    setScale,
  };
};

// Enhanced canvas management with coordinate transformation
const useFabricCanvas = (pdfContainerRef: React.RefObject<HTMLDivElement | null>, scale: number) => {
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [overlayReady, setOverlayReady] = useState(false);

  // Function to transform PDF coordinates to canvas coordinates
  const transformCoordinates = useCallback((bbox: number[]) => {
    return {
      left: bbox[0] * scale,
      top: bbox[1] * scale,
      width: (bbox[2] - bbox[0]) * scale,
      height: (bbox[3] - bbox[1]) * scale,
    };
  }, [scale]);

  // Function to draw highlight rectangle
  const drawHighlight = useCallback((bbox: number[]) => {
    if (!fabricCanvasRef.current) return;

    const coords = transformCoordinates(bbox);
    const rect = new Rect({
      ...coords,
      fill: "rgba(255, 255, 0, 0.3)",
      stroke: "rgba(255, 255, 0, 0.5)",
      strokeWidth: 1,
      selectable: false,
    });

    fabricCanvasRef.current.add(rect);
    fabricCanvasRef.current.renderAll();
  }, [transformCoordinates]);

  // Initialize canvas
  useEffect(() => {
    if (!pdfContainerRef.current) return;

    const pdfViewerLayer = pdfContainerRef.current.querySelector(".rpv-core__page-layer");
    if (!pdfViewerLayer) return;

    const canvasElement = document.createElement("canvas");
    canvasElement.style.position = "absolute";
    canvasElement.style.top = "0";
    canvasElement.style.left = "0";
    canvasElement.style.pointerEvents = "none";
    canvasElement.style.zIndex = "1";

    pdfViewerLayer.appendChild(canvasElement);

    const fabricCanvas = new Canvas(canvasElement, {
      selection: false,
      renderOnAddRemove: true,
    });
    fabricCanvasRef.current = fabricCanvas;

    // Update canvas dimensions
    const updateDimensions = () => {
      fabricCanvas.setDimensions({
        width: pdfViewerLayer.clientWidth,
        height: pdfViewerLayer.clientHeight,
      });
    };

    updateDimensions();
    setOverlayReady(true);

    // Handle resize
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(pdfViewerLayer);

    return () => {
      resizeObserver.disconnect();
      fabricCanvas.dispose();
      pdfViewerLayer.removeChild(canvasElement);
    };
  }, [pdfContainerRef]);

  return {
    fabricCanvasRef,
    overlayReady,
    drawHighlight,
    clearHighlights: () => fabricCanvasRef.current?.clear(),
  };
};

// Component for displaying and handling extracted text
const ExtractedTextDisplay = ({
  extractedData,
  selectedText,
  onTextClick,
  onTextSelection,
}: {
  extractedData: ExtractedDataItem[];
  selectedText: string | null;
  onTextClick: (text: string, item: ExtractedDataItem) => void;
  onTextSelection: () => void;
}) => {
  // Group text items by page for better organization
  const textByPage = useMemo(() => {
    const grouped = new Map<number, ExtractedDataItem[]>();
    extractedData.forEach(item => {
      if (!grouped.has(item.page)) {
        grouped.set(item.page, []);
      }
      grouped.get(item.page)?.push(item);
    });
    return grouped;
  }, [extractedData]);

  return (
    <div className="ml-8 px-4 py-4 w-7/12 bg-gray-200 text-zinc-950">
      <div className="h-full overflow-auto px-4 py-6">
        {Array.from(textByPage.entries()).map(([page, items]) => (
          <div key={page} className="mb-6">
            <h3 className="text-sm font-semibold mb-2">Page {page}</h3>
            <ReactMarkdown
              className="prose max-w-none"
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                p: ({children }) => (
                  <p
                    className={`inline clickable-text ${
                      selectedText === children?.toString() ? "bg-yellow-300" : ""
                    }`}
                    onClick={() => onTextClick(children?.toString() || "", items[0])}
                    onMouseUp={onTextSelection}
                  >
                    {children}
                  </p>
                ),
              }}
            >
              {items.map(item => item.text).join(" ")}
              {/* Ensure proper spacing */}
            </ReactMarkdown>
          </div>
        ))}
      </div>
    </div>
  );
};


export default function PdfViewer({ pdfUrl, extractedData }: PdfViewerProps) {
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Initialize viewport management
  const { scale } = usePdfViewport();
  
  // Initialize plugins
  const defaultLayout = defaultLayoutPlugin();
  const highlightPluginInstance = highlightPlugin();
  const { jumpToHighlightArea } = highlightPluginInstance;

  // Initialize canvas with scale
  const { overlayReady, drawHighlight, clearHighlights } = useFabricCanvas(pdfContainerRef, scale);

  // Handle highlighting of text in both views
  const handleHighlight = useCallback((text: string) => {
    if (!overlayReady) return;

    // Clear previous highlights
    clearHighlights();
    setSelectedText(text);

    // Find all matching text instances
    const matchingItems = extractedData.filter(entry => entry.text === text);

    // Apply highlights to all matches
    matchingItems.forEach(matchItem => {
      // Jump to the page containing the highlight
      jumpToHighlightArea({
        pageIndex: matchItem.page - 1,
        left: matchItem.bbox[0],
        top: matchItem.bbox[1],
        width: matchItem.bbox[2] - matchItem.bbox[0],
        height: matchItem.bbox[3] - matchItem.bbox[1],
      });

      // Draw highlight on the canvas
      drawHighlight(matchItem.bbox);
    });
  }, [extractedData, overlayReady, jumpToHighlightArea, drawHighlight, clearHighlights]);

  // Handle text selection from either view
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // Find matching item in extracted data
    const matchingItem = extractedData.find(item => item.text === selectedText);
    if (matchingItem) {
      handleHighlight(selectedText);
    }
  }, [extractedData, handleHighlight]);

  // Handle PDF viewer scale changes
  // const handleScaleChange = useCallback((newScale: number) => {
  //   setScale(newScale);
  //   // Redraw highlights with new scale
  //   if (selectedText) {
  //     const matchingItem = extractedData.find(item => item.text === selectedText);
  //     if (matchingItem) {
  //       handleHighlight(selectedText);
  //     }
  //   }
  // }, [setScale, selectedText, extractedData, handleHighlight]);

  return (
    <div className="flex h-full">
      <div ref={pdfContainerRef} className="relative w-5/12 overflow-hidden">
        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
          <Viewer
            fileUrl={pdfUrl}
            plugins={[defaultLayout, highlightPluginInstance]}
            defaultScale={SpecialZoomLevel.PageFit}
            // onScaleChange={handleScaleChange}
          />
        </Worker>
      </div>

      <ExtractedTextDisplay
        extractedData={extractedData}
        selectedText={selectedText}
        onTextClick={handleHighlight}
        onTextSelection={handleTextSelection}
      />
    </div>
  );
}