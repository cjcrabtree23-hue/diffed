import type { Template } from "@/lib/types";

/**
 * Sample templates for the MVP. In production these come from the database,
 * built from catalog APIs (TMDB, IGDB, AniList) with attribution.
 * `community` values are SAMPLE data (tier index 0 = True Peak … 5 = Never Peak).
 */
export const TEMPLATES: Template[] = [
  {
    slug: "anime-of-the-2010s",
    title: "Anime of the 2010s",
    category: "Anime",
    source: "Sample catalog",
    items: [
      {
        id: "aot",
        name: "Attack on Titan",
        quiz: [
          {
            prompt: "Which branch of the military guards the Walls from the inside?",
            options: ["Survey Corps", "Garrison Regiment", "Military Police", "Training Corps"],
            answer: 1,
          },
          {
            prompt: "What is the name of the outermost Wall?",
            options: ["Wall Rose", "Wall Sina", "Wall Maria", "Wall Shiganshina"],
            answer: 2,
          },
          {
            prompt: "Which district is Eren from?",
            options: ["Trost", "Shiganshina", "Stohess", "Karanes"],
            answer: 1,
          },
          {
            prompt: "Who is raised alongside Eren as part of his family?",
            options: ["Annie Leonhart", "Sasha Blouse", "Mikasa Ackerman", "Historia Reiss"],
            answer: 2,
          },
          {
            prompt: "What equipment lets soldiers swing through the air?",
            options: ["Omni-directional mobility gear", "Wing harness", "Sky hooks", "Wall climbers"],
            answer: 0,
          },
        ],
      },
      {
        id: "steins-gate",
        name: "Steins;Gate",
        quiz: [
          {
            prompt: "What does Okabe call his alter ego?",
            options: ["Hououin Kyouma", "Kyouma Rintaro", "The Mad Professor", "Daru"],
            answer: 0,
          },
          {
            prompt: "What is the lab's accidental time-travel device?",
            options: ["The Divergence Meter", "The Phone Microwave", "The IBN 5100", "The Time Leap Box"],
            answer: 1,
          },
          {
            prompt: "Which organization is the main antagonist?",
            options: ["NERV", "SERN", "Rounders", "Viktor Chondria"],
            answer: 1,
          },
          {
            prompt: "What is Mayuri's signature greeting?",
            options: ["Nyan nyan", "Tutturu", "El Psy Kongroo", "Ohayo"],
            answer: 1,
          },
          {
            prompt: "What is Okabe's lab called?",
            options: ["Future Gadget Laboratory", "Akihabara Science Club", "Time Lab 1", "Lab Mem HQ"],
            answer: 0,
          },
        ],
      },
      { id: "mob-psycho", name: "Mob Psycho 100" },
      { id: "hxh", name: "Hunter x Hunter" },
      { id: "vinland", name: "Vinland Saga" },
      { id: "demon-slayer", name: "Demon Slayer" },
      { id: "made-in-abyss", name: "Made in Abyss" },
      { id: "haikyu", name: "Haikyu!!" },
      { id: "mha", name: "My Hero Academia" },
      { id: "dr-stone", name: "Dr. Stone" },
      { id: "fire-force", name: "Fire Force" },
      { id: "opm", name: "One Punch Man" },
      { id: "erased", name: "Erased" },
      { id: "your-lie", name: "Your Lie in April" },
      { id: "tokyo-ghoul", name: "Tokyo Ghoul" },
      { id: "promised-neverland", name: "The Promised Neverland" },
    ],
    community: {
      aot: 0, "steins-gate": 0, "mob-psycho": 1, hxh: 0, vinland: 1, "demon-slayer": 2,
      "made-in-abyss": 1, haikyu: 1, mha: 2, "dr-stone": 2, "fire-force": 3, opm: 1,
      erased: 2, "your-lie": 1, "tokyo-ghoul": 3, "promised-neverland": 2,
    },
  },
  {
    slug: "every-pixar-movie",
    title: "Every Pixar movie",
    category: "Movies",
    source: "Sample catalog",
    items: [
      "Toy Story", "A Bug's Life", "Toy Story 2", "Monsters, Inc.", "Finding Nemo", "The Incredibles",
      "Cars", "Ratatouille", "WALL·E", "Up", "Toy Story 3", "Cars 2", "Brave", "Monsters University",
      "Inside Out", "The Good Dinosaur", "Finding Dory", "Cars 3", "Coco", "Incredibles 2",
      "Toy Story 4", "Onward", "Soul", "Luca", "Turning Red", "Lightyear", "Elemental",
    ].map((name) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""), name })),
    community: {
      "toy-story": 0, "a-bug-s-life": 3, "toy-story-2": 2, "monsters-inc": 1, "finding-nemo": 1,
      "the-incredibles": 1, cars: 3, ratatouille: 0, "wall-e": 0, up: 0, "toy-story-3": 1,
      "cars-2": 5, brave: 3, "monsters-university": 2, "inside-out": 0, "the-good-dinosaur": 4,
      "finding-dory": 2, "cars-3": 4, coco: 1, "incredibles-2": 2, "toy-story-4": 2, onward: 3,
      soul: 2, luca: 2, "turning-red": 2, lightyear: 4, elemental: 3,
    },
  },
];

export function getTemplate(slug: string): Template | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}
