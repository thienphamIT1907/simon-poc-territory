import { useMemo } from "react";
import { Select, Tooltip } from "antd";
import type { Operator } from "../../types/segment";
import operatorsData from "../../mock/OP/mock-op.json";

const operators: Operator[] = operatorsData as Operator[];

interface OperatorSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: "small" | "middle" | "large";
  disabledValues?: string[]; // Operator IDs that should be disabled (already used in segments)
}

export function OperatorSelector({
  value,
  onChange,
  disabled,
  size = "large",
  disabledValues = [],
}: OperatorSelectorProps) {
  const options = useMemo(() => {
    return operators.map((op) => {
      const isUsed = disabledValues.includes(op.id);
      return {
        value: op.id,
        label: isUsed ? (
          <Tooltip title="Already assigned to a segment" placement="right">
            <span className="text-gray-400">
              {op.name} <span className="text-xs">(Used)</span>
            </span>
          </Tooltip>
        ) : (
          op.name
        ),
        disabled: isUsed,
      };
    });
  }, [disabledValues]);

  return (
    <Select
      value={value || undefined}
      onChange={onChange}
      options={options}
      placeholder="Select Operator"
      disabled={disabled}
      className="w-full"
      size={size}
      showSearch
      filterOption={(input, option) => {
        // Extract text content for filtering
        const label = operators.find((op) => op.id === option?.value)?.name ?? "";
        return label.toLowerCase().includes(input.toLowerCase());
      }}
    />
  );
}
