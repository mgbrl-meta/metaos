import {
  METAOS_DEFAULT_MODULE_ID,
  METAOS_MODULES,
  METAOS_SECTIONS,
} from "@/lib/metaos-ui/moduleRegistry";

import {
  METAOS_MODULE_IDS,
  type MetaOSModuleDefinition,
  type MetaOSModuleId,
  type MetaOSNavigationSection,
  type MetaOSPlatform,
} from "@/lib/metaos-ui/contracts";

const moduleIdSet = new Set<string>(
  METAOS_MODULE_IDS
);

const moduleById =
  new Map<MetaOSModuleId, MetaOSModuleDefinition>(
    METAOS_MODULES.map((module) => [
      module.id,
      module,
    ])
  );

export function isMetaOSModuleId(
  value: unknown
): value is MetaOSModuleId {
  return (
    typeof value === "string" &&
    moduleIdSet.has(value)
  );
}

export function getMetaOSModule(
  id: MetaOSModuleId
): MetaOSModuleDefinition {
  const module = moduleById.get(id);

  if (!module) {
    throw new Error(
      `Unknown MetaOS module: ${id}`
    );
  }

  return module;
}

export function getMetaOSModulesByPlatform(
  platform: MetaOSPlatform
): MetaOSModuleDefinition[] {
  return METAOS_MODULES.filter(
    (module) => module.platform === platform
  );
}

export function getMetaOSNavigationSections(
  platform: MetaOSPlatform
): MetaOSNavigationSection[] {
  return METAOS_SECTIONS
    .filter(
      (section) => section.platform === platform
    )
    .map((section) => ({
      section,
      modules: METAOS_MODULES.filter(
        (module) =>
          module.sectionId === section.id
      ),
    }))
    .filter(
      (group) => group.modules.length > 0
    );
}

export function getDefaultMetaOSModuleId(
  platform: MetaOSPlatform
): MetaOSModuleId {
  if (platform === "meta") {
    return METAOS_DEFAULT_MODULE_ID;
  }

  if (platform === "google") {
    return "google_search_terms";
  }

  return "settings";
}

export function searchMetaOSModules(
  query: string
): MetaOSModuleDefinition[] {
  const normalizedQuery =
    query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [...METAOS_MODULES];
  }

  return METAOS_MODULES.filter(
    (module) => {
      const searchableText = [
        module.label,
        module.shortLabel,
        module.description,
        module.platform,
        ...module.keywords,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        normalizedQuery
      );
    }
  );
}

export function getAdjacentMetaOSModuleId(
  currentId: MetaOSModuleId,
  direction: "previous" | "next"
): MetaOSModuleId {
  const index = METAOS_MODULES.findIndex(
    (module) => module.id === currentId
  );

  if (index < 0) {
    return METAOS_DEFAULT_MODULE_ID;
  }

  const offset =
    direction === "next" ? 1 : -1;

  const nextIndex =
    (
      index +
      offset +
      METAOS_MODULES.length
    ) % METAOS_MODULES.length;

  return (
    METAOS_MODULES[nextIndex]?.id ??
    METAOS_DEFAULT_MODULE_ID
  );
}
