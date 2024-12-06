import sys
import time
from Crypto.Cipher import AES
from gevent import monkey
monkey.patch_all(thread=False, select=False)
import requests
import cloudscraper
from gevent.pywsgi import WSGIServer
from flask import Flask, Response, request
from flask_compress import Compress

app = Flask(__name__)
Compress(app)

scraper = cloudscraper.create_scraper()

@app.route("/health")
def health():
    return "ok"

@app.route("/exit")
def exit():
    sys.exit(0)

@app.route("/api", methods=["POST", "GET"])
def callApi():
    try:
        data = request.get_json(force=True)
        method = scraper.get
        if data['method'] == 'post': method = scraper.post
        if data['method'] == 'put': method = scraper.put
        if data['method'] == 'delete': method = scraper.delete
        if data['with_interceptor_id_header']:
          data['headers']['X-Interceptor-Id'] = generateInterceptorId()
        response = method(url=data['url'], headers=data['headers'], json=data['body'], proxies=data['proxy'])
        # print(response.headers)
        requestResponse = Response(response.text, mimetype=response.headers['Content-Type'])
        # print(requestResponse)
        requestResponse.status_code = response.status_code
        # print(response.headers['Set-Cookie'])
        if 'Set-Cookie' in response.headers:
            requestResponse.headers['Set-Cookie'] = response.headers['Set-Cookie']
        # requestResponse.cookies = response.cookies.get_dict()
        return requestResponse
    except requests.exceptions.ProxyError as error:
        return Response('proxy error: {0}'.format(error), 400)
    except Exception as error:
        return Response('exception: {0}'.format(error), 400)
    

def pad(s):
    BS = 16
    return s + (BS - len(s) % BS) * chr(BS - len(s) % BS)

def generateInterceptorId(e=None):
    if e is None:
        e = int(time.time() * 1000)
    
    def encrypt(t, n):
        n = str(n).zfill(16)[:16]
        n = n.encode('utf-8')
        t = str(t).encode('utf-8')
        cipher = AES.new(n, AES.MODE_CBC, iv=n)
        padded = pad(t.decode('utf-8'))
        encrypted = cipher.encrypt(padded.encode('utf-8'))
        hex_str = ''.join([format(b, '02x') for b in encrypted])
        return hex_str
    
    key = "EWbnkc7qHBtenQee"
    
    result = encrypt(str(e), key)
    return result

if __name__ == "__main__":
    try:
        # app.run(host="0.0.0.0", port="9999", threaded=True)
        http = WSGIServer(('0.0.0.0', 9999), app.wsgi_app)
        http.serve_forever()
    except KeyboardInterrupt:
        sys.exit()
