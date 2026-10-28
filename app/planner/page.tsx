"use client";

import { Home, Info, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { FormEvent } from "react";
import NavAlbumsLink from "../components/albums/NavAlbumsLink";
import LevelBadge from "../components/progress/LevelBadge";
import AreaPreview, { previewAreas } from "../components/AreaPreview";
import SunSidePicker from "../components/SunSidePicker";
import PixelSprite from "../components/PixelSprite";
import "./planner-album.css";
import {
  firstInvalidStep,
  PLANNER_STEPS,
  validate,
  validateStep,
} from "../../lib/planner-validation";
import {
  CheckboxControl,
  SelectControl,
} from "../components/FormControls";
import {
  GARDEN_TYPE_OPTIONS,
  SUN_EXPOSURE_OPTIONS,
  getAreaCopy,
  getAreaId,
  getAreaName,
  getGardenTypeLabel,
  getSunExposureLabel,
  isGardenType,
  isRepeatableGardenType,
  PREFERENCES_MAX_LENGTH,
} from "../../lib/planner-config";
import {
  PLANNER_DRAFT_KEY,
  PLANNER_RESULT_KEY,
  readSessionJson,
  writeSessionJson,
} from "../../lib/session-storage";
import type {
  AreaSunExposure,
  GardenType,
  GrowingUnitInput,
  InGroundInput,
  PlannerFormErrors,
  PlannerFormUnit,
  PlannerFormValues,
  PlannerInput,
  StoredPlannerResult,
} from "../../lib/types";

type InGroundField = keyof PlannerFormValues["inGround"];
type UnitField = Exclude<keyof PlannerFormUnit, "id">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const PLANT_OPTIONS = [
  {
    key: "flowers",
    sprite: "Marigold",
    label: "Flowers",
    examples: "Example: marigolds, zinnias, black-eyed susans",
  },
  {
    key: "vegetables",
    sprite: "Tomato",
    label: "Vegetables",
    examples: "Example: tomatoes, peppers, carrots",
  },
  {
    key: "herbs",
    sprite: "Basil",
    label: "Herbs",
    examples: "Example: basil, thyme, cilantro",
  },
  {
    key: "medicinal",
    sprite: "Sunflower",
    label: "Medicinal Plants",
    examples: "Example: echinacea, chamomile, calendula",
  },
  {
    key: "basic",
    sprite: "Lettuce",
    label: "Easy-Care Plants",
    examples: "Example: hardy greens and beginner-friendly starters",
  },
];

const PLOT_STYLE_OPTIONS = [
  { value: "single", label: "One continuous plot" },
  { value: "sections", label: "Divide it into sections" },
];

const ALL_KEY = "all";

const INITIAL_FORM: PlannerFormValues = {
  zipCode: "",
  gardenType: "",
  preferences: "",
  plantTypes: [],
  inGround: {
    width: "",
    length: "",
    sunniestSide: "",
    plotStyle: "single",
    sectionCount: "2",
  },
  units: [
    {
      id: "garden-unit-1",
      width: "",
      length: "",
      sunExposure: "",
    },
  ],
};

function createUnit(): PlannerFormUnit {
  return {
    id: `garden-unit-${crypto.randomUUID()}`,
    width: "",
    length: "",
    sunExposure: "",
  };
}

function formFromPlannerInput(input: Partial<PlannerInput> | undefined): PlannerFormValues | null {
  const gardenType = isGardenType(input?.gardenType)
    ? input.gardenType
    : GARDEN_TYPE_OPTIONS.find(({ label }) => label === input?.gardenTypeLabel)?.value ||
      (input?.gardenTypeLabel?.startsWith("Any") ? "any" : "");
  if (!gardenType) {
    return null;
  }

  return {
    zipCode: input?.zipCode || "",
    gardenType,
    preferences: input?.preferences || "",
    plantTypes: Array.isArray(input?.plantTypes) ? input.plantTypes : [],
    inGround: input?.inGround
      ? {
          width: String(input.inGround.width ?? ""),
          length: String(input.inGround.length ?? ""),
          sunniestSide: input.inGround.sunniestSide || "",
          plotStyle: input.inGround.plotStyle || "single",
          sectionCount: String(input.inGround.sectionCount || 2),
        }
      : { ...INITIAL_FORM.inGround },
    units: input?.units?.length
      ? input.units.map((unit: GrowingUnitInput, index: number) => ({
          id: `restored-unit-${index + 1}`,
          width: String(unit.width ?? ""),
          length: String(unit.length ?? ""),
          sunExposure: unit.sunExposure || "",
        }))
      : INITIAL_FORM.units.map((unit) => ({ ...unit })),
  };
}

function formFromDraft(value: unknown): PlannerFormValues | null {
  if (!isRecord(value) || !value.gardenType || !Array.isArray(value.plantTypes)) {
    return null;
  }
  // Drafts are written by this page from PlannerFormValues; trust the shape once the keys are present.
  const draft = value as Partial<PlannerFormValues>;
  return {
    ...INITIAL_FORM,
    ...draft,
    inGround: { ...INITIAL_FORM.inGround, ...(draft.inGround || {}) },
    units: Array.isArray(draft.units) && draft.units.length
      ? draft.units.map((unit: PlannerFormUnit, index: number) => ({
          ...unit,
          id: `restored-unit-${index + 1}`,
        }))
      : INITIAL_FORM.units.map((unit) => ({ ...unit })),
  };
}

function PlannerRestoreLoading() {
  return (
    <div className="planner-page planner-album planner-loading-page" aria-busy="true">
      <nav>
        <div className="container nav-inner">
          <Link className="logo" href="/" aria-label="FloraScape home">
            FloraScape
          </Link>
          <Link
            href="/"
            className="planner-home-link"
            aria-label="Go to FloraScape home"
            title="Home"
          >
            <Home size={21} strokeWidth={2.2} aria-hidden="true" />
          </Link>
        </div>
      </nav>
      <main className="planner-loading-main" aria-label="Loading saved planner inputs">
        <div className="planner-loading-card planner-restore-loading-card pa-loading-card">
          <div className="pa-loading-sprite" aria-hidden="true">
            <PixelSprite plantName="Lettuce" scale={4} motion="grow" />
          </div>
          <p className="px pa-loading-text">Opening your album...</p>
        </div>
      </main>
    </div>
  );
}

function PlannerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formValues, setFormValues] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<PlannerFormErrors>({});
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const shouldRestore = searchParams.get("edit") === "1";
  const [restoreComplete, setRestoreComplete] = useState(!shouldRestore);
  const requestedType = searchParams.get("type");
  const requestedGardenType = isGardenType(requestedType) ? requestedType : "";

  useEffect(() => {
    if (!shouldRestore) {
      setRestoreComplete(true);
      return;
    }

    const savedDraft = readSessionJson(PLANNER_DRAFT_KEY);
    const savedResult: unknown = readSessionJson(PLANNER_RESULT_KEY);
    const savedInput = isRecord(savedResult) && isRecord(savedResult.plannerInput)
      ? (savedResult.plannerInput as Partial<PlannerInput>)
      : undefined;
    const restoredForm = formFromDraft(savedDraft) || formFromPlannerInput(savedInput);

    // Editing an existing plan: every step already has values, so all are reachable.
    if (restoredForm) {
      setMaxStep(PLANNER_STEPS.length - 1);
    }
    setFormValues((previous) => ({
      ...(restoredForm || previous),
      gardenType: requestedGardenType || restoredForm?.gardenType || previous.gardenType,
    }));

    const restoreTimer = window.setTimeout(() => {
      setRestoreComplete(true);
    }, 300);

    return () => window.clearTimeout(restoreTimer);
  }, [requestedGardenType, shouldRestore]);

  // Editing a field clears its error; the rest stay until the next Next or Generate.
  function clearError(key: string) {
    setErrors((previous) => {
      if (!(key in previous)) {
        return previous;
      }
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }

  function updateField<K extends keyof PlannerFormValues>(field: K, value: PlannerFormValues[K]) {
    clearError(field);
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  function updateInGround(field: InGroundField, value: string) {
    clearError(`inGround.${field}`);
    setFormValues((prev) => ({
      ...prev,
      inGround: { ...prev.inGround, [field]: value },
    }));
  }

  function updateUnit(unitId: string, field: UnitField, value: string) {
    clearError(`unit.${unitId}.${field}`);
    setFormValues((prev) => ({
      ...prev,
      units: prev.units.map((unit) =>
        unit.id === unitId ? { ...unit, [field]: value } : unit,
      ),
    }));
  }

  function addUnit() {
    setFormValues((prev) => ({ ...prev, units: [...prev.units, createUnit()] }));
  }

  function removeUnit(unitId: string) {
    setFormValues((prev) => ({
      ...prev,
      units:
        prev.units.length === 1
          ? prev.units
          : prev.units.filter((unit) => unit.id !== unitId),
    }));
  }

  function togglePlant(plantKey: string) {
    if (plantKey === ALL_KEY) {
      const allSelected = PLANT_OPTIONS.every((plant) =>
        formValues.plantTypes.includes(plant.key),
      );
      updateField(
        "plantTypes",
        allSelected ? [] : PLANT_OPTIONS.map((plant) => plant.key),
      );
      return;
    }

    const nextPlants = formValues.plantTypes.includes(plantKey)
      ? formValues.plantTypes.filter((key) => key !== plantKey)
      : [...formValues.plantTypes, plantKey];
    updateField("plantTypes", nextPlants);
  }

  function goToStep(index: number) {
    setStep(index);
    setErrors({});
    document.getElementById("planner")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goBack() {
    goToStep(Math.max(0, step - 1));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step < PLANNER_STEPS.length - 1) {
      const stepErrors = validateStep(formValues, step);
      setErrors(stepErrors);
      if (Object.keys(stepErrors).length > 0) {
        return;
      }
      setMaxStep((previous) => Math.max(previous, step + 1));
      goToStep(step + 1);
      return;
    }

    const nextErrors = validate(formValues);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      // Earlier steps can still be invalid when they were edited after moving on.
      const invalidStep = firstInvalidStep(nextErrors);
      if (invalidStep !== step) {
        setStep(invalidStep);
      }
      return;
    }

    const selectedPlants = PLANT_OPTIONS.filter((plant) =>
      formValues.plantTypes.includes(plant.key),
    ).map((plant) => plant.label);

    // validate() passed, so the select-backed string fields hold one of their known values.
    const plannerInput: PlannerInput = {
      zipCode: formValues.zipCode.trim(),
      gardenType: formValues.gardenType as GardenType,
      gardenTypeLabel: getGardenTypeLabel(formValues.gardenType),
      plantTypes: [...formValues.plantTypes],
      selectedPlants,
      preferences: formValues.preferences.trim(),
      inGround:
        formValues.gardenType === "in_ground"
          ? {
              width: Number(formValues.inGround.width),
              length: Number(formValues.inGround.length),
              sunniestSide: formValues.inGround.sunniestSide,
              plotStyle: formValues.inGround.plotStyle as InGroundInput["plotStyle"],
              sectionCount:
                formValues.inGround.plotStyle === "sections"
                  ? Number(formValues.inGround.sectionCount)
                  : 1,
            }
          : null,
      units: isRepeatableGardenType(formValues.gardenType)
        ? formValues.units.map((unit, index) => ({
            id: getAreaId(formValues.gardenType, index),
            name: getAreaName(formValues.gardenType, index),
            width: Number(unit.width),
            length: Number(unit.length),
            sunExposure: unit.sunExposure as AreaSunExposure,
            sunExposureLabel: getSunExposureLabel(unit.sunExposure),
          }))
        : [],
    };

    const result: StoredPlannerResult = {
      generatedAt: new Date().toISOString(),
      selectedPlants,
      plannerInput,
    };

    writeSessionJson(PLANNER_DRAFT_KEY, formValues);
    writeSessionJson(PLANNER_RESULT_KEY, result);
    router.push("/planner/result");
  }

  const allChecked = PLANT_OPTIONS.every((plant) =>
    formValues.plantTypes.includes(plant.key),
  );
  const repeatableType = isRepeatableGardenType(formValues.gardenType);
  const areaCopy = getAreaCopy(formValues.gardenType);

  if (!restoreComplete) {
    return <PlannerRestoreLoading />;
  }

  return (
    <div className="planner-page planner-album">
      <nav>
        <div className="container nav-inner">
          <Link className="logo" href="/" aria-label="FloraScape home">
            FloraScape
          </Link>
          <div className="planner-nav-actions">
            <LevelBadge />
            <NavAlbumsLink />
            <Link
              href="/"
              className="planner-home-link"
              aria-label="Go to FloraScape home"
              title="Home"
            >
              <Home size={21} strokeWidth={2.2} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </nav>

      <main id="top">
        <section className="section planner-section" id="planner">
          <div className="container planner-grid">
            <div className="panel form-panel pa-page">
              <span className="pa-rings" aria-hidden="true" />
              <div className="panel-title-wrap">
                <h2 className="pa-title">Garden Planner</h2>
                <p>Share your space, sunlight, and growing goals to build a practical plan.</p>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="planner-progress" role="navigation" aria-label="Planner steps">
                  <p className="planner-progress-count px">
                    Step {step + 1} of {PLANNER_STEPS.length}
                  </p>
                  <ol>
                    {PLANNER_STEPS.map((item, index) => (
                      <li key={item.key} className={index === step ? "current" : index <= maxStep ? "reachable" : ""}>
                        <button
                          type="button"
                          onClick={() => goToStep(index)}
                          disabled={index > maxStep}
                          aria-current={index === step ? "step" : undefined}
                        >
                          <span className="px" aria-hidden="true">{index + 1}</span>
                          {item.title}
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>

                {step === 0 ? (
                  <div className="planner-step">
                    <div className="input-grid">
                      <label className="field" htmlFor="zip-code">
                        ZIP Code *
                        <input
                          id="zip-code"
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 80205"
                          value={formValues.zipCode}
                          onChange={(event) => updateField("zipCode", event.target.value)}
                          aria-invalid={Boolean(errors.zipCode)}
                        />
                        {errors.zipCode ? <span className="error">{errors.zipCode}</span> : null}
                      </label>

                      <div className="field">
                        <label htmlFor="garden-type">Garden Type *</label>
                        <SelectControl
                          id="garden-type"
                          value={formValues.gardenType}
                          onValueChange={(value) => updateField("gardenType", value)}
                          placeholder="Choose a garden type"
                          options={GARDEN_TYPE_OPTIONS}
                          ariaInvalid={Boolean(errors.gardenType)}
                        />
                        {errors.gardenType ? (
                          <span className="error">{errors.gardenType}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                {step === 1 ? (
                  <div className="planner-step">
                    {formValues.gardenType === "in_ground" ? (
                      <fieldset className="conditional-fieldset">
                        <legend>In-ground plot</legend>
                        <p className="field-help">
                          Enter the full usable plot size. Sections will be arranged inside it.
                        </p>
                        <div className="input-grid">
                          <label className="field">
                            Width (feet) *
                            <input
                              type="number"
                              min="1"
                              step="0.5"
                              value={formValues.inGround.width}
                              onChange={(event) => updateInGround("width", event.target.value)}
                            />
                            {errors["inGround.width"] ? (
                              <span className="error">{errors["inGround.width"]}</span>
                            ) : null}
                          </label>
                          <label className="field">
                            Length (feet) *
                            <input
                              type="number"
                              min="1"
                              step="0.5"
                              value={formValues.inGround.length}
                              onChange={(event) => updateInGround("length", event.target.value)}
                            />
                            {errors["inGround.length"] ? (
                              <span className="error">{errors["inGround.length"]}</span>
                            ) : null}
                          </label>
                          <div className="field sun-side-field">
                            <span id="sunniest-side-label">Which side gets the most sun? *</span>
                            <SunSidePicker
                              id="sunniest-side"
                              labelledBy="sunniest-side-label"
                              value={formValues.inGround.sunniestSide}
                              onChange={(value) => updateInGround("sunniestSide", value)}
                              ariaInvalid={Boolean(errors["inGround.sunniestSide"])}
                            />
                            {errors["inGround.sunniestSide"] ? (
                              <span className="error">{errors["inGround.sunniestSide"]}</span>
                            ) : null}
                          </div>
                          <div className="field">
                            <label htmlFor="plot-style">Plot layout *</label>
                            <SelectControl
                              id="plot-style"
                              value={formValues.inGround.plotStyle}
                              onValueChange={(value) => updateInGround("plotStyle", value)}
                              options={PLOT_STYLE_OPTIONS}
                            />
                          </div>
                          {formValues.inGround.plotStyle === "sections" ? (
                            <label className="field">
                              Number of sections *
                              <input
                                type="number"
                                min="2"
                                max="12"
                                step="1"
                                value={formValues.inGround.sectionCount}
                                onChange={(event) =>
                                  updateInGround("sectionCount", event.target.value)
                                }
                              />
                              {errors["inGround.sectionCount"] ? (
                                <span className="error">{errors["inGround.sectionCount"]}</span>
                              ) : null}
                            </label>
                          ) : null}
                        </div>
                      </fieldset>
                    ) : null}

                    {repeatableType ? (
                      <fieldset className="conditional-fieldset">
                        <legend>{areaCopy.formLabel} details</legend>
                        <p className="field-help">
                          {formValues.gardenType === "any"
                            ? "Describe each space you could use. FloraScape will recommend in-ground planting, raised beds, or containers based on these dimensions and your preferences."
                            : `Add one card per ${formValues.gardenType === "containers" ? "container" : "bed"}. Each card becomes one correctly scaled rectangle in the sketch.`}
                        </p>
                        <div className="garden-unit-list">
                          {formValues.units.map((unit, index) => (
                            <article className="garden-unit-card pa-sleeve" key={unit.id}>
                              <div className="garden-unit-heading">
                                <h3>{areaCopy.formLabel} {index + 1}</h3>
                                {formValues.units.length > 1 ? (
                                  <button
                                    type="button"
                                    className="icon-text-button danger-button"
                                    onClick={() => removeUnit(unit.id)}
                                  >
                                    <Trash2 size={16} aria-hidden="true" />
                                    Remove
                                  </button>
                                ) : null}
                              </div>
                              <div className="unit-input-grid">
                                <label className="field">
                                  Width (feet) *
                                  <input
                                    type="number"
                                    min="0.5"
                                    step="0.5"
                                    value={unit.width}
                                    onChange={(event) =>
                                      updateUnit(unit.id, "width", event.target.value)
                                    }
                                  />
                                  {errors[`unit.${unit.id}.width`] ? (
                                    <span className="error">{errors[`unit.${unit.id}.width`]}</span>
                                  ) : null}
                                </label>
                                <label className="field">
                                  Length (feet) *
                                  <input
                                    type="number"
                                    min="0.5"
                                    step="0.5"
                                    value={unit.length}
                                    onChange={(event) =>
                                      updateUnit(unit.id, "length", event.target.value)
                                    }
                                  />
                                  {errors[`unit.${unit.id}.length`] ? (
                                    <span className="error">{errors[`unit.${unit.id}.length`]}</span>
                                  ) : null}
                                </label>
                                <div className="field">
                                  <label htmlFor={`sun-${unit.id}`}>Sun exposure *</label>
                                  <SelectControl
                                    id={`sun-${unit.id}`}
                                    value={unit.sunExposure}
                                    onValueChange={(value) =>
                                      updateUnit(unit.id, "sunExposure", value)
                                    }
                                    options={SUN_EXPOSURE_OPTIONS}
                                    placeholder="Choose exposure"
                                    ariaInvalid={Boolean(errors[`unit.${unit.id}.sunExposure`])}
                                  />
                                  {errors[`unit.${unit.id}.sunExposure`] ? (
                                    <span className="error">
                                      {errors[`unit.${unit.id}.sunExposure`]}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                        <button type="button" className="add-unit-button pa-empty-sleeve" onClick={addUnit}>
                          <Plus size={17} aria-hidden="true" />
                          Add another {areaCopy.singular}
                        </button>
                      </fieldset>
                    ) : null}

                    {formValues.gardenType ? (
                      <AreaPreview areas={previewAreas(formValues, areaCopy.drawingLabel)} />
                    ) : null}
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="planner-step">
                    <fieldset className="plant-fieldset">
                      <legend>What would you like to grow? *</legend>
                      <div className="plant-options">
                        {PLANT_OPTIONS.map((plant) => (
                          <div
                            key={plant.key}
                            className={`pa-plant-card${formValues.plantTypes.includes(plant.key) ? " is-checked" : ""}`}
                            // The whole card toggles; the checkbox row handles its own clicks.
                            onClick={(event) => {
                              if (!(event.target as Element).closest(".ui-checkbox-row")) togglePlant(plant.key);
                            }}
                          >
                            <span className="pa-plant-art" aria-hidden="true">
                              <PixelSprite plantName={plant.sprite} scale={3} motion="sway" />
                            </span>
                            <span className="pa-plant-stamp px" aria-hidden="true">In your album</span>
                          <CheckboxControl
                            id={`plant-${plant.key}`}
                            checked={formValues.plantTypes.includes(plant.key)}
                            onCheckedChange={() => togglePlant(plant.key)}
                            label={plant.label}
                          >
                            <span className="tooltip-wrap">
                              <Info size={15} aria-hidden="true" />
                              <span className="tooltip-text">{plant.examples}</span>
                            </span>
                          </CheckboxControl>
                          </div>
                        ))}
                        <CheckboxControl
                          id="plant-all"
                          checked={allChecked}
                          onCheckedChange={() => togglePlant(ALL_KEY)}
                          label="All of the above"
                          className="all-option"
                        />
                      </div>
                      {errors.plantTypes ? (
                        <span className="error">{errors.plantTypes}</span>
                      ) : null}
                    </fieldset>

                    <label className="field preferences-field">
                      Preferences (optional)
                      <textarea
                        rows={4}
                        maxLength={PREFERENCES_MAX_LENGTH}
                        placeholder="Tomatoes, pollinator friendly, low watering, budget conscious..."
                        value={formValues.preferences}
                        onChange={(event) => updateField("preferences", event.target.value)}
                      />
                    </label>
                  </div>
                ) : null}

                <div className="planner-step-actions">
                  {step > 0 ? (
                    <button type="button" className="btn secondary-action" onClick={goBack}>
                      Back
                    </button>
                  ) : null}
                  {step < PLANNER_STEPS.length - 1 ? (
                    <button type="submit" className="btn submit-btn">
                      Next: {PLANNER_STEPS[step + 1].title}
                    </button>
                  ) : (
                    <button type="submit" className="btn submit-btn">
                      <Sparkles size={18} strokeWidth={2.3} aria-hidden="true" />
                      Generate My Garden
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer>© 2026 FloraScape - Grow beautifully.</footer>
    </div>
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={<div className="planner-page" aria-busy="true" />}>
      <PlannerForm />
    </Suspense>
  );
}
