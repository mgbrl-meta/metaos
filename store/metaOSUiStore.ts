"use client";

import { create } from "zustand";

import {
  createJSONStorage,
  persist,
} from "zustand/middleware";

import type {
  MetaOSModuleId,
  MetaOSPlatform,
} from "@/lib/metaos-ui/contracts";

import {
  getDefaultMetaOSModuleId,
  getMetaOSModule,
  isMetaOSModuleId,
} from "@/lib/metaos-ui/moduleQueries";

import {
  METAOS_DEFAULT_MODULE_ID,
} from "@/lib/metaos-ui/moduleRegistry";

const MAX_RECENT_MODULES = 8;

const DEFAULT_LAST_MODULE_BY_PLATFORM:
  Record<MetaOSPlatform, MetaOSModuleId> = {
    meta: METAOS_DEFAULT_MODULE_ID,
    google: "google_search_terms",
    system: "settings",
  };

interface MetaOSUiStore {
  activeModuleId: MetaOSModuleId;

  sidebarCollapsed: boolean;
  mobileNavigationOpen: boolean;
  commandPaletteOpen: boolean;
  navigationSearch: string;

  recentModuleIds: MetaOSModuleId[];

  lastModuleByPlatform:
    Record<MetaOSPlatform, MetaOSModuleId>;

  setActiveModule:
    (moduleId: MetaOSModuleId) => void;

  setActivePlatform:
    (platform: MetaOSPlatform) => void;

  setSidebarCollapsed:
    (collapsed: boolean) => void;

  toggleSidebar: () => void;

  setMobileNavigationOpen:
    (open: boolean) => void;

  setCommandPaletteOpen:
    (open: boolean) => void;

  setNavigationSearch:
    (query: string) => void;

  resetNavigation: () => void;
}

function addRecentModule(
  recentModuleIds: MetaOSModuleId[],
  moduleId: MetaOSModuleId
): MetaOSModuleId[] {
  return [
    moduleId,
    ...recentModuleIds.filter(
      (id) => id !== moduleId
    ),
  ].slice(0, MAX_RECENT_MODULES);
}

export const useMetaOSUiStore =
  create<MetaOSUiStore>()(
    persist(
      (set, get) => ({
        activeModuleId:
          METAOS_DEFAULT_MODULE_ID,

        sidebarCollapsed: true,
        mobileNavigationOpen: false,
        commandPaletteOpen: false,
        navigationSearch: "",

        recentModuleIds: [
          METAOS_DEFAULT_MODULE_ID,
        ],

        lastModuleByPlatform:
          DEFAULT_LAST_MODULE_BY_PLATFORM,

        setActiveModule: (moduleId) => {
          const module =
            getMetaOSModule(moduleId);

          set((state) => ({
            activeModuleId: moduleId,

            mobileNavigationOpen: false,
            commandPaletteOpen: false,
            navigationSearch: "",

            recentModuleIds:
              addRecentModule(
                state.recentModuleIds,
                moduleId
              ),

            lastModuleByPlatform: {
              ...state.lastModuleByPlatform,
              [module.platform]: moduleId,
            },
          }));
        },

        setActivePlatform: (platform) => {
          const rememberedModuleId =
            get()
              .lastModuleByPlatform[
                platform
              ];

          const moduleId =
            isMetaOSModuleId(
              rememberedModuleId
            )
              ? rememberedModuleId
              : getDefaultMetaOSModuleId(
                  platform
                );

          get().setActiveModule(moduleId);
        },

        setSidebarCollapsed:
          (sidebarCollapsed) =>
            set({ sidebarCollapsed }),

        toggleSidebar: () =>
          set((state) => ({
            sidebarCollapsed:
              !state.sidebarCollapsed,
          })),

        setMobileNavigationOpen:
          (mobileNavigationOpen) =>
            set({ mobileNavigationOpen }),

        setCommandPaletteOpen:
          (commandPaletteOpen) =>
            set({ commandPaletteOpen }),

        setNavigationSearch:
          (navigationSearch) =>
            set({ navigationSearch }),

        resetNavigation: () =>
          set({
            activeModuleId:
              METAOS_DEFAULT_MODULE_ID,

            sidebarCollapsed: true,
            mobileNavigationOpen: false,
            commandPaletteOpen: false,
            navigationSearch: "",

            recentModuleIds: [
              METAOS_DEFAULT_MODULE_ID,
            ],

            lastModuleByPlatform:
              DEFAULT_LAST_MODULE_BY_PLATFORM,
          }),
      }),
      {
        name: "metaos-ui-v1",

        storage: createJSONStorage(
          () => localStorage
        ),

        version: 2,

        partialize: (state) => ({
          activeModuleId:
            state.activeModuleId,

          sidebarCollapsed:
            state.sidebarCollapsed,

          recentModuleIds:
            state.recentModuleIds,

          lastModuleByPlatform:
            state.lastModuleByPlatform,
        }),

        migrate: (
          persistedState,
          version
        ) => {
          const saved =
            (
              persistedState ?? {}
            ) as Partial<MetaOSUiStore>;

          if (version < 2) {
            return {
              ...saved,
              sidebarCollapsed: true,
            };
          }

          return saved;
        },

        merge: (
          persisted,
          current
        ) => {
          const saved =
            persisted as
              Partial<MetaOSUiStore>;

          const activeModuleId =
            isMetaOSModuleId(
              saved.activeModuleId
            )
              ? saved.activeModuleId
              : current.activeModuleId;

          return {
            ...current,
            ...saved,

            activeModuleId,

            sidebarCollapsed:
              saved.sidebarCollapsed ??
              true,

            mobileNavigationOpen: false,
            commandPaletteOpen: false,
            navigationSearch: "",
          };
        },
      }
    )
  );

export const selectActiveMetaOSModule =
  (state: MetaOSUiStore) =>
    getMetaOSModule(
      state.activeModuleId
    );

export const selectActiveMetaOSPlatform =
  (state: MetaOSUiStore) =>
    getMetaOSModule(
      state.activeModuleId
    ).platform;
