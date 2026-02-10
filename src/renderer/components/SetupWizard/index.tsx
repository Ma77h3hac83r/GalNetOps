/** First-run wizard: journal path, validation, optional backfill, completion. */
import { useSetupWizard } from './useSetupWizard';
import { SetupWizardPathStep } from './SetupWizardPathStep';
import { SetupWizardBackfillStep } from './SetupWizardBackfillStep';
import { SetupWizardCompleteStep } from './SetupWizardCompleteStep';
import { WIZARD_STEPS } from './constants';

export function SetupWizard() {
  const data = useSetupWizard();
  const {
    step,
    manualPath,
    setManualPath,
    isChecking,
    validationResult,
    detectedPaths,
    isDetecting,
    importHistory,
    setImportHistory,
    isBackfilling,
    backfillProgress,
    backfillResult,
    handleValidate,
    handleBrowse,
    handleSubmit,
    handleSelectDetectedPath,
    handleStartBackfill,
    handleCancelBackfill,
    handleSkipBackfill,
    handleFinish,
  } = data;

  const stepIndex = WIZARD_STEPS.indexOf(step);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-accent-600 dark:text-accent-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome to GalNetOps
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            {step === 'path' && "Let's get you set up for exploration"}
            {step === 'backfill' && 'Import your exploration history'}
            {step === 'complete' && "You're all set!"}
          </p>

          <div className="flex items-center justify-center gap-2 mt-4">
            {WIZARD_STEPS.map((s, i) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  s === step
                    ? 'bg-accent-500'
                    : stepIndex > i
                      ? 'bg-accent-300 dark:bg-accent-700'
                      : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>

        {step === 'path' && (
          <SetupWizardPathStep
            manualPath={manualPath}
            onPathChange={setManualPath}
            isChecking={isChecking}
            validationResult={validationResult}
            detectedPaths={detectedPaths}
            isDetecting={isDetecting}
            onValidate={handleValidate}
            onBrowse={handleBrowse}
            onSubmit={handleSubmit}
            onSelectDetectedPath={handleSelectDetectedPath}
          />
        )}
        {step === 'backfill' && (
          <SetupWizardBackfillStep
            importHistory={importHistory}
            setImportHistory={setImportHistory}
            isBackfilling={isBackfilling}
            backfillProgress={backfillProgress}
            validationResult={validationResult}
            onStartBackfill={handleStartBackfill}
            onSkipBackfill={handleSkipBackfill}
            onCancelBackfill={handleCancelBackfill}
          />
        )}
        {step === 'complete' && (
          <SetupWizardCompleteStep
            backfillResult={backfillResult}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  );
}
