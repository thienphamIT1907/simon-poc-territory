import { useMemo, useState, useCallback, useEffect } from "react";
import {
  ConfigProvider,
  Select,
  Spin,
  theme,
  Tooltip,
  Input,
  Form,
} from "antd";
import { CheckCircle, Search, X, MapPlus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useFsaOptions } from "../hooks/useFsaOptions";
import { useLduData } from "../hooks/useLduData";
import { OperatorSelector } from "./Segments/OperatorSelector";
import type { ProvinceInfo, LduMarkerData } from "../types";
import type { Segment } from "../types/segment";
import { debounce } from "../utils/debounce";
import { calculateConvexHull } from "../utils/geometry";

interface MapFsaSelectorProps {
  selectedProvince?: ProvinceInfo;
  selectedFsaId: string | null;
  onSelectFsa: (fsaId: string | null) => void;
  // LDU selection props
  selectedLdus: string[];
  onSelectLdus: (ldus: string[]) => void;
  onCancelLduSelection: () => void;
  onCreateSegment?: (segment: Segment) => void;
  // Used data from created segments
  usedOperators?: string[];
}

const DEBOUNCE_MS = 300;

// Group LDUs by location (same lat/lng)
interface GroupedLduOption {
  value: string; // First postal code in group
  label: string;
  allPostalCodes: string[]; // All postal codes at this location
  city: string;
  position: google.maps.LatLngLiteral;
}

function groupLdusByLocation(markers: LduMarkerData[]): GroupedLduOption[] {
  const groups = new Map<string, LduMarkerData[]>();

  for (const marker of markers) {
    const key = `${marker.position.lat.toFixed(
      6
    )}_${marker.position.lng.toFixed(6)}`;
    const existing = groups.get(key) || [];
    existing.push(marker);
    groups.set(key, existing);
  }

  return Array.from(groups.values())
    .map((group) => {
      const first = group[0];
      const postalCodes = group.map((m) => m.postalCode);
      return {
        value: first.postalCode,
        label: first.postalCode,
        allPostalCodes: postalCodes,
        city: first.city,
        position: first.position,
      };
    })
    .sort((a, b) => a.value.localeCompare(b.value));
}

/**
 * FSA selector overlay for the map.
 * Positioned on the top-left corner with search and single-select functionality.
 * Also shows LDU selection panel when LDUs are selected.
 */
