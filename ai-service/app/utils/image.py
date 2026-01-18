import base64
import httpx
import ipaddress
import re
import socket
from io import BytesIO
from urllib.parse import urlparse
from PIL import Image
import imagehash


# IPFS CID v0 (Qm...) and v1 (ba...) patterns
IPFS_CID_V0_PATTERN = re.compile(r'^Qm[1-9A-HJ-NP-Za-km-z]{44}$')
IPFS_CID_V1_PATTERN = re.compile(r'^b[a-z2-7]{58}$')


class SSRFProtectionError(Exception):
    """Raised when a URL is blocked due to SSRF protection."""
    pass


def is_valid_ipfs_cid(cid: str) -> bool:
    """Validate IPFS CID format (v0 or v1)."""
    return bool(IPFS_CID_V0_PATTERN.match(cid) or IPFS_CID_V1_PATTERN.match(cid))


def is_private_ip(ip_str: str) -> bool:
    """Check if an IP address is private, localhost, or otherwise restricted."""
    try:
        ip = ipaddress.ip_address(ip_str)
        # Block private, loopback, link-local, reserved, and multicast addresses
        return (
            ip.is_private or
            ip.is_loopback or
            ip.is_link_local or
            ip.is_reserved or
            ip.is_multicast or
            ip.is_unspecified
        )
    except ValueError:
        # If we can't parse the IP, treat it as potentially dangerous
        return True


def validate_url_for_ssrf(url: str) -> str:
    """
    Validate URL to prevent SSRF attacks.

    Raises SSRFProtectionError if the URL is potentially dangerous.
    Returns the validated URL if safe.
    """
    parsed = urlparse(url)

    # Only allow http and https schemes
    if parsed.scheme not in ('http', 'https'):
        raise SSRFProtectionError(f"Invalid URL scheme: {parsed.scheme}. Only http/https allowed.")

    hostname = parsed.hostname
    if not hostname:
        raise SSRFProtectionError("URL must have a valid hostname")

    # Block explicit localhost references
    blocked_hosts = {'localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'}
    if hostname.lower() in blocked_hosts:
        raise SSRFProtectionError(f"Access to {hostname} is not allowed")

    # Resolve hostname and check if it resolves to a private IP
    try:
        # Get all IP addresses for the hostname
        addr_info = socket.getaddrinfo(hostname, parsed.port or 443, proto=socket.IPPROTO_TCP)
        for family, type_, proto, canonname, sockaddr in addr_info:
            ip_str = sockaddr[0]
            if is_private_ip(ip_str):
                raise SSRFProtectionError(
                    f"URL resolves to private/internal IP address: {ip_str}"
                )
    except socket.gaierror as e:
        raise SSRFProtectionError(f"Could not resolve hostname: {hostname}") from e

    return url


async def download_image(uri: str, gateway: str) -> bytes:
    """Download image from IPFS or HTTP URL with SSRF protection."""
    if uri.startswith("ipfs://"):
        cid = uri.replace("ipfs://", "")
        # Validate CID format to prevent injection
        if not is_valid_ipfs_cid(cid):
            raise SSRFProtectionError(f"Invalid IPFS CID format: {cid}")
        url = f"{gateway}/{cid}"
    else:
        url = uri

    # Validate URL for SSRF before making request
    validate_url_for_ssrf(url)

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=False) as client:
        response = await client.get(url)

        # If redirect, validate the redirect URL too
        if response.is_redirect:
            redirect_url = response.headers.get('location')
            if redirect_url:
                validate_url_for_ssrf(redirect_url)
                response = await client.get(redirect_url)

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
