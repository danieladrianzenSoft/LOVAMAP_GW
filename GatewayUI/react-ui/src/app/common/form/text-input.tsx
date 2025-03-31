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
    value?: any;
    className?: string;  // Optional className for custom styling
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function TextInput(props: Props) {
    const fieldProps: any = {
        type: props.type,
        className: `${props.errors[props.name] && props.touched[props.name] ? 'text-input-error' : 'text-input'} ${props.className}`,
        placeholder: props.placeholder,
        name: props.name,
        min: props.min,
        max: props.max,
        step: props.step,
    };

    if (props.onChange) fieldProps.onChange = props.onChange;
    if (props.value !== undefined) fieldProps.value = props.value;

    return (
        <div className="mb-4">
            <Field {...fieldProps} />
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