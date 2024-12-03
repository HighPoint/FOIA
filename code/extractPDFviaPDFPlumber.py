import json
import boto3
import io
import os
import cryptography
import pdfplumber

def lambda_handler(event, context):

    print(os.listdir("/opt/"))
    print(f"cryptography version {cryptography.__version__}")
    print(f"pdfplumber version {pdfplumber.__version__}")

    bucket = event['Records'][0]['s3']['bucket']['name']
    key = event['Records'][0]['s3']['object']['key']

    stream = openPDFfromS3(bucket, key)
    file_binary = stream.getvalue()

    file_name = saveFileTempFile(file_binary)

    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!')
    }

def openPDFfromS3(bucketName, keyInput):

    s3 = boto3.client('s3')
    s3_connection = boto3.resource('s3')

    waiterFlg = s3.get_waiter('object_exists')
    waiterFlg.wait(Bucket=bucketName, Key=keyInput)

    s3_object = s3_connection.Object(bucketName,keyInput)
    s3_response = s3_object.get()

    stream = io.BytesIO(s3_response['Body'].read())

    return stream

def saveFileTempFile(file_binary):

    fileName = "/tmp/file.pdf"
    with open( fileName, "wb") as f:
        f.write(file_binary)
        f.close()

    return fileName
