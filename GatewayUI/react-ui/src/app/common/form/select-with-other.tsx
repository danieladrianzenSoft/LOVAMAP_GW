import React from "react";

type SelectWithOtherProps = {
  label: string;
  value: string;
  otherValue: string;
  onChange: (value: string) => void;
  onOtherChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  onBlur?: () => void;
};

const SelectWithOther: React.FC<SelectWithOtherProps> = ({
  label,
  value,
  otherValue,
  onChange,
  onOtherChange,
  options,
  error,
  onBlur,
}) => {
  const isOther = value === "other";

  return (
    <div className="flex flex-col text-sm">
      <label className="text-gray-500 mb-1">{label}</label>
      <select
        value={isOther ? "other" : value}
        onChange={(e) => {
          onChange(e.target.value);
          if (e.target.value !== "other") onOtherChange("");
        }}
        onBlur={onBlur}
        className={`px-3 py-2 bg-white border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
          error ? "border-red-400" : "border-gray-200"
        }`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {isOther && (
        <input
          type="text"
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          onBlur={onBlur}
          placeholder="Please specify..."
          className={`mt-2 px-3 py-2 bg-white border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
            error ? "border-red-400" : "border-gray-200"
          }`}
        />
      )}
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  );
};

export default SelectWithOther;
