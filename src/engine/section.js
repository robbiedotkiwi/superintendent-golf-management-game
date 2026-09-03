import {
  CREW_TAB_DEFAULT,
  CREW_TABS,
  OFFICE_TAB_DEFAULT,
  OFFICE_TABS,
  SECTION_CREW,
  SECTION_MAP,
  SECTION_OFFICE,
  SECTION_SHED,
  SECTIONS,
  SHED_TAB_DEFAULT,
  SHED_TABS,
} from '../data/constants.js';

export function defaultSectionTabs() {
  return {
    [SECTION_OFFICE]: OFFICE_TAB_DEFAULT,
    [SECTION_CREW]: CREW_TAB_DEFAULT,
    [SECTION_SHED]: SHED_TAB_DEFAULT,
  };
}

export function normalizeSection(section) {
  return SECTIONS.includes(section) ? section : SECTION_MAP;
}

export function normalizeTabs(tabs) {
  const source = tabs && typeof tabs === 'object' ? tabs : {};
  return {
    [SECTION_OFFICE]: OFFICE_TABS.includes(source[SECTION_OFFICE]) ? source[SECTION_OFFICE] : OFFICE_TAB_DEFAULT,
    [SECTION_CREW]: CREW_TABS.includes(source[SECTION_CREW]) ? source[SECTION_CREW] : CREW_TAB_DEFAULT,
    [SECTION_SHED]: SHED_TABS.includes(source[SECTION_SHED]) ? source[SECTION_SHED] : SHED_TAB_DEFAULT,
  };
}

export function tabListForSection(section) {
  if (section === SECTION_OFFICE) return OFFICE_TABS;
  if (section === SECTION_CREW) return CREW_TABS;
  if (section === SECTION_SHED) return SHED_TABS;
  return [];
}
