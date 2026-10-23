import io, os, subprocess
pairs = [("e0a55fb","v50"),("fe036db","v51"),("5b9f933","v52"),("d2e4419","v53"),
         ("3f247d9","v54"),("0a28a91","v55"),("3e62e0c","v56")]
out = os.path.abspath("../.scratch/versions")
os.makedirs(out, exist_ok=True)
for h, v in pairs:
    data = subprocess.run(["git","show",h+":index.html"], capture_output=True, check=True).stdout
    p = os.path.join(out, v + ".html")
    io.open(p,"wb").write(data)
    print(v, len(data), "bytes", h)
