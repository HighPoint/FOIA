let imgElement;
let initialCoordinates = {};
let agencyName = "";
let urlParams;

document.addEventListener('DOMContentLoaded', () => {
    urlParams = new URLSearchParams(window.location.search);
    const imageKey = urlParams.get('image');

    // Set the filename input value to the full image path from the URL
    const filenameInput = document.querySelector('.filenameInput');
    filenameInput.value = imageKey; // Use the entire imageKey as the value

    agencyName = imageKey.split('/')[1]; // Assumes the second folder is always present

    displayPageNumber(imageKey);
    fetchImage(imageKey).then(() => {
        fetchVertices(agencyName, imageKey);
    }).catch(error => {
        console.error('Error loading image:', error);
    });

    document.getElementById('changeFileButton').addEventListener('click', () => {
        const newFilename = filenameInput.value.trim();
        if (newFilename) {
          const newImageKey = newFilename; // Directly use the new input value as the key
          window.location.href = `cropmarks.html?image=${encodeURIComponent(newImageKey)}`;
        } else {
            alert('Please enter a valid filename.');
        }
    });
});

async function fetchImage(imageKey) {
    try {
        const response = await fetch(`https://czwk2vye6pnsszqqeoq7u2qamu0btazt.lambda-url.us-east-1.on.aws/?key=${encodeURIComponent(imageKey)}`);
        if (response.ok) {
            const contentType = response.headers.get('Content-Type');
            const data = await response.text();
            const imageSrc = `data:${contentType};base64,${data}`;
            imgElement = new Image();
            imgElement.src = imageSrc;

            await new Promise((resolve, reject) => {
                imgElement.onload = resolve;
                imgElement.onerror = reject;
            });

            console.log('Image loaded successfully');
            console.log(`Image size: width=${imgElement.width}px, height=${imgElement.height}px`); // Log the image size
        } else {
            console.error('Failed to fetch image:', response.statusText);
            throw new Error('Failed to fetch image');
        }
    } catch (error) {
        console.error('Error fetching image:', error);
        throw error;
    }
}


function drawRectangle(ctx, rect) {
    try {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Ensure the image is fully loaded before drawing
        if (imgElement && imgElement.complete) {
            ctx.drawImage(imgElement, 0, 0); // Redraw the image

            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(rect.topLeft.x, rect.topLeft.y);
            ctx.lineTo(rect.topRight.x, rect.topRight.y);
            ctx.lineTo(rect.bottomRight.x, rect.bottomRight.y);
            ctx.lineTo(rect.bottomLeft.x, rect.bottomLeft.y);
            ctx.closePath();
            ctx.stroke();

            drawVertices(ctx, rect);
        } else {
            console.error('Image is not loaded or not available.');
        }
    } catch (error) {
        console.error('Error in drawRectangle:', error);
    }
}

function drawVertices(ctx, rect) {
    const vertexSize = 8;
    ctx.fillStyle = 'blue';

    ctx.fillRect(rect.topLeft.x - vertexSize / 2, rect.topLeft.y - vertexSize / 2, vertexSize, vertexSize);
    ctx.fillRect(rect.topRight.x - vertexSize / 2, rect.topRight.y - vertexSize / 2, vertexSize, vertexSize);
    ctx.fillRect(rect.bottomLeft.x - vertexSize / 2, rect.bottomLeft.y - vertexSize / 2, vertexSize, vertexSize);
    ctx.fillRect(rect.bottomRight.x - vertexSize / 2, rect.bottomRight.y - vertexSize / 2, vertexSize, vertexSize);
}

function onMouseDown(e, rect, canvas, ctx) {
    const pos = getMousePos(canvas, e);
    let dragging = null;

    if (isVertex(pos, rect.topLeft)) dragging = 'topLeft';
    else if (isVertex(pos, rect.topRight)) dragging = 'topRight';
    else if (isVertex(pos, rect.bottomLeft)) dragging = 'bottomLeft';
    else if (isVertex(pos, rect.bottomRight)) dragging = 'bottomRight';

    if (dragging) {
        const onMouseMove = (e) => {
            const newPos = getMousePos(canvas, e);
            rect[dragging].x = newPos.x;
            rect[dragging].y = newPos.y;

            // Keep the rectangle shape
            if (dragging === 'topLeft') {
                rect.topRight.y = newPos.y;
                rect.bottomLeft.x = newPos.x;
            } else if (dragging === 'topRight') {
                rect.topLeft.y = newPos.y;
                rect.bottomRight.x = newPos.x;
            } else if (dragging === 'bottomLeft') {
                rect.topLeft.x = newPos.x;
                rect.bottomRight.y = newPos.y;
            } else if (dragging === 'bottomRight') {
                rect.topRight.x = newPos.x;
                rect.bottomLeft.y = newPos.y;
            }

            drawRectangle(ctx, rect);

            // Deactivate Approve button if coordinates change
            document.getElementById('approveButton').disabled = true;
        };

        const onMouseUp = () => {
            updateCoordinates(rect); // Update coordinates when dragging stops
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('mouseup', onMouseUp);
        };

        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);
    }
}

