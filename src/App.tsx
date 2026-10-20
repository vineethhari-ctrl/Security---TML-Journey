/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
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
  MapPin,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  Star,
  UserCheck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  AVAILABLE_DATES,
  BASELINE_SOUTH_KPIS,
  DEALER_COMPLIANCE_METRICS,
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
    title: '1. Pan-India TML Web Portal (All 5 Zones & 15 Regions)',
    caption:
      'Welcome to the TATA.CARS TML Security and Reception Web Portal. TML managers can filter live workshop telemetry across all 5 Pan-India Zones—South, West, North, East, and Central—15 Regional Offices, and individual dealerships.',
    durationMs: 7500,
  },
  {
    stepNumber: 2,
    title: '2. Powertrain Segment & Date Controls (Overall / PV / EV)',
    caption:
      'Switch seamlessly between Overall volume, Passenger Vehicles (PV), and Electric Vehicles (EV), or inspect historical dates using the Calendar selector.',
    durationMs: 7000,
  },
  {
    stepNumber: 3,
    title: '3. Live RFID Gate-In / Gate-Out & SLA Alert Banners',
    caption:
      'Clicking the top-right notification bell reveals real-time RFID Gate-In and Gate-Out notifications alongside VIP workshop SLA breach alerts.',
    durationMs: 7500,
  },
  {
    stepNumber: 4,
    title: '4. Today’s Summary & Dealership-Wise Web Dashboard',
    caption:
      'Today’s Summary displays the 4 core gate and road-test tiles (Gate In, Gate Out, Road Test Out, Road Test In), plus active counters for Vehicles Inside Workshop and Active Road Tests, followed by the Dealership Summary & Compliance Matrix.',
    durationMs: 8000,
  },
  {
    stepNumber: 5,
    title: '5. Vehicle Movement Register & Security Guard Filter',
    caption:
      'Opening the Vehicle Movement Register from the top web navigation bar allows filtering by Security Guard, Visit Type (Appointment, Walk In, VIP, Repeat Visit), or Dealership, displaying Road Test Count and Gate-In / Gate-Out timestamps.',
    durationMs: 8500,
  },
  {
    stepNumber: 6,
    title: '6. Direct CSM & Dealer GM Delay Escalation',
    caption:
      'For any delayed or SLA-breached vehicle, TML managers can expand the audit drawer and dispatch a priority escalation directly to the Dealership GM and Territory CSM.',
    durationMs: 8000,
  },
];

function padTwoDigits(num: number): string {
  return String(Math.max(0, num)).padStart(2, '0');
}

