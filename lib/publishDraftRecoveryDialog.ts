export type RecoveryDialogKeyAction = "escape_ignored" | "tab_wrapped" | "ignored";

export type RecoveryDialogFocusable = {
  focus: () => void;
};

export type RecoveryDialogKeyEvent = {
  key: string;
  shiftKey: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
};

/**
 * Recovery dialog keyboard contract:
 * - Escape never chooses continue or delete
 * - Tab cycles only the dialog actions (Continue → Delete → Continue)
 */
export function handlePublishRecoveryDialogKeyDown(
  event: RecoveryDialogKeyEvent,
  options: {
    getFocusables: () => RecoveryDialogFocusable[];
    getActive: () => unknown;
  },
): RecoveryDialogKeyAction {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    return "escape_ignored";
  }

  if (event.key !== "Tab") return "ignored";

  const focusables = options.getFocusables();
  if (focusables.length === 0) return "ignored";

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = options.getActive();

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
    return "tab_wrapped";
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
    return "tab_wrapped";
  }
  return "ignored";
}

export const RECOVERY_DIALOG_FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
