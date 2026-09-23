import React from "react";
import { Link, NavLink, Outlet, useMatch } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { useContentPages } from "../../app/common/hooks/useContentPages";
import { ContentPageSummary } from "../../app/models/contentPage";

/* ── Index page: card grid ─────────────────────────────────── */

const DocIndex = ({ pages }: { pages: ContentPageSummary[] }) => (
    <div className="container mx-auto py-8 px-6">
        <div className="text-3xl text-gray-700 font-bold mb-12">Development Documentation</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pages.map((card) =>
                card.comingSoon ? (
                    <div
                        key={card.slug}
                        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col"
                    >
                        <div className="text-xl font-semibold text-gray-800 mb-2">
                            {card.title}
                        </div>
                        <p className="text-gray-500 mb-4 flex-1">{card.description}</p>
                        <span className="inline-block self-start bg-secondary-50 text-gray-400 text-sm font-medium px-3 py-1 rounded-full">
                            Coming soon
                        </span>
                    </div>
                ) : (
                    <Link
                        key={card.slug}
                        to={`/documentation/${card.slug}`}
                        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col hover:shadow-md transition-shadow"
                    >
                        <div className="text-xl font-semibold text-gray-800 mb-2">
                            {card.title}
                        </div>
                        <p className="text-gray-500 mb-4 flex-1">{card.description}</p>
                    </Link>
                )
            )}
        </div>
    </div>
);

/* ── Section nav bar (pill switcher + back link) ───────────── */

const DocNav = ({ pages }: { pages: ContentPageSummary[] }) => (
    <nav className="flex items-center gap-3 px-6 pt-4 pb-2">
        <Link
            to="/documentation"
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1 text-sm font-medium bg-white border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50 transition-colors mr-2"
        >
            <FiArrowLeft className="w-3.5 h-3.5" />
            Dev Docs
        </Link>

        <div className="relative flex-1 min-w-0">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pr-6">
                {pages.map((s) => (
                    <NavLink
                        key={s.slug}
                        to={`/documentation/${s.slug}`}
                        className={({ isActive }) =>
                            `flex-shrink-0 px-3 py-1 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${
                                isActive
                                    ? "bg-link-100 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`
                        }
                    >
                        {s.title}
                    </NavLink>
                ))}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent" />
        </div>
    </nav>
);

/* ── Layout wrapper ────────────────────────────────────────── */

const Documentation = () => {
    const isIndex = useMatch("/documentation");
    const { pages, loading } = useContentPages("documentation");

    if (loading) return <div className="container mx-auto py-8 px-6 text-gray-400">Loading...</div>;

    return (
        <div>
            {isIndex ? (
                <DocIndex pages={pages} />
            ) : (
                <>
                    <DocNav pages={pages} />
                    <Outlet />
                </>
            )}
        </div>
    );
};

export default Documentation;
