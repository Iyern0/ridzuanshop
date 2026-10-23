"""One-time extraction: app/index.html (v50) -> app/src/ source tree.

The v50 file was one page: the order page with the seller's dashboard as an
overlay inside it. This splits it into the parts a maintainer would author
separately, without changing a line of logic.

    src/shell/head.html        <head> up to the <style>, plus the PWA links
    src/shell/foot.html        service worker, build marker, </body>
    src/css/app.css            all the CSS
    src/markup/customer.html   the order page's body markup
    src/markup/admin.html      the dashboard's body markup
    src/markup/toast.html      the one element both pages share
    src/js/core.js             what both pages use
    src/js/customer.js         the order page's own logic
    src/js/admin.js            the dashboard's own logic
    src/js/boot-*.js           start-up code, hand-maintained (see make-boots.py)

Statement boundaries come from tools/split-js.mjs: V8 parses them, and the
script asserts the split loses nothing. Buckets come from the reference graph
between statements, seeded from each page's own markup. Run once, from the
workspace root:

    node app/tools/split-js.mjs .scratch/v50-script.js .scratch/stmts.json
    python app/tools/extract-src.py
    python app/tools/make-boots.py
    python app/tools/build.py
"""
import io, json, os, re

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(APP)
SCR = os.path.join(ROOT, ".scratch")
SRC = os.path.join(APP, "src")

src = io.open(os.path.join(APP, "index.html"), encoding="utf-8").read()
lines = src.split("\n")
FIRST = next(i for i, l in enumerate(lines) if l.strip().startswith("const SHOP")) + 1
LAST = next(i for i, l in enumerate(lines) if l.strip() == "</script>") + 1
js = "\n".join(lines[FIRST - 1: LAST - 1])
stmts = json.load(io.open(os.path.join(SCR, "stmts.json"), encoding="utf-8"))
assert "".join(s["text"] for s in stmts) == js, "statement split does not reassemble"

# ---- what a statement defines -------------------------------------------
KW = {"if", "for", "while", "switch", "catch", "function", "return", "typeof",
      "new", "delete", "void", "in", "of", "instanceof"}


def strip_comments(t):
    out, i, n = [], 0, len(t)
    while i < n:
        c = t[i]
        if c in "'\"`":
            q = c
            out.append(c)
            i += 1
            while i < n:
                out.append(t[i])
                if t[i] == "\\":
                    if i + 1 < n:
                        out.append(t[i + 1])
                        i += 2
                        continue
                elif t[i] == q:
                    i += 1
                    break
                i += 1
            continue
        if c == "/" and i + 1 < n:
            if t[i + 1] == "/":
                while i < n and t[i] != "\n":
                    i += 1
                continue
            if t[i + 1] == "*":
                j = t.find("*/", i + 2)
                i = j + 2 if j >= 0 else n
                continue
        out.append(c)
        i += 1
    return "".join(out)


def split_top(text, sep=","):
    """Split at depth-0 separators, ignoring strings and brackets."""
    parts, buf, depth, i, n = [], [], 0, 0, len(text)
    while i < n:
        c = text[i]
        if c in "'\"`":
            q = c
            buf.append(c)
            i += 1
            while i < n:
                buf.append(text[i])
                if text[i] == "\\" and i + 1 < n:
                    buf.append(text[i + 1])
                    i += 2
                    continue
                if text[i] == q:
                    i += 1
                    break
                i += 1
            continue
        if c in "([{":
            depth += 1
        elif c in ")]}":
            depth -= 1
        if depth == 0 and c == sep:
            parts.append("".join(buf))
            buf = []
            i += 1
            continue
        buf.append(c)
        i += 1
    parts.append("".join(buf))
    return parts


IDENT = re.compile(r"[A-Za-z_$][\w$]*")


def decl_names(stmt_text):
    code = strip_comments(stmt_text).strip()
    m = re.match(r"^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)", code)
    if m:
        return [m.group(1)]
    m = re.match(r"^(?:const|let|var)\s+", code)
    if not m:
        return []
    names = []
    for part in split_top(code[m.end():]):
        head = part.split("=", 1)[0].strip()
        if not head:
            continue
        if head[0] in "{[":
            names.extend(x for x in IDENT.findall(head) if x not in KW)
        elif IDENT.fullmatch(head):
            names.append(head)
    return names


for s in stmts:
    s["defnames"] = decl_names(s["text"])
    code = strip_comments(s["text"])
    ids = {x for x in IDENT.findall(code)}
    s["refs"] = sorted(ids - set(s["defnames"]) - KW)

name_stmt = {}
for i, s in enumerate(stmts):
    for nm in s["defnames"]:
        name_stmt[nm] = i
nameset = set(name_stmt)

# ---- markup, once, with the page-level edits -----------------------------
def rng(a, b):
    return "\n".join(lines[a - 1:b])

ADMIN_BTN_OLD = ('<div id="admin-btn-wrap" style="max-width:1180px;margin:8px auto 0;padding:0 var(--gutter);'
                 'display:none"><button id="admin-btn" onclick="enterAdmin()" style="display:none" '
                 'class="ghostbtn">Admin</button></div>')
