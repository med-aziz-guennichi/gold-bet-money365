"""Private WSGI entrypoint; only the API's Vercel service binding can reach it."""
import bottle
import routes  # noqa: F401 - registers the vendored upstream routes

app = bottle.default_app()
