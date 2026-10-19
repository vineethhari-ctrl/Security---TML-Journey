/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Building2,
  Calendar,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Clock,
  Home,
  LogIn,
  LogOut,
  MapPin,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  Star,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  AVAILABLE_DATES,
  BASELINE_SOUTH_KPIS,
  DEALER_COMPLIANCE_METRICS,
  INITIAL_TOAST_ALERTS,
  INITIAL_VEHICLES,
  SECURITY_GUARDS,
  TML_REGIONS,
  TML_ZONES,
} from './data/tmlData';
import {
  DateMode,
  EscalationLogEntry,
  KpiBreakdown,
  RegionDefinition,
  SegmentType,
  ToastAlertItem,
  VehicleCategory,
  VehicleRecord,
  VisitFilterType,
  ZoneId,
} from './types/tml';

interface DemoStep {
  stepNumber: number;
  title: string;
  caption: string;
  durationMs: number;
}

const DEMO_STEPS: DemoStep[] = [
  {
    stepNumber: 1,
    title: '1. Pan-India TML Hierarchy (5 Zones & 15 Regions)',
    caption:
      'TML regional managers can filter workshop security and reception telemetry across all 5 Pan-India Zones (South, West, North, East, Central), 15 Regional Offices, and individual dealerships.',
    durationMs: 7500,
  },
  {
    stepNumber: 2,
    title: '2. Powertrain Segment & Date Controls (Overall / PV / EV)',
    caption:
      'Toggle seamlessly between Overall network volume, Passenger Vehicles (PV), and Electric Vehicles (EV), or inspect historical dates using the Calendar selector.',
    durationMs: 7000,
  },
  {
    stepNumber: 3,
    title: '3. Live SLA Breach & RFID Notification Center',
    caption:
      'Tapping the top-right notification bell reveals real-time exception alerts—such as VIP vehicles inside the workshop beyond 3 days and daily RFID Gate-In compliance rates.',
    durationMs: 7500,
  },
  {
    stepNumber: 4,
    title: '4. Today’s Network Summary & Workshop Counters',
    caption:
      'The 4 pastel summary tiles track Gate In, Gate Out, Road Test Out, and Road Test In counts, paired with live counters for Vehicles Inside Workshop and Active Road Tests.',
    durationMs: 7500,
  },
  {
    stepNumber: 5,
    title: '5. TML Governance & RFID Auto-Gate Telemetry',
    caption:
      'Unlike the dealer guard app that uses QR/barcode scanner buttons, the TML portal tracks Governance Exceptions: Ageing > 48 Hours, VIP & Repeat Visits, RFID Auto-Gate vs Manual Scan compliance, and Active Road Tests > 20 mins.',
    durationMs: 8500,
  },
  {
    stepNumber: 6,
    title: '6. Vehicle Movement Register & Security Guard Filter',
    caption:
      'Opening the Vehicle Movement Register displays every vehicle’s Gate In Time, Gate Out Time, Road Test Count, and Security Guard filter. Expanding a card reveals the trip-by-trip road test log.',
    durationMs: 9000,
  },
  {
    stepNumber: 7,
    title: '7. Direct CSM & Dealer GM Delay Escalation',
    caption:
      'For any delayed or SLA-breached vehicle, TML managers can dispatch a priority escalation directly to the Dealership GM and Territory Customer Support Manager (CSM), logged in real time.',
    durationMs: 8500,
  },
];

function padTwoDigits(num: number): string {
  return String(Math.max(0, num)).padStart(2, '0');
}

