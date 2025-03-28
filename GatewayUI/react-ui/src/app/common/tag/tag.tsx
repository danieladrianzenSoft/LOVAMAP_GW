import React from 'react';

interface TagProps {
    text: string;
}

const Tag: React.FC<TagProps> = ({ text }) => {
    return (
        <span className="bg-gray-200 text-gray-700 text-xs px-2.5 py-0.5 rounded-lg">
            {text}
        </span>
    );
};

export default Tag;