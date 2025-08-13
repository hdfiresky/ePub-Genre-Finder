
import { GENRE_KEYWORDS } from './genres';
import { TAG_KEYWORDS } from './tags';
import { GenreResult, TagResult, AnalysisResult, KeywordHit } from '../types';

// Declare JSZip for TypeScript, as it's loaded from a CDN in index.html.
declare var JSZip: any;

/**
 * Safely extracts plain text content from an HTML string by parsing it into a DOM document.
 * This is a crucial step to remove all HTML tags from the ePub content chapters
 * before performing text analysis.
 * @param {string} htmlString The raw HTML content of a chapter.
 * @returns {string} The extracted plain text, or an empty string if parsing fails.
 */
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
 * Escapes special characters in a string for safe use within a regular expression.
 * It also replaces the asterisk wildcard `*` with `\\w` to match a single word character (e.g., `wom*n` becomes `wom\\wn`).
 * This allows for more flexible keyword matching.
 * @param {string} str The raw keyword string to escape.
 * @returns {string} The escaped string, ready for use in a RegExp.
 */
const escapeRegex = (str: string): string => {
  // Escapes standard regex special characters.
  return str.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '\\w');
};

/**
 * The core analysis function. It takes an ePub file, unzips it, parses its structure,
 * extracts all text content from the chapters in reading order, and then analyzes
 * that text for keyword frequencies to determine genres and tags.
 * @param {File} file The ePub file to be analyzed.
 * @returns {Promise<AnalysisResult>} A promise that resolves to an object containing the analysis results.
 * @throws {Error} Throws an error if the ePub file is malformed or its content cannot be read.
 */
const analyzeEpub = async (file: File): Promise<AnalysisResult> => {
  // An ePub is a zip file, so we first load it with JSZip.
  const zip = await JSZip.loadAsync(file);
  // A fake base URL is used to correctly resolve relative paths within the epub archive.
  const FAKE_BASE = 'file:///';
  
  // Step 1: Find the path to the OPF (Open Packaging Format) file, which contains the book's metadata and structure.
  // This path is defined in META-INF/container.xml.
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

  // Step 2: Parse the OPF file to get the manifest (list of all files in the ePub) and the spine (the reading order of the content).
  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error(`OPF file not found at path: ${opfPath}`);
  const opfXmlStr = await opfFile.async('string');
  const opfDoc = xmlParser.parseFromString(opfXmlStr, 'application/xml');

  // Create a map of manifest item IDs to their file paths (href). We only care about HTML/XHTML files.
  const manifestItems: Record<string, string> = {};
  opfDoc.querySelectorAll('manifest item').forEach(item => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type');
    if (id && href && (mediaType?.includes('html') || mediaType?.includes('xhtml'))) {
        manifestItems[id] = href;
    }
  });

  // Get an array of item IDs from the spine, which defines the linear reading order.
  const spineRefs = Array.from(opfDoc.querySelectorAll('spine itemref')).map(item => item.getAttribute('idref'));
  
  // Step 3: Extract all text content from the files listed in the spine.
  let fullTextContent = '';
  const seenPaths = new Set<string>(); // Use a Set to avoid processing the same chapter file multiple times.

  for (const idref of spineRefs) {
    if (!idref) continue;
    const chapterHref = manifestItems[idref];
    if (!chapterHref) continue;

    // Resolve the relative path of the chapter file against the path of the OPF file.
    const resolvedUrl = new URL(chapterHref, new URL(opfPath, FAKE_BASE));
    const chapterFilePath = decodeURIComponent(resolvedUrl.pathname.substring(1).split('#')[0]);
    
    // If we've already processed this file path, skip it.
    if (seenPaths.has(chapterFilePath)) continue;
    seenPaths.add(chapterFilePath);

    const chapterFile = zip.file(chapterFilePath);
    if (chapterFile) {
      const chapterContent = await chapterFile.async('string');
      // Strip HTML tags and append the plain text to our full content string.
      fullTextContent += getHtmlTextContent(chapterContent) + ' ';
    }
  }

  if (!fullTextContent.trim()) {
    throw new Error("Could not extract any text content from the ePub spine files.");
  }
  
  // Step 4: Analyze the concatenated text content for genre keywords.
  const genreResults: GenreResult[] = [];
  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    const hits: Record<string, number> = {};
    let totalScore = 0;

    for (const keyword of keywords) {
      // Create a case-insensitive regex for the keyword, ensuring it matches whole words at the beginning (`\b`).
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

  // Step 5: Analyze the content for tag keywords, using the same logic as for genres.
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

  // Step 6: Aggregate all keyword hits from both genres and tags into a single list of top hits.
  const allHitsMap: Record<string, number> = {};
  for (const result of [...genreResults, ...tagResults]) {
      for (const [keyword, count] of Object.entries(result.hits)) {
          allHitsMap[keyword] = (allHitsMap[keyword] || 0) + count;
      }
  }
  const allHits: KeywordHit[] = Object.entries(allHitsMap)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count); // Sort by hit count descending.


  // Step 7: Sort genre and tag results by their total score, descending.
  genreResults.sort((a, b) => b.score - a.score);
  tagResults.sort((a, b) => b.score - a.score);

  // Return the complete analysis.
  return {
    genres: genreResults,
    tags: tagResults,
    allHits: allHits,
  };
};

/**
 * A service object that encapsulates and exposes the ePub analysis functionality.
 * This makes it easy to import and use in other parts of the application, like the main App component.
 */
export const epubProcessor = {
  analyze: analyzeEpub,
};
