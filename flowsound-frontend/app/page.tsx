"use client";

import { Suspense, useState, type CSSProperties } from "react";
import { LofiPlayer } from "@/components/LofiPlayer";
import {
  NavigationSegmentedControl,
  type TabId,
} from "@/components/NavigationSegmentedControl";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { TasksPanel } from "@/components/TasksPanel";
import { cn } from "@/lib/utils";

const TABS: readonly TabId[] = ["focus", "player", "tasks"];

function FlowSoundHomeContent() {
  const [activeTab, setActiveTab] = useState<TabId>("focus");

  return (
    <main
      style={{ "--accent-now": "var(--ink)" } as CSSProperties}
      className="relative flex h-svh flex-col overflow-x-hidden lg:overflow-hidden"
    >
      {/* Segmented Control — floating top-left */}
      <div className="fixed left-5 top-4 z-50">
        <NavigationSegmentedControl
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Full-bleed canvas: the sheet is gone. Each pane stays mounted
          (audio never stops); inactive ones are hidden. Switching is an
          instant swap — the sliding nav thumb is the motion. */}
      {TABS.map((tabId) => {
        const isActive = tabId === activeTab;
        return (
          <div
            key={tabId}
            id={`panel-${tabId}`}
            role="tabpanel"
            aria-labelledby={`tab-${tabId}`}
            aria-hidden={!isActive}
            className={cn("min-h-0 w-full flex-1 overflow-y-auto", isActive ? "flex" : "hidden")}
          >
            {tabId === "focus" && <PomodoroTimer />}
            {tabId === "player" && <LofiPlayer active={isActive} />}
            {tabId === "tasks" && <TasksPanel />}
          </div>
        );
      })}
    </main>
  );
}

export default function FlowSoundHome() {
  return (
    <Suspense fallback={null}>
      <FlowSoundHomeContent />
    </Suspense>
  );
}