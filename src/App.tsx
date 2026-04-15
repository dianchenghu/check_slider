import { useState } from "react";

type ScaleLevel = {
  label: string;
};

type ScaleBarProps = {
  title: string;
  description: string;
  levels: ScaleLevel[];
};

const moodLevels: ScaleLevel[] = [
  {
    label: "Miserable",
  },
  {
    label: "Down",
  },
  {
    label: "Okay",
  },
  {
    label: "Good",
  },
  {
    label: "Excellent",
  },
];

const workloadLevels: ScaleLevel[] = [
  {
    label: "Underutilized",
  },
  {
    label: "Light",
  },
  {
    label: "Just right",
  },
  {
    label: "Busy",
  },
  {
    label: "Overwhelmed",
  },
];

function ScaleBar({ title, description, levels }: ScaleBarProps) {
  const [value, setValue] = useState(2);
  const activeIndex = Math.min(levels.length - 1, Math.max(0, Math.round(value)));

  return (
    <section className="rounded-2xl bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <div className="rounded-full bg-gray-100 px-4 py-1 text-sm text-gray-700">
          Current: <span className="font-semibold text-gray-900">{levels[activeIndex].label}</span>
        </div>
      </div>

      <div className="mt-6">
        <input
          type="range"
          min={0}
          max={levels.length - 1}
          step={0.01}
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
          className="scale-input w-full accent-emerald-500"
          aria-label={`${title} scale`}
        />
        <div className="mt-2 grid grid-cols-5 items-center">
          {levels.map((level) => (
            <div key={`${title}-${level.label}`} className="flex justify-center">
              <div className="h-2 w-1 rounded-full bg-gray-300" />
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs font-medium text-gray-600">
          {levels.map((level) => (
            <div key={`${title}-${level.label}-label`}>{level.label}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 text-gray-900">
      <style>{`
        .scale-input {
          -webkit-appearance: none;
          appearance: none;
          height: 10px;
          border-radius: 999px;
          background: #2f343b;
        }
        .scale-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #10b981;
          border: 3px solid #ffffff;
          box-shadow: 0 6px 12px rgba(16, 185, 129, 0.35);
          cursor: pointer;
        }
        .scale-input::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #10b981;
          border: 3px solid #ffffff;
          box-shadow: 0 6px 12px rgba(16, 185, 129, 0.35);
          cursor: pointer;
        }
        .scale-input::-moz-range-track {
          height: 10px;
          border-radius: 999px;
          background: #2f343b;
        }
      `}</style>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
        <header className="text-center">
          <h1 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
            Mood & Workload Check-In
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Move the knob freely.
          </p>
        </header>

        <ScaleBar
          title="Mood"
          description="How are you feeling right now?"
          levels={moodLevels}
        />

        <ScaleBar
          title="Workload"
          description="How busy do you feel today?"
          levels={workloadLevels}
        />
      </div>
    </div>
  );
}

export default App;

