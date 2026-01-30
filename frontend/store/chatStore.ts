import { create } from "zustand";

interface ChatState {
  activeRoomId: string | null;
  isCreateRoomOpen: boolean;
  setActiveRoom: (roomId: string | null) => void;
  openCreateRoom: () => void;
  closeCreateRoom: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeRoomId: null,
  isCreateRoomOpen: false,
  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),
  openCreateRoom: () => set({ isCreateRoomOpen: true }),
  closeCreateRoom: () => set({ isCreateRoomOpen: false }),
}));
