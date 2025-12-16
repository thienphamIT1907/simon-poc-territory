import { useNavigate } from "react-router-dom";
import { Trash2, MapPin } from "lucide-react";
import { Badge, ConfigProvider, theme, Tooltip } from "antd";
import { PROVINCES } from "../../constants";
import type { Segment, Operator } from "../../types/segment";
import operatorsData from "../../mock/OP/mock-op.json";

const operators: Operator[] = operatorsData as Operator[];

interface SegmentsListProps {
  segments: Segment[];
  onDelete: (id: string) => void;
}

export function SegmentsList({ segments, onDelete }: SegmentsListProps) {
  const navigate = useNavigate();

  const getOperatorName = (operatorId: string) => {
    return operators.find((o) => o.id === operatorId)?.name || "Unknown";
  };

  const getProvinceName = (code: string) => {
    return PROVINCES.find((p) => p.code === code)?.name || code;
  };

  const handleNavigateToMap = () => {
    navigate("/map");
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#dc2626",
        },
      }}
    >
      <div className="h-full flex flex-col overflow-hidden">
        <header className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            Saved Segments ({segments.length})
          </h2>
          <button
            onClick={handleNavigateToMap}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <MapPin size={18} />
            View Map
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {segments.length === 0 ? (
            <div className="text-center text-slate-400 py-12">
              <p>No segments created yet.</p>
              <p className="text-sm mt-2">
                Use the form on the left to create segments.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {segments.map((segment) => (
                <div
                  key={segment.id}
                  className="p-4 bg-slate-800 rounded-lg border border-slate-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-lg truncate">
                        {segment.name}
                      </div>
                      <div className="text-sm text-slate-400 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <span>
                          Province: {getProvinceName(segment.provinceCode)}
                        </span>
                        <span>FSA: {segment.fsaId}</span>
                        <span>
                          Operator: {getOperatorName(segment.operatorId)}
                        </span>
                      </div>

                      {/* LDU Badges */}
                      {segment.ldus.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs text-slate-400 mb-2">
                            LDUs ({segment.ldus.length}):
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {segment.ldus.slice(0, 10).map((ldu) => (
                              <Badge
                                key={ldu}
                                count={ldu}
                                style={{
                                  backgroundColor: "#334155",
                                  color: "#e2e8f0",
                                  fontSize: "11px",
                                }}
                                showZero
                              />
                            ))}
                            {segment.ldus.length > 10 && (
                              <Tooltip
                                title={segment.ldus.slice(10).join(", ")}
                              >
                                <Badge
                                  count={`+${segment.ldus.length - 10} more`}
                                  style={{
                                    backgroundColor: "#475569",
                                    color: "#e2e8f0",
                                    fontSize: "11px",
                                  }}
                                />
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onDelete(segment.id)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors ml-4"
                      title="Delete segment"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ConfigProvider>
  );
}
