import json
import boto3
import csv
from io import StringIO
import time

s3 = boto3.client('s3')
lambda_client = boto3.client('lambda')

# Destination bucket for the merged CSV
bucket_out = 'poliscio-humanreview-csv'

def lambda_handler(event, context):
    # Process the SQS event
    print(f"event {event}")

    for record in event['Records']:
        body = json.loads(record['body'])
        csv_bucket = body['csv_bucket']
        csv_key = body['csv_key']
        page_number = body['page_number']
        total_pages = body['total_pages']

        # Exit if page_number is less than total_pages
        if page_number < total_pages:
            print(f"Page {page_number} is less than total pages {total_pages}. Exiting.")
            return {
                'statusCode': 200,
                'body': json.dumps('Exiting as page number is less than total pages.')
            }

        # If page_number equals total_pages, count keys in S3 and merge CSV files
        partial_key = '/'.join(csv_key.split('/')[:-1])  # Get the common prefix

        while True:
            response = s3.list_objects_v2(Bucket=csv_bucket, Prefix=partial_key)
            total_keys = len(response.get('Contents', []))

            if total_keys == total_pages:
                print(f"Successfully found {total_keys} keys in {csv_bucket}. Merging CSV files.")

                # Merge the CSV files
                sorted_keys = sorted([obj['Key'] for obj in response['Contents']], key=extract_page_number)
                merged_content = merge_csv_files(csv_bucket, sorted_keys)

                # Save the merged CSV to the output S3 bucket
                merged_csv_key = f"{partial_key}.csv"
                save_to_s3(merged_content, bucket_out, merged_csv_key)
                print(f"Merged CSV file saved to s3://{bucket_out}/{merged_csv_key}.")

                # Invoke the notification Lambda with a message for human review
                filename = merged_csv_key
                message = f'View file <a href="https://s3.amazonaws.com/poliscioalerts.com/humanreview.html?file={filename}" style="color:blue;"> {filename} </a> in human review.'
                invoke_add_notification_lambda(message)

                return {
                    'statusCode': 200,
                    'body': json.dumps({"message": f"Merged CSV file saved to s3://{bucket_out}/{merged_csv_key}"})
                }
            else:
                print(f"Found {total_keys} keys. Waiting to find {total_pages}. Retrying in 10 seconds.")
                time.sleep(10)

    return {
        'statusCode': 200,
        'body': json.dumps('SQS Event Processed')
    }

def extract_page_number(key):
    """
    Extracts the page number from the key by finding the last occurrence of "_".
    """
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

def merge_csv_files(bucket_name, keys):
    """
    Merge contents of multiple CSV files into a single string, deduplicating rows while preserving order.
    """
    merged_content = StringIO()
    writer = csv.writer(merged_content)

    seen_rows = set()
    previous_row = None
    header_length = 0

    # Write header from the first CSV file
    first_key = keys[0]
    first_obj = s3.get_object(Bucket=bucket_name, Key=first_key)
    first_reader = csv.reader(first_obj['Body'].read().decode('utf-8').splitlines())
    header = next(first_reader)
    writer.writerow(header)
    seen_rows.add(tuple(header))
    header_length = len(header)

    # Append rows from all CSV files
    for key in keys:
        obj = s3.get_object(Bucket=bucket_name, Key=key)
        reader = csv.reader(obj['Body'].read().decode('utf-8').splitlines())
        for row in reader:
            row = validate_row_length(row, header_length)
            row_tuple = tuple(row)
            if row_tuple not in seen_rows and any(cell.strip() for cell in row):  # Check if row is not empty or whitespace
                if previous_row and is_single_non_empty_cell(row):
                    previous_row = append_to_previous_row(previous_row, row)
                elif previous_row and should_append_to_previous(row):
                    previous_row = append_elements_to_previous_row(previous_row, row)
                else:
                    if previous_row:
                        writer.writerow(previous_row)
                        seen_rows.add(tuple(previous_row))
                    previous_row = row

    if previous_row:  # Write the last accumulated row
        writer.writerow(previous_row)
        seen_rows.add(tuple(previous_row))

    merged_content.seek(0)  # Move cursor to start of StringIO buffer
    return merged_content.getvalue()

def invoke_add_notification_lambda(message):
    """
    Invoke the AWS Lambda function addInternalWebNotificationHandler to send a notification.
    """
    # Prepare the event body for the notification Lambda in the required format
    event_payload = {
        'body': json.dumps({
            'message': message,
            'read': False,
            'isHyperlink': True
        }),
        'requestContext': {
            'http': {
                'method': 'POST'
            }
        }
    }

    # Invoke the notification Lambda function
    response = lambda_client.invoke(
        FunctionName='addInternalWebNotificationHandler',
        InvocationType='RequestResponse',
        Payload=json.dumps(event_payload)
    )

    # Read the response from the notification Lambda
    response_payload = json.loads(response['Payload'].read())
    print(f"Notification sent: {response_payload}")


def is_single_non_empty_cell(row):
    """
    Check if the row has only one non-empty cell.
    """
    non_empty_cells = [cell for cell in row if cell.strip()]
    return len(non_empty_cells) == 1

def should_append_to_previous(row):
    """
    Check if the first element in a row is empty or whitespace,
    and if the majority of the row is empty or whitespace.
    """
    if not row[0].strip():
        non_empty_cells = [cell for cell in row if cell.strip()]
        return len(non_empty_cells) <= len(row) // 2
    return False

def append_to_previous_row(prev_row, curr_row):
    """
    Append the single non-empty cell from the current row to the last non-empty cell in the previous row,
    while maintaining the column for the data.
    """
    non_empty_index = next(i for i, cell in enumerate(curr_row) if cell.strip())
    prev_row[non_empty_index] += f" {curr_row[non_empty_index]}"
    return prev_row

def append_elements_to_previous_row(prev_row, curr_row):
    """
    Append the elements from the current row to the corresponding elements in the previous row.
    """
    for i, cell in enumerate(curr_row):
        if cell.strip():
            prev_row[i] += f" {cell}"
    return prev_row

def validate_row_length(row, expected_length):
    """
    Validate the length of the row. If the length is greater than the expected length,
    remove empty or whitespace cells from right to left until the length matches the expected length.
    If the row is shorter than expected, pad it with empty strings.
    """
    if len(row) > expected_length:
        # Remove empty or whitespace cells from right to left until the length matches the expected length
        for index in range(len(row) - 1, -1, -1):
            if len(row) <= expected_length:
                break
            if not row[index].strip():
                row.pop(index)
    elif len(row) < expected_length:
        # If the row is shorter than expected, pad it with empty strings
        row.extend([''] * (expected_length - len(row)))

    return row


def save_to_s3(content, bucket, key):
    """
    Save content to S3 as CSV.
    """
    s3.put_object(Bucket=bucket, Key=key, Body=content.encode('utf-8'))
