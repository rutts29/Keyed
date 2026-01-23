"""
SSRF Protection Tests (Criticality: 10/10)

Tests for the SSRF protection utilities in app/utils/image.py.
These tests verify that the application correctly blocks requests to:
- Localhost and loopback addresses
- Private IP ranges (10.x, 172.16.x, 192.168.x)
- AWS metadata endpoints (169.254.169.254)
- Non-HTTP schemes (file://, ftp://, etc.)
"""

import pytest
from app.utils.image import (
    validate_url_for_ssrf,
    is_private_ip,
    is_valid_ipfs_cid,
    SSRFProtectionError,
)


class TestSSRFProtection:
    """Test SSRF protection validation."""

    def test_blocks_localhost(self):
        """Localhost addresses should be blocked."""
        with pytest.raises(SSRFProtectionError):
            validate_url_for_ssrf("http://localhost/evil")
        with pytest.raises(SSRFProtectionError):
            validate_url_for_ssrf("http://localhost:8080/evil")

    def test_blocks_loopback_ipv4(self):
        """IPv4 loopback addresses should be blocked."""
        with pytest.raises(SSRFProtectionError):
            validate_url_for_ssrf("http://127.0.0.1/evil")
        with pytest.raises(SSRFProtectionError):
            validate_url_for_ssrf("http://127.0.0.1:3000/internal")

    def test_blocks_loopback_ipv6(self):
        """IPv6 loopback addresses should be blocked."""
        with pytest.raises(SSRFProtectionError):
            validate_url_for_ssrf("http://[::1]/evil")

    def test_blocks_private_class_a(self):
        """10.x.x.x private addresses should be blocked."""
        with pytest.raises(SSRFProtectionError):
            validate_url_for_ssrf("http://10.0.0.1/internal")
        with pytest.raises(SSRFProtectionError):
            validate_url_for_ssrf("http://10.255.255.255/internal")

    def test_blocks_private_class_b(self):
        """172.16.x.x - 172.31.x.x private addresses should be blocked."""
        with pytest.raises(SSRFProtectionError):
            validate_url_for_ssrf("http://172.16.0.1/internal")
        with pytest.raises(SSRFProtectionError):
            validate_url_for_ssrf("http://172.31.255.255/internal")

    def test_blocks_private_class_c(self):
        """192.168.x.x private addresses should be blocked."""
        with pytest.raises(SSRFProtectionError):
            validate_url_for_ssrf("http://192.168.1.1/internal")
        with pytest.raises(SSRFProtectionError):
            validate_url_for_ssrf("http://192.168.0.1/router")

    def test_blocks_aws_metadata(self):
        """AWS metadata endpoint should be blocked."""
        with pytest.raises(SSRFProtectionError):
            validate_url_for_ssrf("http://169.254.169.254/latest/meta-data/")
        with pytest.raises(SSRFProtectionError):
            validate_url_for_ssrf("http://169.254.169.254/latest/api/token")

    def test_blocks_link_local(self):
        """Link-local addresses (169.254.x.x) should be blocked."""
        with pytest.raises(SSRFProtectionError):
            validate_url_for_ssrf("http://169.254.1.1/")

    def test_blocks_file_scheme(self):
        """file:// URLs should be blocked."""
        with pytest.raises(SSRFProtectionError):
            validate_url_for_ssrf("file:///etc/passwd")
        with pytest.raises(SSRFProtectionError):
            validate_url_for_ssrf("file:///etc/shadow")

    def test_blocks_ftp_scheme(self):
        """ftp:// URLs should be blocked."""
        with pytest.raises(SSRFProtectionError):
            validate_url_for_ssrf("ftp://ftp.example.com/file")

    def test_allows_public_https(self):
        """Public HTTPS URLs should be allowed."""
        url = validate_url_for_ssrf("https://example.com/image.jpg")
        assert url == "https://example.com/image.jpg"

    def test_allows_public_http(self):
        """Public HTTP URLs should be allowed."""
        url = validate_url_for_ssrf("http://example.com/image.png")
        assert url == "http://example.com/image.png"

    def test_allows_cloudflare(self):
        """Cloudflare URLs should be allowed."""
        url = validate_url_for_ssrf("https://imagedelivery.net/abc123/image.jpg")
        assert "imagedelivery.net" in url

    def test_allows_ipfs_gateway(self):
        """IPFS gateway URLs should be allowed."""
        url = validate_url_for_ssrf("https://gateway.pinata.cloud/ipfs/Qm123abc")
        assert "pinata.cloud" in url


class TestIsPrivateIP:
    """Test private IP detection."""

    def test_loopback(self):
        """127.x.x.x should be private."""
        assert is_private_ip("127.0.0.1") is True
        assert is_private_ip("127.255.255.255") is True

    def test_class_a_private(self):
        """10.x.x.x should be private."""
        assert is_private_ip("10.0.0.1") is True
        assert is_private_ip("10.255.255.255") is True

    def test_class_b_private(self):
        """172.16-31.x.x should be private."""
        assert is_private_ip("172.16.0.1") is True
        assert is_private_ip("172.31.255.255") is True
        # 172.15.x.x and 172.32.x.x are NOT private
        assert is_private_ip("172.15.0.1") is False
        assert is_private_ip("172.32.0.1") is False

    def test_class_c_private(self):
        """192.168.x.x should be private."""
        assert is_private_ip("192.168.0.1") is True
        assert is_private_ip("192.168.255.255") is True

    def test_link_local(self):
        """169.254.x.x should be private (link-local)."""
        assert is_private_ip("169.254.169.254") is True
        assert is_private_ip("169.254.1.1") is True

    def test_public_ips(self):
        """Public IPs should not be private."""
        assert is_private_ip("8.8.8.8") is False
        assert is_private_ip("1.1.1.1") is False
        assert is_private_ip("142.250.185.238") is False  # google.com

    def test_invalid_ip_returns_true_as_failsafe(self):
        """Invalid IPs should return True as a security fail-safe (unparseable = potentially dangerous)."""
        assert is_private_ip("not.an.ip") is True
        assert is_private_ip("") is True


class TestIPFSCIDValidation:
    """Test IPFS CID validation."""

    def test_valid_cid_v0(self):
        """Valid CIDv0 (Qm...) should pass."""
        # Real CIDv0 example
        assert is_valid_ipfs_cid("QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG") is True

    def test_valid_cid_v1(self):
        """Valid CIDv1 (bafy...) should pass."""
        # Real CIDv1 example
        assert is_valid_ipfs_cid("bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi") is True

    def test_invalid_cid_wrong_prefix(self):
        """CIDs with wrong prefix should fail."""
        assert is_valid_ipfs_cid("InvalidCID") is False
        assert is_valid_ipfs_cid("Xm123456789") is False

    def test_invalid_cid_too_short(self):
        """CIDs that are too short should fail."""
        assert is_valid_ipfs_cid("Qm123") is False
        assert is_valid_ipfs_cid("bafy123") is False

    def test_invalid_cid_empty(self):
        """Empty strings should fail."""
        assert is_valid_ipfs_cid("") is False

    def test_invalid_cid_none_raises(self):
        """None input raises TypeError (function expects string)."""
        with pytest.raises(TypeError):
            is_valid_ipfs_cid(None)  # type: ignore
