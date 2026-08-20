// POLITICIAN DATA IS INTENTIONALLY EMPTY.
// This provider boundary is where the future agreed data source will plug in.
// UI and routing must not know or care whether the source is public API, DB, or import pipeline.

export const PERSON_PROVIDER_STATUS = "UNDECIDED";

export async function listAssemblyMembers() {
  return { totalCapacity: 300, items: [], providerStatus: PERSON_PROVIDER_STATUS };
}

export async function listLocalLeaders() {
  return { totalCapacity: 300, items: [], providerStatus: PERSON_PROVIDER_STATUS };
}

export async function getPersonById() {
  return null;
}
