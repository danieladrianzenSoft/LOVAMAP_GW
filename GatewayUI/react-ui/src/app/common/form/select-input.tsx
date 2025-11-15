import React from "react";
import {
  Field,
  ErrorMessage,
  FormikErrors,
  FormikTouched,
  FormikValues,
  useField,
} from "formik";

type OptionValue = string | number | undefined;

export interface SelectOption {
  value?: OptionValue;
  label: React.ReactNode;
  disabled?: boolean;
}

interface Props {
  name: string;
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  compact?: boolean;
  value?: OptionValue;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  errors: FormikErrors<FormikValues>;
  touched: FormikTouched<FormikValues>;
  disabled?: boolean;
}

export default function SelectInput(props: Props) {
	const [field, , helpers] = useField(props.name);

	const hasError =
		(props.errors as any)?.[props.name] && (props.touched as any)?.[props.name];

	const currentValue =
		props.value !== undefined ? props.value : (field.value as OptionValue);
	const hasValue =
		currentValue !== "" && currentValue !== undefined && currentValue !== null;

	const selectValue = (currentValue ?? "") as string;

	const paddingClass = props.compact ? "pt-2 pb-1" : "pt-3 pb-2";

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const raw = e.target.value;
		// Map '' => null (or undefined) in your Formik state if you want a nullish model
		const next = raw === "" ? null : raw;
		if (props.onChange) props.onChange(e);
		else helpers.setValue(next);
	};


	const fieldProps: any = {
		name: props.name,
		disabled: props.disabled,
		value: currentValue ?? "",
		onChange: handleChange, // ✅ always have a handler
		className: `
		peer w-full px-3 ${paddingClass} text border rounded-md outline-none transition-all leading-[1.25rem]
		${hasError ? "border-red-500" : "border-gray-300"} focus:border-blue-600
		focus:ring-0 focus:border-blue-600 bg-white appearance-none
		${props.className || ""}
		`,
	};

  return (
    <div className="relative mb-5">
      {/* Down caret */}
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <svg
          aria-hidden="true"
          className="h-4 w-4 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.17l3.71-2.94a.75.75 0 111.04 1.08l-4.23 3.35a.75.75 0 01-.94 0L5.21 8.31a.75.75 0 01.02-1.1z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {/* The select */}
      <select {...fieldProps}>
        <option value="" disabled hidden>
          {props.placeholder ?? ""}
        </option>
        {props.options.map((opt) => (
          <option
            key={String(opt.value ?? "")}
            value={opt.value ?? ""}
            disabled={opt.disabled}
          >
            {opt.label}
          </option>
        ))}
      </select>

      {/* Floating label */}
      <label
        htmlFor={props.name}
        className={`
          absolute left-2.5 px-1 text-sm bg-white transition-all duration-200 pointer-events-none
          ${hasValue ? "top-[-0.6rem] text-sm text-blue-600" : "top-3 text-base"}
          text-gray-400 peer-focus:top-[-0.6rem] peer-focus:text-sm peer-focus:text-blue-600
        `}
      >
        {props.label}
      </label>

      <ErrorMessage
        name={props.name}
        render={(error) => (
          <p className="text-red-500 text-xs mt-1 ml-1 tracking-wide">{error}</p>
        )}
      />
    </div>
  );
}
