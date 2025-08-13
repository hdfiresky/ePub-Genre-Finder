
import React, { useState, useCallback } from 'react';
import { FileUpload } from './FileUpload';
import { epubProcessor } from '../services/epubProcessor';
import { ProcessingState, GenreResult, TagResult, KeywordHit } from '../types';
import { ExclamationCircleIcon } from './Icons';

/**
 * The main application component. It manages the application's state,
 * including the selected file, processing status, and analysis results.
 * It orchestrates the UI and handles the entire analysis workflow.
 * @returns {React.FC} The rendered App component.
 */
const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.IDLE);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [genreResults, setGenreResults] = useState<GenreResult[]>([]);
  const [tagResults, setTagResults] = useState<TagResult[]>([]);
  const [allHits, setAllHits] = useState<KeywordHit[]>([]);
  
  /**
   * Resets the analysis-related state to its initial default values.
   * This is used to clear previous results when a new file is selected or before a new analysis begins.
   * Encapsulated in useCallback to ensure the function reference is stable across re-renders.
   */
  const resetState = useCallback(() => {
    setProcessingState(ProcessingState.IDLE);
    setStatusMessage('');
    setGenreResults([]);
    setTagResults([]);
    setAllHits([]);
  }, []);

  /**
   * Handles the selection of a new file from the FileUpload component.
   * It updates the file state and resets all other state variables to prepare for a new analysis.
   * @param {File} selectedFile The file chosen by the user.
   */
  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    resetState();
  }, [resetState]);

  /**
   * Initiates the ePub file analysis process.
   * This function is triggered by the "Analyze Genre" button. It handles setting the loading state,
   * invoking the epubProcessor service, and updating the state with either the successful results or an error message.
   */
  const handleProcess = useCallback(async () => {
    if (!file) {
      setStatusMessage('Please select an ePub file to analyze.');
      setProcessingState(ProcessingState.ERROR);
      return;
    }

    // Set the app to a processing state and provide feedback to the user.
    setProcessingState(ProcessingState.PROCESSING);
    setStatusMessage('Analyzing ePub... this may take a moment.');
    setGenreResults([]);
    setTagResults([]);
    setAllHits([]);

    try {
      // The core analysis is delegated to the epubProcessor service.
      const results = await epubProcessor.analyze(file);
      setGenreResults(results.genres);
      setTagResults(results.tags);
      setAllHits(results.allHits);
      setProcessingState(ProcessingState.SUCCESS);
      setStatusMessage('Analysis complete!');
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setStatusMessage(`Error: ${errorMessage}`);
      setProcessingState(ProcessingState.ERROR);
    }
  }, [file]);
  
  // Calculate top scores for normalizing progress bar widths.
  const topGenreScore = genreResults.length > 0 ? genreResults[0].score : 0;
  const topTagScore = tagResults.length > 0 ? tagResults[0].score : 0;
  // Calculate total score to check if any keywords were found at all.
  const totalScore = genreResults.reduce((sum, result) => sum + result.score, 0) + tagResults.reduce((sum, result) => sum + result.score, 0);

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">ePub Genre Finder</h1>
          <p className="mt-2 text-lg text-gray-600">Discover the genre and tags of your web novels and e-books.</p>
        </header>

        <main className="bg-white p-8 rounded-xl shadow-lg space-y-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Upload your ePub file</h2>
              <FileUpload onFileSelect={handleFileSelect} selectedFile={file} />
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <button
              onClick={handleProcess}
              disabled={!file || processingState === ProcessingState.PROCESSING}
              className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {processingState === ProcessingState.PROCESSING ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : 'Analyze Genre'}
            </button>
          </div>
          
          {/* Display status or error messages, but not on success, as results are shown instead. */}
          {(statusMessage && processingState !== ProcessingState.SUCCESS) && (
            <div className={`mt-4 p-4 rounded-md text-sm ${
              processingState === ProcessingState.ERROR ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'
            }`}>
              <div className="flex items-center">
                {processingState === ProcessingState.ERROR && <ExclamationCircleIcon />}
                <p>{statusMessage}</p>
              </div>
            </div>
          )}

          {/* This block renders the analysis results only when processing is successful. */}
          {processingState === ProcessingState.SUCCESS && (
             <div className="mt-4 divide-y divide-gray-200">
                 {/* Genre results section */}
                 {genreResults.filter(r => r.score > 0).length > 0 && (
                    <div className="py-6">
                        <h3 className="text-xl font-semibold text-gray-700 mb-4">Genre Analysis</h3>
                        <div className="space-y-4">
                            {genreResults.filter(r => r.score > 0).map((result, index) => (
                               <div key={result.genre} className="w-full">
                                   <div className="flex justify-between mb-1">
                                       <span className="text-base font-medium text-indigo-700">{index + 1}. {result.genre}</span>
                                       <span className="text-sm font-medium text-indigo-700">{result.score} hits</span>
                                   </div>
                                   <div className="w-full bg-gray-200 rounded-full h-2.5">
                                       {/* The width of the bar is relative to the top-scoring genre. */}
                                       <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${topGenreScore > 0 ? (result.score / topGenreScore) * 100 : 0}%` }}></div>
                                   </div>
                                   <div className="mt-2 flex flex-wrap gap-1">
                                       {/* Display top 5 keywords for this genre */}
                                       {Object.entries(result.hits)
                                           .sort(([, countA], [, countB]) => countB - countA)
                                           .slice(0, 5)
                                           .map(([keyword, count]) => (
                                               <span key={keyword} className="px-2 py-0.5 text-xs font-medium text-indigo-800 bg-indigo-100 rounded-full">
                                                   {keyword} ({count})
                                               </span>
                                           ))
                                       }
                                   </div>
                               </div>
                            ))}
                        </div>
                    </div>
                 )}

                 {/* Tags results section */}
                 {tagResults.filter(t => t.score > 0).length > 0 && (
                    <div className="py-6">
                        <h3 className="text-xl font-semibold text-gray-700 mb-4">Detected Tags</h3>
                        <div className="space-y-4">
                            {tagResults.filter(r => r.score > 0).map(result => (
                               <div key={result.tag} className="w-full">
                                   <div className="flex justify-between mb-1">
                                       <span className="text-base font-medium text-indigo-700">{result.tag}</span>
                                       <span className="text-sm font-medium text-indigo-700">{result.score} hits</span>
                                   </div>
                                   <div className="w-full bg-gray-200 rounded-full h-2.5">
                                       {/* The width of the bar is relative to the top-scoring tag. */}
                                       <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${topTagScore > 0 ? (result.score / topTagScore) * 100 : 0}%` }}></div>
                                   </div>
                                   <div className="mt-2 flex flex-wrap gap-1">
                                       {/* Display top 5 keywords for this tag */}
                                       {Object.entries(result.hits)
                                           .sort(([, countA], [, countB]) => countB - countA)
                                           .slice(0, 5)
                                           .map(([keyword, count]) => (
                                               <span key={keyword} className="px-2 py-0.5 text-xs font-medium text-indigo-800 bg-indigo-100 rounded-full">
                                                   {keyword} ({count})
                                               </span>
                                           ))
                                       }
                                   </div>
                               </div>
                            ))}
                        </div>
                    </div>
                 )}
                 
                 {/* Overall keyword hits section */}
                 {allHits.length > 0 && (
                    <div className="py-6">
                        <h3 className="text-xl font-semibold text-gray-700 mb-4">Overall Top 50 Keyword Hits</h3>
                         <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                            {allHits.slice(0, 50).map(hit => (
                                <li key={hit.keyword} className="flex justify-between items-center py-1 text-sm border-b border-gray-100">
                                    <span className="font-medium text-gray-700 truncate" title={hit.keyword}>{hit.keyword}</span>
                                    <span className="font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md ml-3 flex-shrink-0">{hit.count}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                 )}

                 {/* Fallback message if analysis is complete but no keywords were found. */}
                 {totalScore === 0 && (
                     <div className="py-6">
                         <div className="p-4 rounded-md text-sm bg-yellow-50 text-yellow-800">
                             <p>Analysis complete, but no matching genre or tag keywords were found in this ePub.</p>
                         </div>
                     </div>
                 )}
             </div>
          )}
        </main>
        <footer className="text-center mt-8 text-sm text-gray-500">
            <p>Powered by React & JSZip. All processing is done in your browser.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