export function MapFsaSelector({
  selectedProvince,
  selectedFsaId,
  onSelectFsa,
  selectedLdus,
  onSelectLdus,
  onCancelLduSelection,
  onCreateSegment,
  usedOperators = [],
}: MapFsaSelectorProps) {
  const { options, isLoading, error } = useFsaOptions(selectedProvince);

  // Load LDU data for the selected FSA
  const { lduMarkers } = useLduData({
    selectedProvince,
    selectedFsaId,
  });

  const [searchValue, setSearchValue] = useState("");
  const [lduSearchValue, setLduSearchValue] = useState("");

  const [form] = Form.useForm();

  // Group LDU options
  const groupedLduOptions = useMemo(
    () => groupLdusByLocation(lduMarkers),
    [lduMarkers]
  );

  const hasSelectedLdus = selectedLdus.length > 0;

  // Set default segment name when FSA or LDU selection changes
  useEffect(() => {
    if (selectedFsaId && hasSelectedLdus) {
      // Basic naming convention: FSA-Count-Index (using timestamp for uniqueness in name suggestion)
      form.setFieldsValue({
        name: `${selectedFsaId}-${Date.now()}`,
        operatorId: undefined,
      });
    } else {
      form.resetFields();
    }
  }, [selectedFsaId, hasSelectedLdus, form]);

  // Debounced search handler
  const debouncedSetSearch = useMemo(
    () => debounce((value: string) => setSearchValue(value), DEBOUNCE_MS),
    []
  );

  const debouncedSetLduSearch = useMemo(
    () => debounce((value: string) => setLduSearchValue(value), DEBOUNCE_MS),
    []
  );

  const handleSearch = useCallback(
    (value: string) => {
      debouncedSetSearch(value);
    },
    [debouncedSetSearch]
  );

  const handleLduSearch = useCallback(
    (value: string) => {
      debouncedSetLduSearch(value);
    },
    [debouncedSetLduSearch]
  );

  const handleChange = useCallback(
    (value: string | undefined) => {
      onSelectFsa(value || null);
      setSearchValue("");
      // Reset segment form
      form.resetFields();
    },
    [onSelectFsa, form]
  );

  const handleClear = useCallback(() => {
    onSelectFsa(null);
    setSearchValue("");
    onCancelLduSelection();
    // Reset segment form
    form.resetFields();
  }, [onSelectFsa, onCancelLduSelection, form]);

  const handleCreateSegment = useCallback(
    (values: { name: string; operatorId: string }) => {
      if (!selectedProvince || !selectedFsaId || !onCreateSegment) {
        return;
      }

      const { name, operatorId } = values;

      // Identify selected groups and their locations
      const selectedGroups = groupedLduOptions.filter((g) =>
        g.allPostalCodes.some((pc) => selectedLdus.includes(pc))
      );

      const groupLocations = selectedGroups.map((g) => ({
        location: g.position,
        postalCodes: g.allPostalCodes,
      }));

      // Calculate geometry
      let geometry: Segment["geometry"];
      // Extract just lat/lng for calculation
      const points = selectedGroups.map((g) => g.position);

      if (points.length === 1) {
        geometry = {
          type: "Circle",
          center: points[0],
          radius: 500, // 500 meters default radius
        };
      } else if (points.length >= 2) {
        const hull = calculateConvexHull(points);
        geometry = {
          type: "Polygon",
          coordinates: hull,
        };
      }

      const newSegment: Segment = {
        id: uuidv4(),
        name,
        provinceCode: selectedProvince.code,
        fsaId: selectedFsaId,
        ldus: selectedLdus,
        operatorId,
        geometry,
        groupedLdus: groupLocations,
      };

      onCreateSegment(newSegment);

      // Reset form fields (name, operator)
      form.resetFields();
      
      // Clear LDU selection after successful segment creation
      // Keep FSA selected so user can quickly create another segment
      onSelectLdus([]);
    },
    [
      selectedProvince,
      selectedFsaId,
      selectedLdus,
      onCreateSegment,
      onSelectLdus,
      groupedLduOptions,
      form,
    ]
  );

  const handleLduChange = useCallback(
    (values: string[]) => {
      // When a grouped option is selected, include all postal codes in that group
      const allSelected = new Set<string>();
      for (const val of values) {
        const group = groupedLduOptions.find(
          (g) => g.value === val || g.allPostalCodes.includes(val)
        );
        if (group) {
          for (const pc of group.allPostalCodes) {
            allSelected.add(pc);
          }
        } else {
          allSelected.add(val);
        }
      }
      onSelectLdus(Array.from(allSelected));
      setLduSearchValue(""); // Reset search on selection
    },
    [groupedLduOptions, onSelectLdus]
  );

  // Filter options based on search value
  const filteredOptions = useMemo(() => {
    if (!searchValue) return options;
    const lowerSearch = searchValue.toLowerCase();
    return options.filter((opt) =>
      opt.value.toLowerCase().includes(lowerSearch)
    );
  }, [options, searchValue]);

  // Filter LDU options based on search
  const filteredLduOptions = useMemo(() => {
    if (!lduSearchValue) return groupedLduOptions;
    const lowerSearch = lduSearchValue.toLowerCase();
    return groupedLduOptions.filter(
      (opt) =>
        opt.value.toLowerCase().includes(lowerSearch) ||
        opt.city.toLowerCase().includes(lowerSearch)
    );
  }, [groupedLduOptions, lduSearchValue]);

  // Don't show if no province selected
  if (!selectedProvince) {
    return null;
  }

  return (
    <div className="absolute top-4 left-4 z-40">
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: "#10b981",
            borderRadius: 8,
          },
        }}
      >
        <div className="bg-slate-800/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-700/50 overflow-hidden w-100">
          {/* Header */}
          <div className="px-4 py-2 bg-linear-to-r from-emerald-600/20 to-teal-600/20 border-b border-slate-700/50">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Search size={14} className="text-emerald-400" />
              <span>Search FSA in {selectedProvince.alias}</span>
            </div>
          </div>

          {/* Select */}
          <div className="p-3 min-w-70">
            <Select
              value={selectedFsaId || undefined}
              onChange={handleChange}
              onSearch={handleSearch}
              options={filteredOptions}
              placeholder="Type to search FSA..."
              className="w-full"
              size="large"
              showSearch
              allowClear
              onClear={handleClear}
              filterOption={false}
              loading={isLoading}
              notFoundContent={
                isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Spin size="small" />
                    <span className="ml-2 text-slate-400">Loading FSAs...</span>
                  </div>
                ) : error ? (
                  <div className="text-red-400 py-2">{error}</div>
                ) : searchValue ? (
                  <div className="text-slate-400 py-2">
                    No FSA found for "{searchValue}"
                  </div>
                ) : (
                  <div className="text-slate-400 py-2">No FSAs available</div>
                )
              }
              dropdownStyle={{
                maxHeight: 300,
              }}
            />
          </div>

          {/* Selected FSA indicator with LDU count */}
          {selectedFsaId && (
            <div className="px-3 pb-3">
              <div className="flex items-center justify-between bg-emerald-600/20 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-300 text-sm font-medium animate-pulse">
                    Selected: {selectedLdus.length} / {lduMarkers.length} LDUs
                  </span>
                </div>
                <button
                  onClick={handleClear}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="Clear selection"
                >
                  <X size={14} className="text-slate-400" />
                </button>
              </div>
            </div>
          )}

          {/* LDU Selection Panel - only show when LDUs are selected */}
          {selectedFsaId && selectedLdus.length > 0 && (
            <div className="px-3 pb-3 border-t border-slate-700/50 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-medium">
                  Selected LDUs
                </span>
                <button
                  onClick={onCancelLduSelection}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
              <Select
                mode="multiple"
                menuItemSelectedIcon={
                  <CheckCircle className="absolute left-0" />
                }
                suffix={false}
                value={groupedLduOptions
                  .filter((g) =>
                    g.allPostalCodes.some((pc) => selectedLdus.includes(pc))
                  )
                  .map((g) => g.value)}
                onChange={handleLduChange}
                onSearch={handleLduSearch}
                className="w-full"
                size="middle"
                showSearch
                filterOption={false}
                placeholder="Search LDUs..."
                optionRender={(option) => {
                  const group = groupedLduOptions.find(
                    (g) => g.value === option.value
                  );
                  if (!group) return option.label;

                  const hasMultiple = group.allPostalCodes.length > 1;
                  return (
                    <div className="flex items-center justify-between gap-2">
                      <span className="pl-5">
                        {`${group.value.slice(0, 3)} ${group.value.slice(3)}`} -{" "}
                        {group.city}
                      </span>
                      {hasMultiple && (
                        <Tooltip
                          title={
                            <div>
                              <div className="font-semibold mb-1">
                                Postal codes at this location:
                              </div>
                              {group.allPostalCodes.slice(1).map((pc) => (
                                <div key={pc}>{pc}</div>
                              ))}
                            </div>
                          }
                        >
                          <span className="text-xs font-medium border rounded-2xl px-2 mr-2 bg-white text-black flex justify-center gap-x-1">
                            +{group.allPostalCodes.length - 1} LDUs
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  );
                }}
                options={filteredLduOptions.map((g) => ({
                  value: g.value,
                  label: `${g.value.slice(0, 3)} ${g.value.slice(3)}`,
                }))}
              />

              {/* Segment Details Form */}
              <div className="mt-4 space-y-3 pt-3 border-t border-slate-700/50">
                <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
                  <MapPlus size={14} className="text-emerald-400" />
                  <span>New Segment Details</span>
                </div>

                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleCreateSegment}
                  requiredMark={false}
                >
                  <Form.Item
                    name="name"
                    label={
                      <span className="text-xs text-slate-400">
                        Segment Name
                      </span>
                    }
                    rules={[
                      {
                        required: true,
                        message: "Please enter a segment name",
                      },
                    ]}
                    className="mb-3"
                  >
                    <Input
                      placeholder="Enter segment name"
                      className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </Form.Item>

                  <Form.Item
                    name="operatorId"
                    label={
                      <span className="text-xs text-slate-400">
                        Assign Operator
                      </span>
                    }
                    rules={[
                      { required: true, message: "Please select an operator" },
                    ]}
                    className="mb-4"
                  >
                    <OperatorSelector
                      value={form.getFieldValue("operatorId")}
                      onChange={(val) => form.setFieldValue("operatorId", val)}
                      size="middle"
                      disabledValues={usedOperators}
                    />
                  </Form.Item>

                  <Form.Item className="mb-0">
                    <button
                      type="submit"
                      className="w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"
                    >
                      Create Segment
                    </button>
                  </Form.Item>
                </Form>
              </div>
            </div>
          )}
        </div>
      </ConfigProvider>
    </div>
  );
}
