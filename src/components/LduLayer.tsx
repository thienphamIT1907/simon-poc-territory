import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { Marker } from "@googlemaps/markerclusterer";
import type { LduMarkerData } from "../types";

interface LduLayerProps {
  markers: LduMarkerData[];
  selectedLdus?: string[];
  usedLdus?: string[]; // LDUs already used in created segments (shown as disabled/gray)
  onSelectLdu?: (ldus: string[]) => void;
  onRenderComplete?: () => void;
}

// Group key for lat/lng (exact match without rounding)
function getLocationKey(lat: number, lng: number): string {
  return `${lat.toString()}_${lng.toString()}`;
}

interface GroupedLdu {
  position: google.maps.LatLngLiteral;
  ldus: LduMarkerData[];
  key: string;
}

// Custom cluster renderer for LDU clusters
function createLduClusterRenderer() {
  return {
    render: ({
      count,
      position,
    }: {
      count: number;
      position: google.maps.LatLng;
    }) => {
      const size = Math.min(50, 24 + Math.log2(count) * 6);
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position,
        content: createClusterContent(count, size),
        zIndex: 2000 + count,
      });
      return marker;
    },
  };
}

function createClusterContent(count: number, size: number): HTMLElement {
  const div = document.createElement("div");
  div.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${size}px;
    height: ${size}px;
    background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    color: white;
    font-weight: bold;
    font-size: ${Math.max(10, size / 3)}px;
    cursor: pointer;
    transition: transform 0.2s ease;
  `;
  div.textContent = count.toString();
  div.addEventListener("mouseenter", () => {
    div.style.transform = "scale(1.1)";
  });
  div.addEventListener("mouseleave", () => {
    div.style.transform = "scale(1)";
  });
  return div;
}

function LduLayerComponent({
  markers,
  selectedLdus = [],
  usedLdus = [],
  onSelectLdu,
  onRenderComplete,
}: LduLayerProps) {
  const map = useMap();
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markerElementsRef = useRef<Map<string, Marker>>(new Map());
  const [openPopoverKey, setOpenPopoverKey] = useState<string | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to clear any pending close timeout
  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  // Handle mouse entering marker/popover - keep popover open
  const handleMouseEnter = useCallback((groupKey: string) => {
    clearCloseTimeout();
    setOpenPopoverKey(groupKey);
  }, [clearCloseTimeout]);

  // Handle mouse leaving marker/popover - close with delay to allow moving to popover
  const handleMouseLeave = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setOpenPopoverKey(null);
    }, 150); // 150ms delay for smooth transition between marker and popover
  }, [clearCloseTimeout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Group markers by location
  const groupedMarkers = useMemo<GroupedLdu[]>(() => {
    const groups = new Map<string, LduMarkerData[]>();

    for (const marker of markers) {
      const key = getLocationKey(marker.position.lat, marker.position.lng);
      const existing = groups.get(key) || [];
      existing.push(marker);
      groups.set(key, existing);
    }

    return Array.from(groups.entries()).map(([key, ldus]) => ({
      key,
      position: ldus[0].position,
      ldus,
    }));
  }, [markers]);

  // Check if a group has any selected LDUs
  const isGroupSelected = useCallback(
    (group: GroupedLdu) => {
      return group.ldus.some((ldu) => selectedLdus.includes(ldu.postalCode));
    },
    [selectedLdus]
  );

  // Check if all LDUs in a group are already used (in created segments)
  const isGroupUsed = useCallback(
    (group: GroupedLdu) => {
      // A group is "used" if ALL its LDUs are in usedLdus
      return group.ldus.every((ldu) => usedLdus.includes(ldu.postalCode));
    },
    [usedLdus]
  );

  // Check if a single LDU is used
  const isLduUsed = useCallback(
    (postalCode: string) => usedLdus.includes(postalCode),
    [usedLdus]
  );

  // Initialize the clusterer
  useEffect(() => {
    if (!map) return;

    clustererRef.current = new MarkerClusterer({
      map,
      markers: [],
      renderer: createLduClusterRenderer(),
      algorithmOptions: {
        maxZoom: 10,
      },
    });

    const markerElements = markerElementsRef.current;

    return () => {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current.setMap(null);
      }
      markerElements.clear();
    };
  }, [map]);

  // Update clusterer when markers prop changes
  useEffect(() => {
    if (!clustererRef.current) return;

    const updateMarkersIdle = () => {
      if (clustererRef.current) {
        const markerArray = Array.from(markerElementsRef.current.values());
        clustererRef.current.clearMarkers();
        if (markerArray.length > 0) {
          clustererRef.current.addMarkers(markerArray);
        }
        if (onRenderComplete) {
          onRenderComplete();
        }
      }
    };

    const idleId =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? window.requestIdleCallback(updateMarkersIdle, { timeout: 150 })
        : setTimeout(updateMarkersIdle, 100);

    return () => {
      if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId as number);
      } else {
        clearTimeout(idleId as number);
      }
    };
  }, [groupedMarkers, map, onRenderComplete]);

  // Reset popover when markers change
  useEffect(() => {
    queueMicrotask(() => {
      setOpenPopoverKey(null);
    });
  }, [markers]);

  const setMarkerRef = useCallback((marker: Marker | null, key: string) => {
    if (marker) {
      markerElementsRef.current.set(key, marker);
    } else {
      markerElementsRef.current.delete(key);
    }
  }, []);

  const handleMarkerClick = useCallback(
    (group: GroupedLdu) => {
      // If the entire group is used (all LDUs in created segments), do nothing
      if (isGroupUsed(group)) {
        return;
      }

      // If we have a selection handler, add all postal codes from this group to selection
      if (onSelectLdu) {
        // Filter out any used postal codes - only allow selecting non-used ones
        const availablePostalCodes = group.ldus
          .filter((ldu) => !isLduUsed(ldu.postalCode))
          .map((ldu) => ldu.postalCode);

        if (availablePostalCodes.length === 0) {
          return; // All LDUs are used
        }

        const newSelection = new Set(selectedLdus);

        // Check if all available postal codes in group are already selected
        const allSelected = availablePostalCodes.every((pc) =>
          newSelection.has(pc)
        );

        if (allSelected) {
          // Deselect all
          for (const pc of availablePostalCodes) {
            newSelection.delete(pc);
          }
        } else {
          // Select all available
          for (const pc of availablePostalCodes) {
            newSelection.add(pc);
          }
        }

        onSelectLdu(Array.from(newSelection));
      }
    },
    [onSelectLdu, selectedLdus, isGroupUsed, isLduUsed]
  );

  return (
    <>
      {groupedMarkers.map((group) => {
        const isOpen = openPopoverKey === group.key;
        const hasMultiple = group.ldus.length > 1;
        const firstLdu = group.ldus[0];
        const isSelected = isGroupSelected(group);
        const isUsed = isGroupUsed(group);

        // Determine marker state: used > selected > default
        const markerState = isUsed ? "used" : isSelected ? "selected" : "default";

        // Color classes based on state
        const pinCircleClasses = {
          used: "bg-gray-500 shadow-gray-500/50 ring-2 ring-gray-400 cursor-not-allowed",
          selected: "bg-emerald-500 shadow-emerald-500/50 ring-2 ring-emerald-300",
          default: "bg-blue-600 shadow-blue-600/50",
        }[markerState];

        const pinTriangleClass = {
          used: "border-t-gray-500",
          selected: "border-t-emerald-500",
          default: "border-t-blue-600",
        }[markerState];

        const cityLabelClasses = {
          used: "bg-gray-500 text-white",
          selected: "bg-emerald-500 text-white",
          default: "bg-blue-600 text-white",
        }[markerState];

        return (
          <AdvancedMarker
            key={group.key}
            position={group.position}
            ref={(marker) => setMarkerRef(marker, group.key)}
            title={
              hasMultiple
                ? `${group.ldus.length} postal codes`
                : `${firstLdu.postalCode} - ${firstLdu.city}`
            }
            zIndex={isOpen ? 3000 : isSelected ? 2500 : isUsed ? 1500 : 2000}
            onClick={() => handleMarkerClick(group)}
          >
            <div 
              className="relative"
              onMouseEnter={() => handleMouseEnter(group.key)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Custom Pin Marker */}
              <div
                className={`
                  relative flex flex-col items-center
                  transition-all duration-200 ease-out
                  ${isUsed ? "cursor-not-allowed" : "cursor-pointer"}
                  ${isOpen ? "scale-125" : isUsed ? "scale-100" : "scale-100 hover:scale-110"}
                `}
                style={{ width: '48px', height: '60px' }}
              >
                {/* Pin Shape */}
                <div className="relative">
                  {/* Pin Top Circle with Count */}
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      shadow-lg transition-all duration-200
                      ${pinCircleClasses}
                    `}
                  >
                    <span className="text-white font-bold text-sm">
                      {hasMultiple ? group.ldus.length : '1'}
                    </span>
                  </div>
                  
                  {/* Pin Point (Triangle) */}
                  <div 
                    className={`
                      absolute left-1/2 -translate-x-1/2 top-10.5
                      w-0 h-0 
                      border-l-8 border-l-transparent
                      border-r-8 border-r-transparent
                      border-t-12
                      ${pinTriangleClass}
                    `}
                  />
                </div>

                {/* City name on hover */}
                {isOpen && (
                  <div
                    className={`
                      absolute top-14 whitespace-nowrap px-2 py-1 rounded
                      text-xs font-medium shadow-lg
                      ${cityLabelClasses}
                    `}
                  >
                    {isUsed && <span className="mr-1">✗</span>}
                    {firstLdu.city}
                    {isUsed && <span className="ml-1 text-[10px] opacity-80">(Used)</span>}
                  </div>
                )}
              </div>

              {/* Popover for grouped LDUs */}
              {isOpen && hasMultiple && (
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-16 bg-white rounded-lg shadow-xl border border-slate-200 p-2 min-w-50 max-w-70 max-h-50 overflow-y-auto z-100"
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={() => handleMouseEnter(group.key)}
                  onMouseLeave={handleMouseLeave}
                  onWheel={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <div className="text-xs font-semibold text-slate-700 mb-2 pb-1 border-b border-slate-200">
                    {group.ldus.length} Postal Codes at this location
                  </div>
                  <div className="space-y-1">
                    {group.ldus.map((ldu) => {
                      const lduSelected = selectedLdus.includes(ldu.postalCode);
                      const lduUsed = isLduUsed(ldu.postalCode);
                      
                      // Determine LDU item styling
                      const itemBgClass = lduUsed
                        ? "bg-gray-100 cursor-not-allowed"
                        : lduSelected
                        ? "bg-emerald-100"
                        : "hover:bg-slate-100";
                      
                      const itemTextClass = lduUsed
                        ? "text-gray-500"
                        : lduSelected
                        ? "text-emerald-600"
                        : "text-blue-600";
                      
                      return (
                        <div
                          key={ldu.postalCode}
                          className={`text-xs p-1.5 rounded transition-colors ${itemBgClass}`}
                        >
                          <div className={`font-semibold ${itemTextClass}`}>
                            {lduUsed && "✗ "}
                            {lduSelected && !lduUsed && "✓ "}
                            {ldu.postalCode}
                            {lduUsed && <span className="ml-1 font-normal text-gray-400">(Used)</span>}
                          </div>
                          <div className={lduUsed ? "text-gray-400" : "text-slate-500"}>
                            {ldu.city}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}

export const LduLayer = memo(LduLayerComponent);
