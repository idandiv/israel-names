import os
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','data')
import pandas as pd, json, gzip, base64
d=pd.read_csv(os.path.join(D,'babynamesIL.csv'))
SEC=['Jewish','Muslim','Christian-Arab','Druze']
d['s']=d.sector.map(SEC.index); d['x']=(d.sex=='M').astype(int)
Y0=1949
tot=d.groupby(['s','x','year']).n.sum()
T=[[[int(tot.get((s,x,y),0)) for y in range(Y0,2025)] for x in (0,1)] for s in range(4)]
order=d.groupby('name').n.sum().sort_values(ascending=False)
names=list(order.index)
idx={n:i for i,n in enumerate(names)}
rows=[[] for _ in names]
for (nm,s,x),g in d.groupby(['name','s','x']):
    g=g.sort_values('year'); a=int(g.year.min())-Y0; b=int(g.year.max())-Y0
    arr=[0]*(b-a+1)
    for y,n in zip(g.year,g.n): arr[y-Y0-a]=int(n)
    rows[idx[nm]].append(f"{s}{x}{a}:"+",".join(map(str,arr)).replace(",0,0,0",",,,"))
# simpler: keep plain
rows=[[] for _ in names]
for (nm,s,x),g in d.groupby(['name','s','x']):
    g=g.sort_values('year'); a=int(g.year.min())-Y0; b=int(g.year.max())-Y0
    arr=['']*(b-a+1)
    for y,n in zip(g.year,g.n): arr[y-Y0-a]=str(int(n))
    rows[idx[nm]].append(f"{s}{x}{a}:"+",".join(arr))
txt="\n".join(n+"|"+"|".join(r) for n,r in zip(names,rows))
data={"y0":Y0,"T":T,"txt":txt}
raw=json.dumps(data,ensure_ascii=False).encode()
gz=gzip.compress(raw,9)
open(os.path.join(D,'data.b64'),'w').write(base64.b64encode(gz).decode())
print(len(raw),len(gz),len(names))
