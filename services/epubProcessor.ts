import { GENRE_KEYWORDS } from './genres';
import { TAG_KEYWORDS } from './tags';
import { GenreResult, TagResult, AnalysisResult, KeywordHit } from '../types';

// Declare JSZip for TypeScript, as it's loaded from a CDN in index.html.
declare var JSZip: any;

// Helper to safely extract plain text from an HTML string.
const getHtmlTextContent = (htmlString: string): string => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    return doc.body.textContent || "";
  } catch (e) {
    console.error("Error parsing HTML for text extraction", e);
    return "";
  }
};

/**
 * Escapes special characters in a string for use in a regular expression.
 * The asterisk '*' is replaced with '\w' to match a single word character.
 */
const escapeRegex = (str: string): string => {
  return str.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '\\w');
};

const analyzeEpub = async (file: File): Promise<AnalysisResult> => {
  const zip = await JSZip.loadAsync(file);
  // A fake base URL for resolving relative paths within the epub archive.
  const FAKE_BASE = 'file:///';
  
  // 1. Find OPF file path from container.xml
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new Error('META-INF/container.xml not found in epub.');
  const containerXmlStr = await containerFile.async('string');
  const xmlParser = new DOMParser();
  const containerDoc = xmlParser.parseFromString(containerXmlStr, 'application/xml');
  const rootfile = containerDoc.querySelector('rootfile');
  if (!rootfile || !rootfile.getAttribute('full-path')) {
    throw new Error('Could not find rootfile path in container.xml.');
  }
  const opfPath = rootfile.getAttribute('full-path')!;

  // 2. Parse OPF file to get manifest and spine
  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error(`OPF file not found at path: ${opfPath}`);
  const opfXmlStr = await opfFile.async('string');
  const opfDoc = xmlParser.parseFromString(opfXmlStr, 'application/xml');

  const manifestItems: Record<string, string> = {};
  opfDoc.querySelectorAll('manifest item').forEach(item => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type');
    if (id && href && (mediaType?.includes('html') || mediaType?.includes('xhtml'))) {
        manifestItems[id] = href;
    }
  });

  const spineRefs = Array.from(opfDoc.querySelectorAll('spine itemref')).map(item => item.getAttribute('idref'));
  
  // 3. Extract all text content from spine items
  let fullTextContent = '';
  const seenPaths = new Set<string>();

  for (const idref of spineRefs) {
    if (!idref) continue;
    const chapterHref = manifestItems[idref];
    if (!chapterHref) continue;

    const resolvedUrl = new URL(chapterHref, new URL(opfPath, FAKE_BASE));
    const chapterFilePath = decodeURIComponent(resolvedUrl.pathname.substring(1).split('#')[0]);
    
    if (seenPaths.has(chapterFilePath)) continue;
    seenPaths.add(chapterFilePath);

    const chapterFile = zip.file(chapterFilePath);
    if (chapterFile) {
      const chapterContent = await chapterFile.async('string');
      fullTextContent += getHtmlTextContent(chapterContent) + ' ';
    }
  }

  if (!fullTextContent.trim()) {
    throw new Error("Could not extract any text content from the ePub spine files.");
  }
  
  // 4. Analyze content for genres
  const genreResults: GenreResult[] = [];
  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    const hits: Record<string, number> = {};
    let totalScore = 0;

    for (const keyword of keywords) {
      const pattern = `\\b${escapeRegex(keyword)}`;
      const searchRegex = new RegExp(pattern, 'gi');
      const matches = fullTextContent.match(searchRegex);
      const count = matches ? matches.length : 0;
      
      if (count > 0) {
        hits[keyword] = count;
        totalScore += count;
      }
    }
    
    if (totalScore > 0) {
      genreResults.push({ genre, score: totalScore, hits });
    }
  }

  // 5. Analyze content for tags
  const tagResults: TagResult[] = [];
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    const hits: Record<string, number> = {};
    let totalScore = 0;
    for (const keyword of keywords) {
        const pattern = `\\b${escapeRegex(keyword)}`;
        const searchRegex = new RegExp(pattern, 'gi');
        const matches = fullTextContent.match(searchRegex);
        const count = matches ? matches.length : 0;
        if (count > 0) {
          hits[keyword] = count;
          totalScore += count;
        }
    }
    if (totalScore > 0) {
        tagResults.push({ tag, score: totalScore, hits });
    }
  }

  // 6. Aggregate all keyword hits
  const allHitsMap: Record<string, number> = {};
  for (const result of [...genreResults, ...tagResults]) {
      for (const [keyword, count] of Object.entries(result.hits)) {
          allHitsMap[keyword] = (allHitsMap[keyword] || 0) + count;
      }
  }
  const allHits: KeywordHit[] = Object.entries(allHitsMap)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count);


  // 7. Sort results by score descending
  genreResults.sort((a, b) => b.score - a.score);
  tagResults.sort((a, b) => b.score - a.score);

  return {
    genres: genreResults,
    tags: tagResults,
    allHits: allHits,
  };
};

export const epubProcessor = {
  analyze: analyzeEpub,
};