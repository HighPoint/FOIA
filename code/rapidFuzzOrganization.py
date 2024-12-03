import json
import boto3
from rapidfuzz import fuzz

def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('org_category_names')

    body = event.get('body', '')
    body_dict = json.loads(body)

    sentence = body_dict.get('sentence', '').lower()
    similarity_score_threshold = float(body_dict.get('similarity_score', 90))

    response = table.scan()
    items = response.get('Items', [])

    matches = []
    sentence_words = sentence.split()

    for item in items:
        organization_name = item['Organization_Name'].lower()
        org_words = organization_name.split()

        # Step 1: Compare the first word of the organization with the sentence
        first_word_match = max(fuzz.partial_ratio(org_words[0], word) for word in sentence_words)

        if first_word_match >= similarity_score_threshold:
            # Step 2: If the first word matches, compare the entire organization name with a corresponding phrase in the sentence
            org_length = len(org_words)
            for i in range(len(sentence_words) - org_length + 1):
                phrase = " ".join(sentence_words[i:i+org_length])
                match_score = fuzz.token_set_ratio(organization_name, phrase)

                if match_score >= similarity_score_threshold:
                    matches.append({
                        'Organization_Name': item['Organization_Name'],  # Return the original case-sensitive name
                        'Category_Code': item['Category_Code'],
                        'Category_Name': item['Category_Name'],
                        'Match_Score': match_score
                    })
                    break  # Stop after finding the first valid match

    return {
        'statusCode': 200,
        'body': json.dumps(matches)
    }