ADMIN_BTN_NEW = ('<div id="admin-btn-wrap" style="max-width:1180px;margin:8px auto 0;padding:0 var(--gutter);'
                 'display:none"><a id="admin-btn" href="admin.html" style="display:none;text-decoration:none" '
                 'class="ghostbtn">Admin</a></div>')

customer_markup = rng(971, 1020)
assert ADMIN_BTN_OLD in customer_markup, "admin button markup changed"
customer_markup = customer_markup.replace(ADMIN_BTN_OLD, ADMIN_BTN_NEW)
customer_markup = "\n".join([customer_markup, "<!--TOAST-->", rng(1025, 1036), lines[1036]])
admin_markup = "\n".join([rng(1021, 1023), "<!--TOAST-->", lines[1037], lines[1038]])

HANDLER_RE = re.compile(r"""on[a-z]+\s*=\s*\\?["']([^"']*)\\?["']""")


def handlers_in(text):
    out = set()
    for m in HANDLER_RE.finditer(text):
        out |= set(re.findall(r"\b([A-Za-z_$][\w$]*)\s*\(", m.group(1))) & nameset
    return out


C_SEED = handlers_in(customer_markup) | (nameset & {
    "track", "loadCart", "drawStatus", "drawFounder", "showMyOrderBtn", "loadMenu",
    "initConfig", "initDis", "fillCustomer", "drawCpnBtn", "loadMyCoupons",
    "verifyWallet", "drawLoy", "drawDel", "paintAdminBtn",
})
A_SEED = handlers_in(admin_markup) | (nameset & {
    "track", "initConfig", "adminUser", "enterAdmin", "showAdminLogin",
    "admFulfilPending", "verifyAdminLogin", "admWatchClaims",
})


def closure(seed):
    seen, stack = set(), []
    for nm in seed:
        i = name_stmt[nm]
        if i not in seen:
            seen.add(i)
            stack.append(i)
    while stack:
        i = stack.pop()
        for r in stmts[i]["refs"]:
            j = name_stmt.get(r)
            if j is not None and j not in seen:
                seen.add(j)
                stack.append(j)
    return seen


rc, ra = closure(C_SEED), closure(A_SEED)

bucket = {}
boot = {"customer": [], "admin": []}
for i, s in enumerate(stmts):
    if not s["defnames"]:
        boot["admin" if i in ra else "customer"].append(i)
    elif i in ra and i in rc:
        bucket[i] = "core"
    elif i in ra:
        bucket[i] = "admin"
    elif i in rc:
        bucket[i] = "customer"
    else:
        bucket[i] = "admin" if all(re.match(r"^(adm|ADM_|_adm|admin|AUTH_ERR)", n)
                                   for n in s["defnames"]) else "customer"

# ---- write ---------------------------------------------------------------
for sub in ("css", "js", "markup", "shell"):
    os.makedirs(os.path.join(SRC, sub), exist_ok=True)


def w(rel, text):
    io.open(os.path.join(SRC, rel), "w", encoding="utf-8", newline="\n").write(text)
    print("  %-22s %7d chars" % (rel, len(text)))


w("css/app.css", rng(10, 964))
w("markup/toast.html", lines[1023])
w("markup/customer.html", customer_markup)
w("markup/admin.html", admin_markup)
w("shell/head.html", rng(1, 8) + "\n<!--STYLE-->\n" + rng(966, 970))
w("shell/foot.html", rng(3350, 3360))

hdr = "/* %s - MINUM MALAM SISWA. Built from src/ by tools/build.py; edit the source parts, not this file. */\n"
for k, f in (("core", "core.js"), ("customer", "customer.js"), ("admin", "admin.js")):
    parts = [s["text"] for i, s in enumerate(stmts) if bucket.get(i) == k]
    w("js/" + f, hdr % f + "".join(parts))

gb = os.path.join(SCR, "boot-stmts")
os.makedirs(gb, exist_ok=True)
for f in os.listdir(gb):
    os.remove(os.path.join(gb, f))
index = {}
for page, idxs in boot.items():
    for n, i in enumerate(idxs, 1):
        fn = "%s-%02d.js" % (page, n)
        io.open(os.path.join(gb, fn), "w", encoding="utf-8", newline="\n").write(stmts[i]["text"])
        index[fn] = " ".join(stmts[i]["text"].split())[:110]
json.dump(index, io.open(os.path.join(SCR, "boot-stmts.json"), "w", encoding="utf-8"), indent=1)
json.dump({"bucket": {stmts[i]["defnames"][0]: b for i, b in bucket.items()}},
          io.open(os.path.join(SCR, "bucket.json"), "w", encoding="utf-8"))

counts = {k: sum(1 for v in bucket.values() if v == k) for k in ("core", "customer", "admin")}
print("\nstatements: %d  core=%d customer=%d admin=%d  boot: customer=%d admin=%d"
      % (len(stmts), counts["core"], counts["customer"], counts["admin"],
         len(boot["customer"]), len(boot["admin"])))
for fn in sorted(index):
    print("  %-14s %s" % (fn, index[fn]))
