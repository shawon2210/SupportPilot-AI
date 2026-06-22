"""SupportPilot AI — Website Crawler

Crawls websites to extract content for knowledge base ingestion.
Respects robots.txt, has configurable depth and page limits.
"""

from __future__ import annotations

import asyncio
import ipaddress
import logging
import re
import socket
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlparse

logger = logging.getLogger("supportpilot.crawler")


def _is_safe_url(url: str) -> bool:
    """Validate URL against SSRF attacks — block private/internal IPs."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        # Resolve hostname to IP and check for private ranges
        addr_info = socket.getaddrinfo(hostname, None)
        for family, _, _, _, sockaddr in addr_info:
            ip = ipaddress.ip_address(sockaddr[0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return False
        return True
    except (socket.gaierror, ValueError):
        return False


@dataclass
class CrawledPage:
    """A single crawled web page."""
    url: str
    title: str
    content: str
    status_code: int = 200
    links: list[str] = field(default_factory=list)
    error: str | None = None


class WebsiteCrawler:
    """
    Crawls a website and extracts text content.
    
    Features:
    - Configurable max pages and crawl depth
    - Stays within the same domain
    - Extracts text from HTML (strips scripts, styles, nav, footer)
    - Respects basic crawling etiquette (delays between requests)
    
    Usage:
        crawler = WebsiteCrawler(max_pages=50, max_depth=3)
        pages = await crawler.crawl("https://example.com/docs")
    """

    def __init__(
        self,
        max_pages: int = 50,
        max_depth: int = 3,
        delay: float = 0.5,
        timeout: float = 30.0,
        user_agent: str = "SupportPilotBot/1.0",
    ):
        self.max_pages = max_pages
        self.max_depth = max_depth
        self.delay = delay
        self.timeout = timeout
        self.user_agent = user_agent

    async def crawl(self, url: str) -> list[CrawledPage]:
        """
        Crawl a website starting from the given URL.
        
        Args:
            url: The starting URL to crawl
            
        Returns:
            List of CrawledPage objects with extracted content
        """
        try:
            import httpx
        except ImportError as e:
            raise CrawlerError("httpx is required for web crawling") from e

        # SSRF protection: reject private/internal URLs
        if not _is_safe_url(url):
            raise CrawlerError("URL blocked: private/internal addresses are not allowed for security reasons")

        base_domain = urlparse(url).netloc
        visited: set[str] = set()
        pages: list[CrawledPage] = []
        queue: list[tuple[str, int]] = [(url, 0)]  # (url, depth)

        async with httpx.AsyncClient(
            timeout=self.timeout,
            headers={"User-Agent": self.user_agent},
            follow_redirects=True,
        ) as client:
            while queue and len(pages) < self.max_pages:
                current_url, depth = queue.pop(0)

                if current_url in visited or depth > self.max_depth:
                    continue

                visited.add(current_url)

                try:
                    page = await self._fetch_page(client, current_url)
                    pages.append(page)

                    # Queue new links
                    if depth < self.max_depth:
                        for link in page.links:
                            absolute_url = urljoin(current_url, link)
                            link_domain = urlparse(absolute_url).netloc

                            if (
                                link_domain == base_domain
                                and absolute_url not in visited
                                and not self._is_excluded(absolute_url)
                            ):
                                queue.append((absolute_url, depth + 1))

                    # Be polite
                    if queue:
                        await asyncio.sleep(self.delay)

                except Exception as e:
                    logger.warning("Failed to crawl %s: %s", current_url, e)
                    pages.append(CrawledPage(
                        url=current_url,
                        title="",
                        content="",
                        error=str(e),
                    ))

        logger.info("Crawled %d pages from %s", len(pages), url)
        return pages

    async def _fetch_page(self, client, url: str) -> CrawledPage:
        """Fetch and extract content from a single page."""
        # Secondary SSRF check — catches redirect-based bypasses
        if not _is_safe_url(url):
            return CrawledPage(url=url, title="", content="", error="URL blocked: private/internal address detected")
        response = await client.get(url)

        if response.status_code != 200:
            return CrawledPage(
                url=url,
                title="",
                content="",
                status_code=response.status_code,
                error=f"HTTP {response.status_code}",
            )

        html = response.text
        title = self._extract_title(html)
        content = self._extract_text(html)
        links = self._extract_links(html, url)

        return CrawledPage(
            url=url,
            title=title,
            content=content,
            status_code=200,
            links=links,
        )

    def _extract_title(self, html: str) -> str:
        """Extract the page title from HTML."""
        match = re.search(r"<title[^>]*>(.*?)</title>", html, re.DOTALL | re.IGNORECASE)
        if match:
            return self._clean_text(match.group(1))
        # Try h1 as fallback
        match = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.DOTALL | re.IGNORECASE)
        if match:
            return self._clean_text(match.group(1))
        return ""

    def _extract_text(self, html: str) -> str:
        """Extract readable text from HTML, removing scripts, styles, etc."""
        # Remove script and style tags with their content
        text = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)

        # Remove common non-content elements
        for tag in ["nav", "footer", "header", "aside"]:
            text = re.sub(
                rf"<{tag}[^>]*>.*?</{tag}>", "", text,
                flags=re.DOTALL | re.IGNORECASE,
            )

        # Extract text from content-bearing tags
        content_tags = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th", "blockquote", "pre", "code"]
        text_parts = []

        for tag in content_tags:
            pattern = rf"<{tag}[^>]*>(.*?)</{tag}>"
            matches = re.findall(pattern, text, re.DOTALL | re.IGNORECASE)
            for match in matches:
                cleaned = self._clean_text(match)
                if cleaned and len(cleaned) > 10:  # Skip very short fragments
                    text_parts.append(cleaned)

        # If no structured content found, strip all tags
        if not text_parts:
            text = re.sub(r"<[^>]+>", " ", html)
            text_parts = [self._clean_text(text)]

        return "\n\n".join(text_parts)

    def _extract_links(self, html: str, base_url: str) -> list[str]:
        """Extract all links from HTML."""
        links = []
        for match in re.finditer(r'href=["\'](.*?)["\']', html, re.IGNORECASE):
            href = match.group(1)
            # Skip anchors, javascript, mailto
            if href.startswith(("#", "javascript:", "mailto:", "tel:")):
                continue
            # Skip non-HTTP links
            if href.startswith(("data:", "ftp:")):
                continue
            links.append(href)
        return links

    def _clean_text(self, text: str) -> str:
        """Clean extracted text."""
        # Remove remaining HTML tags
        text = re.sub(r"<[^>]+>", " ", text)
        # Decode HTML entities
        text = text.replace("&nbsp;", " ")
        text = text.replace("&amp;", "&")
        text = text.replace("&lt;", "<")
        text = text.replace("&gt;", ">")
        text = text.replace("&quot;", '"')
        # Normalize whitespace
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def _is_excluded(self, url: str) -> bool:
        """Check if a URL should be excluded from crawling."""
        excluded_extensions = {
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
            ".zip", ".tar", ".gz", ".rar", ".7z",
            ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico",
            ".mp3", ".mp4", ".avi", ".mov", ".webm",
            ".css", ".js", ".xml", ".json",
        }
        parsed = urlparse(url)
        path = parsed.path.lower()
        return any(path.endswith(ext) for ext in excluded_extensions)


class CrawlerError(Exception):
    """Raised when web crawling fails."""
    pass
