from http.server import HTTPServer, BaseHTTPRequestHandler
import requests
from urllib.parse import urlparse

ALLOWED_DOMAINS = [
    'platform.21-school.ru',
    'auth.21-school.ru',
    'api.telegram.org'
]
ALLOWED_ORIGIN = 'http://localhost:8000'

class SecureCORSProxyHandler(BaseHTTPRequestHandler):
    def handle_request(self):
        origin = self.headers.get('Origin')
        allow_origin = ALLOWED_ORIGIN
        if origin and (origin == 'http://localhost:8000' or origin == 'http://127.0.0.1:8000'):
            allow_origin = origin

        if self.path == '/' or self.path == '':
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', allow_origin)
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.end_headers()
            return

        try:
            target_url = self.path[1:]
            parsed_url = urlparse(target_url)

            if parsed_url.netloc not in ALLOWED_DOMAINS:
                self.send_error(403, f"Forbidden: Domain '{parsed_url.netloc}' is not whitelisted.")
                return

            headers = {k: v for k, v in self.headers.items() 
                      if k.lower() not in ['host', 'origin', 'referer', 'content-length']}
            
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length else None

            response = requests.request(
                method=self.command,
                url=target_url,
                headers=headers,
                data=body,
                timeout=15,
                verify=True
            )

            self.send_response(response.status_code)
            self.send_header('Access-Control-Allow-Origin', allow_origin)
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

            safe_headers = ['content-type', 'set-cookie', 'cache-control']
            for key, value in response.headers.items():
                if key.lower() in safe_headers:
                    self.send_header(key, value)
            
            self.end_headers()
            self.wfile.write(response.content)

        except Exception:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b"Internal Proxy Error")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self): self.handle_request()
    def do_POST(self): self.handle_request()
    def do_HEAD(self): self.handle_request()

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', 8080), SecureCORSProxyHandler)
    print("Proxy listening on http://127.0.0.1:8080")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()