import json
import boto3
from boto3.dynamodb.conditions import Key

def lambda_handler(event, context):

    print(f"event {event}")

    # Initialize the DynamoDB resource
    dynamodb = boto3.resource('dynamodb')

    # Define the table name
    table_name = "GovernmentAgencyPDFMargins"

    # Get the table object
    table = dynamodb.Table(table_name)

    if isinstance(event['body'], str):
        body = json.loads(event['body'])
    elif isinstance(event['body'], dict):
        body = event['body']

    agency_name = body['AgencyName']


    if not agency_name:
        return {
            'statusCode': 400,
            'body': json.dumps('AgencyName is required')
        }

    # Replace spaces with underscores
    sanitized_agency_name = agency_name.replace(" ", "_")

    print(f"sanitized_agency_name {sanitized_agency_name}")

    # Query the table for the matching AgencyName
    response = table.get_item(Key={'AgencyName': agency_name})
    if 'Item' not in response:
        raise Exception(f"No margin data found for agency {agency_name}")

    print(f"response {response}")

    # Check if any items were returned
    if 'Item' not in response:
        return {
            'statusCode': 404,
            'body': json.dumps(f'No data found for AgencyName: {sanitized_agency_name}')
        }

    margins = response['Item']

    print(f"margins {type(margins)} {margins}")

    margins_page1 = margins['PDFMargins1']
    margins_page2 = margins['PDFMargins2']


    # Create the response
    result = {
        'AgencyName': sanitized_agency_name,
        'PDFMargin1': margins_page1,
        'PDFMargin2': margins_page2
    }

    return {
        'statusCode': 200,
        'body': result
    }
