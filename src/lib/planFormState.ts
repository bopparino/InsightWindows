// Shared plan-form state shapes + factory. No "use client" - the edit page
// (a server component) builds initial state with these too.

export type SystemState = {
  houseNbr: string;
  houseType: string;
  partNbr: string;
  partQuery: string;
  partCostOverride: string; // "" = book price
  smRuns: { feet: string; height: string; width: string; insulated: boolean }[];
  dbRuns: { feet: string; height: string; width: string; insulated: boolean }[];
  sheetMetalCost: string;
  ductBoardCost: string;
  otherCost: string;
  kitLines: { id: string; label: string; qty: string; unitPrice: string; picking?: boolean; query?: string }[];
  laborHours: string;
  laborRate: string;
  factor: string;
  taxPct: string;
  permitCost: string;
  serviceCost: string;
  commission: string;
};

export type PlanInitial = {
  dueDate: string;
  planNbr: string;
  builderName: string;
  projName: string;
  systems: SystemState[];
};

export const blankSystem = (): SystemState => ({
  houseNbr: "01",
  houseType: "",
  partNbr: "",
  partQuery: "",
  partCostOverride: "",
  smRuns: [],
  dbRuns: [],
  sheetMetalCost: "",
  ductBoardCost: "",
  otherCost: "",
  kitLines: [],
  laborHours: "",
  laborRate: "86",
  factor: "0.6",
  taxPct: "0.06",
  permitCost: "",
  serviceCost: "",
  commission: "",
});
