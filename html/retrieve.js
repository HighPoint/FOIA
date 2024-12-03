// Element references
const uploadButton = document.getElementById('uploadButton');
const checkCropmarksButton = document.getElementById('checkCropmarksButton');
const processFileButton = document.getElementById('processFileButton');
const agencyInput = document.getElementById('agencyInput');
const agencyList = document.getElementById('agencyList');
const getUrlButton = document.getElementById('getUrlButton');
const urlInput = document.getElementById('urlInput');
const urlIframe = document.getElementById('urlIframe');
const spinner = document.getElementById('spinner');
const pdfFilesDiv = document.getElementById('pdfFiles');
const xlsxFilesDiv = document.getElementById('xlsxFiles');
const csvFilesDiv = document.getElementById('csvFiles');

let selectedAgency = null;
let globalAgencyNames = [];
let globalModifiedAgencyNames = [];
let uploadedPdfFileName = null;
let globalAgencyUrls = [];

// Initialize the application on DOM load
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
});

async function initializeApp() {
    try {
        await loadAgencyData();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        alert('Failed to load agency names.');
    }
}

// Load agency names from AWS Lambda
async function loadAgencyData() {
    const data = await fetchAgencyNames();
    globalAgencyNames = data.agency_names || [];
    globalModifiedAgencyNames = data.modified_agency_names || [];
    globalAgencyUrls = data.url || [];
    populateAgencyList(globalAgencyNames);
}

// Fetch agency names from AWS Lambda
async function fetchAgencyNames() {
    const lambdaUrl = 'https://wcd32bsbsobm65qvfydaesikgi0uaydn.lambda-url.us-east-1.on.aws/';
    const response = await fetch(lambdaUrl);
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Data from Lambda:', data);
    return data;
}

function populateAgencyList(agencies) {
    agencyList.innerHTML = '';
    agencyList.selectedIndex = -1; // Reset selection
    agencies.forEach(agency => {
        const option = document.createElement('option');
        option.value = agency;
        option.textContent = agency;
        agencyList.appendChild(option);
    });

    adjustAgencyListSize(agencies.length);
}

// Adjust the size and overflow of the agency list
function adjustAgencyListSize(length) {
    agencyList.size = Math.min(length, 10);
    agencyList.style.overflowY = length > 10 ? 'scroll' : 'auto';
}

// Event listeners
agencyInput.addEventListener('input', handleAgencyInput);
agencyList.addEventListener('change', handleAgencySelection);
agencyList.addEventListener('mousedown', handleAgencySelection);
urlInput.addEventListener('focus', clearNoUrlPlaceholder);
getUrlButton.addEventListener('click', handleGetUrlClick);


// Handle agency input for search

function handleAgencyInput() {
    console.log('handleAgencyInput called');
    
    const filter = agencyInput.value.toLowerCase();
    const matchingAgencies = globalAgencyNames.filter(agency =>
        agency.toLowerCase().includes(filter)
    );
    populateAgencyList(matchingAgencies);
    agencyList.style.display = matchingAgencies.length > 0 ? 'block' : 'none';
}

function handleAgencySelection(event) {
  console.log('handleAgencySelection called');
  console.log('Event type:', event.type);
  console.log('Selected index:', agencyList.selectedIndex);
  console.log('Selected value:', agencyList.value);

  selectedAgency = agencyList.value;
  agencyInput.value = selectedAgency;
  agencyList.style.display = 'none';
  updateUrlInputForSelectedAgency();
}

// Update the URL input based on the selected agency
function updateUrlInputForSelectedAgency() {
    const index = globalAgencyNames.indexOf(selectedAgency);
    if (index !== -1 && globalAgencyUrls[index]) {
        let agencyUrl = globalAgencyUrls[index];
        agencyUrl = stripUrlScheme(agencyUrl);
        urlInput.value = agencyUrl;
    } else {
        urlInput.value = 'No url';
    }
}

