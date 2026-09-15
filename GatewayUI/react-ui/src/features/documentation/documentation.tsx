import React from "react";
import { useContentPages } from "../../app/common/hooks/useContentPages";

const Documentation = () => {
    const { pages, loading } = useContentPages("documentation");

    if (loading) return <div className="container mx-auto py-8 px-6 text-gray-400">Loading...</div>;

    return (
        <div className="container mx-auto py-8 px-6">
            <div className="text-3xl text-gray-700 font-bold mb-12">Documentation</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {pages.map((card) => (
                    <div
                        key={card.slug}
                        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col"
                    >
                        <div className="text-xl font-semibold text-gray-800 mb-2">
                            {card.title}
                        </div>
                        <p className="text-gray-500 mb-4 flex-1">{card.description}</p>
                        {card.comingSoon && (
                            <span className="inline-block self-start bg-secondary-50 text-gray-400 text-sm font-medium px-3 py-1 rounded-full">
                                Coming soon
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Documentation;
