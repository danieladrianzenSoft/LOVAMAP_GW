import { FaInfoCircle } from "react-icons/fa";
import ReactMarkdown from "react-markdown";

interface DescriptorTypeInfoProps {
  label: string;
  tableLabel: string;
  imageUrl?: string;
  description: string;
}

const DescriptorTypeInfo: React.FC<DescriptorTypeInfoProps> = ({ label, tableLabel, imageUrl, description }) => {
  return (
    <div className="relative group flex items-center space-x-1">
      <span>{label}</span>

      <div className="relative">
        {/* Info Icon */}
        <div className="ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            window.open('/learn', '_blank');
          }}
        >
          <FaInfoCircle />
        </div>

        {/* Tooltip */}
        <div className="absolute left-4 top-full mt-1 w-64 p-2 bg-white border border-gray-300 rounded shadow-lg z-50 hidden group-hover:block text-left">
          <div className="font-semibold text-sm text-gray-800 mb-1">{tableLabel}</div>

          {imageUrl && (
            <img
              src={imageUrl}
              alt={tableLabel}
              className="w-full h-auto max-h-24 object-contain mb-2 rounded"
            />
          )}

          <div className="text-xs text-gray-600 max-h-24 overflow-y-auto">
            <ReactMarkdown className="markdown-content">
              {description}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DescriptorTypeInfo;