"""Build the app's pages from app/src/.

    python app/tools/build.py           # writes index.html, drinks-order.html, admin.html
    python app/tools/build.py --check   # verifies the files on disk are current; writes nothing

index.html and drinks-order.html are the same shop page under two names: the QR
cards and the service worker both point at drinks-order.html, and it has to stay
a byte-for-byte mirror of index.html or a scanned code opens a different app than
a typed URL. admin.html is the dashboard, its own page since the split.

Everything is inlined: one HTML file per page, no extra requests, so the deploy is
still "drop the files plus sw.js on the host". That is deliberate - GitHub Pages
serves them, and the service worker caches them by name.

Deploy checklist (see app/AGENTS.md):
  1. bump VERSION here and the cache name in sw.js in the same commit
  2. python app/tools/build.py
  3. python app/tools/check-contracts.py     (what CI runs)
"""
import io, os, sys

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(APP, "src")
VERSION = "v53"

# The shop page is written twice, under both of its names.
SHOP_PAGES = ("index.html", "drinks-order.html")
ADMIN_PAGE = "admin.html"


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
    # The build marker in the corner and the <span id="foot-build"> both carry the
    # version; one replacement covers each.
    assert ">v50<" in html, "the version placeholder moved; update page()"
    html = html.replace(">v50<", ">%s<" % VERSION)
    return html


def outputs():
    """Every built file, as (name, text). Order matters only for the log."""
    shop = page(CUSTOMER_MARKUP, CORE + CUSTOMER_JS + BOOT_CUSTOMER, "Order", "shop")
    admin = page(ADMIN_MARKUP, CORE + ADMIN_JS + BOOT_ADMIN, "Admin", "admin")
    out = [(name, shop) for name in SHOP_PAGES]
    out.append((ADMIN_PAGE, admin))
    return out


def build(check=False):
    rows = []
    stale = []
    for name, html in outputs():
        path = os.path.join(APP, name)
        data = html.encode("utf-8")
        if check:
            try:
                # Text mode, so a CRLF checkout on Windows still counts as current:
                # the artifact's content is what matters, not its line endings.
                current = io.open(path, encoding="utf-8").read()
            except FileNotFoundError:
                current = None
            if current != html:
                stale.append(name)
        else:
            io.open(path, "w", encoding="utf-8", newline="\n").write(html)
        rows.append((name, len(data)))
    return rows, stale


if __name__ == "__main__":
    check = "--check" in sys.argv[1:]
    rows, stale = build(check=check)
    for name, size in rows:
        print("  %-18s %8d bytes" % (name, size))
    if check:
        if stale:
            print("STALE: " + ", ".join(stale) + " - run python app/tools/build.py")
            sys.exit(1)
        print("current: all %d files match app/src/" % len(rows))
