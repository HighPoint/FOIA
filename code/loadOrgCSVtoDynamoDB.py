import boto3
import csv
import os

def lambda_handler(event, context):

    bucket_name = "poliscioalerts.com"
    csv_key = "data/Org_Category_Names_2024_08_16.csv"

    s3 = boto3.client('s3')
    dynamodb = boto3.resource('dynamodb')

    table_name = 'org_category_names'

    table = dynamodb.Table(table_name)
    try:
        table.load()
    except dynamodb.meta.client.exceptions.ResourceNotFoundException:

        table = dynamodb.create_table(
            TableName=table_name,
            KeySchema=[
                {
                    'AttributeName': 'Organization_Name',  # Primary Key
                    'KeyType': 'HASH'
                }
            ],
            AttributeDefinitions=[
                {
                    'AttributeName': 'Organization_Name',  # Primary Key
                    'AttributeType': 'S'  # String type
                }
            ],
            BillingMode='PAY_PER_REQUEST'  # Use on-demand capacity mode
        )

        # Wait until the table exists before proceeding
        table.meta.client.get_waiter('table_exists').wait(TableName=table_name)

    s3_object = s3.get_object(Bucket=bucket_name, Key=csv_key)
    csv_content = s3_object['Body'].read().decode('utf-8').splitlines()

    csv_reader = csv.DictReader(csv_content)

    for row in csv_reader:
        existing_item = table.get_item(Key={'Organization_Name': row['Organization_Name']})

        if 'Item' in existing_item:
            # If the item exists, merge the new data with the existing data
            merged_item = {**existing_item['Item'], **row}
            table.put_item(Item=merged_item)
        else:
            # If the item does not exist, insert the new data
            table.put_item(Item=row)

    return {
        'statusCode': 200,
        'body': f'Successfully imported {csv_key} into {table_name}'
    }
