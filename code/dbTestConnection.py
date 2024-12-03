import os
import mysql.connector
import json

def lambda_handler(event, context):
    db_host = os.getenv('DB_HOST')
    db_user = os.getenv('DB_USER')
    db_password = os.getenv('DB_PASSWORD')
 #   db_name = os.getenv('DB_NAME')

    body = event.get('body')

    if not body:
        return {
            'statusCode': 400,
            'body': 'No body found in the event.'
        }

    try:
        body_json = json.loads(body)
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'body': 'Body is not valid JSON.'
        }

    sql_commands = body_json.get('sql_commands', '')

    if not sql_commands:
        return {
            'statusCode': 400,
            'body': 'No sql_commands provided in the body.'
        }

    try:
        connection = mysql.connector.connect(
            host=db_host,
            user=db_user,
            password=db_password
        )
        print("Connection successful")
        cursor = connection.cursor(buffered=True)  # Use buffered cursor

        cursor.execute("SHOW DATABASES;")
        databases = [db[0] for db in cursor.fetchall()]
        print("Available Databases:", databases)

        db_name = 'poliscio'

        if db_name in databases:
            # Select the existing database
            connection.database = db_name
            print(f"Using database '{db_name}'.")
        else:
            # Create the database
            cursor.execute(f"CREATE DATABASE {db_name}")
            connection.database = db_name
            print(f"Database '{db_name}' created and selected.")

        # Execute SQL commands and collect results
        results = execute_sql_commands(sql_commands, connection)
        print("SQL commands executed successfully")
        print(f"results {results}")

    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return {
            'statusCode': 500,
            'body': f"Database error: {err}"
        }
    finally:
        if connection.is_connected():
            connection.close()
            print("Connection closed")

    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'SQL commands executed successfully.',
            'results': results
        })
    }

def execute_sql_commands(sql_commands, connection):
    cursor = connection.cursor(buffered=True)  # Use buffered cursor
    commands = sql_commands.strip().split(';')
    results = []
    for command in commands:
        command = command.strip()
        if command:
            try:
                cursor.execute(command)
                if cursor.with_rows:
                    rows = cursor.fetchall()
                    columns = cursor.column_names
                    # Convert rows to list of dictionaries
                    data = [dict(zip(columns, row)) for row in rows]
                    results.append({
                        'command': command,
                        'data': data
                    })
                else:
                    results.append({
                        'command': command,
                        'rowcount': cursor.rowcount
                    })
            except mysql.connector.Error as err:
                print(f"Error executing command: {command}\nError: {err}")
                raise err
    connection.commit()
    return results
