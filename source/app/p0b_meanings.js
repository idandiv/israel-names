/* meanings and stories of names. The content lives in data/meanings.json (see tools/meanings.py);
   the build serves it as its own asset, const MEANINGS={name:[meaning, story]}, loaded before the app */
const MEAN=new Map(),STORY=new Map();
for(const[k,v]of Object.entries(typeof MEANINGS==='undefined'?{}:MEANINGS)){if(v[0])MEAN.set(k,v[0]);if(v[1])STORY.set(k,v[1])}
