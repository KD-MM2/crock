const WORDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima'];

export function generateCodePhrase() {
  const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)];
  const number = Math.floor(Math.random() * 90 + 10);
  return `${pick()}-${number}-${pick()}`;
}
