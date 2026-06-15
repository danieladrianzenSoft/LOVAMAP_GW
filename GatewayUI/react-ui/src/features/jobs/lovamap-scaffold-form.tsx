import React, { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { FaChevronDown, FaSpinner, FaCheckCircle } from "react-icons/fa";
import { SaveLovamapResultRequest } from "../../app/models/job";
import { useStore } from "../../app/stores/store";
import { ScaffoldGroup } from "../../app/models/scaffoldGroup";
import { PACKING_CONFIGS } from "../../constants/packing-configurations";
import { PARTICLE_DISPERSITIES } from "../../constants/particle-dispersities";
import { PARTICLE_SHAPES } from "../../constants/particle-shapes";
import { PARTICLE_STIFFNESSES } from "../../constants/particle-stiffnesses";
import { CONTAINER_SHAPES } from "../../constants/container-shapes";
import { ImageCategory, ImageToCreate } from "../../app/models/image";
import ScreenshotViewer from "../visualization/screenshot-viewer";

type Props = {
  jobId: string;
  results: any;
  onClose: () => void;
  onSaved?: (scaffoldGroupId: number, scaffoldId?: number) => void;
};

function computeMeanStdDev(values: number[]): { mean: number; stdDev: number } {
  if (!values || values.length === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return { mean, stdDev: Math.sqrt(variance) };
}

const ReadOnlyField: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex flex-col text-sm">
    <span className="text-gray-500 mb-1">{label}</span>
    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-500">
      {value}
    </div>
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
}> = ({ label, value, onChange, options, error }) => (
  <div className="flex flex-col text-sm">
    <label className="text-gray-500 mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 bg-white border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
        error ? "border-red-400" : "border-gray-200"
      }`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
  </div>
);

const MultiInput: React.FC<{
  label: string;
  values: string[];
  placeholders: string[];
  separator: string;
  onChange: (values: string[]) => void;
  error?: string;
}> = ({ label, values, placeholders, separator, onChange, error }) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, "");
    const next = [...values];
    next[idx] = cleaned;
    onChange(next);

    if (cleaned.length >= 3 && idx < values.length - 1) {
      refs.current[idx + 1]?.focus();
      refs.current[idx + 1]?.select();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && values[idx] === "" && idx > 0) {
      e.preventDefault();
      refs.current[idx - 1]?.focus();
    }
    if ((e.key === "x" || e.key === "×") && idx < values.length - 1) {
      e.preventDefault();
      refs.current[idx + 1]?.focus();
      refs.current[idx + 1]?.select();
    }
  };

  return (
    <div className="flex flex-col text-sm">
      <span className="text-gray-500 mb-1">{label}</span>
      <div className={`flex items-center border rounded-md focus-within:ring-2 focus-within:ring-blue-500 transition ${
        error ? "border-red-400" : "border-gray-200"
      }`}>
        {values.map((val, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="text-gray-400 select-none">{separator}</span>}
            <input
              ref={(el) => { refs.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              value={val}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              placeholder={placeholders[idx] || ""}
              className="w-full px-3 py-2 text-center text-sm bg-transparent outline-none"
            />
          </React.Fragment>
        ))}
      </div>
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  );
};

const ContainerSizeInput: React.FC<{
  label: string;
  shape: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}> = ({ label, shape, value, onChange, error }) => {
  // Parse stored value into parts based on shape
  const parts = value ? value.split(/\s*[x×]\s*/) : [];

  if (shape === "sphere") {
    return (
      <div className="flex flex-col text-sm">
        <span className="text-gray-500 mb-1">{label}</span>
        <input
          type="text"
          inputMode="numeric"
          value={parts[0] || ""}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="Diameter"
          className={`px-3 py-2 bg-white border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
            error ? "border-red-400" : "border-gray-200"
          }`}
        />
        {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
      </div>
    );
  }

  if (shape === "cylinder") {
    const vals = [parts[0] || "", parts[1] || ""];
    return (
      <MultiInput
        label={label}
        values={vals}
        placeholders={["Radius", "Length"]}
        separator="×"
        onChange={(v) => onChange(v.join(" x "))}
        error={error}
      />
    );
  }

  if (shape === "other" || shape === "") {
    return (
      <div className="flex flex-col text-sm">
        <span className="text-gray-500 mb-1">{label}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter"
          className={`px-3 py-2 bg-white border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
            error ? "border-red-400" : "border-gray-200"
          }`}
        />
        {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
      </div>
    );
  }

  // cube (default)
  const cubeVals = [parts[0] || "", parts[1] || "", parts[2] || ""];
  return (
    <MultiInput
      label={label}
      values={cubeVals}
      placeholders={["L", "W", "H"]}
      separator="×"
      onChange={(v) => onChange(v.join(" x "))}
      error={error}
    />
  );
};

const CREATE_NEW = "__create_new__";

const LovamapScaffoldForm: React.FC<Props> = ({ jobId, results, onClose, onSaved }) => {
  const { scaffoldGroupStore, jobStore } = useStore();

  // Scaffold group selection
  const [userGroups, setUserGroups] = useState<ScaffoldGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [autofillEnabled, setAutofillEnabled] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(CREATE_NEW);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Particle state
  const [shape, setShape] = useState("");
  const [stiffness, setStiffness] = useState("");
  const [packingConfig, setPackingConfig] = useState("");
  const [dispersity, setDispersity] = useState("");

  // Container state
  const [containerShape, setContainerShape] = useState("");
  const [containerSize, setContainerSize] = useState("");

  // Submission
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Screenshot generation phase
  const [screenshotPhase, setScreenshotPhase] = useState(false);
  const [savedScaffoldGroupId, setSavedScaffoldGroupId] = useState<number | null>(null);
  const [savedScaffoldId, setSavedScaffoldId] = useState<number | null>(null);
  const [screenshotCategories] = useState<ImageCategory[]>([
    ImageCategory.Particles,
    ImageCategory.ExteriorPores,
    ImageCategory.InteriorPores,
    ImageCategory.HalfHalf,
  ]);
  const [screenshotIndex, setScreenshotIndex] = useState(0);
  const [screenshotCurrentItem, setScreenshotCurrentItem] = useState<ImageCategory | null>(null);
  const [screenshotsDone, setScreenshotsDone] = useState(0);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const extracted = useMemo(() => {
    const global = results?.globalDescriptors ?? {};
    const other = results?.otherDescriptors ?? {};
    const particleDiamValues: number[] = other?.ParticleDiam?.values ?? [];
    const { mean, stdDev } = computeMeanStdDev(particleDiamValues);
    return { meanDiameter: mean, stdDevDiameter: stdDev };
  }, [results]);

  // Fetch user's scaffold groups on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const groups = await scaffoldGroupStore.getUploadedScaffoldGroups();
        if (!cancelled && groups) {
          const sorted = [...groups].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setUserGroups(sorted);
        }
      } catch {
        // ignore — user can still create new
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [scaffoldGroupStore]);

  // Close dropdown on outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const applyDefaults = () => {
    setShape("");
    setStiffness("");
    setPackingConfig("");
    setDispersity("");
    setContainerShape("");
    setContainerSize("");
  };

  const prefillFromGroup = (group: ScaffoldGroup) => {
    const inputs = group.inputs;
    if (!inputs) return;

    setPackingConfig(inputs.packingConfiguration || "Isotropic");
    setContainerShape(inputs.containerShape || "cube");

    if (inputs.containerDimensions) {
      setContainerSize(inputs.containerDimensions);
    } else if (inputs.containerSize != null) {
      const s = String(inputs.containerSize);
      setContainerSize(`${s} x ${s} x ${s}`);
    } else {
      setContainerSize("");
    }

    const p = inputs.particles?.[0];
    if (p) {
      setShape(p.shape || "spheres");
      setStiffness(p.stiffness || "rigid");
      setDispersity(p.dispersity || "polydisperse");
    }
  };

  const handleGroupChange = (value: string) => {
    setSelectedGroupId(value);
    if (value === CREATE_NEW) {
      applyDefaults();
    } else {
      const group = userGroups.find((g) => String(g.id) === value);
      if (group) prefillFromGroup(group);
    }
  };

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!shape) errs.shape = "Shape is required";
    if (!stiffness) errs.stiffness = "Stiffness is required";
    if (!packingConfig) errs.packingConfig = "Packing configuration is required";
    if (!dispersity) errs.dispersity = "Dispersity is required";
    if (!containerShape) errs.containerShape = "Container shape is required";
    if (!containerSize.trim()) errs.containerSize = "Size is required";
    else if (containerShape === "cube") {
      const parts = containerSize.split(/\s*[x×]\s*/);
      if (parts.length < 3 || parts.some((p) => !p.trim())) errs.containerSize = "All dimensions are required";
    } else if (containerShape === "cylinder") {
      const parts = containerSize.split(/\s*[x×]\s*/);
      if (parts.length < 2 || parts.some((p) => !p.trim())) errs.containerSize = "Both radius and length are required";
    }
    return errs;
  }, [shape, stiffness, packingConfig, dispersity, containerShape, containerSize]);

  // Re-validate on changes after first submit attempt
  useEffect(() => {
    if (submitted) setErrors(validate());
  }, [submitted, validate]);

  const handleSubmit = async () => {
    setSubmitted(true);
    setSubmitError(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const request: SaveLovamapResultRequest = {
      scaffoldGroupId: selectedGroupId !== CREATE_NEW ? parseInt(selectedGroupId) : undefined,
      shape,
      stiffness,
      dispersity,
      packingConfiguration: packingConfig,
      containerShape,
      containerDimensions: containerSize || undefined,
    };

    setSaving(true);
    try {
      const result = await jobStore.saveJobAsScaffold(jobId, request);
      setSubmitSuccess(true);
      if (result) {
        setSavedScaffoldGroupId(result.scaffoldGroupId);
        setSavedScaffoldId(result.scaffoldId);
        // Transition to screenshot phase
        setScreenshotPhase(true);
        setScreenshotIndex(0);
        setScreenshotCurrentItem(screenshotCategories[0]);
      } else {
        setTimeout(() => onClose(), 1500);
      }
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to save scaffold. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const categoryLabel = (cat: ImageCategory): string => {
    switch (cat) {
      case ImageCategory.Particles: return "Particles";
      case ImageCategory.ExteriorPores: return "Exterior Pores";
      case ImageCategory.InteriorPores: return "Interior Pores";
      case ImageCategory.HalfHalf: return "Half-Half";
      default: return `Category ${cat}`;
    }
  };

  const advanceScreenshot = (currentCategory: ImageCategory) => {
    setScreenshotCurrentItem(null);
    const nextIndex = screenshotIndex + 1;
    if (nextIndex < screenshotCategories.length) {
      const isHeavy =
        currentCategory === ImageCategory.HalfHalf ||
        screenshotCategories[nextIndex] === ImageCategory.HalfHalf;
      setTimeout(() => {
        setScreenshotIndex(nextIndex);
        setScreenshotCurrentItem(screenshotCategories[nextIndex]);
      }, isHeavy ? 2000 : 150);
    } else {
      // All done
      if (savedScaffoldGroupId && onSaved) {
        onSaved(savedScaffoldGroupId, savedScaffoldId ?? undefined);
      } else {
        onClose();
      }
    }
  };

  const handleScreenshotReady = async (blob: Blob) => {
    if (!savedScaffoldGroupId || !savedScaffoldId || screenshotCurrentItem === null) return;
    const cat = screenshotCurrentItem;
    try {
      const file = new File([blob], `screenshot-${cat}.png`, { type: "image/png" });
      const image: ImageToCreate = {
        scaffoldGroupId: savedScaffoldGroupId,
        scaffoldId: savedScaffoldId,
        file,
        category: cat,
      };
      await scaffoldGroupStore.uploadImageForScaffoldGroup(savedScaffoldGroupId, image);
    } catch (e) {
      console.warn(`Failed to upload screenshot for category ${cat}:`, e);
    }
    setScreenshotsDone((prev) => prev + 1);
    advanceScreenshot(cat);
  };

  const handleScreenshotError = (error: unknown) => {
    if (screenshotCurrentItem === null) return;
    const cat = screenshotCurrentItem;
    console.warn(`Skipping screenshot for category ${categoryLabel(cat)}:`, error);
    setScreenshotsDone((prev) => prev + 1);
    advanceScreenshot(cat);
  };

  const handleSkipScreenshots = () => {
    if (savedScaffoldGroupId && onSaved) {
      onSaved(savedScaffoldGroupId);
    } else {
      onClose();
    }
  };

  const shapeOptions = PARTICLE_SHAPES;
  const stiffnessOptions = PARTICLE_STIFFNESSES;
  const packingOptions = PACKING_CONFIGS;
  const dispersityOptions = PARTICLE_DISPERSITIES;
  const containerShapeOptions = CONTAINER_SHAPES;

  // Screenshot generation phase UI
  if (screenshotPhase && savedScaffoldId) {
    const progressPct = Math.round((screenshotsDone / screenshotCategories.length) * 100);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4">
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-700">
                Generating Thumbnails
              </h3>
            </div>
          </div>

          <div className="px-5 py-6">
            <p className="text-sm text-gray-600 mb-4">
              Generating thumbnails... {screenshotsDone}/{screenshotCategories.length}
            </p>

            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="space-y-1 mb-4">
              {screenshotCategories.map((cat, i) => (
                <div
                  key={cat}
                  className={`flex items-center justify-between text-sm px-2 py-1 rounded ${
                    i === screenshotIndex && screenshotCurrentItem !== null ? "bg-blue-50" : ""
                  }`}
                >
                  <span className="text-gray-600">{categoryLabel(cat)}</span>
                  <span className="text-xs">
                    {i < screenshotsDone ? (
                      <span className="text-green-600">&#10003;</span>
                    ) : i === screenshotIndex && screenshotCurrentItem !== null ? (
                      <FaSpinner className="animate-spin text-blue-500" size={12} />
                    ) : (
                      <span className="text-gray-400">Pending</span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                className="button-outline px-4 py-2 text-sm"
                onClick={handleSkipScreenshots}
              >
                Skip
              </button>
            </div>
          </div>

          {/* Hidden ScreenshotViewer */}
          {screenshotCurrentItem !== null && (
            <div
              style={{
                opacity: 0,
                position: "absolute",
                width: 512,
                height: 512,
                pointerEvents: "none",
              }}
            >
              <ScreenshotViewer
                key={`ss-${savedScaffoldId}-${screenshotCurrentItem}`}
                scaffoldId={savedScaffoldId}
                category={screenshotCurrentItem}
                onScreenshotReady={handleScreenshotReady}
                onError={handleScreenshotError}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-xl mx-4">
        <div className="px-5 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-700">
              Confirm the information about your scaffold prior to download
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Auto-fill checkbox + custom dropdown */}
          <div className="flex flex-col text-sm gap-2" ref={dropdownRef}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autofillEnabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAutofillEnabled(checked);
                  if (!checked) {
                    setSelectedGroupId(CREATE_NEW);
                    setDropdownOpen(false);
                    applyDefaults();
                  } else {
                    setDropdownOpen(true);
                  }
                }}
                className="h-4 w-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700">Auto-fill from existing scaffold group</span>
            </label>
            {autofillEnabled && (
              groupsLoading ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                  <FaSpinner className="animate-spin" />
                  Loading your scaffold groups…
                </div>
              ) : userGroups.length > 0 ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-left hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <span className="text-gray-700 truncate">
                      {selectedGroupId === CREATE_NEW
                        ? "Select a scaffold group…"
                        : userGroups.find((g) => String(g.id) === selectedGroupId)?.name || `Scaffold Group #${selectedGroupId}`}
                    </span>
                    <FaChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {dropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {userGroups.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm flex justify-between items-center hover:bg-blue-50 transition ${
                            String(g.id) === selectedGroupId ? "bg-blue-50" : ""
                          }`}
                          onClick={() => {
                            handleGroupChange(String(g.id));
                            setDropdownOpen(false);
                          }}
                        >
                          <span className="text-gray-700 truncate">{g.name || `Scaffold Group #${g.id}`}</span>
                          <span className="text-xs text-gray-400 ml-2 shrink-0">
                            {new Date(g.createdAt).toLocaleDateString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No existing scaffold groups found.</p>
              )
            )}
          </div>

          {/* Particle Properties */}
          <div>
            <h4 className="text-sm font-semibold text-gray-600 mb-3">Particle Properties</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ReadOnlyField
                label="Mean Particle Diameter (μm)"
                value={extracted.meanDiameter.toFixed(4)}
              />
              <ReadOnlyField
                label="Std Dev (μm)"
                value={extracted.stdDevDiameter.toFixed(4)}
              />
              <SelectField label="Shape" value={shape} onChange={setShape} options={shapeOptions} error={errors.shape} />
              <SelectField label="Stiffness" value={stiffness} onChange={setStiffness} options={stiffnessOptions} error={errors.stiffness} />
              <SelectField label="Packing Configuration" value={packingConfig} onChange={setPackingConfig} options={packingOptions} error={errors.packingConfig} />
              <SelectField label="Dispersity" value={dispersity} onChange={setDispersity} options={dispersityOptions} error={errors.dispersity} />
            </div>
          </div>

          {/* Container Properties */}
          <div>
            <h4 className="text-sm font-semibold text-gray-600 mb-3">Container Properties</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField label="Shape" value={containerShape} onChange={(v) => { setContainerShape(v); setContainerSize(""); }} options={containerShapeOptions} error={errors.containerShape} />
              <ContainerSizeInput label="Size (μm)" shape={containerShape} value={containerSize} onChange={setContainerSize} error={errors.containerSize} />
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200">
          {submitError && (
            <p className="text-sm text-red-500 mb-3">{submitError}</p>
          )}
          {submitSuccess && (
            <p className="text-sm text-green-600 mb-3 flex items-center gap-1">
              <FaCheckCircle /> Scaffold saved successfully!
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              className="button-outline px-4 py-2"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="button-primary px-6 py-2 flex items-center gap-2"
              onClick={handleSubmit}
              disabled={saving || submitSuccess}
            >
              {saving && <FaSpinner className="animate-spin" />}
              {submitSuccess ? "Saved" : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LovamapScaffoldForm;
