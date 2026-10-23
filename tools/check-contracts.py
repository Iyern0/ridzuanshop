"""Contract checks for the ridzuanshop app. This is what CI runs.

    python app/tools/check-contracts.py
    python app/tools/check-contracts.py --git-base HEAD^   # also: did a source
                                                          # change bump sw.js?

Every check answers a question that has already gone wrong once:

  1. artifacts current      - a page edited but not rebuilt ships the old shell
  2. index == drinks-order  - a QR code and a typed URL must open the same app
  3. sw version agrees      - a stale service worker cache is otherwise invisible
  4. order payload <= rules - a field the rules reject makes every order fail
  5. page ownership         - the dashboard must not need the shop's markup

Exit code 0 means all clear; 1 means at least one contract is broken.
"""
import io, os, re, subprocess, sys

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(APP, "tools"))

import build as build_mod  # noqa: E402  (import after sys.path, that's the point)

problems = []


def fail(msg):
    problems.append(msg)


def read(path):
    return io.open(os.path.join(APP, path), encoding="utf-8").read()


# ---------------------------------------------------------------- 1. artifacts
def check_artifacts_current():
    rows, stale = build_mod.build(check=True)
    if stale:
        fail("artifacts stale (run python app/tools/build.py): " + ", ".join(stale))
    return rows


# --------------------------------------------------------------------- 2. mirror
def check_mirror():
    # Compare text, not bytes: a CRLF checkout on Windows would otherwise fail
    # a mirror that is in fact the same page.
    a = read("index.html").replace("\r\n", "\n")
    b = read("drinks-order.html").replace("\r\n", "\n")
    if a != b:
        fail("drinks-order.html is not identical to index.html (QR card would open a different app)")


# ------------------------------------------------------------------ 3. sw version
def check_service_worker():
    sw = read("sw.js")
    m = re.search(r"const V = '([^']+)';", sw)
    if not m:
        fail("sw.js: no `const V = '...'` cache name found")
        return
    cache = m.group(1)
    version = build_mod.VERSION
    if not cache.startswith(version + "-"):
        fail("sw.js cache %r does not start with the build VERSION %r" % (cache, version))
    shell = re.search(r"const SHELL = \[([^\]]*)\]", sw)
    if not shell:
        fail("sw.js: no SHELL list found")
    else:
        listed = set(re.findall(r"'([^']+)'", shell.group(1)))
        for name in ("./index.html", "./admin.html", "./drinks-order.html"):
            if name not in listed:
                fail("sw.js SHELL does not pre-cache %s" % name)
    for name in ("index.html", "drinks-order.html", "admin.html"):
        if ">%s<" % version not in read(name):
            fail("%s carries no >%s< build marker (a stale cache would be invisible)" % (name, version))
    return cache


# ------------------------------------------------------- 4. order payload <= rules
def _js_object_keys(literal):
    """Top-level keys of a JS object literal source, quote/paren aware."""
    keys, depth, i, buf = [], 0, 0, ""
    tern = 0  # a `?` seen at this depth, so its `:` is not a key separator
    quote = None
    while i < len(literal):
        ch = literal[i]
        if quote:
            if ch == "\\":
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch in "\"'`":
            quote = ch
            i += 1
            continue
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        elif ch == "?" and depth == 1:
            tern += 1
            buf += ch
        elif ch == ":" and depth == 1 and tern:
            tern -= 1
            buf += ch
        elif ch == ":" and depth == 1:
            key = buf.strip()
            if key:
                keys.append(key)
            buf = ""
        elif ch == "," and depth == 1:
            buf = ""
            tern = 0
        else:
            buf += ch
        i += 1
    return keys


def check_order_payload():
    js = read("src/js/customer.js")
    m = re.search(r"const payload=\{(.*?)\};", js, re.S)
    if not m:
        fail("src/js/customer.js: the order payload literal (`const payload={...}`) was not found")
        return
    keys = set(_js_object_keys("{" + m.group(1) + "}"))
    # Optional fields are attached one by one, and the transaction adds the
    # server-side ones.
    for extra in re.findall(r"payload\.([a-zA-Z_]+)\s*=", js):
        keys.add(extra)
    txn = re.search(r"tx\.set\(db\.collection\('orders'\)\.doc\(code\),\{\.\.\.payload,([^}]*)\}", js)
    if not txn:
        fail("src/js/customer.js: the order transaction write was not found")
        return
    for key in re.findall(r"([a-zA-Z_]+)\s*:", txn.group(1)):
        keys.add(key)

    rules = read("firestore.rules")
    block = re.search(r"function validOrder\(\)\s*\{(.*?)\n\s*\}\n\s*// ---", rules, re.S)
    if not block:
        fail("firestore.rules: validOrder() was not found")
        return
    body = block.group(1)
    required = set(re.findall(r"'([a-zA-Z_]+)'", re.search(r"hasAll\(\[(.*?)\]\)", body, re.S).group(1)))
    allowed = set(re.findall(r"'([a-zA-Z_]+)'", re.search(r"hasOnly\(\[(.*?)\]\)", body, re.S).group(1)))

    missing = sorted(required - keys)
    extra = sorted(keys - allowed)
    if missing:
        fail("order payload is missing keys the rules require: " + ", ".join(missing))
    if extra:
        fail("order payload carries keys the rules reject: " + ", ".join(extra))
    if "status:'baru'" not in js:
        fail("customer.js no longer writes status:'baru', which the rules require for a new order")
    print("    payload keys (%d): %s" % (len(keys), ", ".join(sorted(keys))))


# --------------------------------------------------------------- 5. page ownership
def check_page_ownership():
    shop = read("index.html") + read("drinks-order.html")
    admin = read("admin.html")
    if 'id="admin-panel"' in shop:
        fail("a shop page still contains the dashboard markup (#admin-panel)")
    for shop_only in ('id="menu-root"', 'id="cart-bar"', 'id="confirm-modal"'):
        if shop_only in admin:
            fail("admin.html contains shop markup (%s)" % shop_only)


# --------------------------------------------------- 6. a source change bumps sw.js
def check_sw_bumped(base):
    def changed(paths):
        try:
            out = subprocess.run(
                ["git", "diff", "--name-only", base, "HEAD", "--"] + list(paths),
                cwd=APP, capture_output=True, text=True, check=True,
            ).stdout
        except (OSError, subprocess.CalledProcessError) as exc:
            fail("--git-base %r could not be read: %s" % (base, exc))
            return False
        return bool(out.strip())

    sources = ("src", "tools/build.py", "index.html", "admin.html", "drinks-order.html")
    if changed(sources) and not changed(("sw.js",)):
        fail("the shell changed but sw.js did not: bump `const V` (a stale cache would keep serving the old page)")


def main(argv):
    base = None
    if "--git-base" in argv:
        base = argv[argv.index("--git-base") + 1]

    rows = check_artifacts_current()
    for name, size in rows:
        print("  %-18s %8d bytes" % (name, size))
    check_mirror()
    cache = check_service_worker()
    check_order_payload()
    check_page_ownership()
    if base:
        check_sw_bumped(base)

    if problems:
        print("\nFAILED (%d):" % len(problems))
        for p in problems:
            print("  - " + p)
        return 1
    print("\nall contracts hold (cache %s)" % cache)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
