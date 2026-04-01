import boto3
import os
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

def test_public_acl():
    s3_client = boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION')
    )
    bucket_name = os.getenv('AWS_S3_BUCKET')
    
    try:
        print(f"Testing public-read ACL on bucket {bucket_name}...")
        s3_client.put_object(
            Bucket=bucket_name,
            Key='test_public.txt',
            Body='This is a test public file.',
            ContentType='text/plain',
            ACL='public-read'
        )
        print("SUCCESS: Public-read ACL is allowed!")
        # Delete the test file
        s3_client.delete_object(Bucket=bucket_name, Key='test_public.txt')
    except ClientError as e:
        print(f"FAILURE: {e}")

if __name__ == "__main__":
    test_public_acl()
