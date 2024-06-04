import React from "react";
import { Field, ErrorMessage, FormikErrors, FormikTouched, FormikValues } from "formik";

interface Props {
    placeholder: string;
    type: string;
    name: string;
    errors: FormikErrors<FormikValues>;
    touched: FormikTouched<FormikValues>;
    min?: number;
    max?: number;
    step?: number;
    className?: string;  // Optional className for custom styling
}

export default function TextInput(props: Props) {
    return (
        <div className="mb-4">
            <Field
                type={props.type}
                className={`${props.errors[props.name] && props.touched[props.name] ? 'text-input-error' : 'text-input'} ${props.className}`}
                placeholder={props.placeholder}
                name={props.name}
                min={props.min} // Only applied if type is 'number'
                max={props.max} // Only applied if type is 'number'
                step={props.step} // Only applied if type is 'number'
            />
            <ErrorMessage
                name={props.name}
                render={(error) => (
                    <p className="text-red-500 text-xs mt-1 ml-1 tracking-wide">
                        {error}
                    </p>
                )}
            />
        </div>
    );
}