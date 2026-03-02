"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  createElement,
  type ReactNode,
} from "react";
import { CreateDealWizard } from "@/components/features/deals/create-deal-wizard";
import { CreateEntityForm } from "@/components/features/entities/create-entity-form";
import { CreateInvestorForm } from "@/components/features/investors/create-investor-form";
import { CreateMeetingForm } from "@/components/features/meetings/create-meeting-form";

// ── Types ───────────────────────────────────────────────

type DialogType =
  | "createDeal"
  | "createEntity"
  | "createInvestor"
  | "createMeeting"
  | null;

interface GlobalDialogsContextType {
  activeDialog: DialogType;
  openCreateDeal: () => void;
  openCreateEntity: () => void;
  openCreateInvestor: () => void;
  openCreateMeeting: () => void;
  closeDialog: () => void;
}

// ── Context ─────────────────────────────────────────────

const GlobalDialogsContext = createContext<GlobalDialogsContextType>({
  activeDialog: null,
  openCreateDeal: () => {},
  openCreateEntity: () => {},
  openCreateInvestor: () => {},
  openCreateMeeting: () => {},
  closeDialog: () => {},
});

export function useGlobalDialogs() {
  return useContext(GlobalDialogsContext);
}

// ── Provider ────────────────────────────────────────────

export function GlobalDialogsProvider({ children }: { children: ReactNode }) {
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);

  const openCreateDeal = useCallback(() => setActiveDialog("createDeal"), []);
  const openCreateEntity = useCallback(() => setActiveDialog("createEntity"), []);
  const openCreateInvestor = useCallback(() => setActiveDialog("createInvestor"), []);
  const openCreateMeeting = useCallback(() => setActiveDialog("createMeeting"), []);
  const closeDialog = useCallback(() => setActiveDialog(null), []);

  // Listen for command bar action events
  useEffect(() => {
    function handleCommandAction(e: Event) {
      const { actionId } = (e as CustomEvent).detail || {};
      switch (actionId) {
        case "createDeal":
          openCreateDeal();
          break;
        case "createEntity":
          openCreateEntity();
          break;
        case "createInvestor":
          openCreateInvestor();
          break;
        case "createMeeting":
          openCreateMeeting();
          break;
        // createTask, createCompany, createContact navigate to their pages
        // (handled by the command bar's path-based navigation)
      }
    }

    window.addEventListener("atlas:command-action", handleCommandAction);
    return () =>
      window.removeEventListener("atlas:command-action", handleCommandAction);
  }, [openCreateDeal, openCreateEntity, openCreateInvestor, openCreateMeeting]);

  return createElement(
    GlobalDialogsContext.Provider,
    {
      value: {
        activeDialog,
        openCreateDeal,
        openCreateEntity,
        openCreateInvestor,
        openCreateMeeting,
        closeDialog,
      },
    },
    children,
    // Render active dialog
    activeDialog === "createDeal" &&
      createElement(CreateDealWizard, { open: true, onClose: closeDialog }),
    activeDialog === "createEntity" &&
      createElement(CreateEntityForm, { open: true, onClose: closeDialog }),
    activeDialog === "createInvestor" &&
      createElement(CreateInvestorForm, { open: true, onClose: closeDialog }),
    activeDialog === "createMeeting" &&
      createElement(CreateMeetingForm, { open: true, onClose: closeDialog }),
  );
}
