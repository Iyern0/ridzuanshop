import os, subprocess, sys, time
root = os.path.abspath("..")
vers = ["v50","v51","v52","v53","v54","v55","v56"]
probe = os.path.join(root, ".scratch", "probe3.mjs")
shots = os.path.join(root, ".scratch", "versions")
for v in vers:
    prof = os.path.join(root, ".scratch", "p-" + v)
    out = os.path.join(shots, v + ".png")
    url = "http://127.0.0.1:8767/" + v + ".html"
    r = subprocess.run(["node", probe, url, "1", "390", "1100", prof, out],
                       capture_output=True, text=True)
    print(v, "rc=", r.returncode, (r.stdout or "").strip().splitlines()[-1:] , (r.stderr or "").strip()[:120])
    time.sleep(0.3)
