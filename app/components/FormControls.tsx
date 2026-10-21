"use client";

import { Check, ChevronDown } from "lucide-react";
import { Checkbox, Select } from "radix-ui";
import type { ReactNode } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectControlProps {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: readonly SelectOption[];
  ariaInvalid?: boolean;
  ariaLabel?: string;
}

interface CheckboxControlProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function SelectControl({
  id,
  value,
  onValueChange,
  placeholder = "Select one",
  options,
  ariaInvalid = false,
  ariaLabel,
}: SelectControlProps) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger
        id={id}
        className="ui-select-trigger"
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="ui-select-icon">
          <ChevronDown size={17} aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="ui-select-content"
          position="popper"
          sideOffset={6}
        >
          <Select.Viewport className="ui-select-viewport">
            {options.map((option) => (
              <Select.Item
                className="ui-select-item"
                key={option.value}
                value={option.value}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="ui-select-indicator">
                  <Check size={15} aria-hidden="true" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export function CheckboxControl({
  id,
  checked,
  onCheckedChange,
  label,
  children,
  className = "",
}: CheckboxControlProps) {
  return (
    <div className={`ui-checkbox-row ${className}`.trim()}>
      <Checkbox.Root
        id={id}
        className="ui-checkbox-root"
        checked={checked}
        onCheckedChange={(nextChecked) => onCheckedChange(nextChecked === true)}
      >
        <Checkbox.Indicator className="ui-checkbox-indicator">
          <Check size={15} strokeWidth={3} aria-hidden="true" />
        </Checkbox.Indicator>
      </Checkbox.Root>
      <label htmlFor={id} className="ui-checkbox-label">
        {label}
      </label>
      {children}
    </div>
  );
}
