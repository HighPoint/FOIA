import json
import boto3
import os
from io import BytesIO
from pdf2image import convert_from_bytes
from PIL import Image
import urllib.request

s3 = boto3.client('s3')

def getAgencyShortName(file_key):
    parts = file_key.split('/')
    if len(parts) >= 2:
        agency_short_name = parts[1]  # Extract the agency short name between the first and second "/"
        print(f"Extracted agency short name: {agency_short_name}")
        return agency_short_name
    print("Agency short name could not be extracted.")
    return ""

def createPDFMargins(agency_name, image_url):
    if len(agency_name) == 0:
        print("Agency name is empty, skipping table check.")
        return None

    dynamodb = boto3.resource('dynamodb')
    table_name = "GovernmentAgencyPDFMargins"
    table = dynamodb.Table(table_name)

    sanitized_agency_name = agency_name.replace(" ", "_")

    # Check if margins already exist
    response = table.get_item(Key={'AgencyName': sanitized_agency_name})
    if 'Item' in response:
        print(f"Margins already exist for {sanitized_agency_name}")
        return response['Item']

    try:
        with urllib.request.urlopen(image_url) as url:
            with Image.open(url) as img:
                width, height = img.size
                print(f"Page width: {width}, Page height: {height}")
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return None

    margins = {
        "Right": width - 3,
        "Bottom": height - 3,
        "Left": 3,
        "Top": 3
    }

    print(f"Calculated margins for {sanitized_agency_name}: {margins}")

    # Store the new margins in DynamoDB
    response = table.put_item(
        Item={
            'AgencyName': sanitized_agency_name,
            'PDFMargins1': margins,
            'PDFMargins2': margins
        }
    )

    return {
        'AgencyName': sanitized_agency_name,
        'PDFMargins1': margins,
        'PDFMargins2': margins
    }

def lambda_handler(event, context):

    print(f"event {event}")

    if 'body' in event:
        event_body = json.loads(event['body'])
        records = event_body['Records']
    else:
        records = event['Records']

    source_bucket = records[0]['s3']['bucket']['name']
    source_key = records[0]['s3']['object']['key']

    print(f"source_bucket {source_bucket}")
    print(f"source_key {source_key}")

    destination_bucket = 'poliscio-raw-jpeg'

    pdf_object = s3.get_object(Bucket=source_bucket, Key=source_key)
    pdf_content = pdf_object['Body'].read()

    images = convert_from_bytes(pdf_content, dpi=72, first_page=1, last_page=2)

    for page_number, image in enumerate(images, start=1):
        image_io = BytesIO()
        image.save(image_io, format='JPEG')
        image_io.seek(0)

        image_key = f'{os.path.splitext(source_key)[0]}_page_{page_number}.jpg'
        s3.put_object(Bucket=destination_bucket, Key=image_key, Body=image_io, ContentType='image/jpeg')

        # Get the agency short name from the source key
        agency_short_name = getAgencyShortName(source_key)
        image_url = f"https://{destination_bucket}.s3.amazonaws.com/{image_key}"

        # Call the createPDFMargins function
        createPDFMargins(agency_short_name, image_url)

    return {
        'statusCode': 200,
        'body': f'Successfully converted the first two pages of {source_key} to 72 DPI JPEG images in {destination_bucket}'
    }
