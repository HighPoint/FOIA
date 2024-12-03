import json
import boto3
import string
import re
from rapidfuzz import fuzz

def split_into_sentences(text):
    # Split the text into sentences using regex that captures sentence-ending punctuation.
    sentence_endings = re.compile(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s')
    sentences = sentence_endings.split(text)
    return [sentence.strip() for sentence in sentences if sentence.strip()]

def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('org_category_names')

    body = event.get('body', '')
    body_dict = json.loads(body)

    text = body_dict.get('sentence', '').lower()
    similarity_score_threshold = float(body_dict.get('similarity_score', 90))

    # Split the text into individual sentences
    sentences = split_into_sentences(text)

    response = table.scan()
    items = response.get('Items', [])

    matches = {}

    for sentence in sentences:
        # Remove punctuation from the sentence
        clean_sentence = sentence.translate(str.maketrans('', '', string.punctuation))
        sentence_words = clean_sentence.split()

        for item in items:
            organization_name = item['Organization_Name'].lower()
            org_words = organization_name.split()

            # Step 1: Compare the first word of the organization with the sentence
            first_word_match = max(fuzz.token_set_ratio(org_words[0], word) for word in sentence_words)

            if first_word_match >= similarity_score_threshold:
                # Step 2: If the first word matches, compare the entire organization name with a corresponding phrase in the sentence
                org_length = len(org_words)
                for i in range(len(sentence_words) - org_length + 1):
                    phrase = " ".join(sentence_words[i:i+org_length])
                    partial_match_score = fuzz.partial_ratio(organization_name, phrase)

                    # Step 3: Use fuzz.ratio to fine-tune the match score
                    full_match_score = fuzz.ratio(organization_name, phrase)

                    # Combine partial and full match scores to give higher weight to full matches
                    match_score = (partial_match_score + full_match_score) / 2

                    # Only keep the highest score for each organization
                    if match_score >= similarity_score_threshold:
                        if organization_name not in matches or matches[organization_name]['Match_Score'] < match_score:
                            matches[organization_name] = {
                                'Organization_Name': item['Organization_Name'],  # Return the original case-sensitive name
                                'Category_Code': item['Category_Code'],
                                'Category_Name': item['Category_Name'],
                                'Match_Score': match_score
                            }

    # Convert matches dictionary to a list of results
    final_matches = list(matches.values())

    return {
        'statusCode': 200,
        'body': json.dumps(final_matches)
    }
