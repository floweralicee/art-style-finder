export const MUSEUM_PALETTES: Record<string, string[]> = {
  met:     ['#8B1A1A','#C9A84C','#2C4A7C','#F5F0E8','#3D3228'],
  moma:    ['#1a1a1a','#ffffff','#FF3333','#0033CC','#FFCC00'],
  chicago: ['#1B3A6B','#C8A96E','#8B3A3A','#F5F2EC','#4A6741'],
  rijks:   ['#C17B00','#1B2F5E','#8B4B3B','#F5EDD8','#3D5A3A'],
  va:      ['#2D5A1B','#8B6914','#4A1942','#F5F0E8','#1A3A6B'],
  harvard: ['#A41034','#1D2951','#8B7355','#F5F0E8','#2D4A2D'],
};

export const MOVEMENTS: Record<string, string[]> = {
  met:     ['Ancient & Classical', 'Renaissance', 'Baroque'],
  moma:    ['Modernism', 'Abstract Expressionism', 'Surrealism'],
  chicago: ['Impressionism', 'Post-Impressionism', 'American Realism'],
  rijks:   ['Dutch Golden Age', 'Baroque', 'Delft'],
  va:      ['Arts & Crafts', 'Art Nouveau', 'Victorian Design'],
  harvard: ['Bauhaus', 'Constructivism', 'Abstract'],
};

export const DESIGN_RECS: Record<string, {h: string; b: string}[]> = {
  met: [
    { h: 'Warm Antiquity', b: 'Deep burgundy + aged gold + cream. Heavy serif for headings. Textured, layered layouts with generous whitespace.' },
    { h: 'Gallery Minimal', b: 'White + one accent. Let the product image breathe like a painting. No unnecessary chrome.' },
  ],
  moma: [
    { h: 'Bauhaus Grid', b: 'Black + white + one primary color. Strict grid. Geometric sans-serif. Maximum contrast.' },
    { h: 'Neo-Brutalist', b: 'Bold typography-first layout. Asymmetric. Raw borders. Like a protest poster, but refined.' },
  ],
  chicago: [
    { h: 'Impressionist Warmth', b: 'Dusty rose + sage + warm ivory. Rounded, organic forms. Soft transitions. Feels like a Sunday afternoon.' },
    { h: 'American Craft', b: 'Earthy ochre + navy + cream. Slab serifs. Tactile textures. Honest, no-nonsense quality signals.' },
  ],
  rijks: [
    { h: 'Dutch Masters', b: 'Deep amber + prussian blue + ivory. Chiaroscuro light effects. Premium, heritage positioning.' },
    { h: 'Golden Age Commerce', b: 'Warm gold on dark. Clear hierarchy. Confidence. Think Dutch trading companies.' },
  ],
  va: [
    { h: 'Arts & Crafts Revival', b: 'Forest green + terracotta + cream. Botanical motifs. Hand-crafted feel. Artisan brand energy.' },
    { h: 'Victorian Elegance', b: 'Deep teal + antique gold. Ornamental details used sparingly. Maximalist but deliberate.' },
  ],
  harvard: [
    { h: 'Constructivist Logic', b: 'Red + black + white diagonal grids. Dynamic, angular energy. Assertive brand voice.' },
    { h: 'Academic Precision', b: 'Crimson + deep navy + cream. Authority without stuffiness. Research-grade credibility.' },
  ],
};

export const MUSEUMS = [
  { id: 'met',     name: 'The Metropolitan Museum', short: 'MET · NYC',          color: '#8B1A1A' },
  { id: 'chicago', name: 'Art Institute of Chicago', short: 'AIC · Chicago',     color: '#1B3A6B' },
  { id: 'rijks',   name: 'Rijksmuseum',              short: 'Rijks · Amsterdam', color: '#C17B00' },
];
