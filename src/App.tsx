import React from "react";
import { MedicationProvider } from "./context/MedicationContext";
import { useMedication } from "./context/useMedication";
import { NameStep } from "./components/onboarding/NameStep";
import { ScanStep } from "./components/onboarding/ScanStep";
import { AnalyzingStep } from "./components/onboarding/AnalyzingStep";
import { VerifyStep } from "./components/onboarding/VerifyStep";
import { SuccessStep } from "./components/onboarding/SuccessStep";
import { HomeView } from "./components/HomeView";
import { ScheduleView } from "./components/ScheduleView";
import { GameView } from "./components/GameView";
import { ReminderModal } from "./components/ReminderModal";
import { AICallModal } from "./components/AICallModal";

const AppContent: React.FC = () => {
  const { activeScreen, isAnalyzing, analysisError, restartOnboarding } = useMedication();

  return (
    <div className="app-viewport">
      {/* 1. Onboarding Flow */}
      {activeScreen === "onboarding_name" && <NameStep />}

      {activeScreen === "onboarding_scan" && (
        isAnalyzing || analysisError ? (
          <AnalyzingStep
            error={analysisError}
            onRetry={() => restartOnboarding(true)}
          />
        ) : (
          <ScanStep />
        )
      )}

      {activeScreen === "onboarding_review" && <VerifyStep />}
      {activeScreen === "onboarding_success" && <SuccessStep />}

      {/* 2. Primary Senior Experience */}
      {activeScreen === "home" && <HomeView />}
      {activeScreen === "schedule" && <ScheduleView />}
      {activeScreen === "game" && <GameView />}

      {/* 3. Highest Priority Overlays: Reminder & AI Call */}
      <ReminderModal />
      <AICallModal />
    </div>
  );
};

export function App() {
  return (
    <MedicationProvider>
      <AppContent />
    </MedicationProvider>
  );
}

export default App;
