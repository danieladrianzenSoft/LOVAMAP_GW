import { FaArrowLeft } from "react-icons/fa";
import { JobDetailed } from "../../app/models/job";

type Props = {
  job: JobDetailed;
  onBack: () => void;
  formatDate: (d: any) => string; // reuse your existing formatDate
  onDownloadResults: (jobId: string, suggestedFileName?: string) => Promise<void>;
};

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="grid grid-cols-12 gap-3 py-2 border-b border-gray-100">
    <div className="col-span-4 md:col-span-3 text-sm text-gray-500">{label}</div>
    <div className="col-span-8 md:col-span-9 text-sm text-gray-800 break-words">
      {value ?? <span className="text-gray-400">—</span>}
    </div>
  </div>
);

const JobDetail: React.FC<Props> = ({ job, onBack, formatDate, onDownloadResults }) => {
  const canDownload =
    (job.status ?? "").toLowerCase() === "completed" && job.hasResults === true;
  
  const handleDownload = async () => {
    if (!job.id) return;
    const fileName = job.fileName ? `${job.fileName}.json` : `${job.id}_results.json`;
    await onDownloadResults(job.id, fileName);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <button
          className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900"
          onClick={onBack}
        >
          <FaArrowLeft />
          <span>Back to Jobs</span>
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="px-5 py-4 border-b border-gray-200">
          <div className="text-xl font-bold text-gray-800">Job Details</div>
          <div className="text-sm text-gray-500 mt-1">
            Id: <span className="text-gray-700">{job.id}</span>
          </div>
        </div>

        <div className="px-5 py-4">
          <Row label="Status" value={job.status} />
          <Row label="Submitted At" value={job.submittedAt ? formatDate(job.submittedAt) : undefined} />
          <Row label="Completed At" value={job.completedAt ? formatDate(job.completedAt) : undefined} />

          {/* <Row label="JobId" value={job.jobId ?? undefined} />
          <Row label="File Name" value={job.fileName ?? undefined} />
          <Row label="Retry Count" value={job.retryCount ?? undefined} /> */}

          <Row
            label="Has Results"
            value={
              job.hasResults === true ? (
                <>
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                    Yes
                  </span>
                  {canDownload && (
                    <div>
                      <button
                        className="button-primary items-center content-center w-32"
                        onClick={handleDownload}
                      >
                        Download
                      </button>
                    </div>
                    
                  )}
                </>
                
              ) : job.hasResults === false ? (
                <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                  No
                </span>
              ) : undefined
            }
          />

          {/* <Row label="Result Path" value={job.resultPath ?? undefined} />
          <Row
            label="Error Message"
            value={
              job.errorMessage ? (
                <div className="rounded-md bg-red-50 border border-red-100 p-3 text-red-700 text-sm">
                  {job.errorMessage}
                </div>
              ) : undefined
            }
          /> */}
        </div>
      </div>
    </div>
  );
};

export default JobDetail;