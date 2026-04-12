import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserProfile {
  university: string;
  faculty: string;
  group: string;
  fullName: string;
  variantGroup: string; // e.g. "Вариант 5"
  extraInfo: string;    // free-form additional info
}

interface ProfileStore {
  profile: UserProfile | null;
  onboardingDone: boolean;
  setProfile: (profile: UserProfile) => void;
  completeOnboarding: (profile: UserProfile) => void;
  resetOnboarding: () => void;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      profile: null,
      onboardingDone: false,

      setProfile: (profile) => set({ profile }),

      completeOnboarding: (profile) =>
        set({ profile, onboardingDone: true }),

      resetOnboarding: () =>
        set({ profile: null, onboardingDone: false }),
    }),
    { name: "vibestudy-profile" }
  )
);
