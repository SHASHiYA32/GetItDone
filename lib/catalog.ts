import type { Question, Service } from "./types.ts";

// Illustrative prices in LKR. Replace with researched market rates before launch.
const num = (key: string, label: string, o: Partial<Question>): Question => ({ key, label, type: "number", min: 0, max: 100, initial: o.included ?? 0, ...o });
const yes = (key: string, label: string, o: Partial<Question> = {}): Question => ({ key, label, type: "yesno", initial: false, ...o });
const pick = (key: string, label: string, options: NonNullable<Question["options"]>): Question => ({ key, label, type: "choice", options, initial: options[0].value });

const size = (included: number, labour: number, material: number) =>
  num("size", "Approximate area", { unit: "sq ft", min: 20, max: 10000, included, labour, material });
const work = pick("work", "New installation or replacement?", [
  { value: "new", label: "New installation" }, { value: "replace", label: "Replacement", pct: 10 },
]);
const built = pick("built", "Is the building already built?", [
  { value: "yes", label: "Yes, already built" }, { value: "no", label: "Still under construction", pct: -5 },
]);
const floors = num("floors", "Number of floors", { min: 1, max: 6, included: 1, labour: 15000, material: 10000, minutes: 480 });
const quality = pick("grade", "Material grade", [
  { value: "standard", label: "Standard" }, { value: "premium", label: "Premium", pct: 25 },
]);
const urgent = yes("urgent", "Is it urgent (within 24 hours)?", { labour: 1500 });

const s = (id: string, category: string, name: string, labour: number, material: number, minutes: number, questions: Question[]): Service =>
  ({ id, category, name, labour, material, minutes, questions });

export const CATEGORIES = [
  { id: "electrical", name: "Electrical", blurb: "Wiring, repairs, lights and fans" },
  { id: "plumbing", name: "Plumbing", blurb: "Pipes, leaks and fittings" },
  { id: "construction", name: "Construction", blurb: "Building, renovation, masonry" },
  { id: "painting", name: "Painting", blurb: "Inside and outside walls" },
  { id: "carpentry", name: "Carpentry", blurb: "Furniture, doors, cupboards" },
  { id: "ac", name: "AC services", blurb: "Install, service, repair" },
  { id: "maintenance", name: "Home maintenance", blurb: "Everyday household repairs" },
];

export const SERVICES: Service[] = [
  s("new-wiring", "electrical", "New wiring", 6000, 4000, 240, [
    size(120, 15, 10),
    num("points", "Electrical points", { included: 4, labour: 600, material: 400, minutes: 30 }),
    num("switches", "Switches", { included: 3, labour: 250, material: 350, minutes: 15 }),
    num("fixtures", "Lights and fans to install", { included: 2, labour: 500, minutes: 20 }),
    work, built,
  ]),
  s("electrical-repair", "electrical", "Electrical repair", 2500, 500, 60, [
    num("faults", "How many faults?", { min: 1, max: 20, included: 1, labour: 900, material: 300, minutes: 30 }),
    yes("breaker", "Does the main breaker keep tripping?", { labour: 1500, minutes: 45 }), urgent,
  ]),
  s("lights-fans", "electrical", "Lights and fans", 2000, 300, 60, [
    num("fixtures", "Lights and fans to install", { min: 1, included: 2, labour: 500, material: 100, minutes: 25 }), work,
  ]),
  s("pipe-repair", "plumbing", "Pipe and leak repair", 2500, 800, 60, [
    num("leaks", "Leaks or blocked points", { min: 1, max: 20, included: 1, labour: 1000, material: 500, minutes: 30 }),
    yes("concealed", "Is the pipe inside a wall or floor?", { labour: 3000, material: 1500, minutes: 120 }), urgent,
  ]),
  s("plumbing-install", "plumbing", "Plumbing installation", 4000, 2500, 180, [
    num("fittings", "Taps, basins or toilets", { min: 1, max: 30, included: 1, labour: 1500, material: 800, minutes: 60 }), work, built,
  ]),
  s("building", "construction", "New building work", 60000, 90000, 2400, [size(200, 450, 700), floors, quality]),
  s("renovation", "construction", "Renovation", 25000, 20000, 960, [size(120, 220, 250), floors, quality,
    yes("demolish", "Is any demolition needed?", { labour: 12000, minutes: 480 })]),
  s("masonry", "construction", "Masonry", 8000, 6000, 360, [size(100, 90, 110), quality]),
  s("interior-paint", "painting", "Interior painting", 5000, 4000, 360, [size(200, 30, 25),
    num("coats", "Coats of paint", { min: 1, max: 4, included: 2, labour: 2000, material: 1800, minutes: 150 }), quality]),
  s("exterior-paint", "painting", "Exterior painting", 8000, 7000, 480, [size(300, 38, 32), floors, quality]),
  s("furniture", "carpentry", "Furniture repair", 3000, 1000, 120, [
    num("items", "Pieces to repair", { min: 1, max: 30, included: 1, labour: 1500, material: 500, minutes: 60 })]),
  s("doors-cupboards", "carpentry", "Doors and cupboards", 7000, 9000, 360, [
    num("items", "Doors or cupboards", { min: 1, max: 30, included: 1, labour: 4000, material: 6000, minutes: 240 }), quality]),
  s("ac-install", "ac", "AC installation", 8000, 4500, 240, [
    num("units", "AC units", { min: 1, max: 12, included: 1, labour: 6000, material: 3500, minutes: 180 }),
    pick("capacity", "Unit capacity", [{ value: "12k", label: "Up to 12,000 BTU" }, { value: "18k", label: "18,000 BTU", pct: 12 }, { value: "24k", label: "24,000 BTU or more", pct: 22 }])]),
  s("ac-service", "ac", "AC service and repair", 3500, 500, 90, [
    num("units", "AC units", { min: 1, max: 20, included: 1, labour: 2500, material: 400, minutes: 60 }),
    yes("cooling", "Has it stopped cooling?", { labour: 2000, material: 1500, minutes: 60 })]),
  s("handyman", "maintenance", "General repairs", 2500, 500, 90, [
    num("tasks", "Number of small jobs", { min: 1, max: 20, included: 1, labour: 1000, material: 300, minutes: 45 }), urgent]),
];

export const CITIES: Record<string, [number, number]> = {
  Colombo: [6.9271, 79.8612], Dehiwala: [6.8402, 79.8712], Nugegoda: [6.8649, 79.8997], Maharagama: [6.848, 79.9265],
  Kaduwela: [6.9333, 79.9833], Moratuwa: [6.773, 79.8816], Negombo: [7.2083, 79.8358], Gampaha: [7.0873, 80.0144],
  Kalutara: [6.5854, 79.9607], Kandy: [7.2906, 80.6337], Kurunegala: [7.4863, 80.3623], Galle: [6.0535, 80.221],
  Matara: [5.9549, 80.555], Anuradhapura: [8.3114, 80.4037], Jaffna: [9.6615, 80.0255], Batticaloa: [7.731, 81.6747],
};
