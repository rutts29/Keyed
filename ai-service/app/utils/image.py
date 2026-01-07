import base64
import httpx
from io import BytesIO
from PIL import Image
import imagehash


async def download_image(uri: str, gateway: str) -> bytes:
    """Download image from IPFS or HTTP URL."""
    if uri.startswith("ipfs://"):
        cid = uri.replace("ipfs://", "")
        url = f"{gateway}/{cid}"
    else:
        url = uri

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content


def image_to_base64(image_bytes: bytes) -> str:
    """Convert image bytes to base64 data URI."""
    img = Image.open(BytesIO(image_bytes))
    fmt = img.format or "JPEG"
    mime = f"image/{fmt.lower()}"
    b64 = base64.b64encode(image_bytes).decode()
    return f"data:{mime};base64,{b64}"


def decode_base64_image(data_uri: str) -> bytes:
    """Extract raw bytes from base64 data URI."""
    if "," in data_uri:
        data_uri = data_uri.split(",", 1)[1]
    return base64.b64decode(data_uri)


def compute_phash(image_bytes: bytes) -> str:
    """Compute perceptual hash for image deduplication."""
    img = Image.open(BytesIO(image_bytes))
    return str(imagehash.phash(img))
