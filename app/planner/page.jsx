"use client";

import { Home, Info, Plus, Sparkles, Sprout, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  CheckboxControl,
  SelectControl,
} from "../components/FormControls";

const PLANT_OPTIONS = [
  {
    key: "flowers",
    label: "Flowers",
    examples: "Example: marigolds, zinnias, black-eyed susans",
  },
  {
    key: "vegetables",
    label: "Vegetables",
    examples: "Example: tomatoes, peppers, carrots",
  },
  {
    key: "herbs",
    label: "Herbs",
    examples: "Example: basil, thyme, cilantro",
  },
  {
    key: "medicinal",
    label: "Medicinal Plants",
    examples: "Example: echinacea, chamomile, calendula",
  },
  {
    key: "basic",
    label: "Easy-Care Plants",
    examples: "Example: hardy greens and beginner-friendly starters",
  },
];

const GARDEN_TYPE_OPTIONS = [
  { value: "any", label: "Any — recommend the best setup" },
  { value: "in_ground", label: "In-ground" },
  { value: "raised_beds", label: "Raised beds" },
  { value: "containers", label: "Containers" },
];

const SUN_EXPOSURE_OPTIONS = [
  { value: "full_sun", label: "Full sun (6+ hours)" },
  { value: "partial_shade", label: "Partial shade (3–6 hours)" },
  { value: "mostly_shade", label: "Mostly shade (under 3 hours)" },
];

const SUNNIEST_SIDE_OPTIONS = [
  { value: "north", label: "North side" },
  { value: "east", label: "East side" },
  { value: "south", label: "South side" },
  { value: "west", label: "West side" },
  { value: "fully_shaded", label: "The whole plot is shaded" },
];

const PLOT_STYLE_OPTIONS = [
  { value: "single", label: "One continuous plot" },
  { value: "sections", label: "Divide it into sections" },
];

const ALL_KEY = "all";
const STORAGE_KEY = "florascape_planner_result";
const DRAFT_KEY = "florascape_planner_draft";

