import datetime
import os
import re

# Start date: April 7, 2007 00:00:00 IST
start_date = datetime.datetime(2007, 4, 7, 0, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=5, minutes=30)))
now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30)))

years = now.year - start_date.year
if (now.month, now.day) < (start_date.month, start_date.day):
    years -= 1

anniversary = datetime.datetime(start_date.year + years, start_date.month, start_date.day, 0, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=5, minutes=30)))
delta = now - anniversary

days = delta.days
hours = delta.seconds // 3600
minutes = (delta.seconds % 3600) // 60

new_uptime = f"uptime: {years} years, {days} days, {hours} hours, {minutes} mins, 1 active developer"

targets = ["README.md", "GITHUB_PROFILE_README.md"]

for target in targets:
    if os.path.exists(target):
        with open(target, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Replace the uptime line (handles multiple variations of the format)
        pattern = r"uptime: \d+ years, \d+ days, \d+ (?:hours, \d+ mins|hours, \d+ minutes|:\d+), 1 active developer"
        content = re.sub(pattern, new_uptime, content)
        # Also try exact string match replacements
        content = re.sub(r"uptime: \d+ years, \d+ days, \d+ hours, \d+ mins, 1 active developer", new_uptime, content)
        content = re.sub(r"uptime: \d+ years, \d+ days, \d+:\d+, 1 active developer", new_uptime, content)
        
        with open(target, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {target} with: {new_uptime}")
