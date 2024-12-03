const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const uploadButton = document.getElementById('uploadButton');
const checkCropmarksButton = document.getElementById('checkCropmarksButton');
const processFileButton = document.getElementById('processFileButton');
const agencyInput = document.getElementById('agencyInput');
const agencyList = document.getElementById('agencyList');
let selectedAgency = null;
let filesToUpload = [];
let globalAgencyNames = [];
let globalModifiedAgencyNames = [];
let uploadedPdfFileName = null;
let uploadedFiles = [];

// Load agency names on DOM load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const data = await fetchAgencyNames();
        globalAgencyNames = data.agency_names; // Assign fetched agency names to the global variable
        globalModifiedAgencyNames = data.modified_agency_names; // Assign fetched modified agency names to the global variable
        populateAgencyList(globalAgencyNames); // Initially populate the list with all agencies
    } catch (error) {
        console.error('Failed to load agencies:', error);
        alert('Failed to load agency names.');
    }
});

async function fetchAgencyNames() {
    const lambdaUrl = 'https://wcd32bsbsobm65qvfydaesikgi0uaydn.lambda-url.us-east-1.on.aws/';
    const response = await fetch(lambdaUrl);
    const data = await response.json();
    return data;
}

function populateAgencyList(agencies) {
    agencyList.innerHTML = ''; // Clear the list before populating
    agencies.forEach(agency => {
        const option = document.createElement('option');
        option.value = agency;
        option.textContent = agency;
        agencyList.appendChild(option);
    });

    agencyList.size = Math.min(agencies.length, 10); // Set the size to the number of items, up to 10
    agencyList.style.overflowY = agencies.length > 10 ? 'scroll' : 'auto'; // Enable scrolling if there are more than 10 items
}

agencyInput.addEventListener('input', () => {
    const filter = agencyInput.value.toLowerCase();
    let matchingAgencies = globalAgencyNames.filter(agency => agency.toLowerCase().includes(filter));

    populateAgencyList(matchingAgencies); // Repopulate the list with only matching agencies

    agencyList.style.display = matchingAgencies.length > 0 ? 'block' : 'none'; // Show the list if there are matching options
});

agencyList.addEventListener('click', (event) => {
    if (event.target.tagName === 'OPTION') {
        selectedAgency = event.target.value;
        console.log('Selected agency:', selectedAgency); // Log the selected agency

        // Find the index of the selected agency in the global list
        const index = globalAgencyNames.indexOf(selectedAgency);
        if (index !== -1) {
            let modifiedAgencyName = globalModifiedAgencyNames[index];
            let reducedAgencyName = modifiedAgencyName;

            // If modified_agency_name has "__", change it to the text after the "__"
            if (modifiedAgencyName.includes('__')) {
                reducedAgencyName = modifiedAgencyName.split('__').pop().replace(/^_+|_+$/g, '');
                if (reducedAgencyName.length === 0) {
                    reducedAgencyName = modifiedAgencyName; // Use existing modified_agency_name if the length is 0
                }
            }

            console.log('Reduced agency name:', reducedAgencyName); // Log the reduced agency name

            agencyInput.value = selectedAgency; // Show full selected agency name in the input box
            agencyList.style.display = 'none'; // Hide the dropdown after selection
        }
    }
});

function processFileName(fileName) {
    // Convert to lowercase
    let lowerCaseFileName = fileName.toLowerCase();

    // Validate file extension
    if (!lowerCaseFileName.endsWith('.pdf') && !lowerCaseFileName.endsWith('.xlsx') && !lowerCaseFileName.endsWith('.csv')) {
        alert('Only .pdf, .xlsx, and .csv files are allowed.');
        return null;
    }

    // Remove spaces, single quotes, hyphens, or special characters (except the dot before the extension)
    let baseName = lowerCaseFileName.substring(0, lowerCaseFileName.lastIndexOf('.'));
    const extension = lowerCaseFileName.split('.').pop().toUpperCase();
    baseName = baseName.replace(/[\s'`~!@#$%^&*()\-+=\[\]{};:"\\|,.<>?]+/g, '_');

    // Combine the cleaned base name with the original extension
    const processedFileName = `${baseName}.${extension.toLowerCase()}`;

    return { processedFileName, extension };
}

function handleFiles(files) {
    filesToUpload = []; // Clear the files array
    fileList.innerHTML = ''; // Clear the file list

    for (const file of files) {
        const { processedFileName, extension } = processFileName(file.name);
        if (processedFileName) {
            filesToUpload.push({ file, processedFileName });

            const index = globalAgencyNames.indexOf(selectedAgency);
            if (index !== -1) {
                let modifiedAgencyName = globalModifiedAgencyNames[index];
                let reducedAgencyName = modifiedAgencyName;

                // If modified_agency_name has "__", change it to the text after the "__"
                if (modifiedAgencyName.includes('__')) {
                    reducedAgencyName = modifiedAgencyName.split('__').pop().replace(/^_+|_+$/g, '');
                    if (reducedAgencyName.length === 0) {
                        reducedAgencyName = modifiedAgencyName; // Use existing modified_agency_name if the length is 0
                    }
                }

                // Prepare the filename with the required full path format
                const finalFileName = `${extension}/${reducedAgencyName}/${processedFileName}`;

                // Display the file name under the dropzone
                const fileNameElement = document.createElement('div');
                fileNameElement.textContent = `Prepared for upload: ${finalFileName}`;
                fileList.appendChild(fileNameElement);

                // Activate the appropriate buttons based on the file type
                if (extension === 'PDF') {
                    pdfUploaded = true;
                }
                uploadButton.disabled = false;
            }
        }
    }

}

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!selectedAgency) {
        alert('Please select an agency before uploading files.');
        return;
    }
    dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!selectedAgency) {
        alert('Please select an agency before uploading files.');
        return;
    }
    dropzone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    handleFiles(files);
});

