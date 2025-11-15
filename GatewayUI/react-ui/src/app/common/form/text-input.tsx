// import React from "react";
// import { Field, ErrorMessage, FormikErrors, FormikTouched, FormikValues, useField } from "formik";

// interface Props {
//     label?: string;
//     placeholder?: string;
//     type: string;
//     name: string;
//     errors: FormikErrors<FormikValues>;
//     touched: FormikTouched<FormikValues>;
//     min?: number;
//     max?: number;
//     step?: number;
//     value?: any;
//     className?: string;  // Optional className for custom styling
//     autoComplete?: string;
//     compact?: boolean;
//     onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
// }

// export default function TextInput(props: Props) {
//     const hasError = props.errors[props.name] && props.touched[props.name];
//     // const [field] = useField(props.name);
//     const [field, meta, helpers] = useField(props.name);
//     const hasValue = (props.value ?? field.value) !== "";

//     const paddingClass = props.compact ? "pt-2 pb-1" : "pt-3 pb-2";
    
//     const fieldProps: any = {
//         type: props.type,
//         name: props.name,
//         min: props.min,
//         max: props.max,
//         step: props.step,
//         autoComplete: props.autoComplete,
//         placeholder: " ", // key for floating label trick
//         className: `
//             peer w-full px-3 ${paddingClass} text border 
//             rounded-md outline-none transition-all leading-[1.25rem]
//             ${hasError ? "border-red-500" : "border-gray-300"} focus:border-blue-600
//             focus:ring-0 focus:border-blue-600 
//             ${props.className || ""}
//             `,
//     };
  
//     if (props.onChange) fieldProps.onChange = props.onChange;
//     if (props.value !== undefined) fieldProps.value = props.value;

//     return (
//         <div className="relative mb-5">
//         <Field {...fieldProps} />
//         <label
//             htmlFor={props.name}
//             className={`
//                 absolute left-2.5 px-1 text-sm bg-white transition-all duration-200 pointer-events-none
//                 ${hasValue
//                     ? "top-[-0.6rem] text-sm text-blue-600"
//                     : "top-3 text-base"}
//                 text-gray-400 peer-focus:top-[-0.6rem] peer-focus:text-sm peer-focus:text-blue-600
//             `}
//         >
//             {props.label}
//         </label>
//         <ErrorMessage
//             name={props.name}
//             render={(error) => (
//                 <p className="text-red-500 text-xs mt-1 ml-1 tracking-wide">{error}</p>
//             )}
//         />
//         </div>
//     );
// }

import React from "react";
import {
  ErrorMessage,
  FormikErrors,
  FormikTouched,
  FormikValues,
  useField,
} from "formik";

interface Props {
  label?: string;
  placeholder?: string;
  type: string;
  name: string;
  errors: FormikErrors<FormikValues>;
  touched: FormikTouched<FormikValues>;
  min?: number;
  max?: number;
  step?: number;
  value?: any;
  className?: string;  // Optional className for custom styling
  autoComplete?: string;
  compact?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function TextInput(props: Props) {
  const hasError = (props.errors as any)[props.name] && (props.touched as any)[props.name];
  const [field, , helpers] = useField(props.name);

  // Normalize the value so the DOM never sees null/undefined
  const rawValue = props.value ?? field.value;
  const inputValue =
    rawValue === null || rawValue === undefined ? "" : rawValue; // ✅ never null

  // For number inputs, let the user type freely (store string while typing).
  // Optionally coerce on blur.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (props.onChange) return props.onChange(e);
    helpers.setValue(e.target.value); // keep as string during typing
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // optional: coerce numbers to number|null on blur
    if (props.type === "number") {
      const v = e.target.value.trim();
      helpers.setValue(v === "" ? null : Number(v));
    }
  };

  const hasValue = inputValue !== "";

  const paddingClass = props.compact ? "pt-2 pb-1" : "pt-3 pb-2";

  return (
    <div className="relative mb-5">
      <input
        type={props.type}
        name={props.name}
        min={props.min}
        max={props.max}
        step={props.step}
        autoComplete={props.autoComplete}
        placeholder=" " // key for floating label trick
        value={inputValue}               // ✅ never null/undefined
        onChange={handleChange}          // ✅ controlled
        onBlur={handleBlur}              // ✅ optional number coercion
        className={`
          peer w-full px-3 ${paddingClass} text border 
          rounded-md outline-none transition-all leading-[1.25rem]
          ${hasError ? "border-red-500" : "border-gray-300"} focus:border-blue-600
          focus:ring-0 focus:border-blue-600 
          ${props.className || ""}
        `}
      />

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
