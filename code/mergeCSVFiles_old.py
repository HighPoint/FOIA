import json
import boto3
import csv
from io import StringIO

s3 = boto3.client('s3')

bucket_name = 'poliscio-processed-csv'
prefix = 'PDF/Animal_Plant_And_Health_Inspection/Animal_Plant_and_Health_Inspection_Service_-_FOIA Logs_-_september-23_18_07_24_07_54_18'
bucket_out = 'poliscio-final-csv'

def lambda_handler(event, context):

    response = s3.list_objects_v2(Bucket=bucket_name, Prefix=prefix)


    if 'Contents' in response:
        keys = [obj['Key'] for obj in response['Contents']]

        sorted_keys = sorted(keys, key=extract_page_number)

        # Merge CSV files
        merged_content = merge_csv_files(sorted_keys)

        # Save merged content to a CSV file
        merged_csv_key = f"{prefix}/output.csv"
        save_to_s3(merged_content, bucket_out, merged_csv_key)

        return {
            'statusCode': 200,
            'body': json.dumps({"message": f"Merged CSV files saved to s3://{bucket_out}/{merged_csv_key}"})
        }
    else:
        return {
            'statusCode': 404,
            'body': json.dumps("No keys found with the specified prefix.")
        }

def extract_page_number(key):

    # Find the last occurrence of "_" in the key
    last_underscore_index = key.rfind('_')

    if last_underscore_index != -1:

        start_index = last_underscore_index + 1
        end_index = key.find('.csv', start_index)

        if start_index > 0 and end_index > start_index:
            try:
                return int(key[start_index:end_index])
            except ValueError:
                return float('inf')  # Return a very high number for keys that don't match the pattern
        else:
            return float('inf')  # Return a very high number if the pattern is not found
    else:
        return float('inf')  # Return a very high number if "_" is not found

def merge_csv_files(keys):
    """
    Merge contents of multiple CSV files into a single string.
    """
    merged_content = StringIO()
    writer = csv.writer(merged_content)

    # Write header from the first CSV file
    first_key = keys[0]
    first_obj = s3.get_object(Bucket=bucket_name, Key=first_key)
    first_reader = csv.reader(first_obj['Body'].read().decode('utf-8').splitlines())
    header = next(first_reader)
    writer.writerow(header)

    # Append rows from remaining CSV files
    for key in keys:
        obj = s3.get_object(Bucket=bucket_name, Key=key)
        reader = csv.reader(obj['Body'].read().decode('utf-8').splitlines())
        next(reader)  # Skip header row
        for row in reader:
            if any(cell.strip() for cell in row):  # Check if row is not empty or whitespace
                writer.writerow(row)

    merged_content.seek(0)  # Move cursor to start of StringIO buffer
    return merged_content.getvalue()

def save_to_s3(content, bucket, key):
    """
    Save content to S3 as CSV.
    """
    s3.put_object(Bucket=bucket, Key=key, Body=content.encode('utf-8'))
