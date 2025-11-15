"""
Scheduler for running the course scraper periodically
Can be configured to run daily, weekly, or on-demand
"""

import time
import schedule
import logging
from pathlib import Path
from course_scraper import CourseScraper

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_scraper():
    """Run the course scraper"""
    logger.info("Starting scheduled course scrape...")
    try:
        scraper = CourseScraper()
        results = scraper.scrape_all_courses()
        logger.info(f"Scrape completed: {results}")
    except Exception as e:
        logger.error(f"Error during scheduled scrape: {e}")


def main():
    """Main scheduler loop"""
    # Schedule daily runs at 2 AM
    schedule.every().day.at("02:00").do(run_scraper)
    
    # Or schedule weekly runs on Sunday at 2 AM
    # schedule.every().sunday.at("02:00").do(run_scraper)
    
    logger.info("Course scraper scheduler started")
    logger.info("Scheduled runs: Daily at 02:00")
    logger.info("Press Ctrl+C to stop")
    
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    except KeyboardInterrupt:
        logger.info("Scheduler stopped by user")


if __name__ == '__main__':
    main()

