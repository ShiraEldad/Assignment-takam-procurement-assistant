import { instructions } from "./knowledge.js";

const stopWords = new Set([
  "איך",
  "האם",
  "הוא",
  "היא",
  "ומה",
  "של",
  "על",
  "את",
  "מה",
  "מי",
  "עם",
  "זה",
  "זו",
  "זהו",
  "יש",
  "לגבי",
  "עבור",
  "מידע",
  "הוראה",
  "הוראות",
  "תכם",
  "the",
  "a",
  "an",
  "is",
  "of",
  "to",
]);

const hebrewPrefixes = ["ו", "ה", "ב", "ל", "מ", "כ", "ש"];

function normalize(value) {
  return value
    .toLocaleLowerCase("he")
    .replace(/[״׳"'.,!?():;־–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandToken(token) {
  const variants = new Set([token]);
  const remainingPrefixes = [...hebrewPrefixes];

  while (remainingPrefixes.length > 0) {
    const prefix = remainingPrefixes.shift();
    if (!token.startsWith(prefix) || token.length < 4) continue;

    const withoutPrefix = token.slice(1);
    variants.add(withoutPrefix);
    token = withoutPrefix;
    remainingPrefixes.unshift(...hebrewPrefixes);
  }

  return variants;
}

function tokenize(value) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 1)
    .map((token) =>
      [...expandToken(token)].filter(
        (variant) => variant.length > 1 && !stopWords.has(variant),
      ),
    )
    .filter((variants) => variants.length > 0);
}

function collectTokens(value) {
  return new Set(tokenize(value).flat());
}

function scoreInstruction(question, instruction) {
  const questionText = normalize(question);
  const questionTokenGroups = tokenize(question);
  const titleTokens = collectTokens(instruction.title);
  const searchableTokens = collectTokens(
    `${instruction.chapter} ${instruction.subchapter} ${instruction.keywords.join(" ")}`,
  );
  let score = 0;

  for (const variants of questionTokenGroups) {
    if (variants.some((token) => titleTokens.has(token))) {
      score += 4;
    } else if (variants.some((token) => searchableTokens.has(token))) {
      score += 2;
    }
  }

  const compactQuestion = questionText.replace(/\s/g, "");
  const compactInstructionId = instruction.id.replace(/\./g, "");
  if (compactQuestion.includes(compactInstructionId)) {
    score += 20;
  }

  return score;
}

export function searchInstructions(question) {
  return instructions
    .map((instruction) => ({
      instruction,
      score: scoreInstruction(question, instruction),
    }))
    .filter((result) => result.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, 3)
    .map(({ instruction, score }) => ({ ...instruction, score }));
}
