import requests
from bs4 import BeautifulSoup
import sys

url = "https://www.vnjpclub.com/mimikara-n3-tu-vung/"
headers = {'User-Agent': 'Mozilla/5.0'}

try:
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Find all links on the page that might contain vocabulary lessons
    links = soup.find_all('a', href=True)
    lesson_links = []
    for link in links:
        href = link['href']
        if 'mimikara' in href and 'bai' in href.lower() or 'bai' in link.text.lower():
            lesson_links.append((link.text.strip(), href))
            
    print("Found potential lesson links:")
    for text, href in lesson_links:
        print(f"{text}: {href}")
        
    # If there's a table on the main page, print its headers
    tables = soup.find_all('table')
    if tables:
        print(f"\nFound {len(tables)} tables on the main page.")
        for i, table in enumerate(tables):
            headers = [th.text.strip() for th in table.find_all('th')]
            print(f"Table {i+1} headers: {headers}")
            rows = table.find_all('tr')
            if len(rows) > 1:
                cols = [td.text.strip() for td in rows[1].find_all('td')]
                print(f"Table {i+1} row 1: {cols}")
except Exception as e:
    print(f"Error: {e}")
