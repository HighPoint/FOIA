import json
import boto3
import botocore
import io
import os
import pypdf

def lambda_handler(event, context):

    print(os.listdir("/opt"))
    print(f"pypdf version {pypdf.__version__}")

    bucket = event['Records'][0]['s3']['bucket']['name']
    key = event['Records'][0]['s3']['object']['key']

    stream = openPDFfromS3(bucket, key)
    file_binary = stream.getvalue()

    file_name = saveFileTempFile(file_binary)

    with open(file_name, "rb") as in_f:
        reader = pypdf.PdfReader(in_f)
        output = pypdf.PdfWriter()

        numPages = reader.get_num_pages()
        print(f"document has {numPages} pages.")

        page = reader.get_page(0)

        mb = page.mediabox
        print(f"mb.left {mb.left} mb.bottom {mb.bottom} mb.right {mb.right} mb.top {mb.top}")

        mb.bottom = 200
        mb.top = 412

        page.mediabox = pypdf.generic.RectangleObject((mb.left, mb.bottom, mb.right, mb.top))

        output.add_page(page)

        with open("/tmp/out.pdf", "wb") as out_f:
            output.write(out_f)

        saveLocalFileToS3("out.pdf", "foia-start", "croptest.pdf")



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

def saveLocalFileToS3(localFileName, bucketName, keyName):

    s3Client = boto3.client('s3')

    try:
        response = s3Client.upload_file('/tmp/'+ localFileName, bucketName, keyName)
    except botocore.exceptions.ClientError as e:
        raise ErrorResponse(e.response['Error'])

    return True
