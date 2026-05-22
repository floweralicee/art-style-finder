export interface Artwork {
  id: string;
  title: string;
  artist: string;
  year: string;
  medium: string;
  image: string;
  museum: 'met' | 'rijks' | 'chicago';
  tags: string[];
}
