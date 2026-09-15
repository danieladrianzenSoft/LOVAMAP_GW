import React from "react";
import { useContentPage } from "../../app/common/hooks/useContentPage";
import ContentRenderer from "../common/content-renderer";

const Compare2d3dTab = () => {
    const { page, loading } = useContentPage("compare-2d-3d");

    if (loading || !page) return <div className="container mx-auto py-8 px-6 text-gray-400">Loading...</div>;

    return <ContentRenderer page={page} />;
};

export default Compare2d3dTab;
