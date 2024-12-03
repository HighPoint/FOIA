let gridApi;
let deletedRows = []; // Stack to keep track of deleted rows and their original positions
const approveButton = document.querySelector('.approveButton'); // Get the Approve button

// Function to disable the Approve button
function disableApproveButton() {
  approveButton.disabled = true;
  approveButton.style.backgroundColor = 'gray'; // Gray out the button
}

// Function to enable the Approve button
function enableApproveButton() {
  approveButton.disabled = false;
  approveButton.style.backgroundColor = '#04AA6D'; // Restore the original green color
}

async function loadCSVFile(filename) {
  const fileTextbox = document.querySelector('#filenameTextBox');
  if (filename) {
    fileTextbox.value = filename;
  } else {
    alert('No file provided.');
    return;
  }

  const lambdaUrl = 'https://o23jeyfcjvpoynwrbyjaexuuzu0nmhgb.lambda-url.us-east-1.on.aws/';

  try {
    const requestBody = {
      body: `/filename/:/${filename}/`
    };

    const response = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('AWS Lambda response:', data);

    if (response.status === 200) {
      clearGrid();
      setUpGrid(data);
      enableApproveButton(); // Enable Approve button when the Load button is pressed
    } else {
      console.error('Error:', data);
      alert('Failed to load the CSV file.');
    }
  } catch (error) {
    console.error('Error fetching the CSV file:', error);
  }
}

function setUpGrid(csvData) {
  const parsedData = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true
  }).data;

  console.log('Parsed CSV data:', parsedData);

  const columnDefs = Object.keys(parsedData[0] || {}).map(key => ({
    field: key,
    editable: true,
    onCellValueChanged: disableApproveButton // Disable Approve button if a cell value is changed
  }));

  // Add a delete column with a red "x" for deleting rows
  columnDefs.push({
    headerName: '',
    field: 'delete',
    cellRenderer: params => {
      const button = document.createElement('button');
      button.innerHTML = '❌'; // Red "x"
      button.style.color = 'red';
      button.onclick = () => {
        deleteRow(params.node);
        disableApproveButton(); // Disable Approve button if a row is deleted
      };
      return button;
    },
    editable: false,
    width: 50
  });

  const gridOptions = {
    undoRedoCellEditing: true,
    undoRedoCellEditingLimit: 20,
    rowData: parsedData,
    columnDefs: columnDefs,
    onCellValueChanged: disableApproveButton // Disable Approve button if a cell value changes
  };

  const myGridElement = document.querySelector('#myGrid');
  gridApi = agGrid.createGrid(myGridElement, gridOptions);

  console.log('Grid created with data.');
}

function deleteRow(node) {
  deletedRows.push({
    data: node.data,
    index: node.rowIndex
  });

  gridApi.applyTransaction({
    remove: [node.data]
  });
}

function undoFunction() {
  console.log('Undo function called. Deleted rows:', deletedRows);

  if (gridApi && deletedRows.length === 0) {
    gridApi.undoCellEditing();
  }

  if (deletedRows.length > 0) {
    const { data, index } = deletedRows.pop();
    gridApi.applyTransaction({
      add: [data],
      addIndex: index
    });

    console.log('Row restored at index:', index, data);
  } else {
    console.log('No deleted rows to undo.');
  }
}

async function revertFunction() {
  alert("Revert to Previous Saved Version");
  deletedRows = [];
  clearGrid();
  const fileTextbox = document.querySelector('#filenameTextBox').value;
  await loadCSVFile(fileTextbox);
  enableApproveButton(); // Enable Approve button when the Revert button is pressed
}

function clearGrid() {
  const myGridElement = document.querySelector('#myGrid');
  if (myGridElement && gridApi) {
    gridApi.destroy();
    myGridElement.innerHTML = '';
    console.log('Grid cleared.');
  }
}

function loadFunction() {
  const filename = document.querySelector('#filenameTextBox').value;
  if (filename) {
    alert(`Load ${filename}`);
    loadCSVFile(filename); // Call loadCSVFile with the filename in the textbox
  } else {
    alert('Please provide a file name.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const fileParam = urlParams.get('file');

  if (fileParam) {
    loadCSVFile(fileParam); // Load the table initially if there's a file in the URL
  }
});

function redoFunction() {
  if (gridApi) gridApi.redoCellEditing();
}

async function saveFunction() {
  const filename = document.querySelector('#filenameTextBox').value;

  if (!filename) {
    alert('Please provide a file name.');
    return;
  }

  console.log('Save function triggered with filename:', filename);
  alert("Save Current Version");

  const csvContent = getCSVContentFromGrid(); // Get CSV content from AG Grid
  console.log('CSV content to upload:', csvContent);

  const fileBlob = new Blob([csvContent]);
  const fileBase64 = await blobToBase64(fileBlob); // Convert the Blob to Base64

  const lambdaUrl = 'https://qd4xkanm3aarlmht3btlkrqcsi0wwkyf.lambda-url.us-east-1.on.aws/';

  try {
    const response = await fetch(lambdaUrl, {
      method: 'POST',
      body: JSON.stringify({
        file_name: filename,
        file: fileBase64
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('File uploaded successfully:', data);
    enableApproveButton(); // Enable Approve button when the Save button is pressed
  } catch (error) {
    console.error('Error during the save process:', error);
  }
}

// Utility function to convert Blob to Base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]); // Return Base64 part
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Example function to get CSV content from AG Grid
function getCSVContentFromGrid() {
  // Export AG Grid content to CSV format
  return gridApi.getDataAsCsv(); // Assuming AG Grid's export functionality is being used
}


// Utility function to convert Blob to Base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]); // Return Base64 part
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


// Example function to get CSV content from AG Grid
function getCSVContentFromGrid() {
  // Export AG Grid content to CSV format
  return gridApi.getDataAsCsv(); // Assuming AG Grid's export functionality is being used
}


// Example function to get CSV content from AG Grid
function getCSVContentFromGrid() {
  // Export AG Grid content to CSV format
  return gridApi.getDataAsCsv(); // Assuming AG Grid's export functionality is being used
}

// Function to upload the file using a pre-signed URL
async function uploadFile(file, url) {
  console.log('Uploading file to pre-signed URL:', url);
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

    console.log('File uploaded successfully via pre-signed URL');
  } catch (error) {
    console.error('Error uploading file:', error);
  }
}


// Function to upload the file using a pre-signed URL
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

    console.log('File uploaded successfully via pre-signed URL');
  } catch (error) {
    console.error('Error uploading file:', error);
  }
}
// Example function to get CSV content from AG Grid
function getCSVContentFromGrid() {
  // Export AG Grid content to CSV format
  return gridApi.getDataAsCsv(); // Assuming AG Grid's export functionality is being used
}


async function approveFunction() {
  const filename = document.querySelector('#filenameTextBox').value;
  alert("Approve Current Version");

  const downloadUrl = `https://s3.amazonaws.com/poliscioalerts.com/csvdownload.html?file=${encodeURIComponent(filename)}`;

  const message = `${filename} is approved. <a href="${downloadUrl}" style="color:blue;">Download here</a>`;
  await postNotificationMessage(message, true);
}

async function postNotificationMessage(message, isHyperlink = false) {
  const lambdaUrl = 'https://qxryrgbnny4qwxyxkwuhjwpvwe0muyuq.lambda-url.us-east-1.on.aws/';

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
