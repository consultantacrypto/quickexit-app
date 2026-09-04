export type CarBrandComboboxEnterResult = "select_highlight" | "ignore";

/**
 * Enter in the car-brand combobox may only commit the highlighted suggestion.
 * It must never be treated as form submit / step advance / checkout.
 */
export function resolveCarBrandComboboxEnter(input: {
  open: boolean;
  highlighted: string | undefined;
}): CarBrandComboboxEnterResult {
  if (input.open && input.highlighted) return "select_highlight";
  return "ignore";
}
