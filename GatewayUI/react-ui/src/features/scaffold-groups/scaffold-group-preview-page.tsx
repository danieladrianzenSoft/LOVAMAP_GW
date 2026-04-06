import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../../app/stores/store';
import { observer } from 'mobx-react-lite';
import ExcelPreview from '../../app/common/excel-preview/excel-preview';
import { downloadScaffoldGroupAsExcel, triggerDownload } from '../../app/common/excel-generator/excel-generator';
import * as XLSX from 'xlsx';
import LoadingSpinner from '../../app/common/loading-spinner/loading-spinner';

const ScaffoldGroupPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { scaffoldGroupStore, commonStore } = useStore();
  const { isLoggedIn } = commonStore;

  const [data, setData] = useState<{
    file: XLSX.WorkBook;
    filename: string;
    headingRowsBySheet?: Record<string, number[]>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const scaffoldGroupId = parseInt(id);
        const result = isLoggedIn
          ? await scaffoldGroupStore.getDetailedScaffoldGroupById({ scaffoldGroupId })
          : await scaffoldGroupStore.getPreviewScaffoldGroupById(scaffoldGroupId);

        if (result) {
          setData(downloadScaffoldGroupAsExcel(result));
        } else {
          setError('Failed to load scaffold group data.');
        }
      } catch {
        setError('Failed to load scaffold group data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isLoggedIn, scaffoldGroupStore]);

  const isAnonymous = !isLoggedIn;

  const onLoginRedirect = isAnonymous
    ? () => {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    : undefined;

  if (loading) {
    return <LoadingSpinner text="Loading preview..." className="h-screen" />;
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-screen text-red-600 text-sm">
        {error || 'No data available.'}
      </div>
    );
  }

  return (
    <ExcelPreview
      data={data}
      handleDownload={triggerDownload}
      allFiles={[data]}
      numRows={100}
      isAnonymous={isAnonymous}
      onLoginRedirect={onLoginRedirect}
    />
  );
};

export default observer(ScaffoldGroupPreviewPage);
