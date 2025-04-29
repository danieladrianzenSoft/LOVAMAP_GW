import React from 'react';
import { FaTimes } from 'react-icons/fa';

interface TagProps {
    text: string;
    showRemove?: boolean;
    onRemove?: (text: string) => void;
}

const Tag: React.FC<TagProps> = ({ text, showRemove = false, onRemove }) => {
    return (
        <span className="flex items-center bg-gray-200 text-gray-700 text-xs px-2.5 py-0.5 rounded-lg space-x-1">
            {showRemove && (
                <button
                    type="button"
                    className="text-gray-500 hover:text-red-500 focus:outline-none"
                    onClick={() => onRemove?.(text)}
                >
                    <FaTimes size={10} />
                </button>
            )}
            <span>{text}</span>
        </span>
        // <span className="bg-gray-200 text-gray-700 text-xs px-2.5 py-0.5 rounded-lg">
        //     {text}
        // </span>
    );
};

export default Tag;