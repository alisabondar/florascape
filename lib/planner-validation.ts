import { getAreaCopy, isRepeatableGardenType } from "./planner-config";
import type { PlannerFormErrors, PlannerFormValues } from "./types";

export const PLANNER_STEPS = [
  { key: "location", title: "Location & type" },
  { key: "space", title: "Your space" },
  { key: "plants", title: "What to grow" },
];

const STEP_FOR_ERROR = (key: string): number =>
  key === "zipCode" || key === "gardenType"
    ? 0
    : key.startsWith("inGround.") || key.startsWith("unit.")
      ? 1
      : 2;

export function validate(values: PlannerFormValues): PlannerFormErrors {
  const errors: PlannerFormErrors = {};

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

  if (isRepeatableGardenType(values.gardenType)) {
    const { formLabel } = getAreaCopy(values.gardenType);
    values.units.forEach((unit, index) => {
      if (Number(unit.width) <= 0) {
        errors[`unit.${unit.id}.width`] = `${formLabel} ${index + 1} needs a width.`;
      }
      if (Number(unit.length) <= 0) {
        errors[`unit.${unit.id}.length`] = `${formLabel} ${index + 1} needs a length.`;
      }
      if (!unit.sunExposure) {
        errors[`unit.${unit.id}.sunExposure`] = `${formLabel} ${index + 1} needs sun exposure.`;
      }
    });
  }

  return errors;
}

/** Errors for one planner step only (0 = location & type, 1 = space, 2 = plants). */
export function validateStep(values: PlannerFormValues, stepIndex: number): PlannerFormErrors {
  return Object.fromEntries(
    Object.entries(validate(values)).filter(([key]) => STEP_FOR_ERROR(key) === stepIndex),
  );
}

/** The first step with an error, or -1 when the whole form is valid. */
export function firstInvalidStep(errors: PlannerFormErrors): number {
  const steps = Object.keys(errors).map(STEP_FOR_ERROR);
  return steps.length ? Math.min(...steps) : -1;
}
