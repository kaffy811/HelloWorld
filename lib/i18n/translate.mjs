import zh from './zh.json' with {type:'json'};
export function translate(language,text,params={}){
 const key=String(text??'').replace(/\s+/g,' ').trim();
 let value=language==='zh-Hans'?(zh[key]||dynamicChinese(key)||key):key;
 for(const [name,content] of Object.entries(params))value=value.replaceAll('{'+name+'}',String(content));
 return (/^\s/.test(String(text))?' ':'')+value+(/\s$/.test(String(text))?' ':'');
}
function dynamicChinese(s){
 const pairs=[[/^Rating saved: (\d)\/5\. You can change it\.$/,'评分已保存：$1/5，可以修改。'],[/^News checked: (\d+) available updates imported\.$/,'资讯更新完成：已同步 $1 条现有资讯。'],[/^(\d+) companies$/,'$1 家公司'],[/^(\d+) updates$/,'$1 条资讯'],[/^Page (\d+) of (\d+)$/,'第 $1 页，共 $2 页'],[/^(\d+) of 5 — (.*)$/,'$1 / 5 — $2'],[/^([A-Z][A-Z0-9.]{0,11}) news$/,'$1 资讯'],[/^Explore (\w+) ↗$/,'了解 $1 ↗'],[/^Add (\w+) to watchlist$/,'将 $1 加入自选'],[/^Remove (\w+) from watchlist$/,'将 $1 移出自选'],[/^Sign in to add (\w+) to watchlist$/,'登录后将 $1 加入自选']];
 for(const [pattern,value] of pairs)if(pattern.test(s))return s.replace(pattern,value);return null;
}
