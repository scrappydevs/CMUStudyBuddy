CMU Course Scraper - Background Process
========================================

The course scraper is now running in the background and will scrape all CMU CS course websites for:
- Textbooks and PDFs
- Recitations
- Homeworks/Assignments
- Lecture notes
- Other course materials

STATUS CHECKING
---------------
To check if the scraper is running:
  ./check_scraper.sh

To view live logs:
  tail -f scraper_full.log

To view recent activity:
  tail -20 scraper_full.log

MANAGING THE SCRAPER
--------------------
Start scraper (all courses):
  nohup python course_scraper.py > scraper_full.log 2>&1 &

Start scraper (limited to N courses for testing):
  python course_scraper.py --limit 10

Start scraper (specific course):
  python course_scraper.py --course 15-213

Stop scraper:
  pkill -f course_scraper.py
  OR
  ps aux | grep course_scraper
  kill <PID>

WHAT IT DOES
------------
1. Reads all course files from data/courses/
2. Extracts course URLs
3. Scrapes each course website
4. Identifies and downloads PDFs (textbooks, homeworks, recitations)
5. Updates course files with found materials
6. Saves PDFs to data/books/

RATE LIMITING
-------------
- 2 second delay between requests (respectful scraping)
- Automatic retries on failures
- Skips already-scraped URLs

OUTPUT
------
- Updated course files in data/courses/
- Downloaded PDFs in data/books/
- Logs in scraper_full.log and course_scraper.log

The scraper will process all 225 courses. This may take a while due to rate limiting.
You can continue working on the UI while it runs in the background.

