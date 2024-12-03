import json
import boto3
import io
import os
from datetime import datetime
import pytz
from pypdf import PdfReader, PdfWriter
from decimal import Decimal

# AWS Clients
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
sqs = boto3.client('sqs')

# Constants
TABLE_NAME = "GovernmentAgencyPDFMargins"
S3_BUCKET = "poliscio-processed-input"
SQS_QUEUE_NAME = "sqs_pdf_crop_pages"
EST = pytz.timezone('America/New_York')

# Define the timestamp at the start to make it a constant
timestamp_utc = datetime.utcnow().replace(tzinfo=pytz.utc)
TIMESTAMP_EST = timestamp_utc.astimezone(EST).strftime("%d_%m_%y_%H_%M_%S")

def lambda_handler(event, context):
    # Extract agency name, original PDF S3 details, and max pages from the event

    print(f"event {event}")

    if 'body' in event:
        # Parse the JSON body
        body = json.loads(event['body'])
        agency_name = body['agency_name']
        input_s3_bucket = body['input_s3_bucket']
        input_s3_key = body['input_s3_key']
        max_pages = body.get('max_pages', 0)  # Default to 0 if not provided
    else:
        # Use the original event structure
        agency_name = event['agency_name']
        input_s3_bucket = event['input_s3_bucket']
        input_s3_key = event['input_s3_key']
        max_pages = event.get('max_pages', 0)  # Default to 0 if not provided


    # Get margin coordinates from DynamoDB
    table = dynamodb.Table(TABLE_NAME)
    response = table.get_item(Key={'AgencyName': agency_name})
    if 'Item' not in response:
        raise Exception(f"No margin data found for agency {agency_name}")

    margins = response['Item']
    margins_page1 = margins['PDFMargins1']
    margins_page2 = margins['PDFMargins2']

    # Convert Decimal to float for usage in pypdf
    margins_page1 = {k: float(v) for k, v in margins_page1.items()}
    margins_page2 = {k: float(v) for k, v in margins_page2.items()}

    # Get the original PDF from S3
    original_pdf = s3.get_object(Bucket=input_s3_bucket, Key=input_s3_key)
    pdf_content = original_pdf['Body'].read()

    # Open the PDF with pypdf
    pdf_reader = PdfReader(io.BytesIO(pdf_content))
    total_pages = len(pdf_reader.pages)

    # Determine how many pages to process
    pages_to_process = total_pages if max_pages == 0 else min(max_pages, total_pages)

    # Get SQS queue URL
    sqs_queue_url = sqs.get_queue_url(QueueName=SQS_QUEUE_NAME)['QueueUrl']

    # Process and save each page
    cropped_pages = []
    for page_number in range(pages_to_process):
        page = pdf_reader.pages[page_number]

        # Determine the margins to use
        if page_number == 0:
            # Use margins for the first page
            mb_left = margins_page1['Left']
            mb_bottom = margins_page1['Bottom']
            mb_right = margins_page1['Right']
            mb_top = margins_page1['Top']
        else:
            # Use margins for the second and subsequent pages
            mb_left = margins_page2['Left']
            mb_bottom = margins_page2['Bottom']
            mb_right = margins_page2['Right']
            mb_top = margins_page2['Top']

        # Calculate the new media box
        new_media_box = [
            mb_left,  # Lower-left x
            mb_bottom,  # Lower-left y
            mb_right,  # Upper-right x
            mb_top  # Upper-right y
        ]

        # Create a new PDF writer and add the cropped page
        pdf_writer = PdfWriter()
        page.mediabox.lower_left = (new_media_box[0], new_media_box[1])
        page.mediabox.upper_right = (new_media_box[2], new_media_box[3])
        pdf_writer.add_page(page)

        # Save the cropped page to a byte buffer
        buffer = io.BytesIO()
        pdf_writer.write(buffer)
        buffer.seek(0)

        # Generate the output S3 key
        base_filename = os.path.splitext(input_s3_key)[0]  # Strip the ".pdf" extension
        output_s3_key = f"{base_filename}_{TIMESTAMP_EST}/page_{page_number + 1}.pdf"

        # Upload the cropped page to S3
        s3.put_object(Bucket=S3_BUCKET, Key=output_s3_key, Body=buffer)
        cropped_pages.append(output_s3_key)

        # Send message to SQS for each page
        message = {
            'cropped_pdf_s3_bucket': S3_BUCKET,
            'cropped_pdf_s3_key': output_s3_key,
            'page_number': page_number + 1,
            'total_pages': total_pages
        }

        sqs.send_message(
            QueueUrl=sqs_queue_url,
            MessageBody=json.dumps(message)
        )

    return {
        'statusCode': 200,
        'body': json.dumps({
            'cropped_pages': cropped_pages
        })
    }
