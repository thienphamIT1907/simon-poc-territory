import { Select } from "antd";
import { PROVINCES } from "../../constants";

interface ProvinceSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ProvinceSelector({
  value,
  onChange,
  disabled,
}: ProvinceSelectorProps) {
  const options = PROVINCES.map((province) => ({
    value: province.code,
    label: `${province.name} (${province.alias})`,
  }));

  return (
    <Select
      value={value || undefined}
      onChange={onChange}
      options={options}
      placeholder="Select Province"
      disabled={disabled}
      className="w-full"
      size="large"
      showSearch
      filterOption={(input, option) =>
        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
      }
    />
  );
}
