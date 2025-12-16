import { memo } from "react";
import { X, MapPin, User, Layers } from "lucide-react";
import type { Segment } from "../types/segment";
import mockOperators from "../mock/OP/mock-op.json";
import { PROVINCES } from "../constants";

interface Operator {
  id: string;
  name: string;
  province?: string;
  color?: string;
}

interface SegmentDetailPanelProps {
  segment: Segment | null;
  onClose: () => void;
}

function getOperatorName(operatorId: string): string {
  const operator = (mockOperators as Operator[]).find(
    (op) => op.id === operatorId
  );
  return operator?.name || "Unknown Operator";
}

function getOperatorColor(operatorId: string): string {
  const operator = (mockOperators as Operator[]).find(
    (op) => op.id === operatorId
  );
  return operator?.color || "#2563eb";
}

function getProvinceName(code: string): string {
  return PROVINCES.find((p) => p.code === code)?.name || code;
}

function SegmentDetailPanelComponent({
  segment,
  onClose,
}: SegmentDetailPanelProps) {
  if (!segment) return null;

  const operatorColor = getOperatorColor(segment.operatorId);

  return (
    <div
      className="
        absolute right-4 top-4 bottom-4 w-80 z-50
        bg-slate-900/95 backdrop-blur-md
        border border-slate-700/50 rounded-xl
        shadow-2xl overflow-hidden
        animate-in slide-in-from-right duration-300
      "
    >
      {/* Header */}
      <div
        className="p-4 border-b border-slate-700/50"
        style={{ borderLeftColor: operatorColor, borderLeftWidth: 4 }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white truncate">
              {segment.name}
            </h3>
            <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
              <User size={14} className="shrink-0" />
              <span className="truncate">
                {getOperatorName(segment.operatorId)}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="
              p-1.5 rounded-lg
              text-slate-400 hover:text-white
              hover:bg-slate-700/50
              transition-colors shrink-0
            "
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Location Info */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-slate-300">
            <MapPin size={14} className="text-blue-400" />
            <span className="font-medium">{segment.fsaId}</span>
          </div>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">
            {getProvinceName(segment.provinceCode)}
          </span>
        </div>
      </div>

      {/* LDUs Section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 pb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Layers size={14} className="text-emerald-400" />
            <span>LDUs ({segment.ldus.length})</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex flex-wrap gap-1.5">
            {segment.ldus.map((ldu) => (
              <span
                key={ldu}
                className="
                  px-2 py-1 rounded-md text-xs font-mono
                  bg-slate-800 text-slate-300
                  border border-slate-700/50
                "
              >
                {ldu}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer with operator color indicator */}
      <div
        className="p-3 border-t border-slate-700/50"
        style={{ backgroundColor: `${operatorColor}15` }}
      >
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: operatorColor }}
          />
          <span>Assigned to {getOperatorName(segment.operatorId)}</span>
        </div>
      </div>
    </div>
  );
}

export const SegmentDetailPanel = memo(SegmentDetailPanelComponent);
