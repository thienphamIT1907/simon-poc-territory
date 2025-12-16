import { Toaster } from "react-hot-toast";
import { CreateSegmentForm } from "../components/Segments/CreateSegmentForm";
import { SegmentsList } from "../components/Segments/SegmentsList";
import { useSegments } from "../hooks/useSegments";

export function SegmentsManagementPage() {
  const { segments, createSegments, deleteSegment } = useSegments();

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-900">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#1e293b",
            color: "#fff",
            border: "1px solid #334155",
          },
          success: {
            iconTheme: {
              primary: "#22c55e",
              secondary: "#fff",
            },
          },
        }}
      />

      {/* Left Panel - Create Form (50%) */}
      <div className="w-1/2 h-full bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden">
        <CreateSegmentForm onSave={createSegments} />
      </div>

      {/* Right Panel - Segments List (50%) */}
      <div className="w-1/2 h-full flex flex-col overflow-hidden">
        <SegmentsList segments={segments} onDelete={deleteSegment} />
      </div>
    </div>
  );
}
