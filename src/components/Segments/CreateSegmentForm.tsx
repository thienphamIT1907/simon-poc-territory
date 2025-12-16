import { useState, useCallback } from "react";
import { MapPlus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { twMerge } from "tailwind-merge";
import { ConfigProvider, Input, theme } from "antd";
import { ProvinceSelector } from "./ProvinceSelector";
import { FsaSelector } from "./FsaSelector";
import { OperatorSelector } from "./OperatorSelector";
import { LduSelector } from "./LduSelector";
import type { Segment, SegmentFormItem } from "../../types/segment";

interface CreateSegmentFormProps {
  onSave: (segments: Segment[]) => void;
}

export function CreateSegmentForm({ onSave }: CreateSegmentFormProps) {
  // Form state
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>("");
  const [selectedFsaId, setSelectedFsaId] = useState<string>("");
  const [amount, setAmount] = useState<number>(1);
  const [segmentItems, setSegmentItems] = useState<SegmentFormItem[]>([]);

  // Reset form values when province changes
  const handleProvinceChange = useCallback((value: string) => {
    setSelectedProvinceCode(value);
    // Reset dependent fields
    setSelectedFsaId("");
    setAmount(1);
    setSegmentItems([]);
  }, []);

  // Generate segment items helper
  const generateSegmentItems = useCallback(
    (count: number, fsaId: string, currentItems: SegmentFormItem[] = []) => {
      const newItems: SegmentFormItem[] = [];
      for (let i = 0; i < count; i++) {
        if (currentItems[i]) {
          newItems.push({
            ...currentItems[i],
            name: `${fsaId}-${i + 1}`,
          });
        } else {
          newItems.push({
            id: uuidv4(),
            name: `${fsaId}-${i + 1}`,
            ldus: [],
            operatorId: "",
          });
        }
      }
      return newItems;
    },
    []
  );

  // Reset dependent fields when FSA changes
  const handleFsaChange = useCallback(
    (value: string) => {
      setSelectedFsaId(value);
      // Initialize with 1 segment if FSA is selected
      if (value) {
        setAmount(1);
        setSegmentItems(generateSegmentItems(1, value, []));
      } else {
        setSegmentItems([]);
      }
    },
    [generateSegmentItems]
  );

  // Handle amount change
  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(1, parseInt(e.target.value) || 1);
      setAmount(value);
      if (selectedFsaId) {
        setSegmentItems((prev) =>
          generateSegmentItems(value, selectedFsaId, prev)
        );
      }
    },
    [selectedFsaId, generateSegmentItems]
  );

  // Update segment item
  const handleUpdateItem = useCallback(
    (id: string, field: keyof SegmentFormItem, value: string | string[]) => {
      setSegmentItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        )
      );
    },
    []
  );

  // Delete segment item
  const handleDeleteItem = useCallback(
    (id: string) => {
      setSegmentItems((prev) => {
        if (prev.length <= 1) return prev;
        const newItems = prev.filter((item) => item.id !== id);
        // Rename items to preserve sequence
        return newItems.map((item, index) => ({
          ...item,
          name: `${selectedFsaId}-${index + 1}`,
        }));
      });
      setAmount((prev) => Math.max(1, prev - 1));
    },
    [selectedFsaId]
  );

  // Save segments
  const handleSave = useCallback(() => {
    if (!selectedProvinceCode || !selectedFsaId || segmentItems.length === 0) {
      return;
    }

    // Validate all items have operator
    const invalidItems = segmentItems.filter((item) => !item.operatorId);
    if (invalidItems.length > 0) {
      return;
    }

    // Create segments
    const newSegments: Segment[] = segmentItems.map((item) => ({
      id: item.id,
      name: item.name,
      provinceCode: selectedProvinceCode,
      fsaId: selectedFsaId,
      ldus: item.ldus,
      operatorId: item.operatorId,
    }));

    onSave(newSegments);

    // Reset form completely including province
    setSelectedProvinceCode("");
    setSelectedFsaId("");
    setAmount(1);
    setSegmentItems([]);
  }, [selectedProvinceCode, selectedFsaId, segmentItems, onSave]);

  const isFormValid =
    selectedProvinceCode &&
    selectedFsaId &&
    segmentItems.length > 0 &&
    segmentItems.every((item) => item.operatorId);

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
        <header className="p-4 border-b border-slate-700 bg-slate-800/50">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPlus size={24} />
            Create Segment
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Province Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Province <span className="text-red-500">*</span>
            </label>
            <ProvinceSelector
              value={selectedProvinceCode}
              onChange={handleProvinceChange}
            />
          </div>

          {/* FSA Selector */}
          <div
            className={twMerge(
              "space-y-2",
              !selectedProvinceCode && "opacity-30"
            )}
          >
            <label className="text-sm font-medium text-slate-300">
              FSA <span className="text-red-500">*</span>
            </label>
            <FsaSelector
              provinceCode={selectedProvinceCode}
              value={selectedFsaId}
              onChange={handleFsaChange}
              disabled={!selectedProvinceCode}
            />
          </div>

          {/* Amount */}
          <div className={twMerge("space-y-2", !selectedFsaId && "opacity-30")}>
            <label className="text-sm font-medium text-slate-300">
              Amount of Segments
            </label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={handleAmountChange}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={!selectedFsaId}
            />
          </div>

          {/* Segment Items */}
          {segmentItems.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">
                Segment Items ({segmentItems.length})
              </label>
              {segmentItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-700/50 rounded-lg border border-slate-600 space-y-3 mt-2"
                >
                  <div className="flex items-center gap-2">
                    {/* Segment Name */}
                    <Input
                      size="large"
                      type="text"
                      value={item.name}
                      onChange={(e) =>
                        handleUpdateItem(item.id, "name", e.target.value)
                      }
                      className="flex-1 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      placeholder="Segment name"
                    />

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      disabled={segmentItems.length <= 1}
                      className="p-1.5 text-red-400 hover:bg-red-500/20 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title={
                        segmentItems.length <= 1
                          ? "Cannot delete last item"
                          : "Delete item"
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* LDU Selector */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">LDUs</label>
                    <LduSelector
                      provinceCode={selectedProvinceCode}
                      fsaId={selectedFsaId}
                      value={item.ldus}
                      onChange={(ldus) =>
                        handleUpdateItem(item.id, "ldus", ldus)
                      }
                      size="large"
                      disabledValues={segmentItems
                        .filter((s) => s.id !== item.id)
                        .flatMap((s) => s.ldus)
                      }
                    />
                    {item.ldus.length > 0 && (
                      <div className="text-xs text-slate-400">
                        Selected: {item.ldus.length} LDU(s)
                      </div>
                    )}
                  </div>

                  {/* Operator Selector */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">
                      Operator <span className="text-red-500">*</span>
                    </label>
                    <OperatorSelector
                      value={item.operatorId}
                      onChange={(value: string) =>
                        handleUpdateItem(item.id, "operatorId", value)
                      }
                      size="large"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!isFormValid}
            className={twMerge(
              "w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors",
              !isFormValid && "opacity-30"
            )}
          >
            Save Segments
          </button>
        </div>
      </div>
    </ConfigProvider>
  );
}
