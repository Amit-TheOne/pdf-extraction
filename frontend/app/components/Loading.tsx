export default function Loading() {
  return (
    <div className="flex justify-center items-center h-screen w-screen bg-gray-900 bg-opacity-70 fixed top-0 left-0 z-50">
      <div className="animate-ping rounded-full h-20 w-20 border-4 border-white" />
    </div>
  );
}