function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

function isVertex(pos, vertex) {
    const vertexSize = 8;
    return (
        pos.x >= vertex.x - vertexSize / 2 &&
        pos.x <= vertex.x + vertexSize / 2 &&
        pos.y >= vertex.y - vertexSize / 2 &&
        pos.y <= vertex.y + vertexSize / 2
    );
}

function updateCoordinates(rect) {
    const topLeftCoord = document.getElementById('topLeftCoord');
    const topRightCoord = document.getElementById('topRightCoord');
    const bottomLeftCoord = document.getElementById('bottomLeftCoord');
    const bottomRightCoord = document.getElementById('bottomRightCoord');

    if (topLeftCoord && topRightCoord && bottomLeftCoord && bottomRightCoord) {
        topLeftCoord.textContent = `{x: ${rect.topLeft.x}, y: ${rect.topLeft.y}}`;
        topRightCoord.textContent = `{x: ${rect.topRight.x}, y: ${rect.topRight.y}}`;
        bottomLeftCoord.textContent = `{x: ${rect.bottomLeft.x}, y: ${rect.bottomLeft.y}}`;
        bottomRightCoord.textContent = `{x: ${rect.bottomRight.x}, y: ${rect.bottomRight.y}}`;
    }

    document.querySelector('.updateCropMarks').addEventListener('click', () => {
        document.getElementById('approveButton').disabled = false; // Reactivate Approve button on Update Cropmarks click
    });
}

function displayPageNumber(imageKey) {
    const pageMatch = imageKey.match(/_page_(\d+)\.jpg$/);
    if (pageMatch && pageMatch[1]) {
        const currentPage = pageMatch[1];
        document.getElementById('pageInfo').textContent = currentPage;

        // Determine the other page number
        const otherPage = currentPage === '1' ? '2' : currentPage === '2' ? '1' : null;

        if (otherPage) {
            // Create hyperlink for the other page
            const link = document.createElement('a');
            link.href = `cropmarks.html?image=${imageKey.replace(/_page_\d+/, `_page_${otherPage}`)}`;
            link.textContent = `Page ${otherPage}`;

            // Append the hyperlink to the pageInfo element
            const pageInfoElement = document.getElementById('pageInfo');
            pageInfoElement.appendChild(document.createTextNode(' and '));
            pageInfoElement.appendChild(link);
        }
    } else {
        document.getElementById('pageInfo').textContent = 'N/A'; // Default if no page number found
    }
}

async function fetchVertices(agencyName, imageKey) {
    try {
        const response = await fetch('https://2y6go6jqz5pce72olf7gbsn56q0ylmgn.lambda-url.us-east-1.on.aws/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ AgencyName: agencyName })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Lambda response data:', data); // Log the entire response

            // Validate that data has the expected properties
            if (data && (data.PDFMargin1 || data.PDFMargin2)) {
                const pageMatch = imageKey.match(/_page_(\d+)\.jpg$/);
                const pageNumber = pageMatch ? pageMatch[1] : '1'; // Default to page 1 if no match
                const margins = pageNumber === '1' ? data.PDFMargin1 : data.PDFMargin2;

                // Initialize the canvas with the retrieved margins
                initializeCanvas(margins);
            } else {
                console.error('Data does not contain expected PDFMargin properties:', data);
            }
        } else {
            console.error('Failed to fetch vertices:', response.statusText, 'Status Code:', response.status);
        }
    } catch (error) {
        console.error('Error fetching vertices:', error);
    }
}

function initializeCanvas(margins) {
    try {
        const canvas = document.querySelector('.pdfCanvas');
        const ctx = canvas.getContext('2d');

        // Set the canvas size based on the image size
        canvas.width = imgElement.width;
        canvas.height = imgElement.height;

        // Adjust margins if they exceed image dimensions, ensuring at least a 3px margin
        let adjustedMargins = {
            Left: Math.max(3, Math.min(margins.Left, canvas.width - 3)),
            Top: Math.max(3, Math.min(margins.Top, canvas.height - 3)),
            Right: Math.min(canvas.width - 3, Math.max(margins.Right, margins.Left + 3)),
            Bottom: Math.min(canvas.height - 3, Math.max(margins.Bottom, margins.Top + 3))
        };

        // Ensure that Left < Right and Top < Bottom
        if (adjustedMargins.Left >= adjustedMargins.Right) {
            adjustedMargins.Right = adjustedMargins.Left + 3;
        }
        if (adjustedMargins.Top >= adjustedMargins.Bottom) {
            adjustedMargins.Bottom = adjustedMargins.Top + 3;
        }

        const rectangle = {
            topLeft: { x: adjustedMargins.Left, y: adjustedMargins.Top },
            topRight: { x: adjustedMargins.Right, y: adjustedMargins.Top },
            bottomLeft: { x: adjustedMargins.Left, y: adjustedMargins.Bottom },
            bottomRight: { x: adjustedMargins.Right, y: adjustedMargins.Bottom },
        };

        drawRectangle(ctx, rectangle);

        // Update the coordinates displayed on the page
        updateCoordinates(rectangle);

        // Add event listeners for dragging vertices
        canvas.addEventListener('mousedown', (e) => onMouseDown(e, rectangle, canvas, ctx));

        // If margins were adjusted, send adjustments to the database
        if (
            adjustedMargins.Left !== margins.Left ||
            adjustedMargins.Top !== margins.Top ||
            adjustedMargins.Right !== margins.Right ||
            adjustedMargins.Bottom !== margins.Bottom
        ) {
            // Determine the page number
            const imageKey = urlParams.get('image');
            const pageMatch = imageKey.match(/_page_(\d+)\.jpg$/);
            const pageNumber = pageMatch ? pageMatch[1] : '1'; // Default to page 1 if no match

            // Use the existing updateCropMarks function to send adjusted margins
            updateCropMarks(rectangle, agencyName, pageNumber);
        }
    } catch (error) {
        console.error('Error in initializeCanvas:', error);
    }
}



