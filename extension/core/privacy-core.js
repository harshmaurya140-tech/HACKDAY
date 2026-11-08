/* Incognix core. Runs entirely in the extension; no fetch, network, telemetry,
 * Python, or remote API. Shared by MV3 service worker and Node unit tests. */
(function (root) {
  'use strict';
  const TOKEN = /\[PRIVATE_[A-Z]+_\d+_[0-9A-F]{6}\]/g;
  const TYPES = new Set(['PERSON','EMAIL','PHONE','ADDRESS','PAN','AADHAAR','ACCOUNT','DOB','INCOME','AMOUNT','CARD','ID','SECRET','USERNAME','IP','OTHER']);
  const TYPE_ALIASES = {
    NAME:'PERSON',FULL_NAME:'PERSON',FIRST_NAME:'PERSON',LAST_NAME:'PERSON',
    DATE_OF_BIRTH:'DOB',BIRTH_DATE:'DOB',BANK_ACCOUNT:'ACCOUNT',ACCOUNT_NUMBER:'ACCOUNT',
    TAX_ID:'PAN',TAX_NUMBER:'PAN',PAN_NUMBER:'PAN',PAN_CARD:'PAN',AADHAAR_NUMBER:'AADHAAR',AADHAAR_CARD:'AADHAAR',GOVERNMENT_ID:'ID',NATIONAL_ID_NUMBER:'ID',
    PHONE_NUMBER:'PHONE',PHONE_NUM:'PHONE',MOBILE:'PHONE',ID_NUM:'ID',PAYMENT_CARD:'CARD',CREDIT_CARD:'CARD',
    SALARY:'INCOME',TRANSACTION_AMOUNT:'AMOUNT',PAYMENT_AMOUNT:'AMOUNT',FINANCIAL_AMOUNT:'AMOUNT',MONEY:'AMOUNT',PASSWORD:'SECRET',API_KEY:'SECRET',
    SSN:'ID',SOCIAL_SECURITY_NUMBER:'ID',CVV:'SECRET',PIN:'SECRET',OTP:'SECRET',PRIVATE_KEY:'SECRET',ROUTING_NUMBER:'ACCOUNT',PASSPORT:'ID',IP_ADDRESS:'IP',LOCATION:'ADDRESS',CITY:'ADDRESS'
  };
  // Category-level safeguard, never hardcoded prompt text or individual values.
  // An inference model must never override the user's decision to keep credentials hidden.
  const NEVER_DISCLOSE=new Set(['ACCOUNT','PAN','AADHAAR','CARD','ID','SECRET']);
  function canAskForDisclosure(rawType){return !NEVER_DISCLOSE.has(typeOf(rawType));}
  function typeOf(raw) {
    const normalized = String(raw || 'OTHER').trim().toUpperCase().replace(/[^A-Z]+/g, '_');
    let result = TYPE_ALIASES[normalized] || normalized;
    // Model label wording can vary. Normalize identifier families without
    // matching or hardcoding any particular user's content.
    if(!TYPES.has(result)){
      if(result.includes('ACCOUNT')||result==='IBAN'||result==='BANK_ACCT')result='ACCOUNT';
      else if(result.includes('PAN'))result='PAN';
      else if(result.includes('CARD'))result='CARD';
      else if(result.includes('AADHAAR'))result='AADHAAR';
      else if(result.includes('PASSWORD')||result.includes('SECRET')||result.includes('API_KEY')||result.includes('ACCESS_TOKEN'))result='SECRET';
      else if(result.includes('PASSPORT')||result.includes('NATIONAL_ID')||result.includes('GOVERNMENT_ID'))result='ID';
      else if(result.includes('TAX')&&result.includes('ID'))result='ID';
    }
    return TYPES.has(result) ? result : 'OTHER';
  }
  function overlaps(a,b) {return a.start<b.end && b.start<a.end;}
  // Never let an ambiguous model label override an overlapping credential
  // recognized by a deterministic format validator. Mask the union rather
  // than expose part of an identifier or invite disclosure for that span.
  function neverDisclose(rawType){return NEVER_DISCLOSE.has(typeOf(rawType));}
  function validates(text, e) {
    return Number.isInteger(e.start) && Number.isInteger(e.end) &&
      e.start>=0 && e.end<=text.length && e.start<e.end &&
      text.slice(e.start,e.end)===e.text && e.text.length<=60000;
  }
  function spansFor(text, raw) {
    if (typeof text !== 'string' || text.length>60000) throw Error('Draft is too long for local analysis.');
    if (!Array.isArray(raw) || raw.length>2000) throw Error('Local detector returned invalid results.');
    const proposed = [];
    for (const e of raw) {
      if (!e || typeof e!=='object') continue;
      const type=typeOf(e.type);
      // The inference side MUST return offsets validated against the exact draft.
      const value=typeof e.text==='string'?e.text:'';
      const candidate={start:e.start,end:e.end,text:value,type,necessary:e.necessary===true && canAskForDisclosure(type),
        reason:typeof e.reason==='string'?e.reason.slice(0,250):''};
      if(!validates(text,candidate))continue;
      if (TOKEN.test(candidate.text)) { TOKEN.lastIndex=0; continue; }
      TOKEN.lastIndex=0;
      proposed.push(candidate);
    }
    proposed.sort((a,b)=>a.start-b.start || b.end-a.end);
    const clean=[];
    for(const e of proposed){
      const prior=clean.at(-1);
      if(!prior || !overlaps(prior,e)){clean.push(e);continue;}
      if(neverDisclose(prior.type)||neverDisclose(e.type)){
        // A broad or incorrect NER span must not turn a PAN/account into a
        // user-revealable field. Protect the entire collision, conservatively.
        prior.start=Math.min(prior.start,e.start);
        prior.end=Math.max(prior.end,e.end);
        prior.text=text.slice(prior.start,prior.end);
        if(!neverDisclose(prior.type))prior.type=e.type;
        prior.necessary=false;
        prior.reason='Protected identifier; exact disclosure is blocked.';
      }else if(e.end>prior.end){
        prior.end=e.end;
        prior.text=text.slice(prior.start,prior.end);
        // Do not carry a necessity prediction across two distinct entities.
        prior.necessary=false;
      }else if(e.start===prior.start&&e.end===prior.end&&e.type===prior.type){
        prior.necessary=prior.necessary||e.necessary;
      }
    }
    return clean.map((e,i)=>{
      // Normalize only person boundaries AFTER collision resolution. Never trim
      // a credential union or guess offsets from normalized/decoded model text.
      if(e.type==='PERSON'){
        let start=e.start,end=e.end;
        while(start<end && /[\s"“(\[]/u.test(text[start]))start++;
        while(end>start && /[\s"”,;:!?\)\]]/u.test(text[end-1]))end--;
        // Keep initials and abbreviated suffixes (J., J.R., Jr., Sr.). Apostrophes,
        // hyphens, accents and internal punctuation remain part of the name.
        const tail=text.slice(start,end).match(/([\p{L}\p{M}]+)\.$/u);
        if(tail && [...tail[1]].length>1 && !/^(?:jr|sr)$/i.test(tail[1]))end--;
        if(start<end){e.start=start;e.end=end;e.text=text.slice(start,end);}
      }
      return {...e,id:'e'+(i+1)};
    });
  }
  // Pure format checks complement model extraction. They are generic validators,
  // never hardcoded individuals, PANs, user prompts, or sensitive values.
  function detectFormats(text) {
    const findings=[];
    const formats = [
      {type:'EMAIL',rx:/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi},
      {type:'PAN',rx:/\b[A-Z]{5}[0-9]{4}[A-Z]\b/g},
      // Candidate Indian mobile numbers: include international prefix when present.
      {type:'PHONE',rx:/(?<![\p{L}\p{N}_+])(?:\+91[ \u00a0-]?|0)?[6-9](?:[ \u00a0-]?\d){9}(?![\p{L}\p{N}_])/gu},
      {type:'AADHAAR',rx:/(?<!\w)[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}(?!\w)/g},
      {type:'IP',rx:/\b(?:\d{1,3}\.){3}\d{1,3}\b/g}
    ];
    for (const f of formats) for (const m of text.matchAll(f.rx)) {
      // IP candidates must be valid IPv4 octets.
      if(f.type==='IP' && m[0].split('.').some(x=>Number(x)>255)) continue;
      findings.push({type:f.type,text:m[0],start:m.index,end:m.index+m[0].length,necessary:false,reason:'Structured identifier; hidden by default.'});
    }
    // Generic context-aware account-number format detection, not a specific
    // prompt or account value. Plain long numbers are NOT all bank accounts.
    const accountRx=/\b(?:bank\s+)?(?:account|a\/c)\s*(?:number|no\.?|#)?\s*(?:is|[:=#-])?\s*(\d[\d -]{2,24}\d)\b/gi;
    for(const match of text.matchAll(accountRx)){
      const number=match[1],digits=number.replace(/[^0-9]/g,'');
      if(digits.length<4||digits.length>18)continue;
      const start=match.index+match[0].lastIndexOf(number);
      findings.push({type:'ACCOUNT',text:number,start,end:start+number.length,necessary:false,reason:'Account identifier; hidden by default.'});
    }
    // Explicit birth-date labels provide privacy context without classifying
    // unrelated dates (deadlines, comparison dates) as personal identifiers.
    // Ambiguous numeric ordering is still masked; no date is interpreted here.
    const birthRx=/\b(?:date\s+of\s+birth|birth\s*date|d\.?o\.?b\.?)\s*(?:is\s*|[:=]\s*)?((?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?[,]?\s+\d{4}))(?![\p{L}\p{N}])/giu;
    for(const m of text.matchAll(birthRx)){
      const value=m[1],start=m.index+m[0].lastIndexOf(value);
      findings.push({type:'DOB',text:value,start,end:start+value.length,necessary:false,reason:'Explicitly labelled birth date; hidden by default.'});
    }
    const add=(type,value,start)=>findings.push({type,text:value,start,end:start+value.length,necessary:false,reason:'Structured credential; hidden by default.'});
    const luhn=digits=>{let sum=0;for(let i=digits.length-1,n=0;i>=0;i--,n++){let d=Number(digits[i]);if(n%2){d*=2;if(d>9)d-=9;}sum+=d;}return sum%10===0;};
    for(const m of text.matchAll(/(?<![\p{L}\p{N}])(?:\d[ -]?){12,18}\d(?![\p{L}\p{N}])/gu)){
      const digits=m[0].replace(/\D/g,'');if(digits.length>=13&&digits.length<=19&&luhn(digits))add('CARD',m[0],m.index);
    }
    for(const m of text.matchAll(/\b(?!000|666|9\d\d)\d{3}[- ](?!00)\d{2}[- ](?!0000)\d{4}\b/g))add('ID',m[0],m.index);
    for(const m of text.matchAll(/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]){11,30}\b/g)){
      const compact=m[0].replace(/ /g,'');const reordered=compact.slice(4)+compact.slice(0,4);let remainder=0;
      for(const c of reordered){for(const digit of /[A-Z]/.test(c)?String(c.charCodeAt(0)-55):c)remainder=(remainder*10+Number(digit))%97;}
      if(remainder===1)add('ACCOUNT',m[0],m.index);
    }
    // A labelled credential is private regardless of length or entropy. Read
    // quoted values in full (including escaped quotes/spaces), without the old
    // 500-character prefix cutoff. Never consume a following line as its value.
    const secretLabel=/\b(?:password|passwd|api[_ -]?key|secret|access[_ -]?token|bearer)\b["']?[ \t]*(?:is\b|[:=])[ \t]*/gi;
    for(const m of text.matchAll(secretLabel)){
      let start=m.index+m[0].length,end=start;
      const quote=text[start];
      if(quote==='"'||quote==="'"){
        start++;end=start;
        while(end<text.length && text[end]!=='\n' && text[end]!=='\r'){
          if(text[end]===quote)break;
          if(text[end]==='\\' && end+1<text.length && !/[\r\n]/.test(text[end+1]))end+=2;
          else end++;
        }
      }else{
        const value=text.slice(start).match(/^[^\s"',;}\]]+/u);
        if(value)end=start+value[0].length;
      }
      if(end>start)add('SECRET',text.slice(start,end),start);
    }
    // Standard HTTP authorization syntax has whitespace after the scheme,
    // unlike a labelled assignment. Require the header to avoid prose matches.
    for(const m of text.matchAll(/\b(?:proxy-)?authorization\b["']?[ \t]*[:=][ \t]*["']?(?:Bearer|Basic)[ \t]+([A-Za-z0-9._~+\/-]+=*)/gi))add('SECRET',m[1],m.index+m[0].lastIndexOf(m[1]));
    for(const m of text.matchAll(/\b(?:cvv|pin|otp)["']?\s*(?:is|[:=])\s*["']?(\d{3,8})\b/gi))add('SECRET',m[1],m.index+m[0].lastIndexOf(m[1]));
    for(const m of text.matchAll(/-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z]+ )?PRIVATE KEY-----/g))add('SECRET',m[0],m.index);
    return findings;
  }
  function mergeDetected(text, modelEntities) {
    const all=[...modelEntities,...detectFormats(text)];
    // Prefer the longest span, and model's contextual category on exact collisions.
    all.sort((a,b)=>a.start-b.start || b.end-a.end);
    return spansFor(text,all);
  }
  function confidentialTerms(text,terms){
    if(!Array.isArray(terms)||terms.length>100)throw Error('Use at most 100 confidential terms.');
    const entities=[];
    for(const value of new Set(terms)){
      if(typeof value!=='string'||!value.length||value.length>200)throw Error('Invalid confidential term.');
      for(let start=text.indexOf(value);start>=0;start=text.indexOf(value,start+value.length))entities.push({start,end:start+value.length,text:value,type:'SECRET',necessary:false,reason:'Local confidential term'});
    }
    return entities;
  }
  function newSession() {return {realToDummy:{},dummyToReal:{},counts:{}};}
  function tokenFor(session,e) {
    // Preserve exact spelling/case for lossless round-trip. A case-folded key
    // maps distinct user-provided strings to the same placeholder and restores
    // the wrong original text.
    const key=e.type+'\u0000'+e.text;
    if(session.realToDummy[key])return session.realToDummy[key];
    const count=(session.counts[e.type]||0)+1;
    session.counts[e.type]=count;
    const bytes=new Uint8Array(3);
    crypto.getRandomValues(bytes);
    const suffix=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
    const token=`[PRIVATE_${e.type}_${count}_${suffix}]`;
    if(session.dummyToReal[token]) throw Error('Placeholder collision; sending blocked.');
    session.realToDummy[key]=token;
    session.dummyToReal[token]=e.text;
    return token;
  }
  // Deliberately narrow: one self-labelled DOB, one explicit reference date.
  // Calendar arithmetic stays local; the provider gets only a result token.
  function localAge(text){
    const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
    const date='(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2} (?:'+months.join('|')+') \\d{4})';
    const births=[...text.matchAll(new RegExp('\\bmy (?:date of birth|dob) (?:is |: ?)?('+date+')','gi'))];
    const refs=[...text.matchAll(new RegExp('\\b(?:my )?(?:exact )?age as of ('+date+')','gi'))];
    if(births.length!==1||refs.length!==1)return null;
    const parse=value=>{
      const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      const parts=value.toLowerCase().split(' ');
      const y=iso?+iso[1]:+parts[2],m=iso?+iso[2]-1:months.indexOf(parts[1]),d=iso?+iso[3]:+parts[0];
      const result=new Date(Date.UTC(y,m,d));
      return y>=1900&&y<=2200&&result.getUTCFullYear()===y&&result.getUTCMonth()===m&&result.getUTCDate()===d?result:null;
    };
    const birth=parse(births[0][1]),end=parse(refs[0][1]);
    if(!birth||!end||end<birth)return null;
    const shifted=n=>{const y=birth.getUTCFullYear()+Math.floor((birth.getUTCMonth()+n)/12),m=(birth.getUTCMonth()+n)%12;return new Date(Date.UTC(y,m,Math.min(birth.getUTCDate(),new Date(Date.UTC(y,m+1,0)).getUTCDate())));};
    let total=(end.getUTCFullYear()-birth.getUTCFullYear())*12+end.getUTCMonth()-birth.getUTCMonth();
    if(shifted(total)>end)total--;
    const days=Math.round((end-shifted(total))/86400000);
    return {text:`${Math.floor(total/12)} years, ${total%12} months, ${days} days`,birth:births[0][1]};
  }
  function prepare(session,draft,decisions={}) {
    if(!draft || typeof draft.text!=='string' || !Array.isArray(draft.entities))throw Error('Invalid draft');
    let text=draft.text;
    let replacements=0;
    for(const e of [...draft.entities].sort((a,b)=>b.start-a.start)){
      const requested=decisions[e.id]||{mode:'HIDE'};
      const mode=(requested.mode||'HIDE').toUpperCase();
      if(!['HIDE','EXACT','RANGE','YEAR'].includes(mode))throw Error('Unsupported disclosure selection');
      if(mode!=='HIDE' && !canAskForDisclosure(e.type))throw Error('This identifier is protected and cannot be disclosed by the extension');
      if(!e.necessary && mode!=='HIDE')throw Error('Disclosure requires a necessity review');
      let replacement;
      if(mode==='EXACT')replacement=e.text;
      else if(mode==='YEAR'){
        if(e.type!=='DOB')throw Error('Birth year only applies to dates of birth');
        const match=e.text.match(/(?:19|20)\d{2}/);
        if(!match)throw Error('Birth year could not be extracted safely');
        replacement=`birth year ${match[0]} (exact birth date withheld)`;
      }
      else if(mode==='RANGE'){
        if(e.type!=='INCOME')throw Error('Ranges only apply to incomes');
        if(!Number.isFinite(requested.lower)||!Number.isFinite(requested.upper)||requested.lower<0||requested.upper<=requested.lower)throw Error('Invalid income range');
        replacement=`INR ${requested.lower}–${requested.upper} (user-specified range)`;
      } else {replacement=tokenFor(session,e);replacements++;}
      if(text.slice(e.start,e.end)!==e.text)throw Error('Entity alignment changed; sending blocked.');
      text=text.slice(0,e.start)+replacement+text.slice(e.end);
    }
    const age=localAge(draft.text);
    if(age){
      const result=tokenFor(session,{type:'AGE',text:age.text});
      text+='\n\n[Incognix local calculation] The requested age was calculated locally using calendar months (month-end dates clamped). For the exact age answer, reproduce this result token verbatim: '+result+'. Do not infer a birth date from it.';
    }
    return {sanitized_text:text,replacements};
  }
  function restore(session,text) {
    if(typeof text!=='string' || text.length>200000)throw Error('Invalid response text');
    const restored=text.replace(TOKEN,t=>Object.prototype.hasOwnProperty.call(session.dummyToReal,t)?session.dummyToReal[t]:t);
    const unresolved=[...restored.matchAll(TOKEN)].some(m=>!Object.prototype.hasOwnProperty.call(session.dummyToReal,m[0]));
    return {text:restored,unresolved};
  }
  const api={localAge,confidentialTerms,typeOf,canAskForDisclosure,spansFor,detectFormats,mergeDetected,newSession,prepare,restore,TOKEN};
  root.PrivacyCore=api;
  if(typeof module!=='undefined' && module.exports)module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
