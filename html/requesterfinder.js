document.getElementById('processRapidFuzzButton').addEventListener('click', async function () {
    const sentence = document.getElementById('sentenceInput').value;
    const similarityScore = document.getElementById('similarityInput').value;
    const rapidfuzzOrgTable = document.querySelector('#rapidfuzzOrgTable tbody');
    const rapidfuzzOrgTableElement = document.getElementById('rapidfuzzOrgTable');
    const loadingDiv = document.getElementById('loading');

    // Validate similarity score
    if (isNaN(similarityScore) || similarityScore < 0 || similarityScore > 100) {
        alert("Please enter a valid number between 0 and 100 for the similarity score.");
        document.getElementById('similarityInput').value = 90;  // Reset to default
        return;
    }

    // Clear previous results
    rapidfuzzOrgTable.innerHTML = '';

    // Show the table (even if empty)
    rapidfuzzOrgTableElement.style.display = 'table';
    loadingDiv.style.display = 'block';  // Show the loading animation

    if (sentence.trim() === '') {
        loadingDiv.style.display = 'none';
        alert('Please enter a sentence.');
        return;
    }

    try {
        // Fetch data for Requester table
        const orgResponse = await fetch('https://kz4oinzqc4p6ew52ab26fnnvzu0dghhg.lambda-url.us-east-1.on.aws/', {
            method: 'POST',
            body: JSON.stringify({ sentence: sentence, similarity_score: similarityScore }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (orgResponse.ok) {
            const organizations = await orgResponse.json();
            console.log("RapidFuzz Requester data: ", organizations);

            if (organizations.length > 0) {
                organizations.forEach(org => {
                    const row = document.createElement('tr');
                    const nameCell = document.createElement('td');
                    const categoryCodeCell = document.createElement('td');
                    const matchScoreCell = document.createElement('td');

                    nameCell.textContent = org.RequesterOrg;
                    categoryCodeCell.textContent = org.Category_Code;
                    matchScoreCell.textContent = org.Match_Score;

                    row.appendChild(nameCell);
                    row.appendChild(categoryCodeCell);
                    row.appendChild(matchScoreCell);

                    rapidfuzzOrgTable.appendChild(row);
                });
            }
        } else {
            alert('Error processing the requester data.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error processing the sentence.');
    } finally {
        loadingDiv.style.display = 'none';  // Hide the loading animation
    }
});