export default function App() {
  // Core Web Navigation & View State
  const [activeView, setActiveView] = useState<'home' | 'list'>('home');
  const [currentSegment, setCurrentSegment] = useState<SegmentType>('Overall');
  const [currentCategory, setCurrentCategory] = useState<VehicleCategory>(
    'Vehicles Inside Workshop'
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
  >({ 1: true, 4: true });

  // Live RFID & SLA Notifications Banner State
  const [showRfidBanners, setShowRfidBanners] = useState<boolean>(false);

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

  // Active Escalation Dialog State
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

  // Speak Narration Helper using Web Speech API
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
        setEscalatingVehicle(null);
        setActiveView('home');
        setSelectedZone('ALL');
        setSelectedRegion('ALL');
        setSelectedDealer('ALL');
        setCurrentSegment('Overall');
        setShowRfidBanners(false);
        break;
      }
      case 2: {
        setEscalatingVehicle(null);
        setActiveView('home');
        setSelectedZone('SOUTH');
        setSelectedRegion('South - Kerala');
        setCurrentSegment('EV');
        setShowRfidBanners(false);
        break;
      }
      case 3: {
        setEscalatingVehicle(null);
        setActiveView('home');
        setCurrentSegment('Overall');
        setShowRfidBanners(true);
        break;
      }
      case 4: {
        setEscalatingVehicle(null);
        setActiveView('home');
        setShowRfidBanners(false);
        break;
      }
      case 5: {
        setEscalatingVehicle(null);
        setShowRfidBanners(false);
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
      case 6: {
        setShowRfidBanners(false);
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

  // Compute Dealership-wise 6-metric summary cards for the active Zone & Region
  const dealerSummaryCards = useMemo(() => {
    const dealersToRender =
      selectedDealer === 'ALL' ? availableDealers : [selectedDealer];

    return (dealersToRender ?? []).map((dealerName) => {
      const dVehicles = (vehicles ?? []).filter(
        (v) =>
          v.dealer === dealerName &&
          (currentSegment === 'Overall' || v.segment === currentSegment)
      );
      const complianceMeta = (DEALER_COMPLIANCE_METRICS ?? []).find(
        (m) => m.dealer === dealerName
      );
      const regionObj = (TML_REGIONS ?? []).find((r) =>
        (r.dealers ?? []).includes(dealerName)
      );

      if (
        currentSegment === 'Overall' &&
        dealerName === 'KVR Motors - Thrissur'
      ) {
        return {
          name: dealerName,
          region: regionObj?.name ?? 'Kerala (RO Kochi)',
          zone: regionObj?.zone ?? 'SOUTH',
          csmLead: complianceMeta?.csmLead ?? 'Vivek Nair',
          gateIn: '02',
          gateOut: '02',
          rtOut: '01',
          rtIn: '01',
          inside: '02',
          activeRt: '01',
          compliancePct: complianceMeta?.compliancePct ?? 96,
        };
      }
      if (
        currentSegment === 'Overall' &&
        dealerName === 'Focuz Cars - Kochi'
      ) {
        return {
          name: dealerName,
          region: regionObj?.name ?? 'Kerala (RO Kochi)',
          zone: regionObj?.zone ?? 'SOUTH',
          csmLead: complianceMeta?.csmLead ?? 'Vivek Nair',
          gateIn: '02',
          gateOut: '01',
          rtOut: '02',
          rtIn: '02',
          inside: '01',
          activeRt: '01',
          compliancePct: complianceMeta?.compliancePct ?? 86,
        };
      }

      const insideCount = dVehicles.filter(
        (v) => v.category === 'Vehicles Inside Workshop'
      ).length;
      const gateOutCount = dVehicles.filter(
        (v) => v.category === 'Gate Out'
      ).length;
      const rtOutCount = dVehicles.filter(
        (v) => v.category === 'Road Test Out'
      ).length;
      const rtInCount = dVehicles.filter(
        (v) => v.category === 'Road Test In'
      ).length;
      const activeRtCount = dVehicles.filter(
        (v) => v.category === 'Active Road Tests'
      ).length;

      return {
        name: dealerName,
        region: regionObj?.name ?? 'Regional Office',
        zone: regionObj?.zone ?? 'SOUTH',
        csmLead: complianceMeta?.csmLead ?? 'Regional CSM',
        gateIn: padTwoDigits(Math.max(1, dVehicles.length)),
        gateOut: padTwoDigits(gateOutCount),
        rtOut: padTwoDigits(rtOutCount),
        rtIn: padTwoDigits(rtInCount),
        inside: padTwoDigits(insideCount),
        activeRt: padTwoDigits(activeRtCount),
        compliancePct: complianceMeta?.compliancePct ?? 93,
      };
    });
  }, [availableDealers, selectedDealer, vehicles, currentSegment]);

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

  const closeListView = () => {
    setActiveView('home');
  };

  // Filtered Vehicles for Drill-Down List View & Vehicle Movement Register
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

  const toggleAuditDrawer = (id: number) => {
    setExpandedVehicleIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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

    setRecentEscalationBanner(
      `Escalation sent to Dealer GM at ${escalatingVehicle.dealer} for vehicle ${escalatingVehicle.reg}`
    );
    setEscalatingVehicle(null);
  };

  const isMovementRegisterView =
    currentCategory === 'Vehicle Movement Register';
  const activeDemoStep = DEMO_STEPS[demoStepIndex] ?? DEMO_STEPS[0];

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-[#111827] flex flex-col">
      {/* ================= TOP WEB PORTAL HEADER BAR ================= */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-6 relative">
          {/* Brand Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={closeListView}
              className="relative w-10 h-10 cursor-pointer shrink-0"
              title="TML Portal Home"
            >
              <div className="w-10 h-10 rounded-full bg-[#1F2937] text-white font-bold text-xs flex items-center justify-center">
                VH
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#16A34A] border-2 border-white rounded-full" />
            </button>
            <button
              type="button"
              onClick={closeListView}
              className="text-left cursor-pointer"
            >
              <div className="text-base font-extrabold tracking-wide text-black whitespace-nowrap">
                TATA.CARS <span className="font-normal text-gray-400 mx-1">|</span>{' '}
                <span className="italic font-semibold">TML Portal</span>
              </div>
            </button>
          </div>

          {/* Primary Web Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-[#4B5563]">
            <button
              type="button"
              onClick={closeListView}
              className={`py-1 border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'home'
                  ? 'border-black text-black'
                  : 'border-transparent hover:text-black'
              }`}
            >
              Dashboard Overview
            </button>
            <button
              type="button"
              onClick={() => openListView('Vehicle Movement Register')}
              className={`py-1 border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'list' &&
                currentCategory === 'Vehicle Movement Register'
                  ? 'border-black text-black'
                  : 'border-transparent hover:text-black'
              }`}
            >
              Vehicle Movement Register
            </button>
            <button
              type="button"
              onClick={() => openListView('Vehicles Inside Workshop')}
              className={`py-1 border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'list' &&
                currentCategory === 'Vehicles Inside Workshop'
                  ? 'border-black text-black'
                  : 'border-transparent hover:text-black'
              }`}
            >
              Inside Workshop ({computedKpis.inside})
            </button>
            <button
              type="button"
              onClick={() => openListView('Active Road Tests')}
              className={`py-1 border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'list' && currentCategory === 'Active Road Tests'
                  ? 'border-black text-black'
                  : 'border-transparent hover:text-black'
              }`}
            >
              Active Road Tests ({computedKpis.activeRt})
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={isDemoPlaying ? handleStopDemo : handleStartDemo}
              className={`px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                isDemoPlaying
                  ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                  : 'bg-[#007AFF] text-white hover:bg-[#0062CC]'
              }`}
            >
              {isDemoPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Stop Tour</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Play Guided Demo</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowRfidBanners((prev) => !prev)}
              className="relative p-2 rounded-full hover:bg-gray-100 text-gray-800 cursor-pointer"
              title="Toggle RFID & SLA Notifications"
              aria-label="Toggle Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#DC2626] rounded-full" />
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN FULL-WIDTH WEB WORKSPACE ================= */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 flex-1">
        {/* Guided Demo Player Banner */}
        {isDemoPlaying && activeDemoStep && (
          <div className="mb-6 bg-[#111827] text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full bg-[#007AFF] text-[11px] font-bold font-mono-tabular">
                  STEP {activeDemoStep.stepNumber} OF {DEMO_STEPS.length}
                </span>
                <h2 className="text-sm sm:text-base font-bold text-white">
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
              </div>
            </div>
            <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
              {activeDemoStep.caption}
            </p>
          </div>
        )}

        {/* RFID Gate-In / Gate-Out & SLA Notification Banners */}
        {showRfidBanners && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-[#DC2626]">
                  SLA Alert: VIP Vehicle Inside &gt; 3 Days
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Nexon • KL08BS899 • Dealer: Focuz Cars - Kochi
                </p>
              </div>
              <span className="text-[11px] text-gray-400 font-mono-tabular">
                Just now
              </span>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-900">
                  RFID Gate-In successful
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Nexon • MH02CA1290 • Customer: Rohit Sharma
                </p>
              </div>
              <span className="text-[11px] text-gray-400 font-mono-tabular">
                Just now
              </span>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-900">
                  RFID Gate-Out successful
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Nexon • MH02CA1280 • Customer: Prachi Sharma
                </p>
              </div>
              <span className="text-[11px] text-gray-400 font-mono-tabular">
                2m ago
              </span>
            </div>
          </div>
        )}

        {/* Escalation Confirmation Banner */}
        {recentEscalationBanner && (
          <div className="mb-6 px-4 py-3 rounded-2xl bg-[#ECFDF5] border border-[#10B981] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#065F46]">
              <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
              <span>{recentEscalationBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setRecentEscalationBanner(null)}
              className="text-[#065F46] hover:text-black p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ================= PAN-INDIA TML HIERARCHY BAR + SEGMENT & DATE CONTROLS ================= */}
        <section className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-6 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-[#F3F4F6]">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#6B7280] mb-0.5">
                <MapPin className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>
                  Tata Motors Passenger &amp; Electric Vehicles · Pan-India
                  Governance
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-[#111827]">
                TML Security, Reception &amp; Vehicle Movement Portal
              </h1>
            </div>

            {/* Overall | PV | EV & Today | Calendar Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center bg-[#EBECEF] rounded-full p-1">
                {(['Overall', 'PV', 'EV'] as SegmentType[]).map((seg) => (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => setCurrentSegment(seg)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                      currentSegment === seg
                        ? 'bg-black text-white'
                        : 'text-[#374151] hover:text-black'
                    }`}
                  >
                    {seg}
                  </button>
                ))}
              </div>

              <div className="inline-flex items-center bg-[#EBECEF] rounded-full p-1">
                <button
                  type="button"
                  onClick={() => {
                    setDateMode('Today');
                    setSelectedDate('25 May 26');
                    setShowCalendarPicker(false);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    dateMode === 'Today'
                      ? 'bg-black text-white'
                      : 'text-[#374151] hover:text-black'
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
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    dateMode === 'Calendar'
                      ? 'bg-black text-white'
                      : 'text-[#374151] hover:text-black'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {selectedDate !== '25 May 26' ? selectedDate : 'Calender'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Zone Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex flex-wrap gap-1.5">
              {(TML_ZONES ?? []).map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => handleZoneChange(z.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    selectedZone === z.id
                      ? 'bg-black text-white'
                      : 'bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]'
                  }`}
                >
                  {z.id === 'ALL' ? 'Pan-India (All 5 Zones)' : `${z.id} Zone`}
                </button>
              ))}
            </div>

            {(selectedZone !== 'ALL' ||
              selectedRegion !== 'ALL' ||
              selectedDealer !== 'ALL') && (
              <button
                type="button"
                onClick={() => handleZoneChange('ALL')}
                className="text-xs font-semibold text-[#007AFF] hover:underline cursor-pointer"
              >
                Reset to Pan-India (All 5 Zones)
              </button>
            )}
          </div>

          {/* Cascading Dropdowns for Zone, Region, and Dealership */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">
                Zone
              </label>
              <select
                aria-label="Select Zone"
                value={selectedZone}
                onChange={(e) => handleZoneChange(e.target.value as ZoneId)}
                className="w-full bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#111827] outline-none cursor-pointer"
              >
                {(TML_ZONES ?? []).map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">
                Region ({(availableRegions ?? []).length} Regional Offices)
              </label>
              <select
                aria-label="Select Region"
                value={selectedRegion}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="w-full bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#111827] outline-none cursor-pointer"
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

            <div>
              <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">
                Dealership ({(availableDealers ?? []).length} in Scope)
              </label>
              <select
                aria-label="Select Dealership"
                value={selectedDealer}
                onChange={(e) => handleHomeDealerChange(e.target.value)}
                className="w-full bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#111827] outline-none cursor-pointer"
              >
                <option value="ALL">
                  All Dealerships ({(availableDealers ?? []).length})
                </option>
                {(availableDealers ?? []).map((dealerName) => (
                  <option key={dealerName} value={dealerName}>
                    {dealerName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Calendar Picker Drawer */}
          {showCalendarPicker && (
            <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-[#374151]">
                  Select Governance Date
                </span>
                <button
                  type="button"
                  onClick={() => setShowCalendarPicker(false)}
                  className="text-xs font-semibold text-[#6B7280] hover:text-black cursor-pointer"
                >
                  Done
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 max-w-md">
                {(AVAILABLE_DATES ?? []).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSelectedDate(d);
                      setDateMode(d === '25 May 26' ? 'Today' : 'Calendar');
                      setShowCalendarPicker(false);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold font-mono-tabular cursor-pointer transition-colors ${
                      selectedDate === d
                        ? 'bg-black text-white'
                        : 'bg-[#F9FAFB] border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ================= VIEW 1: WEB DASHBOARD OVERVIEW ================= */}
        {activeView === 'home' ? (
          <div className="space-y-6">
            {/* Today's Summary (6 Core Cards in a Full-Width Web Grid) */}
            <section className="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#111827]">
                    Today&apos;s Summary (Network Aggregate)
                  </h2>
                  <p className="text-xs text-[#6B7280]">
                    Click any metric tile to open the corresponding vehicle
                    list
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openListView('Vehicle Movement Register')}
                  className="px-4 py-2 rounded-xl bg-[#111827] hover:bg-[#1F2937] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>
                    Open Vehicle Movement Register (
                    {computedKpis.movementRegisterCount})
                  </span>
                </button>
              </div>

              {/* 6-Column Web KPI Grid: 4 Pastel Tiles + 2 Active Counter Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <button
                  type="button"
                  onClick={() => openListView('Gate In')}
                  className="bg-[#CBEFD8] rounded-2xl p-4 text-center cursor-pointer hover:opacity-95 active:scale-[0.98] transition-all flex flex-col justify-center"
                >
                  <div className="text-2xl sm:text-3xl font-bold text-[#111827] mb-1 font-mono-tabular">
                    {computedKpis.gateIn}
                  </div>
                  <div className="text-xs font-semibold text-[#1F2937]">
                    Gate In
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openListView('Gate Out')}
                  className="bg-[#E1F6EA] rounded-2xl p-4 text-center cursor-pointer hover:opacity-95 active:scale-[0.98] transition-all flex flex-col justify-center"
                >
                  <div className="text-2xl sm:text-3xl font-bold text-[#111827] mb-1 font-mono-tabular">
                    {computedKpis.gateOut}
                  </div>
                  <div className="text-xs font-semibold text-[#1F2937]">
                    Gate Out
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openListView('Road Test Out')}
                  className="bg-[#FEF5DF] rounded-2xl p-4 text-center cursor-pointer hover:opacity-95 active:scale-[0.98] transition-all flex flex-col justify-center"
                >
                  <div className="text-2xl sm:text-3xl font-bold text-[#111827] mb-1 font-mono-tabular">
                    {computedKpis.rtOut}
                  </div>
                  <div className="text-xs font-semibold text-[#1F2937]">
                    Road Test Out
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openListView('Road Test In')}
                  className="bg-[#FCEFB8] rounded-2xl p-4 text-center cursor-pointer hover:opacity-95 active:scale-[0.98] transition-all flex flex-col justify-center"
                >
                  <div className="text-2xl sm:text-3xl font-bold text-[#111827] mb-1 font-mono-tabular">
                    {computedKpis.rtIn}
                  </div>
                  <div className="text-xs font-semibold text-[#1F2937]">
                    Road Test In
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openListView('Vehicles Inside Workshop')}
                  className="border border-[#E5E7EB] rounded-2xl p-4 text-left bg-white hover:border-[#9CA3AF] cursor-pointer transition-colors flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center text-[#4B5563]">
                      <Home className="w-4 h-4" />
                    </div>
                    <span className="text-2xl font-bold text-[#111827] font-mono-tabular">
                      {computedKpis.inside}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#374151]">
                    Vehicle Inside Workshop
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openListView('Active Road Tests')}
                  className="border border-[#E5E7EB] rounded-2xl p-4 text-left bg-white hover:border-[#9CA3AF] cursor-pointer transition-colors flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center text-[#4B5563]">
                      <Car className="w-4 h-4" />
                    </div>
                    <span className="text-2xl font-bold text-[#111827] font-mono-tabular">
                      {computedKpis.activeRt}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#374151]">
                    Active Road Test Count
                  </div>
                </button>
              </div>
            </section>

            {/* TML Governance & Exceptions Row */}
            <section className="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#111827]">
                    TML Governance &amp; SLA Exceptions
                  </h2>
                  <p className="text-xs text-[#6B7280]">
                    Proactive monitoring for workshop dwell breaches, VIP/Repeat
                    visits, RFID gate automation, and extended road tests
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() =>
                    openListView('Vehicles Inside Workshop', 'AGEING')
                  }
                  className="border border-[#E5E7EB] rounded-2xl p-4 bg-white hover:border-[#DC2626]/50 text-left cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FEF2F2] flex items-center justify-center text-[#DC2626]">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="py-1 px-3 rounded-lg text-sm font-bold bg-[#FEE2E2] text-[#DC2626] font-mono-tabular">
                      {computedKpis.ageingCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#111827]">
                    <span>Ageing &gt; 48 Hrs</span>
                    <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openListView('Vehicles Inside Workshop', 'VIP_RV')
                  }
                  className="border border-[#E5E7EB] rounded-2xl p-4 bg-white hover:border-[#9333EA]/50 text-left cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FAF5FF] flex items-center justify-center text-[#9333EA]">
                      <Star className="w-5 h-5" />
                    </div>
                    <span className="py-1 px-3 rounded-lg text-sm font-bold bg-[#F3E8FF] text-[#9333EA] font-mono-tabular">
                      {computedKpis.vipRvCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#111827]">
                    <span>VIP &amp; Repeat (RV)</span>
                    <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openListView('Vehicle Movement Register')}
                  className="border border-[#E5E7EB] rounded-2xl p-4 bg-white hover:border-[#2563EB]/50 text-left cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                      <Radio className="w-5 h-5" />
                    </div>
                    <span className="py-1 px-3 rounded-lg text-sm font-bold bg-[#DBEAFE] text-[#2563EB] font-mono-tabular">
                      {computedKpis.rfidCompliance}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#111827]">
                    <span>RFID Gate Compliance</span>
                    <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openListView('Active Road Tests')}
                  className="border border-[#E5E7EB] rounded-2xl p-4 bg-white hover:border-[#D97706]/50 text-left cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] flex items-center justify-center text-[#D97706]">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <span className="py-1 px-3 rounded-lg text-sm font-bold bg-[#FEF3C7] text-[#D97706] font-mono-tabular">
                      {computedKpis.activeRtOver20m}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#111827]">
                    <span>Active RT &gt; 20m</span>
                    <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                  </div>
                </button>
              </div>
            </section>

            {/* Dealership Summary Grid (3 Columns on Desktop Web) */}
            <section className="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#111827]">
                    Dealership Summary ({(dealerSummaryCards ?? []).length}{' '}
                    Dealerships in Scope)
                  </h2>
                  <p className="text-xs text-[#6B7280]">
                    Click any dealership card to inspect its workshop vehicles
                    and movement register
                  </p>
                </div>
                {selectedDealer !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => handleHomeDealerChange('ALL')}
                    className="text-xs font-semibold text-[#007AFF] hover:underline cursor-pointer"
                  >
                    Show All Dealerships
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(dealerSummaryCards ?? []).map((dealer) => (
                  <div
                    key={dealer.name}
                    onClick={() => {
                      handleHomeDealerChange(dealer.name);
                      openListView('Vehicles Inside Workshop');
                    }}
                    className="border border-[#E5E7EB] rounded-2xl p-4 bg-white hover:border-[#9CA3AF] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-bold text-[#111827]">
                          {dealer.name}
                        </div>
                        <div className="text-[11px] text-[#6B7280]">
                          {dealer.zone} Zone · {dealer.region} · RFID:{' '}
                          <span className="font-semibold text-[#059669]">
                            {dealer.compliancePct}%
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-[#CBEFD8]/60 rounded-xl py-2">
                        <div className="text-xs font-bold text-[#111827] font-mono-tabular">
                          {dealer.gateIn}
                        </div>
                        <div className="text-[10px] text-[#374151]">Gate In</div>
                      </div>
                      <div className="bg-[#E1F6EA]/70 rounded-xl py-2">
                        <div className="text-xs font-bold text-[#111827] font-mono-tabular">
                          {dealer.gateOut}
                        </div>
                        <div className="text-[10px] text-[#374151]">
                          Gate Out
                        </div>
                      </div>
                      <div className="bg-[#FEF5DF] rounded-xl py-2">
                        <div className="text-xs font-bold text-[#111827] font-mono-tabular">
                          {dealer.rtOut}
                        </div>
                        <div className="text-[10px] text-[#374151]">RT Out</div>
                      </div>
                      <div className="bg-[#FCEFB8]/70 rounded-xl py-2">
                        <div className="text-xs font-bold text-[#111827] font-mono-tabular">
                          {dealer.rtIn}
                        </div>
                        <div className="text-[10px] text-[#374151]">RT In</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* CSM & Dealer GM Escalation Log */}
            <section className="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#111827]">
                    CSM &amp; Dealer GM Escalation Log
                  </h2>
                  <p className="text-xs text-[#6B7280]">
                    Real-time audit trail of SLA delay escalations triggered by
                    TML regional teams
                  </p>
                </div>
                <span className="text-xs font-mono-tabular font-semibold text-[#4B5563]">
                  {(escalationLogs ?? []).length} Dispatched
                </span>
              </div>

              <div className="space-y-2.5">
                {(escalationLogs ?? []).map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-[#111827] flex-wrap">
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
                      <div className="text-xs text-[#4B5563] mt-0.5">
                        {log.reason}
                      </div>
                      <div className="text-[11px] text-[#6B7280] mt-0.5">
                        Assigned: {log.csmName} · Status: {log.status}
                      </div>
                    </div>
                    <div className="text-[11px] font-mono-tabular text-[#6B7280] shrink-0">
                      {log.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          /* ================= VIEW 2: DRILL-DOWN LIST VIEW & VEHICLE MOVEMENT REGISTER ================= */
          <div className="space-y-5">
            {/* Title & Back Button */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#111827]">
                {currentCategory}
              </h2>
              <button
                type="button"
                onClick={closeListView}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-[#E5E7EB] text-xs font-semibold text-[#111827] hover:bg-gray-50 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </button>
            </div>

            {/* Category Switcher Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {(
                [
                  'Vehicles Inside Workshop',
                  'Vehicle Movement Register',
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
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    currentCategory === cat
                      ? 'bg-black text-white'
                      : 'bg-white border border-[#E5E7EB] text-[#374151] hover:bg-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Web Search & Filter Bar */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-end">
                <div className="lg:col-span-4">
                  <label className="block text-[10px] font-bold text-[#9CA3AF] uppercase mb-1">
                    Search Vehicle / Chassis / Customer
                  </label>
                  <div className="bg-[#F3F4F6] rounded-full px-4 py-2.5 flex items-center gap-2.5">
                    <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search vehicle, VIN or customer"
                      className="bg-transparent text-xs text-[#111827] outline-none w-full"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-[#6B7280] hover:text-black cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-[10px] font-bold text-[#9CA3AF] uppercase mb-1">
                    Filter by Security Guard
                  </label>
                  <select
                    value={listGuardFilter}
                    onChange={(e) => setListGuardFilter(e.target.value)}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-full px-3.5 py-2.5 text-xs font-medium text-[#1F2937] outline-none cursor-pointer"
                  >
                    <option value="ALL">All Guards</option>
                    {(SECURITY_GUARDS ?? []).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-[10px] font-bold text-[#9CA3AF] uppercase mb-1">
                    Filter by Visit Type
                  </label>
                  <select
                    value={listVisitFilter}
                    onChange={(e) =>
                      setListVisitFilter(e.target.value as VisitFilterType)
                    }
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-full px-3.5 py-2.5 text-xs font-medium text-[#1F2937] outline-none cursor-pointer"
                  >
                    <option value="ALL">All Visits</option>
                    <option value="Appointment">Appointment</option>
                    <option value="Walk In">Walk In</option>
                    <option value="VIP_RV">VIP &amp; Repeat Visit (RV)</option>
                    <option value="AGEING">Ageing &gt; 48 Hrs</option>
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-[10px] font-bold text-[#9CA3AF] uppercase mb-1">
                    Filter by Dealership
                  </label>
                  <select
                    value={listDealerFilter}
                    onChange={(e) => setListDealerFilter(e.target.value)}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-full px-3.5 py-2.5 text-xs font-medium text-[#1F2937] outline-none cursor-pointer"
                  >
                    <option value="ALL">All Dealerships</option>
                    {(availableDealers ?? []).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <button
                    type="button"
                    onClick={() => setSearchQuery((prev) => prev.trim())}
                    className="w-full bg-black text-white rounded-full py-2.5 px-4 text-xs font-semibold cursor-pointer hover:bg-[#1F2937] transition-colors"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>

            {/* Date & Count Meta Row */}
            <div className="flex items-center justify-between text-sm font-bold text-[#111827] font-mono-tabular">
              <span>{selectedDate}</span>
              <span>
                {filteredVehicles.length}{' '}
                {currentCategory === 'Vehicles Inside Workshop'
                  ? 'Vehicles'
                  : isMovementRegisterView
                  ? 'Gate In'
                  : currentCategory}
              </span>
            </div>

            {/* Vehicle Cards Grid (3-Column Web Layout on Desktop) */}
            {filteredVehicles.length === 0 ? (
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center">
                <div className="text-sm font-bold text-[#111827] mb-1">
                  No matching vehicles found
                </div>
                <div className="text-xs text-[#6B7280] mb-4">
                  No vehicles match the active Zone, Region, Security Guard, or
                  Visit Type filters.
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-black text-white text-xs font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(filteredVehicles ?? []).map((v) => {
                  const isExpanded = Boolean(expandedVehicleIds[v.id]);
                  return (
                    <div
                      key={v.id}
                      className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        {/* Dealership & Region Tag */}
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-[11px] font-semibold text-[#4B5563] bg-[#F3F4F6] py-1 px-2.5 rounded-lg inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-[#6B7280]" />
                            <span>{v.dealer}</span>
                          </span>
                          <span className="text-[11px] font-medium text-[#6B7280]">
                            {v.region}
                          </span>
                        </div>

                        {/* Main Vehicle Row */}
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="text-base font-bold text-[#111827] font-mono-tabular">
                              {v.reg}
                            </div>
                            <div className="text-xs text-[#6B7280] mt-0.5 break-all font-mono-tabular">
                              {v.vin}
                            </div>
                            <div className="text-xs text-[#6B7280] mt-1">
                              {v.model}
                            </div>
                            <div className="text-xs font-semibold text-[#111827] mt-1">
                              {v.customer}
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end">
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              {v.rv && (
                                <span className="w-7 h-7 rounded-full bg-[#F59E0B] text-white text-[11px] font-bold inline-flex items-center justify-center">
                                  RV
                                </span>
                              )}
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                  v.visitType === 'Appointment'
                                    ? 'border-[#10B981] text-[#059669] bg-[#ECFDF5]'
                                    : 'border-[#93C5FD] text-[#3B82F6] bg-[#EFF6FF]'
                                }`}
                              >
                                {v.visitType}
                              </span>
                              {v.vip && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border border-[#A855F7] text-[#9333EA] bg-[#FAF5FF]">
                                  VIP
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleAuditDrawer(v.id)}
                                className="p-1 text-[#374151] hover:bg-gray-100 rounded-full cursor-pointer"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>

                            <div className="text-xs text-[#374151] font-medium mt-2">
                              Road Test Count:{' '}
                              <strong className="font-bold text-[#111827] font-mono-tabular">
                                {v.roadTestCount}
                              </strong>
                            </div>

                            {v.dwellLabel && !isMovementRegisterView && (
                              <div className="text-xs text-[#6B7280] mt-1">
                                {v.dwellLabel}{' '}
                                <span
                                  className={`font-bold font-mono-tabular ${
                                    v.slaBreach
                                      ? 'text-[#DC2626]'
                                      : 'text-[#111827]'
                                  }`}
                                >
                                  {v.dwellVal}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bottom Dual Timestamp Row (Gate In Time & Gate Out / Event Time) */}
                        <div className="mt-3 pt-2.5 border-t border-[#F3F4F6] flex items-center justify-between gap-2">
                          <div>
                            <div className="text-[11px] text-[#6B7280]">
                              Gate In Time
                            </div>
                            <div className="text-xs font-bold text-[#1F2937] font-mono-tabular">
                              {v.gateInTime}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="flex items-center justify-end gap-1 text-[11px] text-[#6B7280]">
                              {currentCategory !== 'Vehicles Inside Workshop' &&
                                currentCategory !== 'Active Road Tests' && (
                                  <UserCheck className="w-3.5 h-3.5 text-[#6B7280]" />
                                )}
                              <span>
                                {isMovementRegisterView
                                  ? 'Gate Out Time'
                                  : v.timeLabel}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-[#1F2937] font-mono-tabular">
                              {isMovementRegisterView
                                ? v.gateOutTime
                                : v.timeVal}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expandable TML & Security Guard Audit Drawer */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-dashed border-[#E5E7EB] text-xs">
                          <div className="grid grid-cols-2 gap-2 bg-[#F9FAFB] p-2.5 rounded-xl mb-2.5">
                            <div>
                              <span className="block text-[10px] text-[#6B7280]">
                                Security Guard
                              </span>
                              <strong className="text-[#111827]">
                                {v.securityGuard}
                              </strong>
                            </div>
                            <div>
                              <span className="block text-[10px] text-[#6B7280]">
                                Gate Entry Mode
                              </span>
                              <strong className="text-[#111827]">
                                {v.entryMode}
                              </strong>
                            </div>
                            <div>
                              <span className="block text-[10px] text-[#6B7280]">
                                Assigned Staff
                              </span>
                              <strong className="text-[#111827]">{v.sa}</strong>
                            </div>
                            <div>
                              <span className="block text-[10px] text-[#6B7280]">
                                TML Territory CSM
                              </span>
                              <strong className="text-[#111827]">
                                {v.csmName}
                              </strong>
                            </div>
                          </div>

                          {(v.roadTestTrips ?? []).length > 0 && (
                            <div className="mb-2.5 bg-[#F9FAFB] p-2.5 rounded-xl border border-[#E5E7EB]">
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
                                    Escalated to CSM ({v.escalatedAt})
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
                              className="w-full bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-full py-2.5 px-4 text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
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
      </main>

      {/* ================= ESCALATION CONFIRMATION MODAL ================= */}
      {escalatingVehicle && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white w-full max-w-[420px] rounded-2xl p-5 shadow-2xl border border-[#E5E7EB]">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#007AFF] flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">
                    Escalate Delay to Dealership CSM
                  </h3>
                  <p className="text-xs text-[#6B7280]">
                    {escalatingVehicle.dealer} ({escalatingVehicle.region})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEscalatingVehicle(null)}
                className="p-1 text-[#6B7280] hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmEscalation}>
              <div className="bg-[#F9FAFB] rounded-xl p-3 border border-[#E5E7EB] mb-3.5 text-xs space-y-1">
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
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
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
                <label className="block text-[11px] font-bold text-[#374151] mb-1.5">
                  Action Directive for Dealer GM &amp; CSM
                </label>
                <textarea
                  rows={3}
                  value={escalationNoteInput}
                  onChange={(e) => setEscalationNoteInput(e.target.value)}
                  className="w-full rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] p-2.5 text-xs text-[#111827] outline-none focus:border-[#007AFF]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEscalatingVehicle(null)}
                  className="flex-1 py-2.5 px-4 rounded-full border border-[#D1D5DB] bg-white text-xs font-semibold text-[#374151] cursor-pointer hover:bg-[#F3F4F6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold cursor-pointer"
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