import React, { useState } from "react";
import { MedicationProvider } from "./context/MedicationContext";
import { useMedication } from "./context/useMedication";
import { NameStep } from "./components/onboarding/NameStep";
import { GuardianChoiceStep } from "./components/onboarding/GuardianChoiceStep";
import { GuardianConnectStep } from "./components/onboarding/GuardianConnectStep";
import { ScanStep } from "./components/onboarding/ScanStep";
import { AnalyzingStep } from "./components/onboarding/AnalyzingStep";
import { VerifyStep } from "./components/onboarding/VerifyStep";
import { SuccessStep } from "./components/onboarding/SuccessStep";
import { HomeView } from "./components/HomeView";
import { ScheduleView } from "./components/ScheduleView";
import { GameView } from "./components/GameView";
import { ReminderModal } from "./components/ReminderModal";
import { AICallModal } from "./components/AICallModal";

interface GuardianInviteData {
  guardianLinkId: string;
  pairingToken: string;
  telegramUrl: string;
  alreadyConnected?: boolean;
  telegramFirstName?: string;
}

const AppContent: React.FC = () => {
  const { activeScreen, setActiveScreen, isAnalyzing, analysisError, restartOnboarding } = useMedication();
  const [currentInvite, setCurrentInvite] = useState<GuardianInviteData | null>(null);

  return (
    <div className="app-viewport">
      {/* 1. Onboarding Flow */}
      {activeScreen === "onboarding_name" && <NameStep />}

      {activeScreen === "onboarding_guardian_choice" && (
        <GuardianChoiceStep
          onProceedToScan={() => setActiveScreen("onboarding_scan")}
          onInviteCreated={(invite) => {
            setCurrentInvite(invite);
            setActiveScreen("onboarding_guardian_connect");
          }}
        />
      )}

      {activeScreen === "onboarding_guardian_connect" && (
        currentInvite ? (
          <GuardianConnectStep
            invite={currentInvite}
            onProceedToScan={() => setActiveScreen("onboarding_scan")}
          />
        ) : (
          <GuardianChoiceStep
            onProceedToScan={() => setActiveScreen("onboarding_scan")}
            onInviteCreated={(invite) => {
              setCurrentInvite(invite);
              setActiveScreen("onboarding_guardian_connect");
            }}
          />
        )
      )}

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
