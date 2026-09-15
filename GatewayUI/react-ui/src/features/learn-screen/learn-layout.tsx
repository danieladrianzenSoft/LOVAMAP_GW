import React from "react";
import { Link, NavLink, Outlet, useMatch } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { useContentPages } from "../../app/common/hooks/useContentPages";
import { ContentPageSummary } from "../../app/models/contentPage";

/* ── Index page: card grid ─────────────────────────────────── */

const LearnIndex = ({ pages }: { pages: ContentPageSummary[] }) => (
    <div className="container mx-auto py-8 px-6">
        <div className="text-3xl text-gray-700 font-bold mb-12">Learn</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pages.map((s) =>
                s.comingSoon ? (
                    <div
                        key={s.slug}
                        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col opacity-80"
                    >
                        <div className="text-xl font-semibold text-gray-800 mb-2">{s.title}</div>
                        <p className="text-gray-500 mb-4 flex-1">{s.description}</p>
                        <span className="inline-block self-start bg-secondary-50 text-gray-400 text-sm font-medium px-3 py-1 rounded-full">
                            Coming soon
                        </span>
                    </div>
                ) : (
                    <Link
                        key={s.slug}
                        to={`/learn/${s.slug}`}
                        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col hover:shadow-md transition-shadow"
                    >
                        <div className="text-xl font-semibold text-gray-800 mb-2">{s.title}</div>
                        <p className="text-gray-500 mb-4 flex-1">{s.description}</p>
                    </Link>
                )
            )}
        </div>
    </div>
);

/* ── Section nav bar (pill switcher + back link) ───────────── */

const SectionNav = ({ pages }: { pages: ContentPageSummary[] }) => (
    <nav className="flex items-center gap-3 px-6 pt-4 pb-2 flex-wrap">
        <Link
            to="/learn"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mr-2"
        >
            <FiArrowLeft className="w-4 h-4" />
            Learn
        </Link>

        {pages.map((s) => (
            <NavLink
                key={s.slug}
                to={`/learn/${s.slug}`}
                className={({ isActive }) =>
                    `px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                        isActive
                            ? "bg-link-100 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`
                }
            >
                {s.title}
            </NavLink>
        ))}
    </nav>
);

/* ── Layout wrapper ────────────────────────────────────────── */

const LearnLayout = () => {
    const isIndex = useMatch("/learn");
    const { pages, loading } = useContentPages("learn");

    if (loading) return <div className="container mx-auto py-8 px-6 text-gray-400">Loading...</div>;

    return (
        <div>
            {isIndex ? (
                <LearnIndex pages={pages} />
            ) : (
                <>
                    <SectionNav pages={pages} />
                    <Outlet />
                </>
            )}
        </div>
    );
};

export default LearnLayout;
