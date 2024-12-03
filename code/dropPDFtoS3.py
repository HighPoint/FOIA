import json
import boto3
import os

s3 = boto3.client('s3')

def lambda_handler(event, context):
    bucket_name = os.environ['S3_BUCKET_NAME']
    file_name = event['queryStringParameters']['file_name']
    content_type = event['queryStringParameters']['content_type']

    presigned_url = s3.generate_presigned_url(
        'put_object',
        Params={'Bucket': bucket_name, 'Key': file_name, 'ContentType': content_type},
        ExpiresIn=3600
    )

    return {
        'statusCode': 200,
        'body': json.dumps({'url': presigned_url}),
        'headers': {
            'Access-Control-Allow-Origin': '*'
        }
    }
