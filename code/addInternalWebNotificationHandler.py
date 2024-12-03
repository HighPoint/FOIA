import boto3
import json
import os
from decimal import Decimal
from botocore.exceptions import ClientError

# DynamoDB Table Name
TABLE_NAME = os.getenv('DYNAMODB_TABLE', 'internal_notifications_table')

# DynamoDB Client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE_NAME)

def generate_unique_id():
    """Generate a unique numeric ID for the notification."""
    response = table.scan(
        ProjectionExpression="id"
    )
    if 'Items' in response and len(response['Items']) > 0:
        max_id = max(item['id'] for item in response['Items'])
        return max_id + 1
    else:
        return 1  # Start with ID 1 if the table is empty

def lambda_handler(event, context):
    try:
        # Ensure this is a POST request
        http_method = event['requestContext']['http']['method']
        if http_method != 'POST':
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Only POST method is allowed'})
            }

        # Parse the body of the request
        body = json.loads(event['body'])

        # Generate a unique numeric ID for the new notification
        notification_id = generate_unique_id()

        # Prepare the item to be inserted into DynamoDB
        notification_item = {
            'id': notification_id,
            'message': body.get('message', ''),
            'read': body.get('read', False),
            'isHyperlink': body.get('isHyperlink', False)
        }

        # Insert the item into the DynamoDB table
        table.put_item(Item=notification_item)

        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Notification added successfully!', 'id': notification_id})
        }

    except ClientError as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error: ' + str(e)})
        }
