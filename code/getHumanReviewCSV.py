import json
import boto3

def lambda_handler(event, context):

    bucket_name = 'poliscio-humanreview-csv'

    body = event.get('body', '')

    # Extract the filename from the incoming body
    try:
        filename = body.split('/filename/:/')[1].strip('/')
    except IndexError:
        return {
            'statusCode': 400,
            'body': json.dumps('Invalid body format. Expected "/filename/:/xxx/".')
        }

    s3 = boto3.client('s3')

    try:
        # Fetch the file from S3
        response = s3.get_object(Bucket=bucket_name, Key=filename)
        file_content = response['Body'].read().decode('utf-8')

        # Return the file content
        return {
            'statusCode': 200,
            'body': json.dumps(file_content)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(str(e))
        }
