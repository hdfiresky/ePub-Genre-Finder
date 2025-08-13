export enum ProcessingState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface GenreResult {
  genre: string;
  score: number;
  hits: Record<string, number>;
}

export interface TagResult {
  tag: string;
  score: number;
  hits: Record<string, number>;
}

export interface KeywordHit {
  keyword: string;
  count: number;
}

export interface AnalysisResult {
  genres: GenreResult[];
  tags: TagResult[];
  allHits: KeywordHit[];
}