// Strip 'http://' or 'https://' from a URL
function stripUrlScheme(url) {
    return url.replace(/^https?:\/\//i, '');
}

// Clear 'No url' placeholder when URL input is focused
function clearNoUrlPlaceholder() {
    if (urlInput.value === 'No url') {
        urlInput.value = '';
    }
}

// Handle 'Get URL' button click
async function handleGetUrlClick() {
    const urlValue = urlInput.value.trim();
    if (urlValue && urlValue !== 'No url') {
        alert('Fetching URL: ' + urlValue);
        console.log('Requesting URL:', urlValue);
        spinner.style.display = 'block';
        try {
            const data = await fetchPageContent(urlValue);
            updateIframeContent(data);
            handleIframeHyperlinkClicks();
        } catch (error) {
            console.error('Error fetching URL:', error);
            alert('Failed to retrieve the URL.');
            spinner.style.display = 'none';
        }
    } else {
        alert('Please enter a valid URL.');
    }
}

// Fetch page content via AWS Lambda
async function fetchPageContent(url) {
    const response = await fetch('https://senrj7syxt634nv4ghg5l76g4q0btyux.lambda-url.us-east-1.on.aws/', {
        method: 'POST',
        body: JSON.stringify({ url: url }),
        headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.text();
    console.log('AWS Lambda response:', data);
    return injectBackgroundStyleIfMissing(data);
}

// Inject a white background style if missing
function injectBackgroundStyleIfMissing(htmlContent) {
    const hasBodyBackgroundStyle = /<style>[\s\S]*body\s*{[^}]*background-color\s*:/i.test(htmlContent);
    if (!hasBodyBackgroundStyle) {
        return `<style>body { background-color: white; }</style>` + htmlContent;
    }
    return htmlContent;
}

// Update the iframe with fetched content
function updateIframeContent(data) {
    urlIframe.srcdoc = data;
}

// Handle hyperlink clicks inside the iframe
function handleIframeHyperlinkClicks() {
    urlIframe.addEventListener('load', () => {
        spinner.style.display = 'none';
        const iframeDoc = getIframeDocument();
        addHyperlinkClickListener(iframeDoc);
        displayFilesInIframe(iframeDoc);
    });
}

// Get the iframe's document
function getIframeDocument() {
    return urlIframe.contentDocument || urlIframe.contentWindow.document;
}

// Add click listener for hyperlinks inside the iframe
function addHyperlinkClickListener(iframeDoc) {
    iframeDoc.addEventListener('click', function (e) {
        const link = e.target.closest('a');
        if (link) {
            const clickedUrl = link.href;
            console.log('Clicked hyperlink:', clickedUrl);
            urlInput.value = clickedUrl;
        }
    });
}

// Display files (PDFs, XLSX, CSV) found in the iframe content
function displayFilesInIframe(iframeDoc) {
    const links = iframeDoc.querySelectorAll('a');
    const fileLists = { pdfFiles: [], xlsxFiles: [], csvFiles: [] };

    links.forEach(link => {
        processLinkForFiles(link, iframeDoc.baseURI, fileLists);
    });

    updateFileSections(fileLists);
}

// Process each link to check for files
function processLinkForFiles(link, baseURI, fileLists) {
    const href = link.getAttribute('href');
    if (href) {
        const fullUrl = new URL(href, baseURI).href;
        const cleanUrl = removeInlineParameter(fullUrl);
        const linkText = link.textContent.trim() || getDefaultLinkText(href);

        if (isPdfLink(href, link)) {
            fileLists.pdfFiles.push({ url: cleanUrl, text: linkText });
        } else if (isXlsxLink(href, link)) {
            fileLists.xlsxFiles.push({ url: cleanUrl, text: linkText });
        } else if (isCsvLink(href, link)) {
            fileLists.csvFiles.push({ url: cleanUrl, text: linkText });
        }
    }
}

// Remove 'inline' parameter from URLs
function removeInlineParameter(url) {
    return url.replace(/(\?|&)inline\b(=[^&]*)?/i, '').replace(/(\?&|&&)/g, '$1').replace(/\?$/, '');
}

// Get default link text based on file type
function getDefaultLinkText(href) {
    if (/\.pdf$/i.test(href)) return 'Download PDF';
    if (/\.xlsx$/i.test(href)) return 'Download XLSX';
    if (/\.csv$/i.test(href)) return 'Download CSV';
    return 'Download File';
}

// Check if the link is a PDF
function isPdfLink(href, link) {
    return (
        /\.pdf$/i.test(href) ||
        /download(\?|$)/i.test(href) ||
        linkTextContains(link, 'pdf')
    );
}

// Check if the link is an XLSX
function isXlsxLink(href, link) {
    return (
        /\.xlsx$/i.test(href) ||
        linkTextContains(link, 'xlsx') ||
        linkTextContains(link, 'excel')
    );
}

// Check if the link is a CSV
function isCsvLink(href, link) {
    return (
        /\.csv$/i.test(href) ||
        linkTextContains(link, 'csv')
    );
}

// Check if link text or title contains a specific keyword
function linkTextContains(link, keyword) {
    const linkText = link.textContent.toLowerCase();
    const titleText = (link.getAttribute('title') || '').toLowerCase();
    return linkText.includes(keyword) || titleText.includes(keyword);
}

// Update the file sections in the UI
function updateFileSections({ pdfFiles, xlsxFiles, csvFiles }) {
    pdfFilesDiv.innerHTML = formatFileList(pdfFiles);
    xlsxFilesDiv.innerHTML = formatFileList(xlsxFiles);
    csvFilesDiv.innerHTML = formatFileList(csvFiles);
}

// Format the file list for display
function formatFileList(files) {
    return files.length
        ? files.map(fileObj => `<a href="${fileObj.url}" target="_blank">${fileObj.text}</a><br>`).join('')
        : 'No files found.';
}
