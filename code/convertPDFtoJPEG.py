import json
import boto3
import os
from io import BytesIO
import poppler
import io
from pdf2image import convert_from_path, convert_from_bytes
from PIL import Image

s3 = boto3.client('s3') 


def lambda_handler(event, context):

    source_bucket = event['Records'][0]['s3']['bucket']['name']
    source_key = event['Records'][0]['s3']['object']['key']

    print(f"source_bucket {source_bucket}")
    print(f"source_key {source_key}")

        # Define the destination bucket
    destination_bucket = 'poliscio-raw-jpeg'  # Replace with your destination bucket name

    # Fetch the PDF from the source S3 bucket
    pdf_object = s3.get_object(Bucket=source_bucket, Key=source_key)
    pdf_content = pdf_object['Body'].read()

    # Convert PDF pages to images
    images = convert_from_bytes(pdf_content, dpi=72, first_page=1, last_page=2)

    # Iterate over the images and upload them to the destination bucket
    for page_number, image in enumerate(images, start=1):
        # Save image to BytesIO
        image_io = BytesIO()
        image.save(image_io, format='JPEG')
        image_io.seek(0)

        # Upload image to the destination S3 bucket
        image_key = f'{os.path.splitext(source_key)[0]}_page_{page_number}.jpg'
        s3.put_object(Bucket=destination_bucket, Key=image_key, Body=image_io, ContentType='image/jpeg')

    return {
        'statusCode': 200,
        'body': f'Successfully converted first two pages of {source_key} to 72 DPI JPEG images in {destination_bucket}'
    }