const INITIAL_FORM = {
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

function gardenTypeLabel(value) {
  return GARDEN_TYPE_OPTIONS.find((option) => option.value === value)?.label || value;
}

function sunExposureLabel(value) {
  return SUN_EXPOSURE_OPTIONS.find((option) => option.value === value)?.label || value;
}

function validate(values) {
  const errors = {};

  if (!/^\d{5}$/.test(values.zipCode.trim())) {
    errors.zipCode = "Enter a valid 5-digit ZIP code.";
  }

  if (!values.gardenType) {
    errors.gardenType = "Select a garden type.";
  }

  if (!values.plantTypes.length) {
    errors.plantTypes = "Select at least one plant category.";
  }

  if (values.gardenType === "in_ground") {
    if (Number(values.inGround.width) <= 0) {
      errors["inGround.width"] = "Width must be greater than 0.";
    }
    if (Number(values.inGround.length) <= 0) {
      errors["inGround.length"] = "Length must be greater than 0.";
    }
    if (!values.inGround.sunniestSide) {
      errors["inGround.sunniestSide"] = "Select the sunniest side.";
    }
    if (
      values.inGround.plotStyle === "sections" &&
      (!Number.isInteger(Number(values.inGround.sectionCount)) ||
        Number(values.inGround.sectionCount) < 2 ||
        Number(values.inGround.sectionCount) > 12)
    ) {
      errors["inGround.sectionCount"] = "Choose between 2 and 12 sections.";
    }
  }

  if (["any", "raised_beds", "containers"].includes(values.gardenType)) {
    values.units.forEach((unit, index) => {
      const label =
        values.gardenType === "containers"
          ? "Container"
          : values.gardenType === "any"
            ? "Available area"
            : "Bed";
      if (Number(unit.width) <= 0) {
        errors[`unit.${unit.id}.width`] = `${label} ${index + 1} needs a width.`;
      }
      if (Number(unit.length) <= 0) {
        errors[`unit.${unit.id}.length`] = `${label} ${index + 1} needs a length.`;
      }
      if (!unit.sunExposure) {
        errors[`unit.${unit.id}.sunExposure`] = `${label} ${index + 1} needs sun exposure.`;
      }
    });
  }

  return errors;
}

function createUnit() {
  return {
    id: `garden-unit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    width: "",
    length: "",
    sunExposure: "",
  };
}

function formFromPlannerInput(input) {
  const gardenType =
    input?.gardenType === "any" || input?.gardenTypeLabel?.startsWith("Any")
      ? "any"
      : input?.gardenType === "in_ground" || input?.gardenTypeLabel === "In-ground"
      ? "in_ground"
      : input?.gardenType === "containers" || input?.gardenTypeLabel === "Containers"
        ? "containers"
        : input?.gardenType === "raised_beds" || input?.gardenTypeLabel === "Raised beds"
          ? "raised_beds"
          : "";
  if (!gardenType) {
    return null;
  }

  return {
    zipCode: input.zipCode || "",
    gardenType,
    preferences: input.preferences || "",
    plantTypes: Array.isArray(input.plantTypes) ? input.plantTypes : [],
    inGround: input.inGround
      ? {
          width: String(input.inGround.width ?? ""),
          length: String(input.inGround.length ?? ""),
          sunniestSide: input.inGround.sunniestSide || "",
          plotStyle: input.inGround.plotStyle || "single",
          sectionCount: String(input.inGround.sectionCount || 2),
        }
      : { ...INITIAL_FORM.inGround },
    units: input.units?.length
      ? input.units.map((unit, index) => ({
          id: `restored-unit-${index + 1}`,
          width: String(unit.width ?? ""),
          length: String(unit.length ?? ""),
          sunExposure: unit.sunExposure || "",
        }))
      : INITIAL_FORM.units.map((unit) => ({ ...unit })),
  };
}

function formFromDraft(draft) {
  if (!draft?.gardenType || !Array.isArray(draft.plantTypes)) {
    return null;
  }
  return {
    ...INITIAL_FORM,
    ...draft,
    inGround: { ...INITIAL_FORM.inGround, ...(draft.inGround || {}) },
    units: Array.isArray(draft.units) && draft.units.length
      ? draft.units.map((unit, index) => ({
          ...unit,
          id: `restored-unit-${index + 1}`,
        }))
      : INITIAL_FORM.units.map((unit) => ({ ...unit })),
  };
}

function PlannerRestoreLoading() {
  return (
    <div className="planner-page planner-loading-page" aria-busy="true">
      <nav>
        <div className="container nav-inner">
          <a className="logo" href="/" aria-label="FloraScape home">
            FloraScape
          </a>
          <a
            href="/"
            className="planner-home-link"
            aria-label="Go to FloraScape home"
            title="Home"
          >
            <Home size={21} strokeWidth={2.2} aria-hidden="true" />
          </a>
        </div>
      </nav>
      <main className="planner-loading-main" aria-label="Loading saved planner inputs">
        <div className="planner-loading-card planner-restore-loading-card">
          <div className="loading-sprout" aria-hidden="true">
            <span />
            <Sprout size={42} strokeWidth={1.8} />
          </div>
        </div>
      </main>
    </div>
  );
}

function PlannerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formValues, setFormValues] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const shouldRestore = searchParams.get("edit") === "1";
  const [restoreComplete, setRestoreComplete] = useState(!shouldRestore);
  const requestedType = searchParams.get("type");
  const requestedGardenType = GARDEN_TYPE_OPTIONS.some(
    (option) => option.value === requestedType,
  )
    ? requestedType
    : "";

  useEffect(() => {
    if (!shouldRestore) {
      setRestoreComplete(true);
      return;
    }

    let restoredForm = null;
    try {
      const savedDraft = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) || "null");
      restoredForm = formFromDraft(savedDraft);
    } catch {
      restoredForm = null;
    }

    if (!restoredForm) {
      try {
        const savedResult = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "null");
        restoredForm = formFromPlannerInput(savedResult?.plannerInput);
      } catch {
        restoredForm = null;
      }
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

  function updateField(field, value) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  function updateInGround(field, value) {
    setFormValues((prev) => ({
      ...prev,
      inGround: { ...prev.inGround, [field]: value },
    }));
  }

  function updateUnit(unitId, field, value) {
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

  function removeUnit(unitId) {
    setFormValues((prev) => ({
      ...prev,
      units:
        prev.units.length === 1
          ? prev.units
          : prev.units.filter((unit) => unit.id !== unitId),
    }));
  }

  function togglePlant(plantKey) {
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

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(formValues);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const selectedPlants = PLANT_OPTIONS.filter((plant) =>
      formValues.plantTypes.includes(plant.key),
    ).map((plant) => plant.label);

    const plannerInput = {
      zipCode: formValues.zipCode.trim(),
      gardenType: formValues.gardenType,
      gardenTypeLabel: gardenTypeLabel(formValues.gardenType),
      plantTypes: [...formValues.plantTypes],
      selectedPlants,
      preferences: formValues.preferences.trim(),
      inGround:
        formValues.gardenType === "in_ground"
          ? {
              width: Number(formValues.inGround.width),
              length: Number(formValues.inGround.length),
              sunniestSide: formValues.inGround.sunniestSide,
              plotStyle: formValues.inGround.plotStyle,
              sectionCount:
                formValues.inGround.plotStyle === "sections"
                  ? Number(formValues.inGround.sectionCount)
                  : 1,
            }
          : null,
      units: ["any", "raised_beds", "containers"].includes(formValues.gardenType)
        ? formValues.units.map((unit, index) => ({
            id: `${formValues.gardenType === "containers" ? "container" : formValues.gardenType === "any" ? "area" : "bed"}-${index + 1}`,
            name: `${formValues.gardenType === "containers" ? "Container" : formValues.gardenType === "any" ? "Available area" : "Bed"} ${index + 1}`,
            width: Number(unit.width),
            length: Number(unit.length),
            sunExposure: unit.sunExposure,
            sunExposureLabel: sunExposureLabel(unit.sunExposure),
          }))
        : [],
    };

    const result = {
      generatedAt: new Date().toISOString(),
      selectedPlants,
      plannerInput,
    };

    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(formValues));
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    router.push("/planner/result");
  }

  const allChecked = PLANT_OPTIONS.every((plant) =>
    formValues.plantTypes.includes(plant.key),
  );
  const repeatableType = ["any", "raised_beds", "containers"].includes(
    formValues.gardenType,
  );
  const unitLabel =
    formValues.gardenType === "containers"
      ? "Container"
      : formValues.gardenType === "any"
        ? "Available area"
        : "Raised bed";

  if (!restoreComplete) {
    return <PlannerRestoreLoading />;
  }

  return (
    <div className="planner-page">
      <nav>
        <div className="container nav-inner">
          <a className="logo" href="/" aria-label="FloraScape home">
            FloraScape
          </a>
          <div className="planner-nav-actions">
            <a
              href="/"
              className="planner-home-link"
              aria-label="Go to FloraScape home"
              title="Home"
            >
              <Home size={21} strokeWidth={2.2} aria-hidden="true" />
            </a>
          </div>
        </div>
      </nav>

      <main id="top">
        <section className="section planner-section" id="planner">
          <div className="container planner-grid">
            <div className="panel form-panel">
              <div className="panel-title-wrap">
                <h2>Garden Planner</h2>
                <p>Share your space, sunlight, and growing goals to build a practical plan.</p>
              </div>

              <form onSubmit={handleSubmit} noValidate>
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
                      <div className="field">
                        <label htmlFor="sunniest-side">Which side gets the most sun? *</label>
                        <SelectControl
                          id="sunniest-side"
                          value={formValues.inGround.sunniestSide}
                          onValueChange={(value) => updateInGround("sunniestSide", value)}
                          options={SUNNIEST_SIDE_OPTIONS}
                          placeholder="Choose a direction"
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
                    <legend>{unitLabel} details</legend>
                    <p className="field-help">
                      {formValues.gardenType === "any"
                        ? "Describe each space you could use. FloraScape will recommend in-ground planting, raised beds, or containers based on these dimensions and your preferences."
                        : `Add one card per ${formValues.gardenType === "containers" ? "container" : "bed"}. Each card becomes one correctly scaled rectangle in the sketch.`}
                    </p>
                    <div className="garden-unit-list">
                      {formValues.units.map((unit, index) => (
                        <article className="garden-unit-card" key={unit.id}>
                          <div className="garden-unit-heading">
                            <h3>{unitLabel} {index + 1}</h3>
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
                    <button type="button" className="add-unit-button" onClick={addUnit}>
                      <Plus size={17} aria-hidden="true" />
                      Add another {formValues.gardenType === "containers" ? "container" : formValues.gardenType === "any" ? "available area" : "bed"}
                    </button>
                  </fieldset>
                ) : null}

                <fieldset className="plant-fieldset">
                  <legend>What would you like to grow? *</legend>
                  <div className="plant-options">
                    {PLANT_OPTIONS.map((plant) => (
                      <CheckboxControl
                        id={`plant-${plant.key}`}
                        key={plant.key}
                        checked={formValues.plantTypes.includes(plant.key)}
                        onCheckedChange={() => togglePlant(plant.key)}
                        label={plant.label}
                      >
                        <span className="tooltip-wrap">
                          <Info size={15} aria-hidden="true" />
                          <span className="tooltip-text">{plant.examples}</span>
                        </span>
                      </CheckboxControl>
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
                    placeholder="Tomatoes, pollinator friendly, low watering, budget conscious..."
                    value={formValues.preferences}
                    onChange={(event) => updateField("preferences", event.target.value)}
                  />
                </label>

                <button type="submit" className="btn submit-btn">
                  <Sparkles size={18} strokeWidth={2.3} aria-hidden="true" />
                  Generate My Garden
                </button>
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