export default function App() {
  // Core Navigation & View State
  const [activeView, setActiveView] = useState<'home' | 'list'>('home');
  const [currentSegment, setCurrentSegment] = useState<SegmentType>('Overall');
  const [currentCategory, setCurrentCategory] = useState<VehicleCategory>(
    'Vehicle Movement Register'
  );

  // Pan-India TML Hierarchy State (Zone -> Region -> Dealership)
  const [selectedZone, setSelectedZone] = useState<ZoneId>('SOUTH');
  const [selectedRegion, setSelectedRegion] =
    useState<string>('South - Kerala');
  const [selectedDealer, setSelectedDealer] = useState<string>('ALL');

  // Date & Calendar Filter State
  const [dateMode, setDateMode] = useState<DateMode>('Today');
  const [selectedDate, setSelectedDate] = useState<string>('25 May 26');
  const [showCalendarPicker, setShowCalendarPicker] = useState<boolean>(false);

  // Drill-down & Movement Register Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [listDealerFilter, setListDealerFilter] = useState<string>('ALL');
  const [listGuardFilter, setListGuardFilter] = useState<string>('ALL');
  const [listVisitFilter, setListVisitFilter] =
    useState<VisitFilterType>('ALL');

  // Expanded Audit Drawers on Vehicle Cards
  const [expandedVehicleIds, setExpandedVehicleIds] = useState<
    Record<number, boolean>
  >({ 4: true, 1: true });

  // Live Notifications / Toast Banner State
  const [showToasts, setShowToasts] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastAlertItem[]>(INITIAL_TOAST_ALERTS);

  // RFID Compliance Sheet State
  const [showRfidSheet, setShowRfidSheet] = useState<boolean>(false);

  // Vehicles & Escalations State
  const [vehicles, setVehicles] = useState<VehicleRecord[]>(INITIAL_VEHICLES);
  const [escalationLogs, setEscalationLogs] = useState<EscalationLogEntry[]>([
    {
      id: 'esc-init-1',
      vehicleId: 2,
      reg: 'KL08BS899',
      model: 'TATA NEXON - AMT',
      dealer: 'Focuz Cars - Kochi',
      zone: 'SOUTH',
      region: 'South - Kerala',
      csmName: 'Vivek Nair (TML CSM - South)',
      reason: 'VIP Vehicle dwell time exceeded 72 hours (3d 3hr inside)',
      priority: 'Critical',
      timestamp: '25 May 26 | 02:35 PM',
      status: 'Acknowledged',
    },
  ]);

  // Active Escalation Dialog State (replaces window.alert)
  const [escalatingVehicle, setEscalatingVehicle] =
    useState<VehicleRecord | null>(null);
  const [escalationNoteInput, setEscalationNoteInput] = useState<string>('');
  const [escalationPriority, setEscalationPriority] = useState<
    'High' | 'Critical'
  >('Critical');
  const [recentEscalationBanner, setRecentEscalationBanner] = useState<
    string | null
  >(null);

  // Interactive Guided Demo Tour State
  const [isDemoPlaying, setIsDemoPlaying] = useState<boolean>(false);
  const [demoStepIndex, setDemoStepIndex] = useState<number>(0);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const timerRef = useRef<number | null>(null);

  // Filtered Regions based on selected Zone
  const availableRegions = useMemo<RegionDefinition[]>(() => {
    if (selectedZone === 'ALL') {
      return TML_REGIONS;
    }
    return (TML_REGIONS ?? []).filter((r) => r.zone === selectedZone);
  }, [selectedZone]);

  // Filtered Dealerships based on selected Zone & Region
  const availableDealers = useMemo<string[]>(() => {
    const regionsToUse =
      selectedRegion === 'ALL'
        ? availableRegions
        : (availableRegions ?? []).filter((r) => r.id === selectedRegion);

    const dealers: string[] = [];
    (regionsToUse ?? []).forEach((reg) => {
      (reg.dealers ?? []).forEach((d) => {
        if (!dealers.includes(d)) {
          dealers.push(d);
        }
      });
    });
    return dealers;
  }, [availableRegions, selectedRegion]);

  // Cascading Zone Handler
  const handleZoneChange = (newZone: ZoneId) => {
    setSelectedZone(newZone);
    setSelectedRegion('ALL');
    setSelectedDealer('ALL');
    setListDealerFilter('ALL');
  };

  // Cascading Region Handler
  const handleRegionChange = (newRegion: string) => {
    setSelectedRegion(newRegion);
    setSelectedDealer('ALL');
    setListDealerFilter('ALL');
  };

  // Cascading Dealer Handler
  const handleHomeDealerChange = (newDealer: string) => {
    setSelectedDealer(newDealer);
    setListDealerFilter(newDealer);
  };

  // Speak Narration Helper using Web Speech API defensively
  const speakCaption = (text: string, shouldSpeak: boolean) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    if (!shouldSpeak) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Apply UI State for Each Guided Demo Step
  const applyDemoStepState = (stepIdx: number) => {
    const step = DEMO_STEPS[stepIdx];
    if (!step) return;

    speakCaption(step.caption, voiceEnabled);

    switch (step.stepNumber) {
      case 1: {
        // Step 1: Pan-India Hierarchy on Home View
        setEscalatingVehicle(null);
        setActiveView('home');
        setSelectedZone('ALL');
        setSelectedRegion('ALL');
        setSelectedDealer('ALL');
        setCurrentSegment('Overall');
        setShowToasts(false);
        setShowRfidSheet(false);
        break;
      }
      case 2: {
        // Step 2: Segment & Date Controls
        setEscalatingVehicle(null);
        setActiveView('home');
        setSelectedZone('SOUTH');
        setSelectedRegion('South - Kerala');
        setCurrentSegment('EV');
        setShowToasts(false);
        setShowRfidSheet(false);
        break;
      }
      case 3: {
        // Step 3: Live SLA & RFID Notification Center
        setEscalatingVehicle(null);
        setActiveView('home');
        setCurrentSegment('Overall');
        setShowToasts(true);
        setShowRfidSheet(false);
        break;
      }
      case 4: {
        // Step 4: Today's Summary & Counters
        setEscalatingVehicle(null);
        setActiveView('home');
        setShowToasts(false);
        setShowRfidSheet(false);
        break;
      }
      case 5: {
        // Step 5: TML Governance & RFID Compliance Breakdown
        setEscalatingVehicle(null);
        setActiveView('home');
        setShowToasts(false);
        setShowRfidSheet(true);
        break;
      }
      case 6: {
        // Step 6: Vehicle Movement Register View
        setEscalatingVehicle(null);
        setShowToasts(false);
        setShowRfidSheet(false);
        setSelectedZone('SOUTH');
        setSelectedRegion('South - Kerala');
        setListDealerFilter('ALL');
        setListGuardFilter('ALL');
        setListVisitFilter('ALL');
        setCurrentCategory('Vehicle Movement Register');
        setExpandedVehicleIds({ 4: true, 1: true });
        setActiveView('list');
        break;
      }
      case 7: {
        // Step 7: Escalation Modal on VIP Vehicle
        setShowToasts(false);
        setShowRfidSheet(false);
        setSelectedZone('SOUTH');
        setSelectedRegion('South - Kerala');
        setCurrentCategory('Vehicles Inside Workshop');
        setListVisitFilter('AGEING');
        setActiveView('list');
        const targetVehicle = (vehicles ?? []).find((v) => v.id === 2);
        if (targetVehicle) {
          setEscalatingVehicle(targetVehicle);
          setEscalationPriority('Critical');
          setEscalationNoteInput(
            'SLA breach (3d 3hr inside). Expedite bay allocation & notify Customer Care.'
          );
        }
        break;
      }
      default:
        break;
    }
  };

  // Auto-advance Guided Demo Timer
  useEffect(() => {
    if (!isDemoPlaying) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      return;
    }

    const currentStepObj = DEMO_STEPS[demoStepIndex];
    const delay = currentStepObj?.durationMs ?? 7500;

    timerRef.current = window.setTimeout(() => {
      if (demoStepIndex < DEMO_STEPS.length - 1) {
        const nextIdx = demoStepIndex + 1;
        setDemoStepIndex(nextIdx);
        applyDemoStepState(nextIdx);
      } else {
        setIsDemoPlaying(false);
        setEscalatingVehicle(null);
      }
    }, delay);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [isDemoPlaying, demoStepIndex, voiceEnabled]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleStartDemo = () => {
    setDemoStepIndex(0);
    setIsDemoPlaying(true);
    applyDemoStepState(0);
  };

  const handleStopDemo = () => {
    setIsDemoPlaying(false);
    setEscalatingVehicle(null);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const handleStepJump = (newIdx: number) => {
    const clamped = Math.max(0, Math.min(DEMO_STEPS.length - 1, newIdx));
    setDemoStepIndex(clamped);
    applyDemoStepState(clamped);
  };

  // Compute KPI Numbers dynamically across Zones, Regions, and Dealerships
  const computedKpis = useMemo<KpiBreakdown>(() => {
    if (
      selectedZone === 'SOUTH' &&
      selectedRegion === 'South - Kerala' &&
      selectedDealer === 'ALL'
    ) {
      return (
        BASELINE_SOUTH_KPIS[currentSegment] ?? BASELINE_SOUTH_KPIS.Overall
      );
    }

    const scoped = (vehicles ?? []).filter((v) => {
      if (selectedZone !== 'ALL' && v.zone !== selectedZone) return false;
      if (selectedRegion !== 'ALL' && v.region !== selectedRegion) return false;
      if (selectedDealer !== 'ALL' && v.dealer !== selectedDealer) return false;
      if (currentSegment !== 'Overall' && v.segment !== currentSegment)
        return false;
      return true;
    });

    const insideList = scoped.filter(
      (v) => v.category === 'Vehicles Inside Workshop'
    );
    const gateOutList = scoped.filter((v) => v.category === 'Gate Out');
    const rtOutList = scoped.filter((v) => v.category === 'Road Test Out');
    const rtInList = scoped.filter((v) => v.category === 'Road Test In');
    const activeRtList = scoped.filter(
      (v) => v.category === 'Active Road Tests'
    );
    const ageingList = scoped.filter((v) => v.slaBreach);
    const vipRvList = scoped.filter((v) => v.vip || v.rv);
    const rfidCount = scoped.filter(
      (v) => v.entryMode === 'RFID Auto-Gate'
    ).length;
    const rfidPct =
      scoped.length > 0 ? Math.round((rfidCount / scoped.length) * 100) : 93;

    return {
      gateIn: padTwoDigits(scoped.length),
      gateOut: padTwoDigits(gateOutList.length),
      rtOut: padTwoDigits(rtOutList.length),
      rtIn: padTwoDigits(rtInList.length),
      inside: padTwoDigits(insideList.length),
      activeRt: padTwoDigits(activeRtList.length),
      movementRegisterCount: padTwoDigits(scoped.length),
      ageingCount: padTwoDigits(ageingList.length),
      vipRvCount: padTwoDigits(vipRvList.length),
      rfidCompliance: `${rfidPct}%`,
      activeRtOver20m: padTwoDigits(
        activeRtList.filter((v) => v.slaBreach).length
      ),
    };
  }, [
    selectedZone,
    selectedRegion,
    selectedDealer,
    currentSegment,
    vehicles,
  ]);

  // Open Drill-down or Movement Register View
  const openListView = (
    category: VehicleCategory,
    presetFilter: VisitFilterType = 'ALL'
  ) => {
    setCurrentCategory(category);
    setListVisitFilter(presetFilter);
    setListDealerFilter(selectedDealer);
    setActiveView('list');
  };

  // Close Drill-down List View
  const closeListView = () => {
    setActiveView('home');
  };

  // Filtered Vehicles for List View & Vehicle Movement Register
  const filteredVehicles = useMemo<VehicleRecord[]>(() => {
    const query = (searchQuery ?? '').trim().toLowerCase();

    return (vehicles ?? []).filter((v) => {
      if (selectedZone !== 'ALL' && v.zone !== selectedZone) return false;
      if (selectedRegion !== 'ALL' && v.region !== selectedRegion) return false;

      if (
        currentCategory !== 'Gate In' &&
        currentCategory !== 'Vehicle Movement Register' &&
        v.category !== currentCategory
      ) {
        return false;
      }

      if (currentSegment !== 'Overall' && v.segment !== currentSegment) {
        return false;
      }
      if (listDealerFilter !== 'ALL' && v.dealer !== listDealerFilter) {
        return false;
      }
      if (listGuardFilter !== 'ALL' && v.securityGuard !== listGuardFilter) {
        return false;
      }
      if (listVisitFilter === 'Appointment' && v.visitType !== 'Appointment') {
        return false;
      }
      if (listVisitFilter === 'Walk In' && v.visitType !== 'Walk In') {
        return false;
      }
      if (listVisitFilter === 'VIP_RV' && !(v.vip || v.rv)) {
        return false;
      }
      if (listVisitFilter === 'AGEING' && !v.slaBreach) {
        return false;
      }
      if (query) {
        const haystack =
          `${v.reg} ${v.vin} ${v.customer} ${v.dealer} ${v.region} ${v.model} ${v.sa} ${v.securityGuard}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [
    vehicles,
    selectedZone,
    selectedRegion,
    currentCategory,
    currentSegment,
    listDealerFilter,
    listGuardFilter,
    listVisitFilter,
    searchQuery,
  ]);

  // Toggle Vehicle Audit Drawer
  const toggleAuditDrawer = (id: number) => {
    setExpandedVehicleIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Open Escalation Confirmation Modal
  const handleInitiateEscalation = (vehicle: VehicleRecord) => {
    setEscalatingVehicle(vehicle);
    setEscalationPriority(
      vehicle.vip || vehicle.slaBreach ? 'Critical' : 'High'
    );
    setEscalationNoteInput(
      vehicle.slaBreach
        ? `SLA breach (${vehicle.dwellVal || 'Overdue'}). Expedite bay allocation & notify Customer Care.`
        : `Requesting priority status update from Service Advisor ${vehicle.sa}.`
    );
  };

  // Confirm & Dispatch Escalation to Dealership CSM
  const handleConfirmEscalation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalatingVehicle) return;

    const nowTime = '25 May 26 | Just now';
    const noteText =
      escalationNoteInput.trim() ||
      `Escalation dispatched to Dealer GM at ${escalatingVehicle.dealer}`;

    setVehicles((prev) =>
      (prev ?? []).map((item) =>
        item.id === escalatingVehicle.id
          ? {
              ...item,
              escalatedAt: nowTime,
              escalationNote: noteText,
            }
          : item
      )
    );

    const newEntry: EscalationLogEntry = {
      id: `esc-${Date.now()}`,
      vehicleId: escalatingVehicle.id,
      reg: escalatingVehicle.reg,
      model: escalatingVehicle.model,
      dealer: escalatingVehicle.dealer,
      zone: escalatingVehicle.zone,
      region: escalatingVehicle.region,
      csmName: escalatingVehicle.csmName,
      reason: noteText,
      priority: escalationPriority,
      timestamp: nowTime,
      status: 'Dispatched to Dealer GM',
    };
    setEscalationLogs((prev) => [newEntry, ...(prev ?? [])]);

    const newToast: ToastAlertItem = {
      id: `toast-esc-${Date.now()}`,
      type: 'escalation',
      title: `Escalated: ${escalatingVehicle.reg} (${escalationPriority})`,
      sub: `Sent to Dealer GM at ${escalatingVehicle.dealer} & ${escalatingVehicle.csmName}`,
      time: 'Just now',
      vehicleId: escalatingVehicle.id,
      categoryTarget: escalatingVehicle.category,
    };
    setToasts((prev) => [newToast, ...(prev ?? [])]);

    setRecentEscalationBanner(
      `Escalation sent to Dealer GM at ${escalatingVehicle.dealer} for vehicle ${escalatingVehicle.reg}`
    );
    setEscalatingVehicle(null);
  };

  // Filtered Dealer Compliance Metrics for current Zone & Region
  const scopedComplianceList = useMemo(() => {
    return (DEALER_COMPLIANCE_METRICS ?? []).filter((m) => {
      if (selectedZone !== 'ALL' && m.zone !== selectedZone) return false;
      if (selectedRegion !== 'ALL' && m.region !== selectedRegion) return false;
      return true;
    });
  }, [selectedZone, selectedRegion]);

  const isMovementRegisterView =
    currentCategory === 'Vehicle Movement Register';

  const activeDemoStep = DEMO_STEPS[demoStepIndex] ?? DEMO_STEPS[0];

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-[#111827] py-4 px-3 sm:px-6 flex flex-col items-center justify-start">
      {/* Guided Interactive Demo Player Banner (Visible when Demo is Active) */}
      {isDemoPlaying && activeDemoStep && (
        <div className="w-full max-w-6xl mb-4 bg-[#111827] text-white rounded-2xl p-4 shadow-lg border border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#007AFF] text-[11px] font-bold font-mono-tabular">
                LIVE DEMO · STEP {activeDemoStep.stepNumber} OF{' '}
                {DEMO_STEPS.length}
              </span>
              <h2 className="text-[14px] sm:text-[15px] font-bold text-white">
                {activeDemoStep.title}
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleStepJump(demoStepIndex - 1)}
                disabled={demoStepIndex === 0}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 cursor-pointer"
                title="Previous Step"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleStepJump(demoStepIndex + 1)}
                disabled={demoStepIndex === DEMO_STEPS.length - 1}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 cursor-pointer"
                title="Next Step"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextVoice = !voiceEnabled;
                  setVoiceEnabled(nextVoice);
                  speakCaption(activeDemoStep.caption, nextVoice);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                title="Toggle Voiceover Narration"
              >
                {voiceEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Voice ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-white/60" />
                    <span>Muted</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleStopDemo}
                className="px-2.5 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Stop Tour</span>
              </button>
            </div>
          </div>
          <p className="text-[13px] text-white/85 leading-relaxed">
            {activeDemoStep.caption}
          </p>
        </div>
      )}

      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8">
        {/* ================= MOBILE FRAME MATCHING FIGMA PROTOTYPE ================= */}
        <div className="w-full max-w-[412px] bg-white min-h-[860px] rounded-[28px] shadow-[0_12px_36px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col relative shrink-0 border border-[#E5E7EB]">
          {/* Live RFID & SLA Exception Notifications (Tap Bell Icon to Toggle) */}
          {showToasts && (
            <div className="px-4 pt-3 pb-2 flex flex-col gap-2 bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#4B5563] tracking-tight">
                  Live Network Alerts ({(toasts ?? []).length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowToasts(false)}
                  className="text-[11px] font-semibold text-[#6B7280] hover:text-[#111827] px-1.5 py-0.5 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              {(toasts ?? []).map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    if (t.categoryTarget) {
                      openListView(t.categoryTarget, t.filterTarget ?? 'ALL');
                      setShowToasts(false);
                    }
                  }}
                  className={`bg-white border rounded-[14px] p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex justify-between items-start gap-2 transition-colors ${
                    t.type === 'rfid'
                      ? 'border-[#10B981]/40 bg-[#ECFDF5]/20'
                      : t.type === 'escalation'
                      ? 'border-[#007AFF]/40 bg-[#EFF6FF]/30'
                      : 'border-[#DC2626]/40 bg-[#FEF2F2]/20'
                  } ${t.categoryTarget ? 'cursor-pointer hover:bg-[#F9FAFB]' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                        t.type === 'rfid'
                          ? 'bg-[#10B981]'
                          : t.type === 'escalation'
                          ? 'bg-[#007AFF]'
                          : 'bg-[#DC2626]'
                      }`}
                    />
                    <div>
                      <div className="text-[13px] font-bold text-[#111827] mb-0.5">
                        {t.title}
                      </div>
                      <div className="text-[12px] text-[#6B7280]">{t.sub}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#6B7280] whitespace-nowrap shrink-0 font-mono-tabular">
                    {t.time}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top Header matching Figma */}
          <header className="flex items-center justify-between px-[18px] pt-4 pb-3 border-b border-[#E5E7EB] relative bg-white">
            <div className="absolute bottom-[-1px] left-0 w-[55%] h-[3px] bg-black" />

            <button
              type="button"
              onClick={() => closeListView()}
              title="Return to TML Home Dashboard"
              className="relative w-10 h-10 cursor-pointer text-left shrink-0"
            >
              <div className="w-10 h-10 rounded-full bg-[#1F2937] text-white font-bold text-[14px] flex items-center justify-center">
                VH
              </div>
              <span className="absolute -top-[1px] -right-[1px] w-3 h-3 rounded-full bg-[#16A34A] border-2 border-white" />
            </button>

            <div className="text-[15px] font-extrabold tracking-[0.4px] text-black whitespace-nowrap shrink-0">
              TATA.CARS |{' '}
              <span className="font-semibold italic text-[#111111] ml-1">
                TML Portal
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowToasts((prev) => !prev)}
              title="Toggle Live SLA & RFID Alerts"
              aria-label="Toggle Alerts"
              className="relative p-2 rounded-full hover:bg-[#F3F4F6] transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              <Bell
                className="w-[22px] h-[22px] text-[#111827]"
                strokeWidth={2}
              />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#DC2626] rounded-full" />
            </button>
          </header>

          {/* In-app Escalation Confirmation Banner */}
          {recentEscalationBanner && (
            <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl bg-[#ECFDF5] border border-[#10B981] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-[#065F46]">
                <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                <span>{recentEscalationBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setRecentEscalationBanner(null)}
                className="text-[#065F46] hover:text-black p-1 cursor-pointer"
                aria-label="Close escalation notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Calendar Date Selector Drawer */}
          {showCalendarPicker && (
            <div className="mx-4 mt-3 p-3 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#374151]">
                  Select Workshop Governance Date
                </span>
                <button
                  type="button"
                  onClick={() => setShowCalendarPicker(false)}
                  className="text-[11px] font-semibold text-[#6B7280] hover:text-black cursor-pointer"
                >
                  Done
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(AVAILABLE_DATES ?? []).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSelectedDate(d);
                      setDateMode(d === '25 May 26' ? 'Today' : 'Calendar');
                      setShowCalendarPicker(false);
                    }}
                    className={`py-2 px-2.5 rounded-xl text-[12px] font-semibold font-mono-tabular cursor-pointer transition-colors ${
                      selectedDate === d
                        ? 'bg-black text-white'
                        : 'bg-white border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ================= VIEW 1: TML HOME DASHBOARD ================= */}
          {activeView === 'home' && (
            <div className="p-4 flex-1 overflow-y-auto">
              {/* Pan-India TML Hierarchy Bar: All Zones, All Regions & Dealerships */}
              <div className="flex flex-col gap-2 mb-3.5 bg-[#F9FAFB] p-2.5 rounded-2xl border border-[#E5E7EB]">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-[#6B7280] tracking-tight flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#111827]" />
                    <span>TML Pan-India Hierarchy (Zone · Region · Dealer)</span>
                  </span>
                  {(selectedZone !== 'ALL' ||
                    selectedRegion !== 'ALL' ||
                    selectedDealer !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => handleZoneChange('ALL')}
                      className="text-[10px] font-semibold text-[#007AFF] hover:underline cursor-pointer"
                    >
                      View Pan-India
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    aria-label="Select TML Zone"
                    value={selectedZone}
                    onChange={(e) => handleZoneChange(e.target.value as ZoneId)}
                    className="w-full py-2 px-2.5 rounded-[10px] border border-[#D1D5DB] bg-white text-[11px] font-semibold text-[#111827] outline-none cursor-pointer truncate"
                  >
                    {(TML_ZONES ?? []).map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.label}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Select TML Region"
                    value={selectedRegion}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    className="w-full py-2 px-2.5 rounded-[10px] border border-[#D1D5DB] bg-white text-[11px] font-semibold text-[#111827] outline-none cursor-pointer truncate"
                  >
                    <option value="ALL">
                      All Regions ({(availableRegions ?? []).length})
                    </option>
                    {(availableRegions ?? []).map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        {reg.name}
                      </option>
                    ))}
                  </select>
                </div>

                <select
                  aria-label="Select Dealership"
                  value={selectedDealer}
                  onChange={(e) => handleHomeDealerChange(e.target.value)}
                  className="w-full py-2 px-2.5 rounded-[10px] border border-[#D1D5DB] bg-white text-[11px] font-semibold text-[#111827] outline-none cursor-pointer"
                >
                  <option value="ALL">
                    All Dealerships in Scope ({(availableDealers ?? []).length})
                  </option>
                  {(availableDealers ?? []).map((dealerName) => (
                    <option key={dealerName} value={dealerName}>
                      {dealerName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Overall / PV / EV & Today / Calendar Toggles */}
              <div className="flex justify-between items-center mb-4 gap-2.5">
                <div className="bg-[#EBECEF] rounded-full p-[3px] inline-flex items-center">
                  {(['Overall', 'PV', 'EV'] as SegmentType[]).map((seg) => (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => setCurrentSegment(seg)}
                      className={`border-none py-[7px] px-3.5 rounded-full text-[12px] font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                        currentSegment === seg
                          ? 'bg-black text-white'
                          : 'bg-transparent text-[#374151] hover:text-black'
                      }`}
                    >
                      {seg}
                    </button>
                  ))}
                </div>

                <div className="bg-[#EBECEF] rounded-full p-[3px] inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setDateMode('Today');
                      setSelectedDate('25 May 26');
                      setShowCalendarPicker(false);
                    }}
                    className={`border-none py-[7px] px-3 rounded-full text-[12px] font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                      dateMode === 'Today'
                        ? 'bg-black text-white'
                        : 'bg-transparent text-[#374151]'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateMode('Calendar');
                      setShowCalendarPicker((prev) => !prev);
                    }}
                    className={`border-none py-[7px] px-3 rounded-full text-[12px] font-semibold cursor-pointer transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${
                      dateMode === 'Calendar'
                        ? 'bg-black text-white'
                        : 'bg-transparent text-[#374151]'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {selectedDate !== '25 May 26' ? selectedDate : 'Calender'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Today's Summary (Network Aggregate) */}
              <div className="text-[14px] font-semibold text-[#1F2937] mb-3 flex justify-between items-center">
                <span>Today&apos;s Summary (Network Aggregate)</span>
                {selectedDealer !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => handleHomeDealerChange('ALL')}
                    className="text-[11px] font-semibold text-[#007AFF] hover:underline cursor-pointer"
                  >
                    Reset Dealer
                  </button>
                )}
              </div>

              {/* 4 Pastel Summary Cards */}
              <div className="grid grid-cols-4 gap-2 mb-3.5">
                <button
                  type="button"
                  onClick={() => openListView('Gate In')}
                  className="rounded-[14px] py-3.5 px-1.5 text-center cursor-pointer active:scale-[0.97] transition-transform bg-[#CBEFD8] border-none"
                >
                  <div className="text-[20px] font-bold text-[#111827] mb-1.5 font-mono-tabular">
                    {computedKpis.gateIn}
                  </div>
                  <div className="text-[11px] font-medium text-[#1F2937] leading-[1.2]">
                    Gate In
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openListView('Gate Out')}
                  className="rounded-[14px] py-3.5 px-1.5 text-center cursor-pointer active:scale-[0.97] transition-transform bg-[#E1F6EA] border-none"
                >
                  <div className="text-[20px] font-bold text-[#111827] mb-1.5 font-mono-tabular">
                    {computedKpis.gateOut}
                  </div>
                  <div className="text-[11px] font-medium text-[#1F2937] leading-[1.2]">
                    Gate Out
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openListView('Road Test Out')}
                  className="rounded-[14px] py-3.5 px-1.5 text-center cursor-pointer active:scale-[0.97] transition-transform bg-[#FEF5DF] border-none"
                >
                  <div className="text-[20px] font-bold text-[#111827] mb-1.5 font-mono-tabular">
                    {computedKpis.rtOut}
                  </div>
                  <div className="text-[11px] font-medium text-[#1F2937] leading-[1.2]">
                    Road Test Out
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openListView('Road Test In')}
                  className="rounded-[14px] py-3.5 px-1.5 text-center cursor-pointer active:scale-[0.97] transition-transform bg-[#FCEFB8] border-none"
                >
                  <div className="text-[20px] font-bold text-[#111827] mb-1.5 font-mono-tabular">
                    {computedKpis.rtIn}
                  </div>
                  <div className="text-[11px] font-medium text-[#1F2937] leading-[1.2]">
                    Road Test In
                  </div>
                </button>
              </div>

              {/* 2 Workshop Counter Cards */}
              <div className="grid grid-cols-2 gap-3 mb-3.5">
                <button
                  type="button"
                  onClick={() => openListView('Vehicles Inside Workshop')}
                  className="border border-[#E5E7EB] rounded-[16px] p-3.5 bg-white cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.02)] text-left hover:border-[#9CA3AF] transition-colors"
                >
                  <div className="flex justify-between items-center mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center text-[#4B5563]">
                      <Home className="w-4 h-4" />
                    </div>
                    <div className="text-[22px] font-bold text-black font-mono-tabular">
                      {computedKpis.inside}
                    </div>
                  </div>
                  <div className="text-[12px] font-medium text-[#374151]">
                    Vehicle Inside Workshop
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openListView('Active Road Tests')}
                  className="border border-[#E5E7EB] rounded-[16px] p-3.5 bg-white cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.02)] text-left hover:border-[#9CA3AF] transition-colors"
                >
                  <div className="flex justify-between items-center mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center text-[#4B5563]">
                      <Car className="w-4 h-4" />
                    </div>
                    <div className="text-[22px] font-bold text-black font-mono-tabular">
                      {computedKpis.activeRt}
                    </div>
                  </div>
                  <div className="text-[12px] font-medium text-[#374151]">
                    Active Road Test Count
                  </div>
                </button>
              </div>

              {/* Dedicated Card for Vehicle Movement Register */}
              <button
                type="button"
                onClick={() => openListView('Vehicle Movement Register')}
                className="w-full mb-5 p-3.5 rounded-[16px] border border-[#111827] bg-[#111827] text-white flex items-center justify-between cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-[14px] font-bold leading-snug">
                      Vehicle Movement Register
                    </div>
                    <div className="text-[11px] text-white/75">
                      Gate In/Out Logs · Security Guard &amp; Road Test Count
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-white/15 text-[12px] font-bold font-mono-tabular">
                    {computedKpis.movementRegisterCount}
                  </span>
                  <ChevronRight className="w-4 h-4 text-white/80" />
                </div>
              </button>

              {/* TML Governance & Exceptions */}
              <div className="text-[14px] font-semibold text-[#1F2937] mb-3 flex justify-between items-center">
                <span>TML Governance &amp; Exceptions</span>
                <span className="text-[11px] font-medium text-[#6B7280]">
                  Tap card to audit
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-2">
                <button
                  type="button"
                  onClick={() =>
                    openListView('Vehicles Inside Workshop', 'AGEING')
                  }
                  className="border border-[#E5E7EB] rounded-[16px] p-3.5 bg-white cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between min-h-[100px] text-left hover:border-[#DC2626]/50 transition-colors"
                >
                  <div className="flex justify-between items-center mb-2.5 w-full">
                    <div className="w-8 h-8 rounded-lg bg-[#FEF2F2] flex items-center justify-center text-[#DC2626]">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="py-1.5 px-2.5 rounded-[10px] text-[13px] font-bold bg-[#FEE2E2] text-[#DC2626] font-mono-tabular">
                      {computedKpis.ageingCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[12px] font-semibold text-[#111827] w-full">
                    <span>Ageing &gt; 48 Hrs</span>
                    <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openListView('Vehicles Inside Workshop', 'VIP_RV')
                  }
                  className="border border-[#E5E7EB] rounded-[16px] p-3.5 bg-white cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between min-h-[100px] text-left hover:border-[#9333EA]/50 transition-colors"
                >
                  <div className="flex justify-between items-center mb-2.5 w-full">
                    <div className="w-8 h-8 rounded-lg bg-[#FAF5FF] flex items-center justify-center text-[#9333EA]">
                      <Star className="w-4 h-4" />
                    </div>
                    <span className="py-1.5 px-2.5 rounded-[10px] text-[13px] font-bold bg-[#F3E8FF] text-[#9333EA] font-mono-tabular">
                      {computedKpis.vipRvCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[12px] font-semibold text-[#111827] w-full">
                    <span>VIP &amp; Repeat (RV)</span>
                    <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRfidSheet((prev) => !prev)}
                  className="border border-[#E5E7EB] rounded-[16px] p-3.5 bg-white cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between min-h-[100px] text-left hover:border-[#2563EB]/50 transition-colors"
                >
                  <div className="flex justify-between items-center mb-2.5 w-full">
                    <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                      <Radio className="w-4 h-4" />
                    </div>
                    <span className="py-1.5 px-2.5 rounded-[10px] text-[13px] font-bold bg-[#DBEAFE] text-[#2563EB] font-mono-tabular">
                      {computedKpis.rfidCompliance}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[12px] font-semibold text-[#111827] w-full">
                    <span>RFID Compliance</span>
                    <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openListView('Active Road Tests')}
                  className="border border-[#E5E7EB] rounded-[16px] p-3.5 bg-white cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between min-h-[100px] text-left hover:border-[#D97706]/50 transition-colors"
                >
                  <div className="flex justify-between items-center mb-2.5 w-full">
                    <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] flex items-center justify-center text-[#D97706]">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <span className="py-1.5 px-2.5 rounded-[10px] text-[13px] font-bold bg-[#FEF3C7] text-[#D97706] font-mono-tabular">
                      {computedKpis.activeRtOver20m}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[12px] font-semibold text-[#111827] w-full">
                    <span>Active RT &gt; 20m</span>
                    <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                  </div>
                </button>
              </div>

              {/* Collapsible RFID Gate-In Compliance Breakdown inside Mobile Frame */}
              {showRfidSheet && (
                <div className="mt-2 p-3.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB]">
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <div className="text-[13px] font-bold text-[#111827]">
                        RFID Auto-Gate Telemetry
                      </div>
                      <div className="text-[11px] text-[#6B7280]">
                        Auto RFID Tag Read vs Manual Security Scan
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRfidSheet(false)}
                      className="p-1 text-[#6B7280] hover:text-black cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(scopedComplianceList ?? []).map((item) => (
                      <div
                        key={item.dealer}
                        onClick={() => {
                          setSelectedDealer(item.dealer);
                          openListView('Vehicle Movement Register');
                        }}
                        className="bg-white p-2.5 rounded-xl border border-[#E5E7EB] flex items-center justify-between cursor-pointer hover:border-[#2563EB]/40"
                      >
                        <div>
                          <div className="text-[12px] font-semibold text-[#111827]">
                            {item.dealer}
                          </div>
                          <div className="text-[11px] text-[#6B7280] font-mono-tabular">
                            {item.region} · {item.rfidAutoCount} Auto /{' '}
                            {item.manualScanCount} Manual
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-[13px] font-bold font-mono-tabular ${
                              item.compliancePct >= 90
                                ? 'text-[#059669]'
                                : 'text-[#D97706]'
                            }`}
                          >
                            {item.compliancePct}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= VIEW 2: VEHICLE MOVEMENT REGISTER & DRILL-DOWN LIST VIEW ================= */}
          {activeView === 'list' && (
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="flex justify-between items-center mb-3.5">
                <h2 className="text-[20px] font-bold text-[#111827] tracking-tight">
                  {currentCategory}
                </h2>
                <button
                  type="button"
                  onClick={closeListView}
                  className="bg-transparent border-none text-[14px] font-semibold text-[#111827] hover:text-[#007AFF] cursor-pointer py-1 px-2"
                >
                  Back
                </button>
              </div>

              {/* Compact Zone & Region Selector inside List View */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <select
                  aria-label="Zone Filter in List View"
                  value={selectedZone}
                  onChange={(e) => handleZoneChange(e.target.value as ZoneId)}
                  className="py-1.5 px-2.5 rounded-lg border border-[#D1D5DB] bg-[#F9FAFB] text-[11px] font-semibold text-[#111827] outline-none cursor-pointer truncate"
                >
                  {(TML_ZONES ?? []).map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.label}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Region Filter in List View"
                  value={selectedRegion}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className="py-1.5 px-2.5 rounded-lg border border-[#D1D5DB] bg-[#F9FAFB] text-[11px] font-semibold text-[#111827] outline-none cursor-pointer truncate"
                >
                  <option value="ALL">
                    All Regions ({(availableRegions ?? []).length})
                  </option>
                  {(availableRegions ?? []).map((reg) => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Overall / PV / EV & Today / Calendar Toggles */}
              <div className="flex justify-between items-center mb-4 gap-2.5">
                <div className="bg-[#EBECEF] rounded-full p-[3px] inline-flex items-center">
                  {(['Overall', 'PV', 'EV'] as SegmentType[]).map((seg) => (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => setCurrentSegment(seg)}
                      className={`border-none py-[7px] px-3.5 rounded-full text-[12px] font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                        currentSegment === seg
                          ? 'bg-black text-white'
                          : 'bg-transparent text-[#374151] hover:text-black'
                      }`}
                    >
                      {seg}
                    </button>
                  ))}
                </div>

                <div className="bg-[#EBECEF] rounded-full p-[3px] inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setDateMode('Today');
                      setSelectedDate('25 May 26');
                      setShowCalendarPicker(false);
                    }}
                    className={`border-none py-[7px] px-3 rounded-full text-[12px] font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                      dateMode === 'Today'
                        ? 'bg-black text-white'
                        : 'bg-transparent text-[#374151]'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateMode('Calendar');
                      setShowCalendarPicker((prev) => !prev);
                    }}
                    className={`border-none py-[7px] px-3 rounded-full text-[12px] font-semibold cursor-pointer transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${
                      dateMode === 'Calendar'
                        ? 'bg-black text-white'
                        : 'bg-transparent text-[#374151]'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {selectedDate !== '25 May 26' ? selectedDate : 'Calender'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Quick View Switcher Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 no-scrollbar">
                {(
                  [
                    'Vehicle Movement Register',
                    'Vehicles Inside Workshop',
                    'Gate In',
                    'Gate Out',
                    'Road Test Out',
                    'Road Test In',
                    'Active Road Tests',
                  ] as VehicleCategory[]
                ).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCurrentCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      currentCategory === cat
                        ? 'bg-[#111827] text-white'
                        : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search & Filter Card */}
              <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-4 mb-5 shadow-[0_4px_14px_rgba(0,0,0,0.04)]">
                <div className="bg-[#F3F4F6] rounded-full py-2.5 px-4 flex items-center gap-2.5 mb-3.5">
                  <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search vehicle"
                    className="border-none bg-transparent w-full text-[13px] text-[#111827] outline-none placeholder:text-[#6B7280]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-[#6B7280] hover:text-black cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Row 1: Filter by Security Guard & Filter by Visit Type */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label
                      htmlFor="listGuardFilter"
                      className="block text-[10px] font-bold text-[#9CA3AF] tracking-[0.4px] mb-1.5"
                    >
                      Filter by Security Guard
                    </label>
                    <select
                      id="listGuardFilter"
                      value={listGuardFilter}
                      onChange={(e) => setListGuardFilter(e.target.value)}
                      className="w-full py-[9px] px-3 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] text-[12px] font-medium text-[#1F2937] outline-none cursor-pointer"
                    >
                      <option value="ALL">All Guards</option>
                      {(SECURITY_GUARDS ?? []).map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="listVisitFilter"
                      className="block text-[10px] font-bold text-[#9CA3AF] tracking-[0.4px] mb-1.5"
                    >
                      Filter by Visit Type
                    </label>
                    <select
                      id="listVisitFilter"
                      value={listVisitFilter}
                      onChange={(e) =>
                        setListVisitFilter(e.target.value as VisitFilterType)
                      }
                      className="w-full py-[9px] px-3 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] text-[12px] font-medium text-[#1F2937] outline-none cursor-pointer"
                    >
                      <option value="ALL">Select Visit Type</option>
                      <option value="Appointment">Appointment</option>
                      <option value="Walk In">Walk In</option>
                      <option value="VIP_RV">VIP &amp; Repeat Visit (RV)</option>
                      <option value="AGEING">Ageing &gt; 48 Hrs</option>
                    </select>
                  </div>
                </div>

                {/* Filter Row 2: TML Dealership Filter */}
                <div className="mb-3.5">
                  <label
                    htmlFor="listDealerFilter"
                    className="block text-[10px] font-bold text-[#9CA3AF] tracking-[0.4px] mb-1.5"
                  >
                    Filter by Dealership ({(availableDealers ?? []).length} in
                    Region)
                  </label>
                  <select
                    id="listDealerFilter"
                    value={listDealerFilter}
                    onChange={(e) => setListDealerFilter(e.target.value)}
                    className="w-full py-[9px] px-3 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] text-[12px] font-medium text-[#1F2937] outline-none cursor-pointer"
                  >
                    <option value="ALL">All Dealerships</option>
                    {(availableDealers ?? []).map((dealer) => (
                      <option key={dealer} value={dealer}>
                        {dealer}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setSearchQuery((prev) => prev.trim())}
                  className="w-full bg-black text-white border-none rounded-full py-3 text-[14px] font-semibold cursor-pointer hover:bg-[#1F2937] transition-colors"
                >
                  Search
                </button>
              </div>

              {/* Vehicle List Meta Header */}
              <div className="flex justify-between items-center text-[14px] font-bold text-[#111827] mb-3 font-mono-tabular">
                <span>{selectedDate}</span>
                <span>
                  {filteredVehicles.length}{' '}
                  {isMovementRegisterView ? 'Gate In' : currentCategory}
                </span>
              </div>

              {/* Empty State Handling */}
              {filteredVehicles.length === 0 ? (
                <div className="bg-white border border-[#E5E7EB] rounded-[18px] p-6 text-center my-3">
                  <div className="text-[14px] font-bold text-[#111827] mb-1">
                    No matching vehicles found
                  </div>
                  <div className="text-[12px] text-[#6B7280] mb-4">
                    No vehicles match the active Zone, Region, Security Guard,
                    or Visit Type filters.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setListDealerFilter('ALL');
                      setListGuardFilter('ALL');
                      setListVisitFilter('ALL');
                      setCurrentSegment('Overall');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-black text-white text-[12px] font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              ) : (
                /* Vehicle Cards List */
                <div>
                  {(filteredVehicles ?? []).map((v) => {
                    const isExpanded = Boolean(expandedVehicleIds[v.id]);
                    return (
                      <div
                        key={v.id}
                        className="bg-white border border-[#E5E7EB] rounded-[18px] p-4 mb-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-semibold text-[#4B5563] bg-[#F3F4F6] py-[3px] px-2 rounded-[6px] inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-[#6B7280]" />
                            <span>{v.dealer}</span>
                          </span>
                          <span className="text-[11px] font-medium text-[#6B7280]">
                            {v.region}
                          </span>
                        </div>

                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="text-[16px] font-bold text-[#111827] mb-0.5 font-mono-tabular">
                              {v.reg}
                            </div>
                            <div className="text-[12px] font-medium text-[#6B7280] mb-1 break-all font-mono-tabular">
                              {v.vin}
                            </div>
                            <div className="text-[12px] font-medium text-[#6B7280] mb-0.5">
                              {v.model}
                            </div>
                            <div className="text-[13px] font-semibold text-[#111827]">
                              {v.customer}
                            </div>
                          </div>

                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              {v.rv && (
                                <span
                                  title="Repeat Visit Vehicle"
                                  className="w-7 h-7 rounded-full bg-[#F59E0B] text-white text-[11px] font-bold inline-flex items-center justify-center shrink-0"
                                >
                                  RV
                                </span>
                              )}
                              <span
                                className={`py-1 px-3 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0 ${
                                  v.visitType === 'Appointment'
                                    ? 'border border-[#10B981] text-[#059669] bg-[#ECFDF5]'
                                    : 'border border-[#93C5FD] text-[#3B82F6] bg-[#EFF6FF]'
                                }`}
                              >
                                {v.visitType}
                              </span>
                              {v.vip && (
                                <span className="py-1 px-3 rounded-full text-[12px] font-semibold border border-[#A855F7] text-[#9333EA] bg-[#FAF5FF] whitespace-nowrap shrink-0">
                                  VIP
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleAuditDrawer(v.id)}
                                aria-label="Toggle Vehicle Movement & Audit Details"
                                className="bg-transparent border-none text-[#374151] cursor-pointer p-1 hover:bg-[#F3F4F6] rounded-full transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>

                            <div className="text-right mt-2">
                              <div className="text-[12px] text-[#374151] font-medium">
                                Road Test Count:{' '}
                                <strong className="font-bold text-[#111827] font-mono-tabular">
                                  {v.roadTestCount}
                                </strong>
                              </div>
                              {v.dwellLabel && !isMovementRegisterView && (
                                <div className="text-[12px] text-[#6B7280] mt-0.5">
                                  {v.dwellLabel}{' '}
                                  <strong
                                    className={`font-bold font-mono-tabular ${
                                      v.slaBreach
                                        ? 'text-[#DC2626]'
                                        : 'text-[#111827]'
                                    }`}
                                  >
                                    {v.dwellVal}
                                  </strong>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Dual Timestamp Row */}
                        <div className="mt-3 pt-2.5 border-t border-[#F3F4F6] flex items-center justify-between gap-2">
                          <div>
                            <div className="text-[11px] text-[#6B7280]">
                              Gate In Time
                            </div>
                            <div className="text-[12px] font-bold text-[#1F2937] font-mono-tabular">
                              {v.gateInTime}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-[11px] text-[#6B7280]">
                              {isMovementRegisterView
                                ? 'Gate Out Time'
                                : v.timeLabel}
                            </div>
                            <div className="text-[12px] font-bold text-[#1F2937] font-mono-tabular">
                              {isMovementRegisterView
                                ? v.gateOutTime
                                : v.timeVal}
                            </div>
                          </div>
                        </div>

                        {/* Expandable TML & Security Guard Movement Register Drawer */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-dashed border-[#E5E7EB] text-[12px]">
                            <div className="grid grid-cols-2 gap-2 bg-[#F9FAFB] p-2.5 rounded-[10px] mb-2.5">
                              <div>
                                <span className="block text-[10px] text-[#6B7280]">
                                  Security Guard
                                </span>
                                <strong className="text-[#111827] text-[12px]">
                                  {v.securityGuard}
                                </strong>
                              </div>
                              <div>
                                <span className="block text-[10px] text-[#6B7280]">
                                  Gate Entry Mode
                                </span>
                                <strong className="text-[#111827] text-[12px]">
                                  {v.entryMode}
                                </strong>
                              </div>
                              <div>
                                <span className="block text-[10px] text-[#6B7280]">
                                  Assigned Staff
                                </span>
                                <strong className="text-[#111827] text-[12px]">
                                  {v.sa}
                                </strong>
                              </div>
                              <div>
                                <span className="block text-[10px] text-[#6B7280]">
                                  TML Territory CSM
                                </span>
                                <strong className="text-[#111827] text-[12px]">
                                  {v.csmName}
                                </strong>
                              </div>
                            </div>

                            {(v.roadTestTrips ?? []).length > 0 && (
                              <div className="mb-2.5 bg-[#F9FAFB] p-2.5 rounded-[10px] border border-[#E5E7EB]">
                                <div className="text-[11px] font-bold text-[#374151] mb-1.5 flex items-center justify-between">
                                  <span>
                                    Road Test Movement Log ({v.roadTestCount}{' '}
                                    Trips)
                                  </span>
                                  <span className="text-[10px] font-mono-tabular text-[#6B7280]">
                                    {v.jobCardNo}
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {(v.roadTestTrips ?? []).map((trip) => (
                                    <div
                                      key={trip.tripNo}
                                      className="bg-white px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] flex items-center justify-between text-[11px]"
                                    >
                                      <div>
                                        <span className="font-bold text-[#111827]">
                                          RT #{trip.tripNo}
                                        </span>{' '}
                                        <span className="text-[#6B7280]">
                                          · {trip.driver}
                                        </span>
                                        <div className="text-[10px] text-[#6B7280] font-mono-tabular">
                                          Out:{' '}
                                          {trip.outTime.split('|')[1]?.trim() ??
                                            trip.outTime}{' '}
                                          → In:{' '}
                                          {trip.inTime.includes('|')
                                            ? trip.inTime.split('|')[1]?.trim()
                                            : trip.inTime}
                                        </div>
                                      </div>
                                      <span className="font-mono-tabular font-semibold text-[#374151]">
                                        {trip.duration}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {v.escalatedAt ? (
                              <div className="w-full bg-[#ECFDF5] border border-[#10B981] text-[#065F46] rounded-xl p-2.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                                  <div>
                                    <div className="text-[11px] font-bold">
                                      Escalated to Dealership CSM ({v.escalatedAt})
                                    </div>
                                    <div className="text-[11px] text-[#047857]">
                                      {v.escalationNote}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleInitiateEscalation(v)}
                                  className="text-[11px] font-semibold underline cursor-pointer shrink-0"
                                >
                                  Update
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleInitiateEscalation(v)}
                                className="w-full bg-[#007AFF] hover:bg-[#0062CC] text-white border-none rounded-full py-[9px] px-4 text-[12px] font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Escalate Delay to Dealership CSM</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= BOTTOM NAVIGATION BAR MATCHING SCREENSHOT ================= */}
          <nav
            aria-label="Mobile Bottom Navigation"
            className="border-t border-[#E5E7EB] bg-white px-2 pt-2 pb-3 grid grid-cols-5 items-center shrink-0"
          >
            <button
              type="button"
              onClick={() => setActiveView('home')}
              className={`flex flex-col items-center justify-center gap-1 py-1 cursor-pointer transition-colors ${
                activeView === 'home'
                  ? 'text-[#111827] font-bold'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <Home
                className="w-5 h-5"
                strokeWidth={activeView === 'home' ? 2.4 : 1.8}
              />
              <span className="text-[10px]">Home</span>
            </button>

            <button
              type="button"
              onClick={() => openListView('Vehicle Movement Register')}
              className={`flex flex-col items-center justify-center gap-1 py-1 cursor-pointer transition-colors ${
                activeView === 'list' &&
                (currentCategory === 'Vehicle Movement Register' ||
                  currentCategory === 'Gate In')
                  ? 'text-[#111827] font-bold'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <Car
                className="w-5 h-5"
                strokeWidth={
                  activeView === 'list' &&
                  (currentCategory === 'Vehicle Movement Register' ||
                    currentCategory === 'Gate In')
                    ? 2.4
                    : 1.8
                }
              />
              <span className="text-[10px]">Gate In</span>
            </button>

            <button
              type="button"
              onClick={() => openListView('Gate Out')}
              className={`flex flex-col items-center justify-center gap-1 py-1 cursor-pointer transition-colors ${
                activeView === 'list' && currentCategory === 'Gate Out'
                  ? 'text-[#111827] font-bold'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <Building2
                className="w-5 h-5"
                strokeWidth={
                  activeView === 'list' && currentCategory === 'Gate Out'
                    ? 2.4
                    : 1.8
                }
              />
              <span className="text-[10px]">Gate Out</span>
            </button>

            <button
              type="button"
              onClick={() => openListView('Road Test Out')}
              className={`flex flex-col items-center justify-center gap-1 py-1 cursor-pointer transition-colors ${
                activeView === 'list' && currentCategory === 'Road Test Out'
                  ? 'text-[#111827] font-bold'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <LogOut
                className="w-5 h-5"
                strokeWidth={
                  activeView === 'list' && currentCategory === 'Road Test Out'
                    ? 2.4
                    : 1.8
                }
              />
              <span className="text-[10px]">RT Out</span>
            </button>

            <button
              type="button"
              onClick={() => openListView('Road Test In')}
              className={`flex flex-col items-center justify-center gap-1 py-1 cursor-pointer transition-colors ${
                activeView === 'list' && currentCategory === 'Road Test In'
                  ? 'text-[#111827] font-bold'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <LogIn
                className="w-5 h-5"
                strokeWidth={
                  activeView === 'list' && currentCategory === 'Road Test In'
                    ? 2.4
                    : 1.8
                }
              />
              <span className="text-[10px]">RT In</span>
            </button>
          </nav>
        </div>

        {/* ================= DESKTOP COMPANION: PAN-INDIA ZONES, REGIONS & MOVEMENT COMMAND PANEL ================= */}
        <aside className="w-full lg:flex-1 max-w-[412px] lg:max-w-none flex flex-col gap-5">
          {/* Top Regional Summary Header Card */}
          <div className="bg-white rounded-[24px] border border-[#E5E7EB] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5 border-b border-[#E5E7EB]">
              <div>
                <div className="text-[12px] font-semibold text-[#6B7280] mb-1">
                  Tata Motors Passenger &amp; Electric Vehicles · Pan-India
                  Governance
                </div>
                <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">
                  TML Security, Reception &amp; Movement Register
                </h1>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={isDemoPlaying ? handleStopDemo : handleStartDemo}
                  className={`px-4 py-2 rounded-xl text-[12px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    isDemoPlaying
                      ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                      : 'bg-[#007AFF] text-white hover:bg-[#0062CC]'
                  }`}
                >
                  {isDemoPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Stop Auto-Demo</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Play Guided Demo Tour</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2 text-[12px] font-semibold text-[#374151] bg-[#F3F4F6] px-3.5 py-2 rounded-xl font-mono-tabular">
                  <span>Zone:</span>
                  <strong className="text-[#111827]">{selectedZone}</strong>
                  <span>·</span>
                  <span>
                    {selectedRegion === 'ALL' ? 'All Regions' : selectedRegion}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Pan-India Zone Selector Pills */}
            <div className="mb-4">
              <div className="text-[11px] font-bold text-[#6B7280] mb-2">
                Select TML Zone (All 5 Pan-India Zones)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(TML_ZONES ?? []).map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => handleZoneChange(z.id)}
                    className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold cursor-pointer transition-colors ${
                      selectedZone === z.id
                        ? 'bg-[#111827] text-white'
                        : 'bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]'
                    }`}
                  >
                    {z.id === 'ALL' ? 'Pan-India (All 5 Zones)' : `${z.id} Zone`}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Region Selector Pills for Selected Zone */}
            <div className="mb-5">
              <div className="text-[11px] font-bold text-[#6B7280] mb-2">
                Regional Offices ({(availableRegions ?? []).length} Regions in
                Scope)
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleRegionChange('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer transition-colors ${
                    selectedRegion === 'ALL'
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-[#F9FAFB] border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6]'
                  }`}
                >
                  All Regions ({(availableRegions ?? []).length})
                </button>
                {(availableRegions ?? []).map((reg) => (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => handleRegionChange(reg.id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer transition-colors ${
                      selectedRegion === reg.id
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-[#F9FAFB] border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6]'
                    }`}
                  >
                    {reg.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Interactive KPI Strip Synced with Mobile Frame */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB]">
                <div className="text-[11px] font-medium text-[#6B7280] mb-1">
                  Vehicle Movement Register
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[22px] font-bold text-[#111827] font-mono-tabular">
                    {computedKpis.movementRegisterCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => openListView('Vehicle Movement Register')}
                    className="text-[11px] font-semibold text-[#007AFF] hover:underline cursor-pointer inline-flex items-center gap-0.5"
                  >
                    <span>Open Register</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB]">
                <div className="text-[11px] font-medium text-[#6B7280] mb-1">
                  Workshop Dwell &gt; 48h Breaches
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[22px] font-bold text-[#DC2626] font-mono-tabular">
                    {computedKpis.ageingCount}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      openListView('Vehicles Inside Workshop', 'AGEING')
                    }
                    className="text-[11px] font-semibold text-[#007AFF] hover:underline cursor-pointer inline-flex items-center gap-0.5"
                  >
                    <span>Inspect</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB]">
                <div className="text-[11px] font-medium text-[#6B7280] mb-1">
                  RFID Auto-Gate Compliance
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[22px] font-bold text-[#059669] font-mono-tabular">
                    {computedKpis.rfidCompliance}
                  </span>
                  <span className="text-[11px] font-semibold text-[#6B7280]">
                    Target ≥ 90%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dealership RFID & Workshop SLA Governance Matrix across Zones & Regions */}
          <div className="bg-white rounded-[24px] border border-[#E5E7EB] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[16px] font-bold text-[#111827]">
                  Zone &amp; Regional Dealership Compliance Matrix
                </h2>
                <p className="text-[12px] text-[#6B7280]">
                  Click any dealership row to open its Vehicle Movement Register
                  in the mobile frame
                </p>
              </div>
              {selectedDealer !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => handleHomeDealerChange('ALL')}
                  className="text-[12px] font-semibold text-[#007AFF] hover:underline cursor-pointer"
                >
                  Show All ({(scopedComplianceList ?? []).length})
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280]">
                    <th className="py-2.5 pr-3">Dealership &amp; Region</th>
                    <th className="py-2.5 px-3 text-right">Auto RFID</th>
                    <th className="py-2.5 px-3 text-right">Manual Scan</th>
                    <th className="py-2.5 px-3 text-right">Compliance</th>
                    <th className="py-2.5 pl-3 text-right">SLA Breaches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6] text-[13px]">
                  {(scopedComplianceList ?? []).map((row) => {
                    const isSelected = selectedDealer === row.dealer;
                    return (
                      <tr
                        key={row.dealer}
                        onClick={() => {
                          handleHomeDealerChange(row.dealer);
                          openListView('Vehicle Movement Register');
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#EFF6FF]/70 font-semibold'
                            : 'hover:bg-[#F9FAFB]'
                        }`}
                      >
                        <td className="py-3 pr-3">
                          <div className="font-semibold text-[#111827]">
                            {row.dealer}
                          </div>
                          <div className="text-[11px] text-[#6B7280]">
                            {row.zone} Zone · {row.region} · CSM: {row.csmLead}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono-tabular text-[#111827]">
                          {row.rfidAutoCount}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-tabular text-[#6B7280]">
                          {row.manualScanCount}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-tabular">
                          <span
                            className={`font-bold ${
                              row.compliancePct >= 90
                                ? 'text-[#059669]'
                                : 'text-[#D97706]'
                            }`}
                          >
                            {row.compliancePct}%
                          </span>
                        </td>
                        <td className="py-3 pl-3 text-right font-mono-tabular">
                          <span
                            className={`font-bold ${
                              row.slaBreachCount > 0
                                ? 'text-[#DC2626]'
                                : 'text-[#6B7280]'
                            }`}
                          >
                            {padTwoDigits(row.slaBreachCount)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live CSM Escalation Audit Log */}
          <div className="bg-white rounded-[24px] border border-[#E5E7EB] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[16px] font-bold text-[#111827]">
                  CSM &amp; Dealer GM Escalation Log
                </h2>
                <p className="text-[12px] text-[#6B7280]">
                  Real-time audit trail of SLA delay escalations triggered from
                  vehicle cards
                </p>
              </div>
              <span className="text-[12px] font-mono-tabular font-semibold text-[#4B5563]">
                {(escalationLogs ?? []).length} Dispatched
              </span>
            </div>

            <div className="space-y-3">
              {(escalationLogs ?? []).map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2 text-[13px] font-bold text-[#111827] flex-wrap">
                      <span className="font-mono-tabular">{log.reg}</span>
                      <span className="text-[#9CA3AF]">·</span>
                      <span>{log.dealer}</span>
                      <span className="text-[#9CA3AF]">·</span>
                      <span className="text-[11px] font-medium text-[#6B7280]">
                        {log.region}
                      </span>
                      <span className="text-[#9CA3AF]">·</span>
                      <span
                        className={`text-[11px] font-semibold ${
                          log.priority === 'Critical'
                            ? 'text-[#DC2626]'
                            : 'text-[#D97706]'
                        }`}
                      >
                        {log.priority} Priority
                      </span>
                    </div>
                    <div className="text-[12px] text-[#4B5563] mt-0.5">
                      {log.reason}
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-1">
                      Assigned: {log.csmName} · Status: {log.status}
                    </div>
                  </div>
                  <div className="text-[11px] font-mono-tabular text-[#6B7280] shrink-0">
                    {log.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ================= ESCALATION CONFIRMATION MODAL ================= */}
      {escalatingVehicle && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="escalate-modal-title"
        >
          <div className="bg-white w-full max-w-[400px] rounded-[24px] p-5 shadow-2xl border border-[#E5E7EB]">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#007AFF] flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    id="escalate-modal-title"
                    className="text-[15px] font-bold text-[#111827]"
                  >
                    Escalate Delay to Dealership CSM
                  </h3>
                  <p className="text-[12px] text-[#6B7280]">
                    {escalatingVehicle.dealer} ({escalatingVehicle.region})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEscalatingVehicle(null)}
                className="p-1 text-[#6B7280] hover:text-black cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmEscalation}>
              <div className="bg-[#F9FAFB] rounded-xl p-3 border border-[#E5E7EB] mb-3.5 text-[12px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Vehicle Reg / Model:</span>
                  <strong className="text-[#111827] font-mono-tabular">
                    {escalatingVehicle.reg} · {escalatingVehicle.model}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Customer:</span>
                  <strong className="text-[#111827]">
                    {escalatingVehicle.customer}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Territory CSM:</span>
                  <strong className="text-[#111827]">
                    {escalatingVehicle.csmName}
                  </strong>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-[11px] font-bold text-[#374151] mb-1.5">
                  Escalation Severity
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['High', 'Critical'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setEscalationPriority(level)}
                      className={`py-2 px-3 rounded-xl text-[12px] font-semibold border cursor-pointer transition-colors ${
                        escalationPriority === level
                          ? level === 'Critical'
                            ? 'bg-[#FEF2F2] border-[#DC2626] text-[#DC2626]'
                            : 'bg-[#FFFBEB] border-[#D97706] text-[#D97706]'
                          : 'bg-white border-[#E5E7EB] text-[#4B5563]'
                      }`}
                    >
                      {level} Priority
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="escalationNote"
                  className="block text-[11px] font-bold text-[#374151] mb-1.5"
                >
                  Action Directive for Dealer GM &amp; CSM
                </label>
                <textarea
                  id="escalationNote"
                  rows={3}
                  value={escalationNoteInput}
                  onChange={(e) => setEscalationNoteInput(e.target.value)}
                  className="w-full rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] p-2.5 text-[12px] text-[#111827] outline-none focus:border-[#007AFF]"
                  placeholder="Enter escalation remarks..."
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEscalatingVehicle(null)}
                  className="flex-1 py-2.5 px-4 rounded-full border border-[#D1D5DB] bg-white text-[13px] font-semibold text-[#374151] cursor-pointer hover:bg-[#F3F4F6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-full border-none bg-[#007AFF] hover:bg-[#0062CC] text-white text-[13px] font-semibold cursor-pointer"
                >
                  Dispatch Escalation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
