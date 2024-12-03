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

# Helper function to convert Decimal to float/int
def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def lambda_handler(event, context):
    try:
        # Check if 'httpMethod' exists in the event
        http_method = event.get('httpMethod', None)

        if http_method == 'GET':
            # Fetch all notifications
            response = table.scan()
            notifications = response.get('Items', [])
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json'
                },
                'body': json.dumps(notifications, default=decimal_default)
            }

        elif http_method == 'POST':
            # Update notification status
            body = json.loads(event['body'])
            notification_id = body['id']
            if 'read' in body:
                table.update_item(
                    Key={'id': notification_id},
                    UpdateExpression="set #r = :r",
                    ExpressionAttributeNames={
                        '#r': 'read'
                    },
                    ExpressionAttributeValues={
                        ':r': body['read']
                    }
                )
            if 'deleted' in body and body['deleted']:
                table.delete_item(Key={'id': notification_id})

            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'Notification status updated'})
            }

        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid HTTP method or method not provided'})
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
