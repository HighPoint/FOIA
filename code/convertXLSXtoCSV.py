import json
import os
import boto3
import pandas as pd
from io import BytesIO
import chardet

s3_client = boto3.client('s3')

def lambda_handler(event, context):
    try:
        # Extract the S3 key from the event
        origin_bucket = 'poliscio-raw-input'
        destination_bucket = 'poliscio-humanreview-csv'

        print(f"event {event}")

        # Check if the event is in the expected format or the HTML-based format
        if 's3_key' in event:
            s3_key = event['s3_key']
        elif 'body' in event:
            body = json.loads(event['body'])
            s3_key = body.get('s3_key')
        else:
            return {
                'statusCode': 400,
                'body': json.dumps('Invalid event format')
            }

        if not s3_key:
            return {
                'statusCode': 400,
                'body': json.dumps('Missing s3_key in event')
            }

        # Check if the file is a CSV or XLSX
        file_extension = s3_key.rsplit('.', 1)[-1].lower()

        if file_extension == 'xlsx':
            return handle_xlsx_file(origin_bucket, destination_bucket, s3_key)

        elif file_extension == 'csv':
            return handle_csv_file(origin_bucket, destination_bucket, s3_key)

        else:
            return {
                'statusCode': 400,
                'body': json.dumps('Unsupported file type')
            }

    except Exception as e:
        error_message = f"Error in lambda_handler: {str(e)}"
        print(error_message)
        return {
            'statusCode': 500,
            'body': json.dumps(error_message)
        }

def handle_xlsx_file(origin_bucket, destination_bucket, s3_key):
    try:
        # Download the XLSX file from S3
        xlsx_object = s3_client.get_object(Bucket=origin_bucket, Key=s3_key)
        xlsx_content = xlsx_object['Body'].read()

        # Convert XLSX to CSV using pandas
        xlsx_data = pd.read_excel(BytesIO(xlsx_content))
        csv_buffer = BytesIO()
        xlsx_data.to_csv(csv_buffer, index=False)

        # Generate the new key with the .csv extension
        csv_key = s3_key.rsplit('.', 1)[0] + '.csv'

        # Upload the CSV to the destination bucket
        s3_client.put_object(Bucket=destination_bucket, Key=csv_key, Body=csv_buffer.getvalue())

        return {
            'statusCode': 200,
            'body': json.dumps(f'File converted and saved as {csv_key}')
        }

    except Exception as e:
        error_message = f"Error in handle_xlsx_file: {str(e)}"
        print(error_message)
        return {
            'statusCode': 500,
            'body': json.dumps(error_message)
        }

def handle_csv_file(origin_bucket, destination_bucket, s3_key):
    try:
        # Process the CSV file
        process_csv_file(origin_bucket, destination_bucket, s3_key)

        return {
            'statusCode': 200,
            'body': json.dumps(f'CSV file moved to {destination_bucket} as {s3_key}')
        }

    except Exception as e:
        error_message = f"Error in handle_csv_file: {str(e)}"
        print(error_message)
        return {
            'statusCode': 500,
            'body': json.dumps(error_message)
        }

def process_csv_file(origin_bucket, destination_bucket, s3_key):
    try:
        # Download the file from the source bucket
        response = s3_client.get_object(Bucket=origin_bucket, Key=s3_key)
        file_content = response['Body'].read()

        # Detect the encoding of the file using chardet
        result = chardet.detect(file_content)
        source_encoding = result['encoding']
        confidence = result['confidence']
        print(f"Detected encoding: {source_encoding} with confidence {confidence}")

        # If the encoding is not UTF-8, convert it
        if source_encoding.lower() != 'utf-8':
            # Decode the file content using the detected encoding
            decoded_content = file_content.decode(source_encoding)

            # Re-encode the content to UTF-8
            utf8_content = decoded_content.encode('utf-8')
            print(f"Converted file {s3_key} from {source_encoding} to UTF-8.")
        else:
            # If already UTF-8, no conversion needed
            utf8_content = file_content
            print(f"File {s3_key} is already in UTF-8 encoding.")

        # Save the (converted) file to the destination bucket
        s3_client.put_object(Bucket=destination_bucket, Key=s3_key, Body=utf8_content)
        print(f"Uploaded file {s3_key} to bucket {destination_bucket}.")

    except Exception as e:
        error_message = f"Error in process_csv_file: {str(e)}"
        print(error_message)
        raise e
