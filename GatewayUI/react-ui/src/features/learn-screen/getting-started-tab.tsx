import React from "react";
import { useContentPage } from "../../app/common/hooks/useContentPage";
import ContentRenderer from "../common/content-renderer";

const GettingStartedTab = () => {
    const { page, loading } = useContentPage("getting-started");

    if (loading || !page) return <div className="container mx-auto py-8 px-6 text-gray-400">Loading...</div>;

    return <ContentRenderer page={page} />;
};

export default GettingStartedTab;
