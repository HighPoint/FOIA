import json
import requests

def lambda_handler(event, context):
    print(f"event {event}")

    # Check for URL in query string parameters (existing test format)
    query_params = event.get('queryStringParameters', {})
    external_url = query_params.get('url', '')

    # Check for URL in request body (new event format)
    if not external_url and 'body' in event:
        try:
            body = json.loads(event['body'])  # Load the JSON body
            external_url = body.get('url', '')  # Extract the URL from the body
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'body': json.dumps('Error: Invalid JSON in request body')
            }

    # If no URL is provided in both formats
    if not external_url:
        return {
            'statusCode': 400,
            'body': json.dumps('Error: URL parameter is required')
        }

    try:
        # Fetch the content from the external URL
        response = requests.get(external_url)
        content = response.text

        # Inject JavaScript to capture link clicks
        injected_js = """
            <script>
                document.addEventListener('click', function(e) {
                    const link = e.target.closest('a');
                    if (link) {
                        console.log('Clicked link: ' + link.href);
                    }
                });
            </script>
        """

        # Insert the JavaScript just before the closing body tag
        if '</body>' in content:
            content = content.replace('</body>', injected_js + '</body>')
        else:
            content += injected_js  # If no closing body tag, append the script

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'text/html'
            },
            'body': content
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error fetching URL: {str(e)}')
        }
