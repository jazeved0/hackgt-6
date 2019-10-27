# bopify

alexa play songs that make me want to sit in a room alone and cry

## Getting Started

As of October 27, 2019, this works with Python 3.7 but not with Python 3.8, as Scipy doesn't install properly on Python 3.8.

In /server, run `pip install -r requirements.txt` to install the dependencies for running the server.

Create a Spotify developer app, and on the dashboard be sure to add a redirect, package name, and SHA-1 to authorize your Android app. Set environment variables CLIENT_ID and CLIENT_SECRET corresponding to the info for your Spotify app.

You can create server/env.sh with something like the following:
```
export CLIENT_ID="afjoiiwo4ij524wih4gho5389358hgnf"
export CLIENT_SECRET="jivfjoijwt4w409wt09ut3fdsnio"
```
and then in a Unix-like terminal like Git Bash, `cd` to /server and run `source env.sh`.
