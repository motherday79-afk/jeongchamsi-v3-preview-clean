export const PERSON_PROVIDER_STATUS = "UNDECIDED";
export const PHOTO_PROVIDER_STATUS = "UNDECIDED";

export const PERSON_COUNTS = Object.freeze({
  assembly: 300,
  metropolitan: 16,
  basic: 227,
  total: 543,
  homeNowPreview: 15
});

const TYPES = Object.freeze({
  assembly: {
    prefix: "assembly",
    label: "국회의원",
    group: "국회",
    jurisdictionLabel: "선거구"
  },
  metropolitan: {
    prefix: "metropolitan",
    label: "광역단체장",
    group: "광역자치단체",
    jurisdictionLabel: "관할 광역자치단체"
  },
  basic: {
    prefix: "basic",
    label: "기초단체장",
    group: "기초자치단체",
    jurisdictionLabel: "관할 기초자치단체"
  }
});

const pad = n => String(n).padStart(3, "0");

function slot(type, index) {
  const meta = TYPES[type];
  return Object.freeze({
    id: `${meta.prefix}-${pad(index)}`,
    slot: index,
    type,
    roleLabel: meta.label,
    groupLabel: meta.group,
    jurisdictionLabel: meta.jurisdictionLabel,
    connected: false
  });
}

function make(type, count) {
  return Array.from({ length: count }, (_, i) => slot(type, i + 1));
}

const ASSEMBLY = make("assembly", PERSON_COUNTS.assembly);
const METROPOLITAN = make("metropolitan", PERSON_COUNTS.metropolitan);
const BASIC = make("basic", PERSON_COUNTS.basic);
const ALL = [...ASSEMBLY, ...METROPOLITAN, ...BASIC];
const BY_ID = new Map(ALL.map(x => [x.id, x]));

export const listAssemblyMembers = () => ASSEMBLY;
export const listMetropolitanLeaders = () => METROPOLITAN;
export const listBasicLeaders = () => BASIC;
export const listAllLocalLeaders = () => [...METROPOLITAN, ...BASIC];
export const listAllPoliticians = () => ALL;
export const listHomeNowPreviewSlots = () => ASSEMBLY.slice(0, PERSON_COUNTS.homeNowPreview);
export const getPersonSlotById = id => BY_ID.get(String(id || "")) || null;
