import quotes from './data/quotes.json';

export interface Quote {
  text: string;
  author: string;
  context?: string;
}

export const allQuotes: Quote[] = quotes;

export function randomQuote(random: () => number = Math.random): Quote {
  return allQuotes[Math.floor(random() * allQuotes.length)] ?? (allQuotes[0] as Quote);
}

export function attribution(q: Quote): string {
  return q.context ? `— ${q.author}, ${q.context}` : `— ${q.author}`;
}
