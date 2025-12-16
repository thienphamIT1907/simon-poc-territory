import { useState, useEffect, useMemo } from "react";
import { Select, Spin } from "antd";
import { PROVINCES } from "../../constants";

interface LduSelectorProps {
  provinceCode: string;
  fsaId: string;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  size?: "small" | "middle" | "large";
  disabledValues?: string[]; // LDUs that should be disabled (already used)
}

interface LduOption {
  value: string;
  label: string;
  city: string;
  disabled?: boolean;
}

export function LduSelector({
  provinceCode,
  fsaId,
  value,
  onChange,
  disabled,
  size = "middle",
  disabledValues = [],
}: LduSelectorProps) {
  const [options, setOptions] = useState<LduOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const province = useMemo(
    () => PROVINCES.find((p) => p.code === provinceCode),
    [provinceCode]
  );

  useEffect(() => {
    if (!province || !fsaId) {
      setOptions([]);
      return;
    }

    const loadLduData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/src/mock/ldu/${province.firstCharOfCode}-${province.alias}-ldu.geojson`
        );
        if (response.ok) {
          const data = await response.json();
          // Filter LDUs by selected FSA
          const filtered = data.features
            .filter(
              (f: { properties: { fsa: string } }) => f.properties.fsa === fsaId
            )
            .map((f: { properties: { postalCode: string; city: string } }) => ({
              value: f.properties.postalCode,
              label: `${f.properties.postalCode.slice(
                0,
                3
              )} ${f.properties.postalCode.slice(3)} - ${f.properties.city}`,
              city: f.properties.city,
            }));
          // Remove duplicates by postalCode
          const uniqueLdus = Array.from(
            new Map(filtered.map((l: LduOption) => [l.value, l])).values()
          ) as LduOption[];
          // Mark options as disabled if in disabledValues (but allow current selections)
          const optionsWithDisabled = uniqueLdus
            .sort((a, b) => a.value.localeCompare(b.value))
            .map((opt) => ({
              ...opt,
              disabled:
                disabledValues.includes(opt.value) &&
                !value.includes(opt.value),
            }));
          setOptions(optionsWithDisabled);
        }
      } catch (error) {
        console.error("Failed to load LDU data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLduData();
  }, [province, fsaId]);

  return (
    <Select
      mode="multiple"
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Select LDUs"
      disabled={disabled || !fsaId}
      className="w-full"
      size={size}
      showSearch
      filterOption={(input, option) =>
        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
      }
      loading={isLoading}
      notFoundContent={isLoading ? <Spin size="small" /> : "No LDUs found"}
      maxTagCount="responsive"
    />
  );
}
