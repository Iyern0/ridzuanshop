import io, subprocess, sys

def sh(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        print("FAIL", args, r.stderr[:400])
        sys.exit(1)
    return r.stdout

# 1. bring the v55 (pale) source back, keeping the worklog history
sh(["git", "checkout", "0a28a91", "--", "src", "sw.js", "tools/build.py"])

# 2. bump to v56 again
b = io.open("tools/build.py", encoding="utf-8").read()
b = b.replace('VERSION = "v55"', 'VERSION = "v56"', 1)
io.open("tools/build.py", "w", encoding="utf-8", newline="\n").write(b)
s = io.open("sw.js", encoding="utf-8").read()
s = s.replace("v55-20261023", "v56-20261023")
io.open("sw.js", "w", encoding="utf-8", newline="\n").write(s)

# 3. rebuild
print(sh(["python", "tools/build.py"])[-300:])
print(sh(["python", "tools/check-contracts.py"])[-200:])
