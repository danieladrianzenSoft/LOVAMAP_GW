import React, { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { FaChevronDown, FaSpinner, FaCheckCircle } from "react-icons/fa";
import { SaveLovamapResultRequest } from "../../app/models/job";
import { useStore } from "../../app/stores/store";
import { ScaffoldGroup } from "../../app/models/scaffoldGroup";
import { PARTICLE_DISPERSITIES } from "../../constants/particle-dispersities";
import { PARTICLE_SHAPES } from "../../constants/particle-shapes";
import { PARTICLE_STIFFNESSES } from "../../constants/particle-stiffnesses";
import { CONTAINER_SHAPES } from "../../constants/container-shapes";
import { PARTICLE_MATERIALS } from "../../constants/particle-materials";
import { INTERLINKING_MECHANISMS } from "../../constants/interlinking-mechanisms";
import { IMAGING_METHODS } from "../../constants/imaging-methods";
import { SCAFFOLD_OCCUPANTS } from "../../constants/scaffold-occupants";
import { SIZE_DISTRIBUTION_TYPES } from "../../constants/size-distribution-types";
import { ImageCategory, ImageToCreate } from "../../app/models/image";
import SelectWithOther from "../../app/common/form/select-with-other";
import ScreenshotViewer from "../visualization/screenshot-viewer";

type Props = {
  jobId: string;
  results: any;
  onClose: () => void;
  onSaved?: (scaffoldGroupId: number, scaffoldId?: number) => void;
};

interface ParticleState {
  shape: string;
  stiffness: string;
  dispersity: string;
  sizeDistributionType: string;
  material: string;
  materialOther: string;
  proportion: number;
}

const defaultParticle = (): ParticleState => ({
  shape: "",
  stiffness: "",
  dispersity: "",
  sizeDistributionType: "",
  material: "",
  materialOther: "",
  proportion: 1,
});

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
  onBlur?: () => void;
}> = ({ label, value, onChange, options, error, onBlur }) => (
  <div className="flex flex-col text-sm">
    <label className="text-gray-500 mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
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
  onBlur?: () => void;
}> = ({ label, values, placeholders, separator, onChange, error, onBlur }) => {
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
              onBlur={onBlur}
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
  onBlur?: () => void;
}> = ({ label, shape, value, onChange, error, onBlur }) => {
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
          onBlur={onBlur}
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
        onBlur={onBlur}
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
          onBlur={onBlur}
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
      onBlur={onBlur}
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

  // Simulated toggle
  const [isSimulated, setIsSimulated] = useState(true);

  // Particle groups (array)
  const [particles, setParticles] = useState<ParticleState[]>([defaultParticle()]);

  // Scaffold properties (experimental only)
  const [interlinkingMechanism, setInterlinkingMechanism] = useState("");
  const [interlinkingOther, setInterlinkingOther] = useState("");
  const [scaffoldOccupants, setScaffoldOccupants] = useState<string[]>([]);
  const [scaffoldOccupantsOther, setScaffoldOccupantsOther] = useState("");
  const [imagingMethod, setImagingMethod] = useState("");
  const [imagingOther, setImagingOther] = useState("");

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
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const touch = (field: string) => setTouched((prev) => new Set(prev).add(field));

  const extracted = useMemo(() => {
    const other = results?.otherDescriptors ?? {};
    const particleDiamValues: number[] = other?.ParticleDiam?.values ?? [];
    const { mean, stdDev } = computeMeanStdDev(particleDiamValues);
    return { meanDiameter: mean, stdDevDiameter: stdDev };
  }, [results]);

  // Particle array helpers
  const updateParticle = (idx: number, field: keyof ParticleState, value: any) => {
    setParticles((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const addParticle = () => setParticles((prev) => [...prev, defaultParticle()]);

  const removeParticle = (idx: number) => {
    if (particles.length <= 1) return;
    setParticles((prev) => prev.filter((_, i) => i !== idx));
  };

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
    setIsSimulated(true);
    setParticles([defaultParticle()]);
    setContainerShape("");
    setContainerSize("");
    setInterlinkingMechanism("");
    setInterlinkingOther("");
    setScaffoldOccupants([]);
    setScaffoldOccupantsOther("");
    setImagingMethod("");
    setImagingOther("");
  };

  const prefillFromGroup = (group: ScaffoldGroup) => {
    const inputs = group.inputs;
    if (!inputs) return;

    setIsSimulated(group.isSimulated);
    setContainerShape(inputs.containerShape || "cube");

    if (inputs.containerDimensions) {
      setContainerSize(inputs.containerDimensions);
    } else if (inputs.containerSize != null) {
      const s = String(inputs.containerSize);
      setContainerSize(`${s} x ${s} x ${s}`);
    } else {
      setContainerSize("");
    }

    // Material properties
    if (inputs.interlinkingMechanism) {
      const isKnown = INTERLINKING_MECHANISMS.some(o => o.value === inputs.interlinkingMechanism);
      setInterlinkingMechanism(isKnown ? inputs.interlinkingMechanism : "other");
      setInterlinkingOther(isKnown ? "" : inputs.interlinkingMechanism);
    }
    if (inputs.scaffoldOccupants) {
      setScaffoldOccupants(inputs.scaffoldOccupants.split(",").map(s => s.trim()).filter(Boolean));
    }
    if (inputs.imagingMethod) {
      const isKnown = IMAGING_METHODS.some(o => o.value === inputs.imagingMethod);
      setImagingMethod(isKnown ? inputs.imagingMethod : "other");
      setImagingOther(isKnown ? "" : inputs.imagingMethod);
    }

    // Particle groups
    if (inputs.particles && inputs.particles.length > 0) {
      setParticles(
        inputs.particles.map((p) => {
          const materialKnown = p.material ? PARTICLE_MATERIALS.some(o => o.value === p.material) : true;
          return {
            shape: p.shape || "",
            stiffness: p.stiffness || "",
            dispersity: p.dispersity || "",
            sizeDistributionType: p.sizeDistributionType || "",
            material: p.material ? (materialKnown ? p.material : "other") : "",
            materialOther: p.material && !materialKnown ? p.material : "",
            proportion: p.proportion ?? 1,
          };
        })
      );
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

  const resolvedInterlinking = interlinkingMechanism === "other" ? interlinkingOther : interlinkingMechanism;
  const resolvedImaging = imagingMethod === "other" ? imagingOther : imagingMethod;
  const resolvedOccupants = (() => {
    const items = [...scaffoldOccupants];
    const otherIdx = items.indexOf("other");
    if (otherIdx >= 0 && scaffoldOccupantsOther.trim()) {
      items[otherIdx] = scaffoldOccupantsOther.trim();
    } else if (otherIdx >= 0) {
      items.splice(otherIdx, 1);
    }
    return items;
  })();

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!containerShape) errs.containerShape = "Container shape is required";
    if (!containerSize.trim()) errs.containerSize = "Size is required";
    else if (containerShape === "cube") {
      const parts = containerSize.split(/\s*[x×]\s*/);
      if (parts.length < 3 || parts.some((p) => !p.trim())) errs.containerSize = "All dimensions are required";
    } else if (containerShape === "cylinder") {
      const parts = containerSize.split(/\s*[x×]\s*/);
      if (parts.length < 2 || parts.some((p) => !p.trim())) errs.containerSize = "Both radius and length are required";
    }

    // Validate each particle species
    particles.forEach((p, idx) => {
      if (!p.shape) errs[`p${idx}.shape`] = "Required";
      if (!p.stiffness) errs[`p${idx}.stiffness`] = "Required";
      if (isSimulated) {
        if (!p.dispersity) errs[`p${idx}.dispersity`] = "Required";
        if (!p.sizeDistributionType) errs[`p${idx}.sizeDistributionType`] = "Required";
      }
      if (!isSimulated) {
        const resolved = p.material === "other" ? p.materialOther : p.material;
        if (!resolved) errs[`p${idx}.material`] = "Required";
      }
    });

    // Scaffold-level fields (experimental only)
    if (!isSimulated) {
      if (!resolvedInterlinking) errs.interlinkingMechanism = "Interlinking mechanism is required";
      if (scaffoldOccupants.length === 0) errs.scaffoldOccupants = "At least one selection is required";
      else if (scaffoldOccupants.includes("other") && !scaffoldOccupantsOther.trim()) errs.scaffoldOccupants = "Please specify the other occupant species";
      if (!resolvedImaging) errs.imagingMethod = "Imaging method is required";
    }
    return errs;
  }, [containerShape, containerSize, particles, isSimulated, resolvedInterlinking, scaffoldOccupants, scaffoldOccupantsOther, resolvedImaging]);

  // Show errors for touched fields or all fields after submit
  const visibleErrors = useMemo(() => {
    const allErrs = validate();
    if (submitted) return allErrs;
    const filtered: Record<string, string> = {};
    for (const key of Object.keys(allErrs)) {
      if (touched.has(key)) filtered[key] = allErrs[key];
    }
    return filtered;
  }, [validate, submitted, touched]);

  const handleSubmit = async () => {
    setSubmitted(true);
    setSubmitError(null);
    const errs = validate();
    if (Object.keys(errs).length > 0) return;

    const request: SaveLovamapResultRequest = {
      scaffoldGroupId: selectedGroupId !== CREATE_NEW ? parseInt(selectedGroupId) : undefined,
      isSimulated,
      packingConfiguration: "Isotropic",
      containerShape,
      containerDimensions: containerSize || undefined,
      particles: particles.map((p) => ({
        shape: p.shape,
        stiffness: p.stiffness,
        dispersity: isSimulated ? p.dispersity : "polydisperse",
        sizeDistributionType: isSimulated ? p.sizeDistributionType || undefined : undefined,
        material: !isSimulated ? (p.material === "other" ? p.materialOther : p.material) || undefined : undefined,
        proportion: p.proportion,
      })),
      interlinkingMechanism: !isSimulated ? resolvedInterlinking || undefined : undefined,
      scaffoldOccupants: !isSimulated && resolvedOccupants.length > 0 ? resolvedOccupants.join(",") : undefined,
      imagingMethod: !isSimulated ? resolvedImaging || undefined : undefined,
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

          {/* Simulated / Experimental toggle */}
          <fieldset className="flex flex-col text-sm">
            <span className="text-gray-500 mb-1">How was your scaffold created?</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={isSimulated === true}
                  onChange={() => setIsSimulated(true)}
                  className="accent-blue-600"
                />
                <span className="text-gray-700">Computer simulation</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={isSimulated === false}
                  onChange={() => setIsSimulated(false)}
                  className="accent-blue-600"
                />
                <span className="text-gray-700">Experimental image</span>
              </label>
            </div>
          </fieldset>

          {/* Computed stats (read-only) */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ReadOnlyField
                label="Mean Particle Diameter (μm)"
                value={extracted.meanDiameter.toFixed(4)}
              />
              <ReadOnlyField
                label="Std Dev (μm)"
                value={extracted.stdDevDiameter.toFixed(4)}
              />
            </div>
          </div>

          {/* Particle Property Groups */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-600">Particle Properties</h4>
              <button
                type="button"
                onClick={addParticle}
                className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition"
              >
                + Add particle species
              </button>
            </div>
            {particles.map((p, idx) => (
              <div key={idx} className="border border-gray-200 rounded-md p-3 mb-3">
                {particles.length > 1 && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 font-medium">Species {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeParticle(idx)}
                      className="text-xs px-2 py-0.5 bg-red-100 hover:bg-red-200 rounded transition"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SelectField label="Shape" value={p.shape} onChange={(v) => updateParticle(idx, "shape", v)} options={PARTICLE_SHAPES} error={visibleErrors[`p${idx}.shape`]} onBlur={() => touch(`p${idx}.shape`)} />
                  <SelectField label="Stiffness" value={p.stiffness} onChange={(v) => updateParticle(idx, "stiffness", v)} options={PARTICLE_STIFFNESSES} error={visibleErrors[`p${idx}.stiffness`]} onBlur={() => touch(`p${idx}.stiffness`)} />
                  {isSimulated && (
                    <>
                      <SelectField label="Composition" value={p.dispersity} onChange={(v) => updateParticle(idx, "dispersity", v)} options={PARTICLE_DISPERSITIES} error={visibleErrors[`p${idx}.dispersity`]} onBlur={() => touch(`p${idx}.dispersity`)} />
                      <SelectField label="Size Distribution" value={p.sizeDistributionType} onChange={(v) => updateParticle(idx, "sizeDistributionType", v)} options={SIZE_DISTRIBUTION_TYPES} error={visibleErrors[`p${idx}.sizeDistributionType`]} onBlur={() => touch(`p${idx}.sizeDistributionType`)} />
                    </>
                  )}
                  {!isSimulated && (
                    <SelectWithOther label="Material" value={p.material} otherValue={p.materialOther} onChange={(v) => updateParticle(idx, "material", v)} onOtherChange={(v) => updateParticle(idx, "materialOther", v)} options={PARTICLE_MATERIALS} error={visibleErrors[`p${idx}.material`]} onBlur={() => touch(`p${idx}.material`)} />
                  )}
                  {particles.length > 1 && (
                    <div className="flex flex-col text-sm">
                      <label className="text-gray-500 mb-1">Proportion</label>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.1}
                        value={p.proportion}
                        onChange={(e) => updateParticle(idx, "proportion", parseFloat(e.target.value) || 0)}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Container Properties */}
          <div>
            <h4 className="text-sm font-semibold text-gray-600 mb-3">Container Properties</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField label="Shape" value={containerShape} onChange={(v) => { setContainerShape(v); setContainerSize(""); }} options={CONTAINER_SHAPES} error={visibleErrors.containerShape} onBlur={() => touch("containerShape")} />
              <ContainerSizeInput label="Size (μm)" shape={containerShape} value={containerSize} onChange={setContainerSize} error={visibleErrors.containerSize} onBlur={() => touch("containerSize")} />
            </div>
          </div>

          {/* Scaffold Properties (experimental only) */}
          {!isSimulated && (
            <div>
              <h4 className="text-sm font-semibold text-gray-600 mb-3">Scaffold Properties</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SelectWithOther label="Interlinking Mechanism" value={interlinkingMechanism} otherValue={interlinkingOther} onChange={setInterlinkingMechanism} onOtherChange={setInterlinkingOther} options={INTERLINKING_MECHANISMS} error={visibleErrors.interlinkingMechanism} onBlur={() => touch("interlinkingMechanism")} />
                <SelectWithOther label="Imaging Method" value={imagingMethod} otherValue={imagingOther} onChange={setImagingMethod} onOtherChange={setImagingOther} options={IMAGING_METHODS} error={visibleErrors.imagingMethod} onBlur={() => touch("imagingMethod")} />
              </div>

              {/* Scaffold Occupants - multi-select checkboxes */}
              <div className="mt-3">
                <h4 className="text-sm font-semibold text-gray-600 mb-3">Other Scaffold Occupant Species</h4>
                <div className={`flex flex-wrap gap-2 p-3 border rounded-md ${visibleErrors.scaffoldOccupants ? "border-red-400" : "border-gray-200"}`}>
                  {SCAFFOLD_OCCUPANTS.map((opt) => {
                    const isChecked = scaffoldOccupants.includes(opt.value);
                    return (
                      <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            touch("scaffoldOccupants");
                            if (opt.value === "None") {
                              setScaffoldOccupants(isChecked ? [] : ["None"]);
                            } else {
                              let next = isChecked
                                ? scaffoldOccupants.filter((v) => v !== opt.value)
                                : [...scaffoldOccupants.filter((v) => v !== "None"), opt.value];
                              setScaffoldOccupants(next);
                            }
                          }}
                          className="h-4 w-4 accent-blue-600"
                        />
                        <span className="text-gray-700">{opt.label}</span>
                      </label>
                    );
                  })}
                  {scaffoldOccupants.includes("other") && (
                    <input
                      type="text"
                      value={scaffoldOccupantsOther}
                      onChange={(e) => setScaffoldOccupantsOther(e.target.value)}
                      onBlur={() => touch("scaffoldOccupants")}
                      placeholder="Please specify..."
                      className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  )}
                </div>
                {visibleErrors.scaffoldOccupants && <span className="text-xs text-red-500 mt-1">{visibleErrors.scaffoldOccupants}</span>}
              </div>
            </div>
          )}
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
