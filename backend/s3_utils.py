import boto3
import os
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

def get_s3_client():
    return boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION')
    )

def upload_file_to_s3(file_data, file_name, content_type, folder="others"):
    """
    Upload a file to an S3 bucket and return the public URL.
    """
    s3_client = get_s3_client()
    bucket_name = os.getenv('AWS_S3_BUCKET')
    
    # Organize by folder
    full_path = f"{folder}/{file_name}"
    
    try:
        s3_client.put_object(
            Bucket=bucket_name,
            Key=full_path,
            Body=file_data,
            ContentType=content_type
        )
        
        # Construct the public URL
        region = os.getenv('AWS_REGION', 'us-east-1')
        # Handle cases where bucket name contains dots (needs specific URL format)
        url = f"https://{bucket_name}.s3.{region}.amazonaws.com/{full_path}"
        return url
    except ClientError as e:
        print(f"Error uploading to S3: {e}")
        return None

def get_presigned_url(file_key, expiration=3600):
    """
    Generate a presigned URL to share an S3 object.
    """
    s3_client = get_s3_client()
    bucket_name = os.getenv('AWS_S3_BUCKET')
    
    try:
        response = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': file_key},
            ExpiresIn=expiration
        )
        return response
    except ClientError as e:
        print(f"Error generating presigned URL: {e}")
        return None
