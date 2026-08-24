"use client";

import { Info, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
    label: "Basic Plants",
    examples: "Example: easy-care greens and hardy starters",
  },
];

const ALL_KEY = "all";
const STORAGE_KEY = "florascape_planner_result";

const INITIAL_FORM = {
  zipCode: "",
  gardenType: "",
  sunExposure: "",
  width: "",
  height: "",
  preferences: "",
  plantTypes: [],
};

function buildGardenPrompt(values) {
  const selectedPlants = PLANT_OPTIONS.filter((plant) =>
    values.plantTypes.includes(plant.key),
  ).map((plant) => `- ${plant.label}`);

  const preferenceText = values.preferences.trim();
  const preferencesLine =
    preferenceText.length > 0
      ? preferenceText
      : "No specific preferences were provided by the user.";

  const preferenceGuidance =
    preferenceText.length > 0
      ? "Keep in mind what the preferences are and provide any tips about what plants require more shade or should not be planted next to each other."
      : "The user did not provide preferences. Include your own suggestions based on the selected plants and provided details.";

  return `Generate a layout for a garden based on the following criteria:

Location: ${values.zipCode}
Garden Type: ${values.gardenType}
Sun Exposure: ${values.sunExposure}
Size: ${values.width}x${values.height} feet

Plants:
${selectedPlants.join("\n")}

Preferences:
${preferencesLine}

${preferenceGuidance}`;
}

function validate(values) {
  const errors = {};
  if (!/^\d{5}$/.test(values.zipCode.trim())) {
    errors.zipCode = "Enter a valid 5-digit ZIP code.";
  }

  if (!values.gardenType.trim()) {
    errors.gardenType = "Select a garden type.";
  }

  if (!values.sunExposure.trim()) {
    errors.sunExposure = "Select sun exposure.";
  }

  const width = Number(values.width);
  const height = Number(values.height);
  if (!values.width || width <= 0) {
    errors.width = "Width must be greater than 0.";
  }
  if (!values.height || height <= 0) {
    errors.height = "Height must be greater than 0.";
  }

  if (!values.plantTypes.length) {
    errors.plantTypes = "Select at least one plant category.";
  }

  return errors;
}

export default function Home() {
  const router = useRouter();
  const [formValues, setFormValues] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});

  function updateField(field, value) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  function togglePlant(plantKey) {
    if (plantKey === ALL_KEY) {
      const isAllSelected =
        formValues.plantTypes.length === PLANT_OPTIONS.length &&
        PLANT_OPTIONS.every((plant) => formValues.plantTypes.includes(plant.key));

      updateField(
        "plantTypes",
        isAllSelected ? [] : PLANT_OPTIONS.map((plant) => plant.key),
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

    const result = {
      generatedAt: new Date().toISOString(),
      prompt: buildGardenPrompt(formValues),
      selectedPlants,
      formValues,
    };

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    router.push("/planner/result");
  }

  const allChecked =
    formValues.plantTypes.length === PLANT_OPTIONS.length &&
    PLANT_OPTIONS.every((plant) => formValues.plantTypes.includes(plant.key));

  return (
    <div className="planner-page">
      <nav>
        <div className="container nav-inner">
          <a className="logo" href="/" aria-label="FloraScape home">
            FloraScape
          </a>
          <div className="planner-nav-actions">
            <a href="/" className="planner-back-link">
              Back To Landing
            </a>
            <a href="#planner" className="btn">
              Start Planning
            </a>
          </div>
        </div>
      </nav>

      <main id="top">
        <section className="hero">
          <div className="container hero-content">
            <div className="eyebrow">Planner</div>
            <h1>Garden Planner</h1>
            <p>Enter details and generate your result.</p>
          </div>
        </section>

        <section className="section planner-section" id="planner">
          <div className="container planner-grid">
            <div className="panel form-panel">
              <div className="panel-title-wrap">
                <h2>Garden Details</h2>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="input-grid">
                  <label className="field">
                    ZIP Code *
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 07030"
                      value={formValues.zipCode}
                      onChange={(event) =>
                        updateField("zipCode", event.target.value)
                      }
                    />
                    {errors.zipCode ? (
                      <span className="error">{errors.zipCode}</span>
                    ) : null}
                  </label>

                  <label className="field">
                    Garden Type *
                    <select
                      value={formValues.gardenType}
                      onChange={(event) =>
                        updateField("gardenType", event.target.value)
                      }
                    >
                      <option value="">Select one</option>
                      <option value="Raised beds">Raised beds</option>
                      <option value="In-ground">In-ground</option>
                      <option value="Containers">Containers</option>
                    </select>
                    {errors.gardenType ? (
                      <span className="error">{errors.gardenType}</span>
                    ) : null}
                  </label>

                  <label className="field">
                    Sun Exposure *
                    <select
                      value={formValues.sunExposure}
                      onChange={(event) =>
                        updateField("sunExposure", event.target.value)
                      }
                    >
                      <option value="">Select one</option>
                      <option value="Full Sun">Full Sun</option>
                      <option value="Partial Shade">Partial Shade</option>
                      <option value="Mostly Shade">Mostly Shade</option>
                    </select>
                    {errors.sunExposure ? (
                      <span className="error">{errors.sunExposure}</span>
                    ) : null}
                  </label>

                  <div className="field size-field">
                    <span>Size (feet) *</span>
                    <div className="size-inputs">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Width"
                        value={formValues.width}
                        onChange={(event) =>
                          updateField("width", event.target.value)
                        }
                      />
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Height"
                        value={formValues.height}
                        onChange={(event) =>
                          updateField("height", event.target.value)
                        }
                      />
                    </div>
                    {errors.width ? <span className="error">{errors.width}</span> : null}
                    {errors.height ? (
                      <span className="error">{errors.height}</span>
                    ) : null}
                  </div>
                </div>

                <fieldset className="plant-fieldset">
                  <legend>Plants *</legend>
                  <div className="plant-options">
                    {PLANT_OPTIONS.map((plant) => (
                      <label className="plant-option" key={plant.key}>
                        <input
                          type="checkbox"
                          checked={formValues.plantTypes.includes(plant.key)}
                          onChange={() => togglePlant(plant.key)}
                        />
                        <span>{plant.label}</span>
                        <span className="tooltip-wrap">
                          <Info size={15} />
                          <span className="tooltip-text">{plant.examples}</span>
                        </span>
                      </label>
                    ))}

                    <label className="plant-option all-option">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={() => togglePlant(ALL_KEY)}
                      />
                      <span>All of the above</span>
                    </label>
                  </div>
                  {errors.plantTypes ? (
                    <span className="error">{errors.plantTypes}</span>
                  ) : null}
                </fieldset>

                <label className="field">
                  Preferences (optional)
                  <textarea
                    rows={4}
                    placeholder="Lavender, tomatoes, pollinator friendly..."
                    value={formValues.preferences}
                    onChange={(event) =>
                      updateField("preferences", event.target.value)
                    }
                  />
                </label>

                <button type="submit" className="btn submit-btn">
                  <Sparkles size={18} strokeWidth={2.3} />
                  Generate Result
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