dropzone.addEventListener('click', () => {
    if (!selectedAgency) {
        alert('Please select an agency before uploading files.');
        return;
    }
    fileInput.click();
});

fileInput.addEventListener('change', () => {
    if (!selectedAgency) {
        alert('Please select an agency before uploading files.');
        return;
    }
    const files = fileInput.files;
    handleFiles(files);
});

uploadButton.addEventListener('click', () => {

    alert('Upload begun. This may take several seconds to complete.');
    
    if (!selectedAgency) {
        alert('Please select an agency before uploading files.');
        return;
    }

    if (filesToUpload.length === 0) {
        alert('Please select a file to upload.');
        return;
    }

    filesToUpload.forEach(async (fileObject) => {
        const { file, processedFileName } = fileObject;

        const index = globalAgencyNames.indexOf(selectedAgency);
        if (index !== -1) {
            let modifiedAgencyName = globalModifiedAgencyNames[index];
            let reducedAgencyName = modifiedAgencyName;

            // If modified_agency_name has "__", change it to the text after the "__"
            if (modifiedAgencyName.includes('__')) {
                reducedAgencyName = modifiedAgencyName.split('__').pop().replace(/^_+|_+$/g, '');
                if (reducedAgencyName.length === 0) {
                    reducedAgencyName = modifiedAgencyName; // Use existing modified_agency_name if the length is 0
                }
            }

            // Prepare the S3 key (finalFileName) with the required full path format
            const finalFileName = `${processedFileName.split('.')[1].toUpperCase()}/${reducedAgencyName}/${processedFileName}`;

            const url = await getUploadUrl(finalFileName, file.type); // Use finalFileName as the S3 key
            await uploadFile(file, url);

            // Update the global variables with the successfully uploaded filenames
            uploadedFiles.push(finalFileName);
            if (file.type === 'application/pdf') {
                uploadedPdfFileName = finalFileName; // Store the PDF filename for the cropmarks button
                checkCropmarksButton.disabled = false;
                createCropmarkJPEG('poliscio-raw-input', finalFileName);
            }

            processFileButton.disabled = false;

            // Call the postNotificationMessage function after a successful upload
            const message = `File "${finalFileName}" was successfully uploaded.`;

            postNotificationMessage(message, false);
            alert(message);

            fileList.innerHTML = '';
            filesToUpload = [];
        }
    });
});


checkCropmarksButton.addEventListener('click', () => {
    if (uploadedPdfFileName) {
        const fileExtension = uploadedPdfFileName.slice((uploadedPdfFileName.lastIndexOf(".") - 1 >>> 0) + 2);
        const filenameWithoutExtension = uploadedPdfFileName.slice(0, -(fileExtension.length + 1));
        const filenamePage1 = `${filenameWithoutExtension}_page_1.jpg`;

        const cropmarksUrl = `https://s3.amazonaws.com/poliscioalerts.com/cropmarks.html?image=${filenamePage1}`;
        console.log(`Opening cropmarks URL: ${cropmarksUrl}`);

        // Open the URL in a new tab
        window.open(cropmarksUrl, '_blank');
    } else {
        alert('No PDF file uploaded.');
    }
});

processFileButton.addEventListener('click', async () => {
    if (uploadedFiles.length > 0) {
        let message = 'Files to be processed:\n';

        for (const file of uploadedFiles) {
            const extension = file.split('.').pop().toUpperCase();

            // Early alert for processing file
            alert(`Processing File ${file}`);

            if (extension === 'XLSX' || extension === 'CSV') {
                try {
                    const lambdaUrl = 'https://aelmc6taq6whqedex2elbmhtee0gtutz.lambda-url.us-east-1.on.aws/';

                    // Prepare payload for AWS Lambda
                    const payload = {
                        s3_key: file
                    };

                    const response = await fetch(lambdaUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                        // Convert .xlsx to .csv for the hyperlink if needed
                        const csvFileName = file.replace(/\.xlsx$/i, '.csv');
                        const hyperlink = `<a href="https://s3.amazonaws.com/poliscioalerts.com/humanreview.html?file=${encodeURIComponent(csvFileName)}" target="_blank" style="color: blue;">${csvFileName}</a>`;
                        const notificationMessage = `View file ${hyperlink} in human review.`;

                        postNotificationMessage(notificationMessage, true);
                        message += `${file} - Successfully processed. You can view it in human review.\n`;
                    } else {
                        message += `${file} - Failed to process.\n`;
                    }
                } catch (error) {
                    console.error(`Error processing file ${file}:`, error);
                    message += `${file} - Failed to process due to an error.\n`;
                }
            } else if (extension === 'PDF') {
                await processPDF(file); // Call the processPDF function
                message += `${file} - PDF processed successfully.\n`;
            } else {
                message += `${file} - Unknown file type. Cannot process.\n`;
            }
        }

        alert(message);
    } else {
        alert('No files available to process.');
    }
});



