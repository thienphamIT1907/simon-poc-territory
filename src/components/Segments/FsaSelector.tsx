import { Spin, Select } from "antd";
import { useFsaOptions } from "../../hooks/useFsaOptions";

interface FsaSelectorProps {
  provinceCode: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function FsaSelector({
  provinceCode,
  value,
  onChange,
  disabled,
}: FsaSelectorProps) {
  const { options, isLoading } = useFsaOptions(provinceCode);

  return (
    <Select
      value={value || undefined}
      onChange={onChange}
      options={options}
      placeholder="Select FSA"
      disabled={disabled || !provinceCode}
      className="w-full"
      size="large"
      showSearch
      filterOption={(input, option) =>
        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
      }
      loading={isLoading}
      notFoundContent={isLoading ? <Spin size="small" /> : "No FSA found"}
    />
  );
}
