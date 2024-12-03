document.getElementById('processSpacyButton').addEventListener('click', async function () {
    const sentence = document.getElementById('sentenceInput').value;
    const resultTable = document.querySelector('#resultTable tbody');
    const loadingDiv = document.getElementById('loading');

    // Clear previous results
    resultTable.innerHTML = '';
    loadingDiv.style.display = 'block';  // Show the loading animation

    if (sentence.trim() === '') {
        loadingDiv.style.display = 'none';
        alert('Please enter a sentence.');
        return;
    }

    try {
        const response = await fetch('https://2beld7hyqoq5mzqn47rmtdyacm0djckn.lambda-url.us-east-1.on.aws/', {
            method: 'POST',
            body: JSON.stringify({ sentence: sentence }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        loadingDiv.style.display = 'none';  // Hide the loading animation

        if (response.ok) {
            const result = await response.json();
            result.entities.forEach(entity => {
                const row = document.createElement('tr');
                const textCell = document.createElement('td');
                const labelCell = document.createElement('td');
                textCell.textContent = entity.text;
                labelCell.textContent = entity.label;
                row.appendChild(textCell);
                row.appendChild(labelCell);
                resultTable.appendChild(row);
            });
        } else {
            alert('Error processing the sentence.');
        }
    } catch (error) {
        console.error('Error:', error);
        loadingDiv.style.display = 'none';  // Hide the loading animation
        alert('Error processing the sentence.');
    }
});

document.getElementById('processRapidFuzzButton').addEventListener('click', async function () {
    const sentence = document.getElementById('sentenceInput').value;
    const similarityScore = document.getElementById('similarityInput').value;
    const rapidfuzzOrgTable = document.querySelector('#rapidfuzzOrgTable tbody');
    const rapidfuzzOrgTableElement = document.getElementById('rapidfuzzOrgTable');
    const rapidfuzzKeywordTable = document.querySelector('#rapidfuzzKeywordTable tbody');
    const rapidfuzzKeywordTableElement = document.getElementById('rapidfuzzKeywordTable');
    const loadingDiv = document.getElementById('loading');

    // Validate similarity score
    if (isNaN(similarityScore) || similarityScore < 0 || similarityScore > 100) {
        alert("Please enter a valid number between 0 and 100 for the similarity score.");
        document.getElementById('similarityInput').value = 90;  // Reset to default
        return;
    }

    // Clear previous results
    rapidfuzzOrgTable.innerHTML = '';
    rapidfuzzKeywordTable.innerHTML = '';

    // Show the tables (even if empty)
    rapidfuzzOrgTableElement.style.display = 'table';
    rapidfuzzKeywordTableElement.style.display = 'table';
    loadingDiv.style.display = 'block';  // Show the loading animation

    if (sentence.trim() === '') {
        loadingDiv.style.display = 'none';
        alert('Please enter a sentence.');
        return;
    }

    try {
        // Fetch data for Organization table
        const orgResponse = await fetch('https://3qt523u5l4khg6v3liccavatn40pmxvj.lambda-url.us-east-1.on.aws/', {
            method: 'POST',
            body: JSON.stringify({ sentence: sentence, similarity_score: similarityScore }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (orgResponse.ok) {
            const organizations = await orgResponse.json();
            console.log("RapidFuzz Organization data: ", organizations);

            if (organizations.length > 0) {
                organizations.forEach(org => {
                    const row = document.createElement('tr');
                    const nameCell = document.createElement('td');
                    const categoryCodeCell = document.createElement('td');
                    const categoryNameCell = document.createElement('td');
                    const matchScoreCell = document.createElement('td');

                    nameCell.textContent = org.Organization_Name;
                    categoryCodeCell.textContent = org.Category_Code;
                    categoryNameCell.textContent = org.Category_Name;
                    matchScoreCell.textContent = org.Match_Score;

                    row.appendChild(nameCell);
                    row.appendChild(categoryCodeCell);
                    row.appendChild(categoryNameCell);
                    row.appendChild(matchScoreCell);

                    rapidfuzzOrgTable.appendChild(row);
                });
            }
        } else {
            alert('Error processing the organization data.');
        }

        // Fetch data for Keyword table
        const keywordResponse = await fetch('https://htfaherggwhzgpgbkhfmo7bqlq0tcvzz.lambda-url.us-east-1.on.aws/', {
            method: 'POST',
            body: JSON.stringify({ sentence: sentence, similarity_score: similarityScore }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (keywordResponse.ok) {
            const keywords = await keywordResponse.json();
            console.log("RapidFuzz Keyword data: ", keywords);

            if (keywords.length > 0) {
                keywords.forEach(keyword => {
                    const row = document.createElement('tr');
                    const keywordCell = document.createElement('td');
                    const categoryCodeCell = document.createElement('td');
                    const categoryNameCell = document.createElement('td');
                    const matchScoreCell = document.createElement('td');

                    keywordCell.textContent = keyword.Keyword;
                    categoryCodeCell.textContent = keyword.Category_Code;
                    categoryNameCell.textContent = keyword.Category_Name;
                    matchScoreCell.textContent = keyword.Match_Score;

                    row.appendChild(keywordCell);
                    row.appendChild(categoryCodeCell);
                    row.appendChild(categoryNameCell);
                    row.appendChild(matchScoreCell);

                    rapidfuzzKeywordTable.appendChild(row);
                });
            }
        } else {
            alert('Error processing the keyword data.');
        }

    } catch (error) {
        console.error('Error:', error);
        alert('Error processing the sentence.');
    } finally {
        loadingDiv.style.display = 'none';  // Hide the loading animation
    }
});
