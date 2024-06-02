import os
from flask import Flask, request, redirect
import requests

app = Flask(__name__)

CLIENT_KEY = os.getenv('CLIENT_KEY')
CLIENT_SECRET = os.getenv('CLIENT_SECRET')
REDIRECT_URI = os.getenv('REDIRECT_URI', 'https://santiagofs.com/callback')

@app.route('/')
def home():
    return 'Welcome to the TikTok Data Collector!'

@app.route('/login')
def login():
    authorization_url = (
        f"https://www.tiktok.com/auth/authorize?"
        f"client_key={CLIENT_KEY}&response_type=code&scope=user.info.basic,video.list&"
        f"redirect_uri={REDIRECT_URI}"
    )
    return redirect(authorization_url)

@app.route('/callback')
def callback():
    code = request.args.get('code')
    response = requests.post(
        'https://open-api.tiktok.com/oauth/access_token',
        data={
            'client_key': CLIENT_KEY,
            'client_secret': CLIENT_SECRET,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': REDIRECT_URI
        }
    )
    access_token_info = response.json()
    return access_token_info

if __name__ == '__main__':
    app.run(debug=True)