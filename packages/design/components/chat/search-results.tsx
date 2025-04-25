import { FC } from 'react';

interface SearchResult {
  headline: string;
  title: string;
  url: string;
  description: string;
  rank: number;
}

interface SearchResultsProps {
  results: SearchResult[];
}

export const SearchResults: FC<SearchResultsProps> = ({ results }) => {
  if (!results.length) return null;

  return (
    <div className="w-full max-w-4xl space-y-2 mt-2">
      {results.map((result, i) => (
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          key={i}
          className="block bg-background border rounded-lg p-3 text-sm hover:bg-muted/50 transition-colors cursor-pointer"
        >
          <div className="space-y-1">
            <div className="font-medium text-foreground">{result.title}</div>
            <div className="text-xs text-muted-foreground truncate">
              {result.url}
            </div>
            <div className="text-muted-foreground">{result.description}</div>
          </div>
        </a>
      ))}
    </div>
  );
};
