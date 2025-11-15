"""
CMU CS Course Scraper
Scrapes Carnegie Mellon Computer Science course websites for:
- Textbooks and PDFs
- Recitations
- Homeworks/Assignments
- Lecture notes
- Other course materials

Runs as a background process to keep course data up-to-date.
"""

import os
import re
import time
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Set
from urllib.parse import urljoin, urlparse
from datetime import datetime

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('course_scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Rate limiting: wait between requests (seconds)
REQUEST_DELAY = 2.0
MAX_RETRIES = 3
TIMEOUT = 30

# File extensions to download
PDF_EXTENSIONS = {'.pdf'}
DOCUMENT_EXTENSIONS = {'.pdf', '.doc', '.docx', '.txt', '.md', '.html'}

# Keywords to identify different material types
HOMEWORK_KEYWORDS = {
    'homework', 'hw', 'assignment', 'assign', 'problem set', 'pset',
    'lab', 'project', 'exercise', 'exercises'
}
RECITATION_KEYWORDS = {
    'recitation', 'rec', 'tutorial', 'section', 'review'
}
TEXTBOOK_KEYWORDS = {
    'textbook', 'book', 'required reading', 'reading', 'reference',
    'course book', 'required text'
}
LECTURE_KEYWORDS = {
    'lecture', 'lectures', 'notes', 'slides', 'presentation', 'class notes'
}


class CourseScraper:
    """Scraper for CMU CS course websites"""
    
    def __init__(self, data_dir: Optional[Path] = None):
        if data_dir is None:
            self.data_dir = Path(__file__).parent.parent / "data"
        else:
            self.data_dir = Path(data_dir)
        
        self.courses_dir = self.data_dir / "courses"
        self.books_dir = self.data_dir / "books"
        self.books_dir.mkdir(exist_ok=True)
        
        # Create session with retry strategy
        self.session = requests.Session()
        retry_strategy = Retry(
            total=MAX_RETRIES,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Set user agent to identify as a bot
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; CMUStudyBuddy/1.0; +https://github.com/cmu-study-buddy)'
        })
        
        # Track scraped URLs to avoid duplicates
        self.scraped_urls: Set[str] = set()
        
    def load_course_files(self) -> List[Dict[str, str]]:
        """Load all course files and extract URLs"""
        courses = []
        
        if not self.courses_dir.exists():
            logger.error(f"Courses directory not found: {self.courses_dir}")
            return courses
        
        for course_file in self.courses_dir.glob("*.txt"):
            try:
                with open(course_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Extract course code
                code_match = re.search(r'Course Code:\s*(\d{2}-\d{3})', content)
                if not code_match:
                    continue
                
                code = code_match.group(1)
                
                # Extract course URL
                url_match = re.search(r'Course URL:\s*(https?://[^\s]+)', content)
                url = url_match.group(1) if url_match else None
                
                if url:
                    courses.append({
                        'code': code,
                        'file': course_file,
                        'url': url,
                        'content': content
                    })
            except Exception as e:
                logger.error(f"Error loading {course_file.name}: {e}")
        
        logger.info(f"Loaded {len(courses)} courses with URLs")
        return courses
    
    def fetch_page(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch and parse a webpage"""
        if url in self.scraped_urls:
            logger.debug(f"Skipping already scraped URL: {url}")
            return None
        
        try:
            logger.info(f"Fetching: {url}")
            response = self.session.get(url, timeout=TIMEOUT)
            response.raise_for_status()
            
            # Rate limiting
            time.sleep(REQUEST_DELAY)
            
            try:
                soup = BeautifulSoup(response.content, 'lxml')
            except:
                soup = BeautifulSoup(response.content, 'html.parser')
            self.scraped_urls.add(url)
            return soup
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching {url}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error parsing {url}: {e}")
            return None
    
    def find_all_links(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, str]]:
        """Find all links on a page"""
        links = []
        
        for tag in soup.find_all(['a', 'link'], href=True):
            href = tag.get('href', '')
            if not href:
                continue
            
            # Resolve relative URLs
            full_url = urljoin(base_url, href)
            
            # Get link text
            text = tag.get_text(strip=True).lower()
            
            # Determine link type
            link_type = self.classify_link(text, href, full_url)
            
            links.append({
                'url': full_url,
                'text': tag.get_text(strip=True),
                'type': link_type,
                'href': href
            })
        
        return links
    
    def classify_link(self, text: str, href: str, url: str) -> str:
        """Classify a link based on keywords and URL patterns"""
        text_lower = text.lower()
        href_lower = href.lower()
        url_lower = url.lower()
        
        # Check for PDFs
        if any(ext in url_lower for ext in PDF_EXTENSIONS):
            if any(kw in text_lower for kw in TEXTBOOK_KEYWORDS):
                return 'textbook_pdf'
            elif any(kw in text_lower for kw in HOMEWORK_KEYWORDS):
                return 'homework_pdf'
            elif any(kw in text_lower for kw in RECITATION_KEYWORDS):
                return 'recitation_pdf'
            elif any(kw in text_lower for kw in LECTURE_KEYWORDS):
                return 'lecture_pdf'
            else:
                return 'pdf'
        
        # Check for homework/assignments
        if any(kw in text_lower or kw in href_lower for kw in HOMEWORK_KEYWORDS):
            return 'homework'
        
        # Check for recitations
        if any(kw in text_lower or kw in href_lower for kw in RECITATION_KEYWORDS):
            return 'recitation'
        
        # Check for textbooks
        if any(kw in text_lower or kw in href_lower for kw in TEXTBOOK_KEYWORDS):
            return 'textbook'
        
        # Check for lectures
        if any(kw in text_lower or kw in href_lower for kw in LECTURE_KEYWORDS):
            return 'lecture'
        
        return 'other'
    
    def download_file(self, url: str, course_code: str, link_type: str) -> Optional[str]:
        """Download a file and save it to the books directory"""
        try:
            # Generate filename
            parsed_url = urlparse(url)
            filename = os.path.basename(parsed_url.path)
            
            if not filename or '.' not in filename:
                # Generate filename from URL
                filename = f"{course_code}_{link_type}_{int(time.time())}.pdf"
            
            # Sanitize filename
            filename = re.sub(r'[^\w\-_\.]', '_', filename)
            
            # Ensure PDF extension for PDFs
            if link_type.endswith('_pdf') and not filename.endswith('.pdf'):
                filename += '.pdf'
            
            filepath = self.books_dir / filename
            
            # Skip if already exists
            if filepath.exists():
                logger.debug(f"File already exists: {filename}")
                return filename
            
            logger.info(f"Downloading: {url} -> {filename}")
            response = self.session.get(url, timeout=TIMEOUT, stream=True)
            response.raise_for_status()
            
            # Check content type
            content_type = response.headers.get('content-type', '').lower()
            if 'pdf' in content_type or url.endswith('.pdf'):
                with open(filepath, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                # Rate limiting
                time.sleep(REQUEST_DELAY)
                
                logger.info(f"Downloaded: {filename}")
                return filename
            else:
                logger.debug(f"Skipping non-PDF: {url} (content-type: {content_type})")
                return None
                
        except Exception as e:
            logger.error(f"Error downloading {url}: {e}")
            return None
    
    def try_alternative_urls(self, course_code: str, original_url: str) -> List[str]:
        """Try alternative URL formats if original fails"""
        urls_to_try = [original_url]
        
        # Extract course number (last 3 digits)
        course_num_match = re.search(r'(\d{2})-(\d{3})', course_code)
        if course_num_match:
            dept_num = course_num_match.group(1)
            course_num = course_num_match.group(2)
            
            # Try ~XXX format (just last 3 digits)
            urls_to_try.append(f"https://www.cs.cmu.edu/~{course_num}/")
            
            # Try ~XXXXX format (full 5 digits)
            urls_to_try.append(f"https://www.cs.cmu.edu/~{dept_num}{course_num}/")
            
            # Try with leading zero
            if len(course_num) == 3:
                urls_to_try.append(f"https://www.cs.cmu.edu/~0{course_num}/")
        
        return urls_to_try
    
    def scrape_course(self, course: Dict[str, str]) -> Dict[str, any]:
        """Scrape a single course website"""
        course_code = course['code']
        original_url = course['url']
        
        logger.info(f"Scraping course {course_code}: {original_url}")
        
        results = {
            'code': course_code,
            'url': original_url,
            'textbooks': [],
            'recitations': [],
            'homeworks': [],
            'lectures': [],
            'other_links': [],
            'errors': []
        }
        
        # Try alternative URLs if original fails
        urls_to_try = self.try_alternative_urls(course_code, original_url)
        soup = None
        working_url = None
        
        for url in urls_to_try:
            soup = self.fetch_page(url)
            if soup:
                working_url = url
                results['url'] = url  # Update to working URL
                logger.info(f"Successfully accessed course page: {url}")
                break
        
        if not soup:
            results['errors'].append(f"Failed to fetch main page. Tried: {', '.join(urls_to_try)}")
            return results
        
        # Find all links
        links = self.find_all_links(soup, working_url)
        
        # Process links
        for link in links:
            link_type = link['type']
            link_url = link['url']
            
            # Download PDFs
            if link_type.endswith('_pdf') or ('.pdf' in link_url.lower() and link_type == 'other'):
                # Reclassify if it's a PDF but wasn't classified properly
                if '.pdf' in link_url.lower() and link_type == 'other':
                    link_type = 'pdf'
                filename = self.download_file(link_url, course_code, link_type)
                if filename:
                    link['local_filename'] = filename
                    link['type'] = link_type + '_pdf'
            
            # Categorize links
            if link_type == 'textbook' or link_type == 'textbook_pdf' or (link_type.endswith('_pdf') and 'book' in link['text'].lower()):
                results['textbooks'].append(link)
            elif link_type == 'recitation' or link_type == 'recitation_pdf':
                results['recitations'].append(link)
            elif link_type == 'homework' or link_type == 'homework_pdf':
                results['homeworks'].append(link)
            elif link_type == 'lecture' or link_type == 'lecture_pdf':
                results['lectures'].append(link)
            elif link_type.endswith('_pdf') or '.pdf' in link_url.lower():
                # Unclassified PDF - try to categorize by filename/URL
                link_lower = (link.get('text', '') + ' ' + link_url).lower()
                if any(kw in link_lower for kw in HOMEWORK_KEYWORDS):
                    results['homeworks'].append(link)
                elif any(kw in link_lower for kw in RECITATION_KEYWORDS):
                    results['recitations'].append(link)
                elif any(kw in link_lower for kw in TEXTBOOK_KEYWORDS):
                    results['textbooks'].append(link)
                elif any(kw in link_lower for kw in LECTURE_KEYWORDS):
                    results['lectures'].append(link)
                else:
                    results['other_links'].append(link)
            else:
                results['other_links'].append(link)
        
        # Try to find common course page patterns
        # Look for syllabus, schedule, assignments pages
        common_pages = ['syllabus', 'schedule', 'assignments', 'homework', 'hw', 
                       'recitations', 'lectures', 'notes', 'textbook', 'books']
        
        for page_name in common_pages:
            for link in links:
                if page_name in link['href'].lower() or page_name in link['text'].lower():
                    # Fetch sub-page
                    sub_soup = self.fetch_page(link['url'])
                    if sub_soup:
                        sub_links = self.find_all_links(sub_soup, link['url'])
                        logger.debug(f"Found {len(sub_links)} links on sub-page: {link['url']}")
                        for sub_link in sub_links:
                            sub_type = sub_link['type']
                            if sub_type.endswith('_pdf'):
                                filename = self.download_file(sub_link['url'], course_code, sub_type)
                                if filename:
                                    sub_link['local_filename'] = filename
                            
                            # Add to appropriate category
                            if sub_type == 'textbook' or sub_type == 'textbook_pdf':
                                if sub_link not in results['textbooks']:
                                    results['textbooks'].append(sub_link)
                            elif sub_type == 'recitation' or sub_type == 'recitation_pdf':
                                if sub_link not in results['recitations']:
                                    results['recitations'].append(sub_link)
                            elif sub_type == 'homework' or sub_type == 'homework_pdf':
                                if sub_link not in results['homeworks']:
                                    results['homeworks'].append(sub_link)
        
        logger.info(f"Found for {course_code}: {len(results['textbooks'])} textbooks, "
                   f"{len(results['recitations'])} recitations, "
                   f"{len(results['homeworks'])} homeworks")
        
        return results
    
    def update_course_file(self, course_file: Path, results: Dict[str, any]):
        """Update course file with scraped information"""
        try:
            # Read existing content
            with open(course_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Build new content sections
            sections = []
            
            # Books and Textbooks section
            books_section = ["BOOKS AND TEXTBOOKS:", "--------------------------------------------------------------------------------"]
            if results['textbooks']:
                for book in results['textbooks']:
                    if 'local_filename' in book:
                        books_section.append(f"Local PDF: {book['local_filename']}")
                    books_section.append(f"URL: {book['url']}")
                    if book.get('text'):
                        books_section.append(f"Title: {book['text']}")
                    books_section.append("")
            else:
                books_section.append("None found")
            
            sections.extend(books_section)
            sections.append("")
            
            # Recitations section
            recitations_section = ["RECITATIONS:", "--------------------------------------------------------------------------------"]
            if results['recitations']:
                for rec in results['recitations']:
                    if 'local_filename' in rec:
                        recitations_section.append(f"Local PDF: {rec['local_filename']}")
                    recitations_section.append(f"URL: {rec['url']}")
                    if rec.get('text'):
                        recitations_section.append(f"Title: {rec['text']}")
                    recitations_section.append("")
            else:
                recitations_section.append("None found")
            
            sections.extend(recitations_section)
            sections.append("")
            
            # Homeworks section
            homeworks_section = ["HOMEWORKS AND ASSIGNMENTS:", "--------------------------------------------------------------------------------"]
            if results['homeworks']:
                for hw in results['homeworks']:
                    if 'local_filename' in hw:
                        homeworks_section.append(f"Local PDF: {hw['local_filename']}")
                    homeworks_section.append(f"URL: {hw['url']}")
                    if hw.get('text'):
                        homeworks_section.append(f"Title: {hw['text']}")
                    homeworks_section.append("")
            else:
                homeworks_section.append("None found")
            
            sections.extend(homeworks_section)
            sections.append("")
            
            # Update content
            # Find where to insert new content (after Course URL line)
            url_match = re.search(r'(Course URL:.*?\n)', content)
            if url_match:
                insert_pos = url_match.end()
                new_content = content[:insert_pos] + "\n" + "\n".join(sections) + "\n"
            else:
                # Append to end
                new_content = content + "\n" + "\n".join(sections) + "\n"
            
            # Add metadata
            new_content += f"\n================================================================================\n"
            new_content += f"Last Scraped: {datetime.now().isoformat()}\n"
            new_content += f"Total Textbooks Found: {len(results['textbooks'])}\n"
            new_content += f"Total Recitations Found: {len(results['recitations'])}\n"
            new_content += f"Total Homeworks Found: {len(results['homeworks'])}\n"
            
            # Write updated content
            with open(course_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            logger.info(f"Updated course file: {course_file.name}")
            
        except Exception as e:
            logger.error(f"Error updating course file {course_file}: {e}")
    
    def scrape_all_courses(self, limit: Optional[int] = None):
        """Scrape all courses"""
        courses = self.load_course_files()
        
        if limit:
            courses = courses[:limit]
        
        logger.info(f"Starting scrape of {len(courses)} courses")
        
        results_summary = {
            'total': len(courses),
            'successful': 0,
            'failed': 0,
            'total_textbooks': 0,
            'total_recitations': 0,
            'total_homeworks': 0
        }
        
        for i, course in enumerate(courses, 1):
            logger.info(f"Processing course {i}/{len(courses)}: {course['code']}")
            
            try:
                results = self.scrape_course(course)
                
                # Update course file
                self.update_course_file(course['file'], results)
                
                # Update summary
                results_summary['successful'] += 1
                results_summary['total_textbooks'] += len(results['textbooks'])
                results_summary['total_recitations'] += len(results['recitations'])
                results_summary['total_homeworks'] += len(results['homeworks'])
                
            except Exception as e:
                logger.error(f"Error scraping course {course['code']}: {e}")
                results_summary['failed'] += 1
        
        logger.info("=" * 80)
        logger.info("Scraping Summary:")
        logger.info(f"  Total courses: {results_summary['total']}")
        logger.info(f"  Successful: {results_summary['successful']}")
        logger.info(f"  Failed: {results_summary['failed']}")
        logger.info(f"  Total textbooks found: {results_summary['total_textbooks']}")
        logger.info(f"  Total recitations found: {results_summary['total_recitations']}")
        logger.info(f"  Total homeworks found: {results_summary['total_homeworks']}")
        logger.info("=" * 80)
        
        return results_summary


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Scrape CMU CS course websites')
    parser.add_argument('--limit', type=int, help='Limit number of courses to scrape')
    parser.add_argument('--course', type=str, help='Scrape specific course code (e.g., 15-213)')
    parser.add_argument('--data-dir', type=str, help='Path to data directory')
    
    args = parser.parse_args()
    
    scraper = CourseScraper(data_dir=args.data_dir)
    
    if args.course:
        # Scrape specific course
        courses = scraper.load_course_files()
        course = next((c for c in courses if c['code'] == args.course), None)
        if course:
            results = scraper.scrape_course(course)
            scraper.update_course_file(course['file'], results)
        else:
            logger.error(f"Course {args.course} not found")
    else:
        # Scrape all courses
        scraper.scrape_all_courses(limit=args.limit)


if __name__ == '__main__':
    main()

