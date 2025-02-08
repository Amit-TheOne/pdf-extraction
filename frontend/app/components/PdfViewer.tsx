"use client";

import { useEffect, useRef, useState, useMemo, useCallback  } from "react";
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


export default function PdfViewer({ pdfId, pdfUrl, extractedData, formattedText }) {
  // const { textData, bboxData, textLoading, bboxLoading } = usePdfData(pdfId);
  const defaultLayout = defaultLayoutPlugin();
  const highlightPluginInstance = highlightPlugin();
  const { highlight } = highlightPluginInstance;
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [pageScale, setPageScale] = useState(1); // Track PDF zoom level
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

    // Append Fabric.js canvas inside PDF container
    // pdfContainerRef.current.appendChild(fabricCanvas.lowerCanvasEl);

    // Match canvas size to PDF container
    // const container = pdfContainerRef.current;
    // if (container) {
    // fabricCanvas.setDimensions({
    //   width: container.clientWidth,
    //   height: container.clientHeight,
    // });
    // }

    fabricCanvas.setDimensions({
      width: pdfViewerLayer.clientWidth,
      height: pdfViewerLayer.clientHeight,
    });

    setOverlayReady(true); // Overlay is now properly set

    // Draw bounding boxes
    // bboxData.forEach((bbox) => {
    // extractedData.forEach((item) => {
    //   const rect = new Rect({
    //     left: item.bbox[0] * scale,
    //     top: item.bbox[1] * scale,
    //     width: (item.bbox[2] - item.bbox[0]) * scale,
    //     height: (item.bbox[3] - item.bbox[1]) * scale,
    //     fill: "rgba(255, 0, 0, 0.9)",
    //     stroke: "red",
    //     strokeWidth: 2,
    //     selectable: false,
    //     text: item.text, // Store text for easy reference
    //   });
    //   fabricCanvas.add(rect);
    // });

    // let index = 0;

    // Render bounding boxes in batches to avoid UI freeze
    // const renderBoundingBoxes = () => {
    //   for (let i = 0; i < 50 && index < extractedData.length; i++, index++) {
    //     const item = extractedData[index];
    //     const rect = new Rect({
    //       left: item.bbox[0],
    //       top: item.bbox[1],
    //       width: item.bbox[2] - item.bbox[0],
    //       height: item.bbox[3] - item.bbox[1],
    //       // fill: "rgba(255, 0, 0, 0.3)",
    //       stroke: "red",
    //       strokeWidth: 2,
    //       selectable: false,
    //       text: item.text,
    //     });
    //     fabricCanvas.add(rect);
    //   }

    //   if (index < extractedData.length) {
    //     requestAnimationFrame(renderBoundingBoxes); // Schedule next batch
    //   }
    // };

    // requestAnimationFrame(renderBoundingBoxes);

    // return () => {
    //   fabricCanvas.dispose();
    // };

    return () => {
      fabricCanvas.dispose();
      pdfViewerLayer.removeChild(canvasElement);
    };
  }, []);
  // }, [extractedData, scale]);

  // 🛠 **Efficient Bounding Box Highlighting**
  const handleTextClick = useCallback((text) => {
    setSelectedText(text);

    if (!fabricCanvasRef.current || !extractedData || !overlayReady) return;
    fabricCanvasRef.current.clear();

    const matchingItems = extractedData.filter((item) => item.text === text);

    requestAnimationFrame(() => {
      matchingItems.forEach((item) => {
        highlight({
          pageIndex: item.page - 1,
          text: item.text,
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
        fabricCanvasRef.current.add(rect);
      });

      fabricCanvasRef.current.renderAll();
    });
  }, [extractedData, overlayReady]);

   // 🛠 **Memoized Extracted Text Rendering**
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
  }, [extractedData, selectedText, handleTextClick]);

  // const handleTextClick = (text: string) => {
  //   setSelectedText(text);

  //   // if (!fabricCanvasRef.current || !extractedData) return;
  //   if (!fabricCanvasRef.current || !extractedData || !overlayReady) return;

  //   fabricCanvasRef.current.clear(); // Remove old bounding boxes

  //   // Highlight bounding box of clicked text
  //   // if (fabricCanvasRef.current) {
  //   //   fabricCanvasRef.current.getObjects().forEach((obj) => {
  //   //     if (obj instanceof Rect) {
  //   //       obj.set("fill", obj.text === text ? "rgba(255, 0, 0, 0.3)" : "rgba(255, 0, 0, 0.5)");
  //   //     }
  //   //   });
  //   //   fabricCanvasRef.current.renderAll();
  //   // }

  //   // if (!extractedData || !highlight) return;

  //   const matchingItems = extractedData.filter((item) => item.text === text);

  //   matchingItems.forEach((item) => {
  //     // Apply text highlight inside PDF
  //     highlight({
  //       pageIndex: item.page - 1, // Ensure page indexing starts from 0
  //       text: item.text,
  //       bbox: item.bbox,

  //       // annotation: {
  //       //   comment: "Highlighted Text",
  //       //   icon: <MessageIcon />,
  //       // },
  //     });
  //     console.log(item.bbox);
  //     console.log(item.text);

  //     // Draw bounding box for selected text
  //     const rect = new Rect({
  //       left: item.bbox[0],
  //       top: item.bbox[1],
  //       width: item.bbox[2] - item.bbox[0],
  //       height: item.bbox[3] - item.bbox[1],
  //       fill: "rgba(0, 255, 0, 0.3)", // Green highlight for selected text
  //       stroke: "green",
  //       strokeWidth: 2,
  //       selectable: false,
  //     });
  //     fabricCanvasRef.current.add(rect);
  //   });

  //   // matchingItems.forEach((item) => {
  //   //   const rect = new Rect({
  //   //     left: item.bbox[0],
  //   //     top: item.bbox[1],
  //   //     width: item.bbox[2] - item.bbox[0],
  //   //     height: item.bbox[3] - item.bbox[1],
  //   //     fill: "rgba(0, 255, 0, 0.3)", // Green highlight for selected text
  //   //     stroke: "green",
  //   //     strokeWidth: 2,
  //   //     selectable: false,
  //   //   });
  //   //   fabricCanvasRef.current.add(rect);
  //   // });

  //   fabricCanvasRef.current.renderAll();
  // };

  // Handle PDF zoom updates
  // const handleZoomChange = (newScale: number) => {
  //   setPageScale(newScale);
  // };

  // console.log(formattedText)

  // const formatText = extractedData
  //   .map((item, index) => `<span key={${index}} class="clickable-text">${item.text}</span>`)
  //   .join(" ");

  // const formatText = extractedData.map((item, index) => (
  //   <span
  //     key={index} // ✅ Correctly assign key inside JSX
  //     className="clickable-text"
  //     // onClick={() => handleTextClick(item.text)}
  //   >
  //     {item.text}{" "}
  //   </span>
  // ));
  

  return (
    <div className="flex h-full">
      {/* PDF Viewer */}
      <div ref={pdfContainerRef} className="relative w-5/12 overflow-hidden">
        <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`}>
          <Viewer
            // ref={canvasRef}
            // fileUrl="https://youlearn-content-uploads.s3.amazonaws.com/content/b5671201db3042a08a93deaab2e3b8e7.pdf"
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
              // p: ({ node, children }) => <p className="">{children}</p>, // Adds space before paragraphs
              // li: ({ node, children }) => <li className="ml-6 list-disc">{children}</li>, // Formats lists
              // pre: ({ node, children }) => (
              //   <pre className="bg-gray-900 text-white p-4 rounded-md overflow-x-auto">{children}</pre>
              // ), // Formats preformatted text
              // text: ({ children }) => {
              //   //   // Find matching text in extractedData to get bounding box info
              //   const matchingItem = extractedData.find((item) => item.text === children);

              //   console.log("Rendered Text:", children); // Debug log to verify if text is rendered
              //   return (
              //     <span
              //       className={`cursor-pointer hover:bg-green-400 ${selectedText === children ? "bg-yellow-200" : ""
              //         }`}
              //       onClick={() => matchingItem && handleTextClick(matchingItem.text)}
              //     >
              //       {children}
              //     </span>
              //   )
              // }

              // span: ({ children }) => (
              //   <span
              //     className="cursor-pointer hover:bg-green-400"
              //     onClick={() => console.log("Clicked:", children)}
              //   >
              //     {children}
              //   </span>
              // ),

              // <span
              //   className="cursor-pointer hover:bg-green-400"
              //   onClick={() => {
              //     console.log("Clicked Text:", children); // Debug log to verify click event
              //   }}
              // >
              //   {children}
              // </span>


              // );
              // },

              // span: ({ children }) => (
              //   <span
              //     className="cursor-pointer hover:bg-green-400"
              //     onClick={() => console.log("Clicked:", children)}
              //   >
              //     {children}
              //   </span>
              // ),

              // p: ({ children }) => {
              //   console.log("Rendered Paragraph:", children); // Debug: See what ReactMarkdown is rendering
              //   return <p className="mb-4">{children}</p>;
              // },
              // text: ({ children }) => {
              //   console.log("Rendered Text:", children); // Debug: Check how text is passed
              //   return (
              //     <span
              //       className="cursor-pointer hover:bg-green-400"
              //       onClick={() => console.log("Clicked Text:", children)}
              //     >
              //       {children}
              //     </span>
              //   );
              // },

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
            {/* {textData?.map((item) => `**Page ${item.page_number}:** ${item.text}`).join("\n\n")} */}
            {/* {extractedData?.map((item) => `${item.text}`).join(" ")} */}
            {/* {extractedData?.map((item) => item.text).join(" ")} */}

            {/* {formatText} */}

            {/* {formatText} */}

            {/* {formatText.map((item) => item.props.children).join("")} */}
            {formatText.map((item) => item.props.children).join(" ")}
            
            {/* Wrap in <div> for performance optimization */}

            {/* {extractedData
              .map((item, index) => `<span key={index} class="clickable-text">${item.text}</span>`)
              .join(" ")} */}

            {/* {extractedData
              ?.map((item) => item.text)
              .join("\n\n")
              .replace(/\s{2,}/g, " ")
              .replace(/\n\s*\n/g, "\n\n")
            } */}

            {/* {formattedText?.map((item) => item.text).join("")} */}
            {/* {formattedText} */}

            {/* {textData?.map((item) => ( */}
            {/* {/* {extractedData?.map((item) => (
              <div
                key={item.text}
                className={`cursor-pointer hover:bg-gray-200 ${selectedText === item.text ? "bg-yellow-200" : ""
                  }`}
                onClick={() => handleTextClick(item.text)}
              >
                {item.text}
              </div>
            ))} */}

            {/* {extractedData?.map((item, index) => (
            <p
              key={index}
              className={`selection:bg-yellow-200 ${selectedText === item.text
                }`}
              onClick={() => handleTextClick(item.text)}
            >
              {item.text}
            </p>
          ))} */}
          </ReactMarkdown>

          {/* {extractedData?.map((item, index) => (
            <div
              key={index}
              className={`selection:bg-yellow-200 ${selectedText === item.text
                }`}
              onClick={() => handleTextClick(item.text)}
            >
              {item.text}
            </div>
          ))} */}

        </div>
      </div>
    </div>
  );
}
