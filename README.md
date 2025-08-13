# ePub Genre Finder

ePub Genre Finder is a client-side web application that analyzes the content of an `.epub` file to determine its most likely genre and associated tags. It works by scanning the text for keyword occurrences and scoring them against predefined lists for various categories.

## How It Works

The entire analysis process happens locally in your web browser. No files are ever uploaded to a server, ensuring your privacy.

1.  **File Unpacking**: When you upload an `.epub` file (which is essentially a ZIP archive), the application uses the `JSZip` library to read its contents in memory.
2.  **Content Parsing**: It first reads `META-INF/container.xml` to find the main `.opf` content file. The `.opf` file contains the book's manifest (a list of all files) and spine (the required reading order).
3.  **Text Extraction**: The application reads all XHTML/HTML files listed in the spine, parses the HTML to strip out tags, and concatenates the plain text content into a single block.
4.  **Keyword Analysis**: This block of text is then scanned for keywords defined for various genres (e.g., Fantasy, Sci-Fi) and tags (e.g., Magic System, Kingdom Building). The number of hits for each keyword is counted.
5.  **Scoring & Display**: The results are scored based on the total number of keyword hits for each category. The application then displays a ranked list of genres and tags, along with the specific keywords that were found.

## Features

-   **Drag & Drop or Click to Upload**: Easily select an `.epub` file from your computer.
-   **Client-Side Processing**: Fast, secure, and private analysis performed entirely in your browser.
-   **Detailed Genre Analysis**: See a ranked list of potential genres with hit counts.
-   **Tag Detection**: Discover specific tropes and themes present in the book.
-   **Keyword Breakdown**: View the top contributing keywords for each genre and tag.
-   **Overall Keyword Hits**: See a list of the most frequent keywords found across all categories.
-   **Responsive Design**: Works on both desktop and mobile devices.

## How to Use

1.  Open the web application in your browser.
2.  Drag and drop an `.epub` file onto the upload area, or click the area to open a file selector.
3.  Once a file is selected, click the "Analyze Genre" button.
4.  Wait for the analysis to complete. The results will appear below the button.

## Technology Stack

-   **Frontend**: [React](https://reactjs.org/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **ePub Unpacking**: [JSZip](https://stuk.github.io/jszip/)
