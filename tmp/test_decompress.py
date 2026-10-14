import zlib, sys

with open("tmp/decode_zip.py") as f:
    text = f.read()

# Let us find parts between "PART: "
# In a zip file, deflate data is raw deflate (wbits=-15)
# Let's test all offsets and substrings
data_str = """ridge-runners/vite.config.ts :N]C ridge-runners/package.jsoneOK .E!J ridge-runners/index.html &2UX 2ueP e_guW f6X4 n\d; IV<B C?N& cL6I% -FQt .:44 xc+6 !pyQ _.XzS 5!Yy 2RB^d .|Xx k<}  w3h) y3TF <Rt_ hj4|r? ^93x mS^4 ,hJ< 6\zp= )Jx] $,m[ GF&e @w"_ j|_{K =B;] {nSC hwNf0 :N]YW ridge-runners/tsconfig.jsonU ;E\IZ r(fK 7u-L ridge-runners/.gitignore ^N~rbNL ridge-runners/README.md]U 1(C7/ k6cT P.~j HR)qN3! c^Qkl 8,Mx yE=  t, #v ridge-runners/src/style.css WgR3 K_o? E5t5z K0nz mD=F vh/#5 cu5jV ,|v" y]uV dLh`\v|4 nCj& Y&o! H<=JKQd rI^A$ 6xa`;Rq LkH{ }px=A ntgs!6 $WQ'qJ' 5MQ3r1-p( {3Yw W3xy5 o6$C @hA[ ')@a0 GL \ Q{DF  U;/ xiKM 0]5! '^6w 8yMH9#KK' WN.& . 7EU PCB5 $T~>s ridge-runners/src/main.ts %yvv JS^p 9|VNl Q 6= u~qy DrJ( (fQ> nYG- E:S8+. V<#P ia-[ vM+& ;ks] 0e~TZ Uc$Ti {`8M 560U )O(-:KE4 #W$} I1m:  N)0K ~4|{i 5{%RD Pt</ kuKe A:CV$ sCR0 g'm;  pwz jM'v hxm) rJK%  [k&?] rDHYb9 ew\| _GD! qWV:U 6|6q %}}6 '%mp9e  ~0tn r)$= 8ilf qIrLqJ s Y2 kLFn 1Y5l {Nss "N.N: ~quy YA>&; Z+1}1 b2r( [P6( =xCxb8 Pj12$ h[zX y'FXF s?)g _!r[ B,3D \2lx _6vF CJ#/< %WPbQ J-+F Os6h ,f%jt )o({ %^^  nd3;  8Lub U)<& ridge-runners/vite.config.tsPK :N]C ridge-runners/package.jsonPK ridge-runners/index.htmlPK :N]YW ridge-runners/tsconfig.jsonPK ridge-runners/.gitignorePK ridge-runners/README.mdPK ridge-runners/src/style.cssPK ridge-runners/src/main.tsPK"""

# Try latin-1 encoding to preserve bytes
raw_bytes = data_str.encode("latin-1", errors="ignore")
print("raw bytes len:", len(raw_bytes))

for i in range(len(raw_bytes)):
    for wbits in [-15, 15, 31]:
        try:
            decomp = zlib.decompress(raw_bytes[i:i+400], wbits)
            print(f"Success at {i} wbits {wbits}: {decomp[:60]}")
        except Exception:
            pass
