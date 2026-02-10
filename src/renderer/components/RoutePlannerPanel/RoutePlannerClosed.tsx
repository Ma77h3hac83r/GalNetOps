/** Collapsed route planner: button to show panel. */

interface RoutePlannerClosedProps {
  onOpen: () => void;
}

export function RoutePlannerClosed({ onOpen }: RoutePlannerClosedProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-10 flex items-center justify-center shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
      title="Show Route planner"
      aria-label="Show Route planner"
    >
      <svg
        className="w-5 h-5 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  );
}
