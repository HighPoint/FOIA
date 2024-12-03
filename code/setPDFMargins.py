import json
import boto3

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

    agency_name = body.get('AgencyName')
    pdf_margin1 = body.get('PDFMargins1')
    pdf_margin2 = body.get('PDFMargins2')

    # Validate inputs
    if not agency_name or not pdf_margin1 or not pdf_margin2:
        return {
            'statusCode': 400,
            'body': json.dumps('AgencyName, PDFMargin1, and PDFMargin2 are required')
        }

    # Replace spaces with underscores in the AgencyName
    sanitized_agency_name = agency_name.replace(" ", "_")

    print(f"sanitized_agency_name {sanitized_agency_name}")

    # Ensure that PDFMargin1 and PDFMargin2 have the correct structure
    if not all(k in pdf_margin1 for k in ("Right", "Bottom", "Left", "Top")) or not all(k in pdf_margin2 for k in ("Right", "Bottom", "Left", "Top")):
        return {
            'statusCode': 400,
            'body': json.dumps('PDFMargin1 and PDFMargin2 must include Right, Bottom, Left, and Top fields')
        }

    # Put the item into the DynamoDB table
    response = table.put_item(
        Item={
            'AgencyName': sanitized_agency_name,
            'PDFMargins1': pdf_margin1,
            'PDFMargins2': pdf_margin2
        }
    )

    print(f"response {response}")

    # Create the response
    result = {
        'AgencyName': sanitized_agency_name,
        'PDFMargins1': pdf_margin1,
        'PDFMargins2': pdf_margin2
    }

    return {
        'statusCode': 200,
        'body': json.dumps(result)
    }
