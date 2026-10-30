#!/usr/bin/env python3
"""
E-Cell Registration Server (Python 3)
Stores form submissions into data/registrations.json and data/registrations.csv.
Run with: python3 server.py [port]
"""

import os
import sys
import json
import csv
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
from datetime import datetime

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT_DIR, "data")
JSON_FILE = os.path.join(DATA_DIR, "registrations.json")
CSV_FILE = os.path.join(DATA_DIR, "registrations.csv")

os.makedirs(DATA_DIR, exist_ok=True)

if not os.path.exists(CSV_FILE):
    with open(CSV_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Timestamp", "Serial", "Name", "Email", "Phone", "USN", "College", "Branch", "Year", "Interests", "Vision"])

if not os.path.exists(JSON_FILE):
    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump([], f)

def save_registration(entry):
    # 1. Update JSON
    entries = []
    if os.path.exists(JSON_FILE):
        try:
            with open(JSON_FILE, "r", encoding="utf-8") as f:
                entries = json.load(f)
                if not isinstance(entries, list):
                    entries = []
        except Exception:
            entries = []
    entries.append(entry)
    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2)

    # 2. Append to CSV
    interests = "; ".join(entry.get("interests", [])) if isinstance(entry.get("interests"), list) else entry.get("interests", "")
    with open(CSV_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            entry.get("timestamp", datetime.utcnow().isoformat()),
            entry.get("serial", ""),
            entry.get("name", ""),
            entry.get("email", ""),
            entry.get("phone", ""),
            entry.get("usn", ""),
            entry.get("college", ""),
            entry.get("branch", ""),
            entry.get("year", ""),
            interests,
            entry.get("vision", "")
        ])
    return len(entries)

class ECellHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/register":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8")
            try:
                data = json.loads(body)
                total = save_registration(data)
                print(f"[REGISTRATION] Logged #{data.get('serial')}: {data.get('name')} ({data.get('email')})")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                resp = json.dumps({"success": True, "serial": data.get("serial"), "count": total})
                self.wfile.write(resp.encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return
        self.send_response(404)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/registrations":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            if os.path.exists(JSON_FILE):
                with open(JSON_FILE, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.wfile.write(b"[]")
            return
        elif parsed.path == "/api/registrations.csv":
            self.send_response(200)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Disposition", 'attachment; filename="ecell_registrations_2026.csv"')
            self.end_headers()
            if os.path.exists(CSV_FILE):
                with open(CSV_FILE, "rb") as f:
                    self.wfile.write(f.read())
            return
        return super().do_GET()

if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), ECellHandler)
    print(f"[SERVER] E-Cell Server running at http://localhost:{PORT}")
    print(f"[STORAGE] CSV file: {CSV_FILE}")
    print(f"[STORAGE] JSON file: {JSON_FILE}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        server.server_close()
