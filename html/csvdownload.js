document.addEventListener('DOMContentLoaded', () => {
  const downloadButton = document.getElementById('downloadButton');
  const filenameTextBox = document.getElementById('filenameTextBox');

  // Get the filename from the URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const fileName = urlParams.get('file');  // Assume 'file' is the query parameter name

  // Set the filename in the textbox
  if (fileName) {
    filenameTextBox.value = fileName;
  } else {
    filenameTextBox.value = 'No file provided';
  }

  // Download the file when the download button is clicked
  downloadButton.addEventListener('click', async () => {
    const filename = filenameTextBox.value;

    if (!filename || filename === 'No file provided') {
      alert('No file provided to download');
      return;
    }

    try {
      const lambdaUrl = 'https://o23jeyfcjvpoynwrbyjaexuuzu0nmhgb.lambda-url.us-east-1.on.aws/';  // Replace with your actual Lambda URL
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

      const data = await response.json();  // Still using JSON as requested
      console.log('Raw AWS Lambda response (first 200 characters):', data.substring(0, 200));

      if (response.status === 200) {
        // Create a downloadable CSV file from the response
        const a = document.createElement('a');
        const file = new Blob([data], { type: 'text/csv' });  // Create a blob from the raw CSV content
        a.href = URL.createObjectURL(file);
        a.download = filename;  // Use the filename from the URL/textbox
        document.body.appendChild(a);
        a.click();
        a.remove();  // Remove the element after triggering the download

        console.log('File downloaded successfully');
      } else {
        console.error('Error:', data);
        alert('Failed to download the file.');
      }
    } catch (error) {
      console.error('Error fetching the file:', error);
    }
  });
});
