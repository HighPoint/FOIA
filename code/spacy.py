import json
import spacy
import os

def lambda_handler(event, context):
    # Load the spaCy model from the layer
    nlp = spacy.load("/opt/en_core_web_md-2.3.1/en_core_web_md/en_core_web_md-2.3.1")

    # Parse the input sentence from the event
    body = json.loads(event['body'])
    sentence = body.get('sentence', '')

    # Process the sentence with spaCy
    doc = nlp(sentence)

    # Extract the named entities
    entities = []
    for ent in doc.ents:
        entities.append({
            'text': ent.text,
            'start_char': ent.start_char,
            'end_char': ent.end_char,
            'label': ent.label_
        })

    return {
        'statusCode': 200,
        'body': json.dumps({'entities': entities})
    }
