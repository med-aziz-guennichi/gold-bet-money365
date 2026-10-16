# Private Flashscore service

Vendored from the locally used MIT-licensed `omkarcloud/flashscore-scraper` source.
The original copyright and license are retained in `LICENSE`. Only Python source
was copied; no environment files, API keys, logs, or local output were imported.

`app.py` exposes the existing Bottle WSGI application directly to Vercel's Python
runtime. The service has no public rewrite; `server` reaches it through its
`FLASHSCORE_API_URL` binding. It does not run the Windows Cheroot listener.

Python 3.12 and direct dependencies are pinned. `config.py`, `routes.py`,
`schema_fields.py`, `scraper_errors.py`, and `flashscore/*.py` retain the upstream
implementation. Upstream transport errors remain failures; no fabricated odds
or results are returned. Caches are disposable; financial state lives in MongoDB.

To update the vendor source, compare against the upstream revision, retain the
license, run parser tests and API integration tests, and verify real feed access
from the deployment region before switching production traffic.
