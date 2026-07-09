import { useEditor, InteractionState } from "../store";

export const InteractionManager = {
  canDrawConnector(): boolean {
    const state = useEditor.getState().interactionState;
    return state === "IDLE" || state === "SELECTING";
  },

  canDrawShape(): boolean {
    const state = useEditor.getState().interactionState;
    return state === "IDLE" || state === "SELECTING";
  },

  canEditConnector(): boolean {
    const state = useEditor.getState().interactionState;
    return state === "IDLE" || state === "SELECTING" || state === "EDITING_CONNECTOR" || state === "MOVING_CONNECTOR";
  },

  canSelect(): boolean {
    const state = useEditor.getState().interactionState;
    return state === "IDLE" || state === "SELECTING";
  },

  begin(state: InteractionState) {
    useEditor.getState().setInteractionState(state);
  },

  end() {
    useEditor.getState().setInteractionState("IDLE");
  }
};
