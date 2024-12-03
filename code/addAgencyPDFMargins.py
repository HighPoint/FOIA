import json
import boto3
import os

# Initialize the DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = os.environ['TABLE_NAME']
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    try:
        # Parse input data
        data = json.loads(event['body'])
        agency_name = data['AgencyName']
        pdf_margins = data['PDFMargins']

        # Insert data into DynamoDB
        response = table.put_item(
            Item={
                'AgencyName': agency_name,
                'PDFMargins1': pdf_margins,
                'PDFMargins2': pdf_margins
            }
        )

        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Data inserted successfully'})
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(e)})
        }
