import boto3
import os
from botocore.exceptions import ClientError
from botocore.config import Config
from dotenv import load_dotenv

load_dotenv()

def get_s3_client():
    region = os.getenv('AWS_REGION', 'eu-north-1')
    return boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=region,
        # Force path-style addressing and explicit regional endpoint
        endpoint_url=f"https://s3.{region}.amazonaws.com",
        config=Config(
            signature_version='s3v4',
            connect_timeout=10,
            read_timeout=30,
            retries={'max_attempts': 2}
        )
    )
def get_rekognition_client():
    # Rekognition is NOT available in eu-north-1 (Stockholm). 
    # We must use ap-south-1 (Mumbai) for AI features.
    return boto3.client(
        'rekognition',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name='ap-south-1',
        endpoint_url='https://rekognition.ap-south-1.amazonaws.com'
    )

def upload_file_to_s3(file_data, file_name, content_type, folder="tools"):
    """
    Upload a file to an S3 bucket and return a presigned URL.
    Raises an exception with a clear message on failure.
    """
    s3_client = get_s3_client()
    bucket_name = os.getenv('AWS_S3_BUCKET')
    region = os.getenv('AWS_REGION', 'eu-north-1')

    if not bucket_name:
        raise ValueError("AWS_S3_BUCKET environment variable is not set!")

    full_path = f"{folder}/{file_name}"

    try:
        s3_client.put_object(
            Bucket=bucket_name,
            Key=full_path,
            Body=file_data,
            ContentType=content_type
        )
        print(f"[S3] Uploaded: {full_path} to bucket {bucket_name} in {region}")
        
        # Construct the regional S3 URL (stored in DB)
        url = f"https://{bucket_name}.s3.{region}.amazonaws.com/{full_path}"
        return url

    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        raise Exception(f"S3 ClientError [{error_code}]: {error_msg} (Bucket: {bucket_name}, Region: {region})")
    except Exception as e:
        raise Exception(f"S3 upload failed: {str(e)}")

def get_presigned_url(file_key, expiration=86400):
    """
    Generate a presigned URL to share an S3 object.
    Default expiration: 24 hours.
    Returns None silently on failure (graceful degradation for reads).
    """
    s3_client = get_s3_client()
    bucket_name = os.getenv('AWS_S3_BUCKET')

    if not bucket_name or not file_key:
        return None

    try:
        response = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': file_key},
            ExpiresIn=expiration
        )
        return response
    except ClientError as e:
        print(f"[S3] Error generating presigned URL: {e}")
        return None

def verify_image_is_id(image_bytes: bytes):
    """
    Uses AWS Rekognition to detect if the image is likely an ID card.
    Returns (is_id, confidence, labels_found)
    """
    try:
        client = get_rekognition_client()
        response = client.detect_labels(
            Image={'Bytes': image_bytes},
            MaxLabels=15,
            MinConfidence=60
        )
        
        labels = [l['Name'] for l in response['Labels']]
        print(f"[AI VISION] Labels found: {labels}")
        
        # Stricter detection: Look for identity-specific markers
        id_markers = {"Id Card", "Id", "Identity Document", "Identification", "License", "Driver's License", "Document", "Passport", "Text", "Card", "Postal Card", "Paper", "Label"}
        
        # Check if we have an ID label with decent confidence
        # We look for a high-confidence ID marker, OR a combination of markers.
        has_strong_id_marker = False
        has_generic_id_marker = False
        is_document_like = False
        highest_conf = 0
        
        for label in response['Labels']:
            name = label['Name']
            conf = label['Confidence']
            
            # Strong markers that usually mean it's definitely an ID
            if name in ["Id Card", "License", "Driver's License", "Passport", "Identity Card"] and conf > 65:
                has_strong_id_marker = True
            
            # Generic/Structural markers
            if name in ["Identity Document", "Identification", "Id", "Card", "Postal Card"] and conf > 65:
                has_generic_id_marker = True
            
            # Structural markers
            if name in ["Document", "Text", "Paper", "Official Document"] and conf > 75:
                is_document_like = True
            
            highest_conf = max(highest_conf, conf)

        # TO PASS:
        # 1. Any strong ID marker at high confidence
        # 2. A document/text marker combined with any generic ID/Card marker
        if has_strong_id_marker or (is_document_like and has_generic_id_marker):
            return True, highest_conf, labels
            
        # Specific rejection for people/pets/objects
        if "Animal" in labels or "Pet" in labels or "Dog" in labels or "Cat" in labels:
             return False, 0, ["Detected Animal - Please upload your ID card"]
        if "Electronics" in labels or "Computer" in labels or "Laptop" in labels:
             return False, 0, ["Detected Gadget - Please upload your ID card"]
        if "Person" in labels and highest_conf < 70: # A selfie with no ID
             return False, 0, ["Detected Person - No ID found"]
             
        return False, 0, labels
    except Exception as e:
        print(f"[AI VISION] Critical Error: {e}")
        # BLOCK on error. Do not allow bypass.
        return False, 0, [f"AI Region/Service Error: {str(e)}"]