document.querySelector('.updateCropMarks').addEventListener('click', handleUpdateCropMarks);


function handleUpdateCropMarks() {
    const imageKey = urlParams.get('image');
    const pageMatch = imageKey.match(/_page_(\d+)\.jpg$/);
    const pageNumber = pageMatch ? pageMatch[1] : '1'; // Default to page 1 if no match

    const rectangle = getCurrentVertices();

    updateCropMarks(rectangle, agencyName, pageNumber);
}


async function updateCropMarks(rectangle, agencyName, pageNumber) {
    const formattedAgencyName = agencyName.replace(/_/g, ' ');

    const PDFMargins = {
        Right: rectangle.topRight.x,
        Bottom: rectangle.bottomRight.y,
        Left: rectangle.bottomLeft.x,
        Top: rectangle.topLeft.y
    };

    // Corrected payload with 'PDFMargins' and 'body' wrapper
    const payload = {
        body: {
            AgencyName: formattedAgencyName,
            [`PDFMargins${pageNumber}`]: PDFMargins
        }
    };

    // Add console logs to display PDFMargins and payload
    console.log(`PDFMargins${pageNumber}:`, PDFMargins);
    console.log('Payload being sent to AWS Lambda:', payload);

    alert('Updating Cropmarks...');

    try {
        const response = await fetch('https://vkeplbc4l7indzp74jjuzbor6e0mikkq.lambda-url.us-east-1.on.aws/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('setPDFMargins response data:', data);

        if (response.ok) {
            alert('Cropmarks updated successfully!');
            const filename = urlParams.get('image');
            const message = `Cropmarks updated for agency ${formattedAgencyName}`;

            await postNotificationMessage(message);
        } else {
            console.error('setPDFMargins failed with status:', response.status);
            alert('Failed to update cropmarks. Please try again.');
        }
    } catch (error) {
        console.error('Error in setPDFMargins:', error);
        alert('An error occurred while updating cropmarks. Please try again.');
    }
}


function getCurrentVertices() {
    // Function to parse the string and extract x and y values
    function parseCoordinates(coordString) {
        const match = coordString.match(/\{x:\s*(\d+),\s*y:\s*(\d+)\}/);
        if (match) {
            return {
                x: parseInt(match[1], 10),
                y: parseInt(match[2], 10)
            };
        } else {
            throw new Error(`Invalid coordinate string: ${coordString}`);
        }
    }

    // Extract coordinates from the span elements
    const topLeft = parseCoordinates(document.getElementById('topLeftCoord').textContent);
    const topRight = parseCoordinates(document.getElementById('topRightCoord').textContent);
    const bottomLeft = parseCoordinates(document.getElementById('bottomLeftCoord').textContent);
    const bottomRight = parseCoordinates(document.getElementById('bottomRightCoord').textContent);

    // Return the current vertices as an object
    return {
        topLeft: { x: topLeft.x, y: topLeft.y },
        topRight: { x: topRight.x, y: topRight.y },
        bottomLeft: { x: bottomLeft.x, y: bottomLeft.y },
        bottomRight: { x: bottomRight.x, y: bottomRight.y }
    };
}

document.getElementById('approveButton').addEventListener('click', async () => {
    const filename = urlParams.get('image'); // Get the filename from the URL parameters
    const message = `Cropmarks approved for file ${filename}`;

    await postNotificationMessage(message);

    alert('Cropmarks approved!');

    window.close();
});

async function postNotificationMessage(message, isHyperlink = false) {
    const lambdaUrl = 'https://qxryrgbnny4qwxyxkwuhjwpvwe0muyuq.lambda-url.us-east-1.on.aws/';

    // Prepare the JSON body
    const body = {
        message: message,
        read: false,
        isHyperlink: isHyperlink
    };

    try {
        const response = await fetch(lambdaUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            console.error('Failed to post notification:', response.statusText);
        } else {
            console.log('Notification posted successfully:', message);
        }
    } catch (error) {
        console.error('Error posting notification:', error);
    }
}
