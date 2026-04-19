import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "./lib/firebase";

type ModeContextType = {
  isRelationshipMode: boolean;
  isReorderMode: boolean;
  isHoverMode: boolean;
  selectedHandle: { nodeId: string; handleId: string; type: "target" | "source" } | null;
  setSelectedHandle: (
    handle: { nodeId: string; handleId: string; type: "target" | "source" } | null
  ) => void;
  isFieldDragging: boolean;
  setIsFieldDragging: (isDragging: boolean) => void;
  pushHistory: (...args: unknown[]) => void;
  setSelectedField: (field: { nodeId: string; fieldPath: string } | null) => void;
  highlightedEdgeHandles: {
    sourceNodeId: string;
    sourceHandle: string;
    targetNodeId: string;
    targetHandle: string;
  } | null;
};

export const useMode = (): ModeContextType => ({
  isRelationshipMode: false,
  isReorderMode: false,
  isHoverMode: false,
  selectedHandle: null,
  setSelectedHandle: () => {},
  isFieldDragging: false,
  setIsFieldDragging: () => {},
  pushHistory: () => {},
  setSelectedField: () => {},
  highlightedEdgeHandles: null,
});

type ScaleLevel = {
  label: string;
};

type ScaleBarProps = {
  title?: string;
  description?: string;
  levels: ScaleLevel[];
  showLabels?: boolean;
  size?: "default" | "compact";
  value?: number;
  onChange?: (value: number) => void;
  trackClassName?: string;
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

const people = [
  {
    id: "person-amelia-short",
    name: "Amelia Short",
    avatar: "https://ca.slack-edge.com/E01C4Q4H3CL-U023LNJM57U-bec3492a3e8f-72",
  },
  {
    id: "person-allison-mui",
    name: "Allison Mui",
    avatar: "https://ca.slack-edge.com/E01C4Q4H3CL-UM5EKD3T4-20805dd5fb50-72",
  },
  {
    id: "person-devanei-solai",
    name: "Devanei Solai",
    avatar: "https://ca.slack-edge.com/E01C4Q4H3CL-U03J9895X6E-582759c0f55a-72",
  },
  {
    id: "person-diancheng-hu",
    name: "Diancheng Hu",
    avatar: "https://ca.slack-edge.com/E01C4Q4H3CL-UQ6GD4HSB-9ea09802b7f9-72",
  },
  {
    id: "person-hsiutan-hsiao",
    name: "Hsiutan Hsiao",
    avatar: "https://ca.slack-edge.com/E01C4Q4H3CL-UK21ETEBF-ce66deac9b83-72",
  },
  {
    id: "person-will-perez",
    name: "Will Perez",
    avatar: "https://ca.slack-edge.com/E01C4Q4H3CL-U03K9J7NVGR-b89c4787928e-72",
  },
  {
    id: "person-yuchien-kao",
    name: "YuChien Kao",
    avatar: "https://ca.slack-edge.com/E01C4Q4H3CL-U03Q6F2U6KY-2d72f2be3e25-72",
  },
].sort((a, b) => a.name.localeCompare(b.name));

const scoreByIndex = [2, 4, 6, 8, 10];
const gen1PokemonNames = [
  "Bulbasaur",
  "Ivysaur",
  "Venusaur",
  "Charmander",
  "Charmeleon",
  "Charizard",
  "Squirtle",
  "Wartortle",
  "Blastoise",
  "Caterpie",
  "Metapod",
  "Butterfree",
  "Weedle",
  "Kakuna",
  "Beedrill",
  "Pidgey",
  "Pidgeotto",
  "Pidgeot",
  "Rattata",
  "Raticate",
  "Spearow",
  "Fearow",
  "Ekans",
  "Arbok",
  "Pikachu",
  "Raichu",
  "Sandshrew",
  "Sandslash",
  "Nidoran♀",
  "Nidorina",
  "Nidoqueen",
  "Nidoran♂",
  "Nidorino",
  "Nidoking",
  "Clefairy",
  "Clefable",
  "Vulpix",
  "Ninetales",
  "Jigglypuff",
  "Wigglytuff",
  "Zubat",
  "Golbat",
  "Oddish",
  "Gloom",
  "Vileplume",
  "Paras",
  "Parasect",
  "Venonat",
  "Venomoth",
  "Diglett",
  "Dugtrio",
  "Meowth",
  "Persian",
  "Psyduck",
  "Golduck",
  "Mankey",
  "Primeape",
  "Growlithe",
  "Arcanine",
  "Poliwag",
  "Poliwhirl",
  "Poliwrath",
  "Abra",
  "Kadabra",
  "Alakazam",
  "Machop",
  "Machoke",
  "Machamp",
  "Bellsprout",
  "Weepinbell",
  "Victreebel",
  "Tentacool",
  "Tentacruel",
  "Geodude",
  "Graveler",
  "Golem",
  "Ponyta",
  "Rapidash",
  "Slowpoke",
  "Slowbro",
  "Magnemite",
  "Magneton",
  "Farfetch'd",
  "Doduo",
  "Dodrio",
  "Seel",
  "Dewgong",
  "Grimer",
  "Muk",
  "Shellder",
  "Cloyster",
  "Gastly",
  "Haunter",
  "Gengar",
  "Onix",
  "Drowzee",
  "Hypno",
  "Krabby",
  "Kingler",
  "Voltorb",
  "Electrode",
  "Exeggcute",
  "Exeggutor",
  "Cubone",
  "Marowak",
  "Hitmonlee",
  "Hitmonchan",
  "Lickitung",
  "Koffing",
  "Weezing",
  "Rhyhorn",
  "Rhydon",
  "Chansey",
  "Tangela",
  "Kangaskhan",
  "Horsea",
  "Seadra",
  "Goldeen",
  "Seaking",
  "Staryu",
  "Starmie",
  "Mr. Mime",
  "Scyther",
  "Jynx",
  "Electabuzz",
  "Magmar",
  "Pinsir",
  "Tauros",
  "Magikarp",
  "Gyarados",
  "Lapras",
  "Ditto",
  "Eevee",
  "Vaporeon",
  "Jolteon",
  "Flareon",
  "Porygon",
  "Omanyte",
  "Omastar",
  "Kabuto",
  "Kabutops",
  "Aerodactyl",
  "Snorlax",
  "Articuno",
  "Zapdos",
  "Moltres",
  "Dratini",
  "Dragonair",
  "Dragonite",
  "Mewtwo",
  "Mew",
];

function ScaleBar({
  title,
  description,
  levels,
  showLabels = true,
  size = "default",
  value,
  onChange,
  trackClassName,
}: ScaleBarProps) {
  const [localValue, setLocalValue] = useState(2);
  const currentValue = value ?? localValue;
  const activeIndex = Math.min(levels.length - 1, Math.max(0, Math.round(currentValue)));
  const isCompact = size === "compact";

  const handleChange = (nextValue: number) => {
    if (onChange) {
      onChange(nextValue);
      return;
    }
    setLocalValue(nextValue);
  };

  return (
    <section className={`rounded-2xl bg-white ${isCompact ? "p-3" : "p-6"}`}>
      {(title || description) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
            {description && <p className="text-sm text-gray-500">{description}</p>}
          </div>
          <div className={`rounded-full bg-gray-100 px-4 py-1 text-sm text-gray-700 ${isCompact ? "text-xs" : ""}`}>
            <span className="font-semibold text-gray-900">{levels[activeIndex].label}</span>
          </div>
        </div>
      )}

      <div className={isCompact ? "mt-3" : "mt-6"}>
        <input
          type="range"
          min={0}
          max={levels.length - 1}
          step={0.01}
          value={currentValue}
          onChange={(event) => handleChange(Number(event.target.value))}
          className={`scale-input w-full accent-emerald-500 ${isCompact ? "scale-input--compact" : ""} ${trackClassName ?? ""}`}
          aria-label={`${title} scale`}
        />
        <div className="mt-2 grid grid-cols-5 items-center">
          {levels.map((level) => (
            <div key={`${title}-${level.label}`} className="flex justify-center">
              <div className="h-2 w-1 rounded-full bg-gray-300" />
            </div>
          ))}
        </div>
        {showLabels && (
          <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs font-medium text-gray-600">
            {levels.map((level) => (
              <div key={`${title}-${level.label}-label`}>{level.label}</div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function App() {
  const [personStates, setPersonStates] = useState(() =>
    people.map(() => ({ mood: 2, workload: 2 }))
  );
  const hasLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const lastSyncedRef = useRef<string>("");
  const hasFirebaseConfig = Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID
  );

  useEffect(() => {
    if (!hasFirebaseConfig) {
      hasLoadedRef.current = true;
      return;
    }
    const db = getFirebaseDb();
    const sharedRef = doc(db, "statuschecks", "shared");
    const unsubscribe = onSnapshot(sharedRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as { people?: { mood: number; workload: number }[] };
        if (Array.isArray(data.people) && data.people.length === people.length) {
          const next = data.people.map((person) => ({
            mood: typeof person.mood === "number" ? person.mood : 2,
            workload: typeof person.workload === "number" ? person.workload : 2,
          }));
          const nextSerialized = JSON.stringify(next);
          if (nextSerialized !== lastSyncedRef.current) {
            lastSyncedRef.current = nextSerialized;
            setPersonStates(next);
          }
        }
      }
      hasLoadedRef.current = true;
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (!hasFirebaseConfig) return;
    const serialized = JSON.stringify(personStates);
    if (serialized === lastSyncedRef.current) return;
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(async () => {
      const db = getFirebaseDb();
      const sharedRef = doc(db, "statuschecks", "shared");
      await setDoc(
        sharedRef,
        { people: personStates, updatedAt: serverTimestamp() },
        { merge: true }
      );
      lastSyncedRef.current = serialized;
    }, 600);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [personStates]);
  const totalScore = personStates.reduce((sum, person) => {
    const moodIndex = Math.min(4, Math.max(0, Math.round(person.mood)));
    const workloadIndex = Math.min(4, Math.max(0, Math.round(person.workload)));
    return sum + scoreByIndex[moodIndex] + scoreByIndex[workloadIndex];
  }, 0);
  const pokemonId = ((totalScore - 1) % 151) + 1;
  const pokemonName = gen1PokemonNames[pokemonId - 1] ?? "Unknown";

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
          background: #00ed64;
          border: 3px solid #ffffff;
          box-shadow: 0 6px 12px rgba(16, 185, 129, 0.35);
          cursor: pointer;
        }
        .scale-input::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #00ed64;
          border: 3px solid #ffffff;
          box-shadow: 0 6px 12px rgba(16, 185, 129, 0.35);
          cursor: pointer;
        }
        .scale-input--workload::-webkit-slider-thumb {
          background: #ffeea9;
          box-shadow: 0 6px 12px rgba(255, 238, 169, 0.35);
        }
        .scale-input--workload::-moz-range-thumb {
          background: #ffeea9;
          box-shadow: 0 6px 12px rgba(255, 238, 169, 0.35);
        }
        .scale-input::-moz-range-track {
          height: 10px;
          border-radius: 999px;
          background: #2f343b;
        }
        .scale-input--mood {
          background: linear-gradient(90deg, rgba(88, 10, 10, 0.98), rgba(88, 45, 8, 0.98), rgba(90, 66, 10, 0.98), rgba(12, 62, 26, 0.98), rgba(8, 58, 40, 0.98));
        }
        .scale-input--mood::-moz-range-track {
          background: linear-gradient(90deg, rgba(88, 10, 10, 0.98), rgba(88, 45, 8, 0.98), rgba(90, 66, 10, 0.98), rgba(12, 62, 26, 0.98), rgba(8, 58, 40, 0.98));
        }
        .scale-input--workload {
          background: linear-gradient(90deg, rgba(88, 10, 10, 0.98), rgba(24, 74, 40, 0.98), rgba(6, 58, 40, 0.98), rgba(24, 74, 40, 0.98), rgba(88, 10, 10, 0.98));
        }
        .scale-input--workload::-moz-range-track {
          background: linear-gradient(90deg, rgba(88, 10, 10, 0.98), rgba(24, 74, 40, 0.98), rgba(6, 58, 40, 0.98), rgba(24, 74, 40, 0.98), rgba(88, 10, 10, 0.98));
        }
        .scale-input--compact {
          height: 6px;
        }
        .scale-input--compact::-webkit-slider-thumb {
          width: 18px;
          height: 18px;
        }
        .scale-input--compact::-moz-range-thumb {
          width: 18px;
          height: 18px;
        }
        .scale-input--compact::-moz-range-track {
          height: 6px;
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

        <div className="grid gap-4 lg:grid-cols-2">
          <ScaleBar
            title="Mood"
            description="How are you feeling this week?"
            levels={moodLevels}
            trackClassName="scale-input--mood"
          />
          <ScaleBar
            title="Workload"
            description="How busy do you feel this week?"
            levels={workloadLevels}
            trackClassName="scale-input--workload"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {people.map((person, index) => (
            <section key={person.id} className="rounded-2xl bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={person.avatar}
                    alt={`${person.name} avatar`}
                    className="h-6 w-6 rounded-full object-cover"
                    loading="lazy"
                  />
                  <h2 className="text-xs font-semibold text-gray-900">{person.name}</h2>
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                  Status
                </span>
              </div>
              <div className="mt-2.5 flex flex-col gap-2">
                <ScaleBar
                  levels={moodLevels}
                  showLabels={false}
                  size="compact"
                  value={personStates[index].mood}
                  trackClassName="scale-input--mood"
                  onChange={(value) =>
                    setPersonStates((current) =>
                      current.map((state, idx) =>
                        idx === index ? { ...state, mood: value } : state
                      )
                    )
                  }
                />
                <ScaleBar
                  levels={workloadLevels}
                  showLabels={false}
                  size="compact"
                  value={personStates[index].workload}
                  trackClassName="scale-input--workload"
                  onChange={(value) =>
                    setPersonStates((current) =>
                      current.map((state, idx) =>
                        idx === index ? { ...state, workload: value } : state
                      )
                    )
                  }
                />
              </div>
            </section>
          ))}
          <section className="rounded-2xl bg-white p-3">
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-gray-900">Pokemon of the week</h2>
            </div>
            <div className="mt-3 flex flex-col items-center gap-2">
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`}
                alt={`Gen 1 Pokemon #${pokemonId}`}
                className="h-32 w-32"
                loading="lazy"
              />
              <div className="text-[10px] font-medium text-gray-500">
                #{pokemonId} {pokemonName}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;

