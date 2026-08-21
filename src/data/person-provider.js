import { ASSEMBLY_SEED, METROPOLITAN_SEED, BASIC_SEED } from "./person-seed.js";

export const PERSON_PROVIDER_STATUS = "STATIC_TEXT_SEED_2026_08";
export const PHOTO_PROVIDER_STATUS = "DISABLED";

export const PERSON_COUNTS = Object.freeze({
  assembly: 300,
  metropolitan: 16,
  basic: 227,
  total: 543,
  homeNowPreview: 15
});

const TYPES = Object.freeze({
  assembly: { prefix:"assembly", label:"국회의원", group:"국회", jurisdictionLabel:"선거구" },
  metropolitan: { prefix:"metropolitan", label:"광역단체장", group:"광역자치단체", jurisdictionLabel:"관할 광역자치단체" },
  basic: { prefix:"basic", label:"기초단체장", group:"기초자치단체", jurisdictionLabel:"관할 기초자치단체" }
});
const pad=n=>String(n).padStart(3,"0");

function build(type, rows) {
  const meta=TYPES[type];
  return rows.map((r,i)=>Object.freeze({
    id:`${meta.prefix}-${pad(i+1)}`,
    slot:i+1,
    type,
    roleLabel:meta.label,
    groupLabel:meta.group,
    jurisdictionLabel:meta.jurisdictionLabel,
    connected:true,
    name:r[0]||"",
    party:r[1]||"",
    region:r[2]||"",
    jurisdiction:r[3]||"",
    terms:r[4]||"",
    committee:r[5]||"",
    termStart:r[6]||"",
    termEnd:r[7]||"",
    office:r[8]||meta.label,
    electionLabel:r[9]||"",
    photo:"",
    source:type==="assembly"
      ? "국회 공개정보 기반 정참시 현역 스냅샷"
      : "2026 제9회 전국동시지방선거 당선인 결과"
  }));
}
const ASSEMBLY=build("assembly",ASSEMBLY_SEED);
const METROPOLITAN=build("metropolitan",METROPOLITAN_SEED);
const BASIC=build("basic",BASIC_SEED);
const ALL=Object.freeze([...ASSEMBLY,...METROPOLITAN,...BASIC]);
const BY_ID=new Map(ALL.map(x=>[x.id,x]));

export const listAssemblyMembers=()=>ASSEMBLY;
export const listMetropolitanLeaders=()=>METROPOLITAN;
export const listBasicLeaders=()=>BASIC;
export const listAllLocalLeaders=()=>[...METROPOLITAN,...BASIC];
export const listAllPoliticians=()=>ALL;
export const listHomeNowPreviewSlots=()=>ASSEMBLY.slice(0,PERSON_COUNTS.homeNowPreview);
export const getPersonSlotById=id=>BY_ID.get(String(id||""))||null;
