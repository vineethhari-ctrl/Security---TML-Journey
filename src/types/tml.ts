export type SegmentType = 'Overall' | 'PV' | 'EV';

export type ZoneId =
  | 'ALL'
  | 'SOUTH'
  | 'WEST'
  | 'NORTH'
  | 'EAST'
  | 'CENTRAL';

export type DateMode = 'Today' | 'Calendar';

export type VehicleCategory =
  | 'Gate In'
  | 'Gate Out'
  | 'Road Test Out'
  | 'Road Test In'
  | 'Vehicles Inside Workshop'
  | 'Active Road Tests'
  | 'Vehicle Movement Register';

export type VisitFilterType =
  | 'ALL'
  | 'Appointment'
  | 'Walk In'
  | 'VIP_RV'
  | 'AGEING';

export type EntryModeType =
  | 'RFID Auto-Gate'
  | 'Manual Barcode Scan'
  | 'Manual Plate Scan';

export interface RegionDefinition {
  id: string;
  name: string;
  zone: Exclude<ZoneId, 'ALL'>;
  dealers: string[];
}

export interface RoadTestTrip {
  tripNo: number;
  outTime: string;
  inTime: string;
  driver: string;
  guardName: string;
  duration: string;
}

export interface VehicleRecord {
  id: number;
  reg: string;
  vin: string;
  model: string;
  segment: 'PV' | 'EV';
  customer: string;
  dealer: string;
  zone: Exclude<ZoneId, 'ALL'>;
  region: string;
  visitType: 'Appointment' | 'Walk In';
  vip: boolean;
  rv: boolean;
  category: Exclude<VehicleCategory, 'Vehicle Movement Register'>;
  dwellLabel: string;
  dwellVal: string;
  slaBreach: boolean;
  timeLabel: string;
  timeVal: string;
  gateInTime: string;
  gateOutTime: string;
  roadTestCount: number;
  securityGuard: string;
  roadTestTrips: RoadTestTrip[];
  dateStr: string;
  entryMode: EntryModeType;
  sa: string;
  csmName: string;
  csmPhone: string;
  bayNumber: string;
  jobCardNo: string;
  escalatedAt?: string;
  escalationNote?: string;
}

export interface KpiBreakdown {
  gateIn: string;
  gateOut: string;
  rtOut: string;
  rtIn: string;
  inside: string;
  activeRt: string;
  movementRegisterCount: string;
  ageingCount: string;
  vipRvCount: string;
  rfidCompliance: string;
  activeRtOver20m: string;
}

export interface ToastAlertItem {
  id: string;
  type: 'sla' | 'rfid' | 'escalation';
  title: string;
  sub: string;
  time: string;
  vehicleId?: number;
  categoryTarget?: VehicleCategory;
  filterTarget?: VisitFilterType;
}

export interface EscalationLogEntry {
  id: string;
  vehicleId: number;
  reg: string;
  model: string;
  dealer: string;
  zone: Exclude<ZoneId, 'ALL'>;
  region: string;
  csmName: string;
  reason: string;
  priority: 'High' | 'Critical';
  timestamp: string;
  status: 'Dispatched to Dealer GM' | 'Acknowledged';
}

export interface DealerComplianceMetric {
  dealer: string;
  zone: Exclude<ZoneId, 'ALL'>;
  region: string;
  city: string;
  rfidAutoCount: number;
  manualScanCount: number;
  compliancePct: number;
  insideWorkshopCount: number;
  slaBreachCount: number;
  csmLead: string;
}