async function getUploadUrl(fileName, contentType) {
    const lambdaUrl = 'https://hhlyn3uhmagfk37du74b2dw5j40ctklh.lambda-url.us-east-1.on.aws/';
    const response = await fetch(`${lambdaUrl}?file_name=${encodeURIComponent(fileName)}&content_type=${encodeURIComponent(contentType)}`);
    const data = await response.json();
    return data.url;
}

async function uploadFile(file, url) {
    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': file.type,
            },
            body: file
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error uploading file:', error);
    }
}

async function postNotificationMessage(message, isHyperlink = false) {
    const lambdaUrl = 'https://qxryrgbnny4qwxyxkwuhjwpvwe0muyuq.lambda-url.us-east-1.on.aws/';

    // Prepare the JSON body
    const body = {
        message: message,
        read: false,
        isHyperlink: isHyperlink
    };

    const payload = {
        requestContext: {
            http: {
                method: "POST"
            }
        },
        body: JSON.stringify(body)
    };

    try {
        const response = await fetch(lambdaUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Failed to post notification: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Notification posted successfully:', data);
    } catch (error) {
        console.error('Error posting notification:', error);
    }
}

async function createCropmarkJPEG(bucketName, key) {
    const url = "https://o37ncivihtig2bcg7yvtzz2ioa0stutj.lambda-url.us-east-1.on.aws/";

    const payload = {
        Records: [
            {
                eventVersion: "2.1",
                s3: {
                    bucket: {
                        name: bucketName
                    },
                    object: {
                        key: key
                    }
                }
            }
        ]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const rawData = await response.text();
        console.log('createCropmarkJPEG function - Raw response from Lambda:', rawData);  // Log the raw response

        handleCropmarkNotification(key);

        return rawData;
    } catch (error) {
        console.error('createCropmarkJPEG function - Error calling createCropmarkJPEG function:', error);  // Log the error
    }
}

function handleCropmarkNotification(filename) {
    const fileExtension = filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
    const filenameWithoutExtension = filename.slice(0, -(fileExtension.length + 1));
    const filenamePage1 = `${filenameWithoutExtension}_page_1.jpg`;
    const message = `File "${filename}" was successfully uploaded. <a href="https://s3.amazonaws.com/poliscioalerts.com/cropmarks.html?image=${filenamePage1}" target="_blank" style="color: blue;">View cropmarks</a>`;

    postNotificationMessage(message, false);
}

async function processPDF(file) {
    try {
        const lambdaUrl = 'https://2s2pw5wpargsmo7cxdkracq7me0pvblr.lambda-url.us-east-1.on.aws/';

        // Extract the necessary values for the JSON payload
        const inputS3Key = file; // The input_s3_key is the filename provided
        const inputS3KeyParts = inputS3Key.split('/');

        // Extract agency_name as the text between the first and second "/"
        const agencyName = inputS3KeyParts[1]; // This should give the correct agency name

        const inputS3Bucket = 'poliscio-raw-input'; // As per your structure
        const maxPages = 3; // Set max_pages to 3 for testing

        // Prepare payload for AWS Lambda
        const payload = {
            agency_name: agencyName.replace(/\s+/g, '_'), // Replace spaces with underscores
            input_s3_bucket: inputS3Bucket,
            input_s3_key: inputS3Key,
            max_pages: maxPages
        };

        console.log(`processPDF - Sending request to Lambda with payload:`, payload);

        const response = await fetch(lambdaUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log(`processPDF - Response status: ${response.status}`);

        if (response.ok) {
            const responseData = await response.json();
            console.log(`processPDF - Response data:`, responseData);

            alert(`PDF File ${file} processed successfully.`);

            // Post notification message
            const message = `PDF File "${file}" processed successfully.`;
            postNotificationMessage(message, false);
        } else {
            console.error(`processPDF - Failed to process PDF. Status: ${response.statusText}`);
            alert(`Failed to process PDF File ${file}.`);
        }
    } catch (error) {
        console.error(`processPDF - Error processing PDF file ${file}:`, error);
        alert(`An error occurred while processing PDF file ${file}.`);
    }
}
