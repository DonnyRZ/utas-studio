export const normalize = (text: string) => text.normalize('NFKC').toLocaleLowerCase('id')
  .replace(/[^\p{L}\p{N}\p{Extended_Pictographic}]+/gu, ' ').trim();
export const length = (text: string) => [...text].length;
export const splitExamples = (input: string) => input.trim()
  .split(/\r?\n(?:[ \t]*\r?\n)+|\r?\n[ \t]*---[ \t]*\r?\n/u)
  .map((text) => text.trim()).filter(Boolean);

const segmenter = new Intl.Segmenter('id', { granularity: 'grapheme' });
export function metrics(text: string) {
  const emojis = [...segmenter.segment(text)].filter(({ segment }) =>
    /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(segment));
  return {
    characters: length(text), emojis: emojis.length,
    emojiPositions: emojis.map(({ index }) => index < text.length / 3 ? 'awal'
      : index < text.length * 2 / 3 ? 'tengah' : 'akhir'),
    sentences: text.split(/[.!?]+\s+|\n+/u).filter((part) => part.trim()).length,
  };
}

export function lexicalSimilarity(left: string, right: string) {
  const grams = (text: string) => {
    const words = normalize(text).split(' ').filter(Boolean);
    return new Set(words.slice(1).map((word, i) => `${words[i]} ${word}`));
  };
  const a = grams(left);
  const b = grams(right);
  let shared = 0;
  for (const gram of a) if (b.has(gram)) shared++;
  return shared / (a.size + b.size - shared || 1);
}
