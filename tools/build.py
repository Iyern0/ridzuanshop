"""Build the two pages from app/src/.

    python app/tools/build.py           # writes app/index.html and app/admin.html
    python app/tools/build.py --check   # only reports the byte sizes

Everything is inlined: one HTML file per page, no extra requests, so the deploy
is still "drop two files plus sw.js on the host". That is deliberate - GitHub
Pages serves them, and the service worker caches them by name.

Deploy checklist (see app/AGENTS.md):
  1. bump VERSION here, in src/shell/*.html if it carries the number, and the
     cache name in sw.js in the same commit
  2. python app/tools/build.py
  3. python tools/verify-prod.py --local   (or the same file on the live host)
"""
import io, os, sys

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(APP, "src")
VERSION = "v51"


def read(*parts):
    return io.open(os.path.join(SRC, *parts), encoding="utf-8").read()


HEAD = read("shell", "head.html")
FOOT = read("shell", "foot.html")
CSS = read("css", "app.css")
TOAST = read("markup", "toast.html")
CUSTOMER_MARKUP = read("markup", "customer.html")
ADMIN_MARKUP = read("markup", "admin.html")

CORE = read("js", "core.js")
CUSTOMER_JS = read("js", "customer.js")
ADMIN_JS = read("js", "admin.js")
BOOT_CUSTOMER = read("js", "boot-customer.js")
BOOT_ADMIN = read("js", "boot-admin.js")

FIREBASE = (
    '<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>\n'
    '<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>\n'
    '<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>\n'
)

TITLE_OLD = "<title>MINUM MALAM SISWA \u2014 Order</title>"


def page(markup, scripts, title, pagename):
    head = HEAD.replace("<!--STYLE-->", "<style>\n" + CSS + "\n</style>")
    # Which page this is, so the shared script can tell the shop window from the
    # dashboard without sniffing for elements.
    head = head.replace("</head><body>", '</head><body data-page="%s">' % pagename)
    if title != "Order":
        assert TITLE_OLD in head, "title in shell/head.html changed"
        head = head.replace(TITLE_OLD, "<title>MINUM MALAM SISWA \u2014 %s</title>" % title)
    body = markup.replace("<!--TOAST-->", TOAST)
    html = head + "\n" + body + "\n" + FIREBASE + "<script>\n" + scripts + "\n</script>\n" + FOOT
    html = html.replace(">v50<", ">%s<" % VERSION)
    return html


def build():
    out = []
    for name, markup, scripts, title, pagename in (
        ("index.html", CUSTOMER_MARKUP, CORE + CUSTOMER_JS + BOOT_CUSTOMER, "Order", "shop"),
        ("admin.html", ADMIN_MARKUP, CORE + ADMIN_JS + BOOT_ADMIN, "Admin", "admin"),
    ):
        html = page(markup, scripts, title, pagename)
        io.open(os.path.join(APP, name), "w", encoding="utf-8", newline="\n").write(html)
        out.append((name, len(html.encode("utf-8"))))
    return out


if __name__ == "__main__":
    for name, size in build():
        print("  %-12s %8d bytes" % (name, size))
