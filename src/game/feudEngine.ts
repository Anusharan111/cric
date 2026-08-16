export function normalizeAnswer(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/**
 * Checks if a typed guess matches one of the answers for the question.
 * Supports smart matching like checking if the guess is a substring of the answer
 * or contains the same words.
 */
export function matchGuess(guess: string, answerText: string): boolean {
  const g = guess.toLowerCase().trim();
  const a = answerText.toLowerCase().trim();
  if (!g) return false;
  if (g === a) return true;

  const cleanG = normalizeAnswer(g);
  const cleanA = normalizeAnswer(a);
  if (cleanG === cleanA) return true;

  // Split into words
  const wordsA = cleanA.split(/\s+/);
  const wordsG = cleanG.split(/\s+/);

  // If the guess is a single word, check if it's one of the main words in the answer
  // (Ignoring common short words like "of", "the", "a", "in")
  const stopWords = ["the", "of", "and", "in", "to", "a", "for", "on", "at", "de"];
  if (wordsG.length === 1 && cleanG.length >= 3) {
    if (wordsA.includes(cleanG) && !stopWords.includes(cleanG)) {
      return true;
    }
  }

  // Substring check
  if (cleanG.length >= 3) {
    if (cleanA.includes(cleanG) || cleanG.includes(cleanA)) {
      return true;
    }
  }

  return false;
}

/**
 * Returns the index of the matching answer, or -1 if no match is found.
 * Already revealed answers are not matched.
 */
export function checkGuess(
  guess: string,
  answers: { text: string; points: number }[],
  revealedIndices: number[]
): number {
  for (let i = 0; i < answers.length; i++) {
    if (revealedIndices.includes(i)) continue;
    if (matchGuess(guess, answers[i].text)) {
      return i;
    }
  }
  return -1;
}
