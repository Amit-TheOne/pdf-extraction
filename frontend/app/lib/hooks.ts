import { useQuery } from "@tanstack/react-query";
import { fetchPdfText, fetchBoundingBoxes } from "./api";

export const usePdfData = (pdfId: number) => {
  const { data: textData, isLoading: textLoading } = useQuery({
    queryKey: ["pdfText", pdfId],
    queryFn: () => fetchPdfText(pdfId),
    enabled: !!pdfId, // Only fetch if pdfId exists
  });

  const { data: bboxData, isLoading: bboxLoading } = useQuery({
    queryKey: ["pdfBoundingBoxes", pdfId],
    queryFn: () => fetchBoundingBoxes(pdfId),
    enabled: !!pdfId,
  });

  return { textData, textLoading, bboxData, bboxLoading };
};
