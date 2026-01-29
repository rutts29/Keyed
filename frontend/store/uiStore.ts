import { create } from "zustand";

interface UIState {
  isCreatePostOpen: boolean;
  isTipModalOpen: boolean;
  tipTarget: { wallet: string; postId?: string } | null;
  isSubscribeModalOpen: boolean;
  subscribeTarget: { wallet: string } | null;
  notificationsCount: number;
  openCreatePost: () => void;
  closeCreatePost: () => void;
  openTipModal: (wallet: string, postId?: string) => void;
  closeTipModal: () => void;
  openSubscribeModal: (wallet: string) => void;
  closeSubscribeModal: () => void;
  incrementNotifications: () => void;
  resetNotifications: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isCreatePostOpen: false,
  isTipModalOpen: false,
  tipTarget: null,
  isSubscribeModalOpen: false,
  subscribeTarget: null,
  notificationsCount: 0,
  openCreatePost: () => set({ isCreatePostOpen: true }),
  closeCreatePost: () => set({ isCreatePostOpen: false }),
  openTipModal: (wallet, postId) =>
    set({ isTipModalOpen: true, tipTarget: { wallet, postId } }),
  closeTipModal: () => set({ isTipModalOpen: false, tipTarget: null }),
  openSubscribeModal: (wallet) =>
    set({ isSubscribeModalOpen: true, subscribeTarget: { wallet } }),
  closeSubscribeModal: () =>
    set({ isSubscribeModalOpen: false, subscribeTarget: null }),
  incrementNotifications: () =>
    set((state) => ({ notificationsCount: state.notificationsCount + 1 })),
  resetNotifications: () => set({ notificationsCount: 0 }),
}));
