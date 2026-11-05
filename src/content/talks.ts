/**
 * Inspirational talks embedded via YouTube's privacy-enhanced player. Each
 * video ID was checked against several independent listings of the official
 * TED / Khan Academy uploads; the summaries are PD FinPrep's own words.
 */
export interface Talk {
  id: string; // YouTube video id
  title: string;
  speaker: string;
  source: string;
  minutes: number;
  why: string;
  url: string; // canonical page
}

export const TALKS: Talk[] = [
  {
    id: "H14bBuluwB8",
    title: "Grit: the power of passion and perseverance",
    speaker: "Angela Lee Duckworth",
    source: "TED",
    minutes: 6,
    why: "Why stamina over the long haul predicts success better than talent — exactly what a multi-month exam campaign demands.",
    url: "https://www.ted.com/talks/angela_lee_duckworth_grit_the_power_of_passion_and_perseverance",
  },
  {
    id: "_X0mgOOSpLU",
    title: "The power of believing that you can improve",
    speaker: "Carol Dweck",
    source: "TED",
    minutes: 10,
    why: "The growth mindset and the power of \"not yet\": treat a low practice score as a stage, not a verdict.",
    url: "https://www.ted.com/talks/carol_dweck_the_power_of_believing_that_you_can_improve",
  },
  {
    id: "arj7oStGLkU",
    title: "Inside the mind of a master procrastinator",
    speaker: "Tim Urban",
    source: "TED",
    minutes: 14,
    why: "A funny, honest look at procrastination — and why long projects without deadlines need a plan like yours.",
    url: "https://www.ted.com/talks/tim_urban_inside_the_mind_of_a_master_procrastinator",
  },
];

export const LECTURES: Talk[] = [
  {
    id: "733mgqrzNKs",
    title: "Time value of money",
    speaker: "Sal Khan",
    source: "Khan Academy",
    minutes: 8,
    why: "A friendly first look at why money today is worth more than money tomorrow — the idea behind every TVM question.",
    url: "https://www.khanacademy.org/economics-finance-domain/core-finance",
  },
];
